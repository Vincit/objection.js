const difference = require('lodash/difference');
const { isTempColumn } = require('../../utils/tmpColumnUtils');
const BelongsToOneRelation = require('../../relations/belongsToOne/BelongsToOneRelation');

const UpsertNodeType = {
  Insert: 'Insert',
  Delete: 'Delete',
  Update: 'Update',
  Patch: 'Patch',
  Relate: 'Relate',
  Unrelate: 'Unrelate',
  None: 'None'
};

const ChangeType = {
  HasOwnChanges: 'HasOwnChanges',
  HasRelationalChanges: 'HasRelationalChanges',
  NoChanges: 'NoChanges'
};

class UpsertNode {
  constructor(parentNode, relExpr, upsertModel, currentModel, dataPath, opt) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.relPathFromRoot = getRelationPathFromRoot(this);
    this.upsertModel = upsertModel || null;
    this.currentModel = currentModel || null;
    this.relations = Object.create(null);
    this.dataPath = dataPath;
    this.opt = opt || {};

    const { types, omitFromUpdate } = getTypes(this);
    this.types = types;

    if (upsertModel && currentModel) {
      copyCurrentToUpsert(currentModel, upsertModel);
    }

    if (omitFromUpdate) {
      this.upsertModel.$omitFromDatabaseJson(omitFromUpdate);
    }
  }

  static get Type() {
    return UpsertNodeType;
  }

  get someModel() {
    return this.upsertModel || this.currentModel;
  }

  get modelClass() {
    return this.someModel.constructor;
  }

  get relationName() {
    if (this.parentNode !== null) {
      return this.relExpr.name;
    } else {
      return null;
    }
  }

  get relation() {
    if (this.parentNode !== null) {
      return this.parentNode.modelClass.getRelations()[this.relationName];
    } else {
      return null;
    }
  }

  hasType() {
    for (let i = 0, l = arguments.length; i < l; ++i) {
      if (this.types.indexOf(arguments[i]) !== -1) {
        return true;
      }
    }

    return false;
  }
}

function copyCurrentToUpsert(currentModel, upsertModel) {
  const props = Object.keys(currentModel);

  for (let i = 0, l = props.length; i < l; ++i) {
    const prop = props[i];

    // Temp columns are created by some queries and they are never meant to
    // be seen by the outside world. Skip those in addition to undefineds.
    if (!isTempColumn(prop) && upsertModel[prop] === undefined) {
      upsertModel[prop] = currentModel[prop];
    }
  }
}

function getTypes(node) {
  if (node.upsertModel !== null && node.currentModel === null && node.upsertModel.$hasId()) {
    return getTypesInsertRelate(node);
  } else if (node.upsertModel !== null && node.currentModel === null) {
    return getTypesInsert(node);
  } else if (node.upsertModel === null && node.currentModel !== null) {
    return getTypesDeleteUnrelate(node);
  } else {
    return getTypesUpdate(node);
  }
}

function getTypesInsertRelate(node) {
  if (hasOption(node, 'relate') && node.relation !== null) {
    return getTypesRelate(node);
  } else if (hasOption(node, 'insertMissing')) {
    return getTypesInsert(node);
  } else {
    const parent = node.parentNode;
    throw new Error(
      [
        parent
          ? `model (id=${node.upsertModel.$id()}) is not a child of model (id=${parent.upsertModel.$id()}). `
          : `root model (id=${node.upsertModel.$id()}) does not exist. `,
        parent ? `If you want to relate it, use the relate: true option. ` : '',
        `If you want to insert it with an id, use the insertMissing: true option`
      ].join('')
    );
  }
}

function getTypesRelate(node) {
  const props = Object.keys(node.upsertModel);
  const rel = node.parentNode.modelClass.getRelations()[node.relationName];

  if (difference(props, rel.relatedProp.props).length !== 0) {
    const relateType = decideType(node, UpsertNodeType.Relate, 'noRelate');

    // If the relate model contains any other properties besides the foreign
    // keys needed to make the relation, we may also need to update it.
    const possibleUpdateType = decideType(
      node,
      UpsertNodeType.Patch,
      'update',
      UpsertNodeType.Update
    );

    const updateType = decideType(node, possibleUpdateType, 'noUpdate');

    if (relateType === UpsertNodeType.None) {
      return {
        types: [UpsertNodeType.None]
      };
    } else if (updateType === UpsertNodeType.None) {
      return {
        types: [relateType]
      };
    } else {
      return {
        types: [relateType, updateType],
        // If we update, we don't want to update the relation props.
        omitFromUpdate: rel.relatedProp.props
      };
    }
  } else {
    return {
      types: [decideType(node, UpsertNodeType.Relate, 'noRelate')]
    };
  }
}

