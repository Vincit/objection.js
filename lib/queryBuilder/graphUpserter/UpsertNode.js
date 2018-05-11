const { difference } = require('../../utils/objectUtils');
const { isTempColumn } = require('../../utils/tmpColumnUtils');
const BelongsToOneRelation = require('../../relations/belongsToOne/BelongsToOneRelation');

const UpsertNodeType = Object.freeze({
  Insert: 'Insert',
  Delete: 'Delete',
  Update: 'Update',
  Patch: 'Patch',
  Relate: 'Relate',
  Unrelate: 'Unrelate',
  UpsertRecursively: 'UpsertRecursively',
  None: 'None'
});

const ChangeType = Object.freeze({
  HasOwnChanges: 'HasOwnChanges',
  HasRelationalChanges: 'HasRelationalChanges',
  NoChanges: 'NoChanges'
});

const OptionType = Object.freeze({
  Relate: 'relate',
  Unrelate: 'unrelate',
  InsertMissing: 'insertMissing',
  Update: 'update',
  NoInsert: 'noInsert',
  NoUpdate: 'noUpdate',
  NoDelete: 'noDelete',
  NoRelate: 'noRelate',
  NoUnrelate: 'noUnrelate'
});

class UpsertNode {
  constructor({ parentNode, relExpr, upsertModel, currentModel, dataPath, opt }) {
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

  static get OptionType() {
    return OptionType;
  }

  get someModel() {
    return this.upsertModel || this.currentModel;
  }

  get modelClass() {
    return this.someModel.constructor;
  }

  get relationName() {
    if (this.parentNode !== null) {
      return this.relExpr.$relation;
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
  if (isInsertWithId(node)) {
    return getTypesInsertWithId(node);
  } else if (isInsert(node)) {
    return getTypesInsert(node);
  } else if (isDeleteOrUnrelate(node)) {
    return getTypesDeleteUnrelate(node);
  } else {
    return getTypesUpdate(node);
  }
}

function isInsertWithId(node) {
  // Database doesn't have the model, but the upsert graph does and the model
  // in the upsert graph has an id. Depending on other options this might end
  // up being either an insert or a relate.
  return isInsert(node) && node.upsertModel.$hasId();
}

function getTypesInsertWithId(node) {
  if (hasOption(node, OptionType.Relate) && node.relation !== null) {
    return getTypesRelate(node);
  } else if (hasOption(node, OptionType.InsertMissing)) {
    // If insertMissing option is set for the node, we insert the model
    // even though it has the id set.
    return getTypesInsert(node);
  } else {
    const parent = node.parentNode;

    throw new Error(
      [
        parent
          ? `model (id=${node.upsertModel.$id()}) is not a child of model (id=${parent.upsertModel.$id()}). `
          : `root model (id=${node.upsertModel.$id()}) does not exist. `,

        parent ? `If you want to relate it, use the relate option. ` : '',

        `If you want to insert it with an id, use the insertMissing option`
      ].join('')
    );
  }
}

function getTypesRelate(node) {
  const props = Object.keys(node.upsertModel);
  const rel = node.parentNode.modelClass.getRelations()[node.relationName];

  if (difference(props, rel.relatedProp.props).length !== 0) {
    const relateType = decideType(node, UpsertNodeType.Relate, OptionType.NoRelate);

    // If the relate model contains any other properties besides the foreign
    // keys needed to make the relation, we may also need to update it.
    const possibleUpdateType = decideType(
      node,
      UpsertNodeType.Patch,
      OptionType.Update,
      UpsertNodeType.Update
    );

    const updateType = decideType(node, possibleUpdateType, OptionType.NoUpdate);

    if (relateType === UpsertNodeType.None) {
      return {
        types: [UpsertNodeType.None]
      };
    } else if (updateType === UpsertNodeType.None) {
      return {
        types: [relateType]
      };
    } else if (
      relateType === UpsertNodeType.Relate &&
      hasRelationsInUpsertModel(node.upsertModel)
    ) {
      return {
        types: [
          decideType(node, UpsertNodeType.Relate, OptionType.NoRelate),
          decideType(node, UpsertNodeType.UpsertRecursively, OptionType.NoRelate)
        ]
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
      types: [decideType(node, UpsertNodeType.Relate, OptionType.NoRelate)]
    };
  }
}

function isInsert(node) {
  // Database doesn't have the model, but the upsert graph does.
  return node.upsertModel !== null && node.currentModel === null;
}

function getTypesInsert(node) {
  return {
    types: [decideType(node, UpsertNodeType.Insert, OptionType.NoInsert)]
  };
}

function isDeleteOrUnrelate(node) {
  // Database has the model, but the upsert graph doesn't.
  return node.upsertModel === null && node.currentModel !== null;
}

function getTypesDeleteUnrelate(node) {
  const ciblingNodes = node.parentNode.relations[node.relation.name];
  const type = hasOption(node, OptionType.Unrelate)
    ? decideType(node, UpsertNodeType.Unrelate, OptionType.NoUnrelate)
    : decideType(node, UpsertNodeType.Delete, OptionType.NoDelete);

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
      OptionType.Update,
      UpsertNodeType.Update
    );

    const updateType = decideType(node, possibleUpdateType, OptionType.NoUpdate);

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
    if (node.relExpr.$relation) {
      path.unshift(node.relExpr.$relation);
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

    // Use non-strict inequality here on purpose. See issue #732.
    if (currentModel[key] === undefined || currentModel[key] != upsertModel[key]) {
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

function hasRelationsInUpsertModel(upsertModel) {
  const relationArray = upsertModel.constructor.getRelationArray();

  for (let i = 0, l = relationArray.length; i < l; ++i) {
    const relation = relationArray[i];
    const upsertRelated = upsertModel[relation.name];

    if (upsertRelated) {
      return true;
    }
  }

  return false;
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