function getTypesInsert(node) {
  return {
    types: [decideType(node, UpsertNodeType.Insert, 'noInsert')]
  };
}

function getTypesDeleteUnrelate(node) {
  const ciblingNodes = node.parentNode.relations[node.relation.name];
  const type = hasOption(node, 'unrelate')
    ? decideType(node, UpsertNodeType.Unrelate, 'noUnrelate')
    : decideType(node, UpsertNodeType.Delete, 'noDelete');

  // Optimization: If the relation is a BelongsToOneRelation and we are
  // going to relate a new model to it, we don't need to unrelate since
  // we would end up with useless update operation.
  if (
    type === UpsertNodeType.Unrelate &&
    node.relation instanceof BelongsToOneRelation &&
    ciblingNodes &&
    ciblingNodes.some(it => it.hasType(UpsertNodeType.Relate, UpsertNodeType.Insert))
  ) {
    return {
      types: [UpsertNodeType.None]
    };
  } else {
    return {
      types: [type]
    };
  }
}

function getTypesUpdate(node) {
  const { changeType, unchangedProps } = hasChanges(node.currentModel, node.upsertModel);

  if (changeType == ChangeType.NoChanges) {
    return {
      types: [UpsertNodeType.None],
      omitFromUpdate: unchangedProps
    };
  } else if (changeType == ChangeType.HasOwnChanges) {
    const possibleUpdateType = decideType(
      node,
      UpsertNodeType.Patch,
      'update',
      UpsertNodeType.Update
    );

    const updateType = decideType(node, possibleUpdateType, 'noUpdate');

    return {
      types: [updateType],
      omitFromUpdate: unchangedProps
    };
  } else if (changeType == ChangeType.HasRelationalChanges) {
    // Always create a patch node for relational changes even if `noUpdate`
    // option is true.
    return {
      types: [UpsertNodeType.Patch],
      omitFromUpdate: unchangedProps
    };
  }
}

function hasOption(node, optName) {
  const opt = node.opt[optName];

  if (Array.isArray(opt)) {
    return opt.indexOf(node.relPathFromRoot) !== -1;
  } else {
    return !!opt;
  }
}

function decideType(node, defaultType, option, optionType = UpsertNodeType.None) {
  return hasOption(node, option) ? optionType : defaultType;
}

function getRelationPathFromRoot(node) {
  const path = [];

  while (node) {
    if (node.relExpr.name) {
      path.unshift(node.relExpr.name);
    }
    node = node.parentNode;
  }

  return path.join('.');
}

function hasChanges(currentModel, upsertModel) {
  let changeType = ChangeType.NoChanges;
  const changingRelProps = findChangingRelProps(currentModel, upsertModel);

  if (changingRelProps.length) {
    changeType = ChangeType.HasRelationalChanges;
  }

  if (changeType === ChangeType.NoChanges) {
    // If the upsert model has query properties, we cannot know if they will change
    // the value. We need to return HasOwnChanges just in case.
    if (upsertModel.$$queryProps && Object.keys(upsertModel.$$queryProps).length > 0) {
      changeType = ChangeType.HasOwnChanges;
    }
  }

  const keys = Object.keys(upsertModel);
  const relations = upsertModel.constructor.getRelations();
  const unchangedProps = [];

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key[0] === '$' || relations[key]) {
      continue;
    }

    if (currentModel[key] !== upsertModel[key]) {
      if (changeType === ChangeType.NoChanges) {
        changeType = ChangeType.HasOwnChanges;
      }
    } else if (!changingRelProps.includes(key)) {
      unchangedProps.push(key);
    }
  }

  return {
    changeType: changeType,
    unchangedProps
  };
}

function findChangingRelProps(currentModel, upsertModel) {
  const relationArray = upsertModel.constructor.getRelationArray();
  const changingProps = [];

  for (let i = 0, l = relationArray.length; i < l; ++i) {
    const relation = relationArray[i];
    const upsertRelated = upsertModel[relation.name];

    if (upsertRelated && relation instanceof BelongsToOneRelation) {
      // If the the property is a `BelongsToOneRelation` me may need to update
      // this model if the related model changes causing this model's relation
      // property to need updating.
      const relatedProp = relation.relatedProp;
      const ownerProp = relation.ownerProp;
      const currentRelated = currentModel[relation.name];

      for (let j = 0, lr = relatedProp.size; j < lr; ++j) {
        const currentProp = currentRelated && relatedProp.getProp(currentRelated, j);
        const upsertProp = upsertRelated && relatedProp.getProp(upsertRelated, j);

        if (currentProp !== upsertProp) {
          changingProps.push(ownerProp.props[j]);
        }
      }
    }
  }

  return changingProps;
}

module.exports = UpsertNode;
