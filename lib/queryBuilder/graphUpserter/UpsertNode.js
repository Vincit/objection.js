'use strict';

const difference = require('lodash/difference');
const isTempColumn = require('../../utils/tmpColumnUtils').isTempColumn;
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
  constructor(parentNode, relExpr, upsertModel, currentModel, opt) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.relPathFromRoot = getRelationPathFromRoot(this);
    this.upsertModel = upsertModel || null;
    this.currentModel = currentModel || null;
    this.relations = Object.create(null);
    this.opt = opt || {};
    this.types = getTypes(this);

    if (upsertModel && currentModel) {
      copyCurrentToUpsert(currentModel, upsertModel);
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
  const isInRelation = !!node.relExpr.name;

  if (hasOption(node, 'relate') && isInRelation) {
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
    const updateType = decideType(node, UpsertNodeType.Patch, 'update', UpsertNodeType.Update);
    const nodeType = decideType(node, updateType, 'noUpdate');

    // If the relate model contains any other properties besides the foreign
    // keys needed to make the relation, we need to also update it.
    if (relateType === UpsertNodeType.None) {
      return [UpsertNodeType.None];
    } else if (nodeType === UpsertNodeType.None) {
      return [relateType];
    } else {
      return [relateType, nodeType];
    }
  } else {
    return [decideType(node, UpsertNodeType.Relate, 'noRelate')];
  }
}

function getTypesInsert(node) {
  return [decideType(node, UpsertNodeType.Insert, 'noInsert')];
}

function getTypesDeleteUnrelate(node) {
  return [
    hasOption(node, 'unrelate')
      ? decideType(node, UpsertNodeType.Unrelate, 'noUnrelate')
      : decideType(node, UpsertNodeType.Delete, 'noDelete')
  ];
}

function getTypesUpdate(node) {
  const changeType = hasChanges(node.currentModel, node.upsertModel);

  if (changeType == ChangeType.NoChanges) {
    return [UpsertNodeType.None];
  } else if (changeType == ChangeType.HasOwnChanges) {
    const updateType = decideType(node, UpsertNodeType.Patch, 'update', UpsertNodeType.Update);
    return [decideType(node, updateType, 'noUpdate')];
  } else if (changeType == ChangeType.HasRelationalChanges) {
    // Always create a patch node for relational changes even if `noUpdate`
    // option is true.
    return [UpsertNodeType.Patch];
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

function decideType(node, defaultType, option, optionType) {
  return hasOption(node, option) ? optionType || UpsertNodeType.None : defaultType;
}

function getRelationPathFromRoot(node) {
  let path = '';

  while (node) {
    if (node.relExpr.name) {
      path = node.relExpr.name + (path ? '.' : '') + path;
    }

    node = node.parentNode;
  }

  return path;
}

function hasChanges(currentModel, upsertModel) {
  const keys = Object.keys(upsertModel);
  const relations = upsertModel.constructor.getRelations();

  // If the upsert model has query properties, we cannot know if they will change
  // the value. We need to return HasOwnChanges just in case.
  if (upsertModel.$$queryProps && Object.keys(upsertModel.$$queryProps).length > 0) {
    return ChangeType.HasOwnChanges;
  }

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (!relations[key] && currentModel[key] !== upsertModel[key]) {
      return ChangeType.HasOwnChanges;
    } else if (relations[key] instanceof BelongsToOneRelation) {
      // If the the property is a `BelongsToOneRelation` me may need to update
      // this model if the related model changes causing this model's relation
      // property to need updating.
      const relatedProp = relations[key].relatedProp;
      const currentRelated = currentModel[key];
      const upsertRelated = upsertModel[key];

      for (let i = 0, l = relatedProp.size; i < l; ++i) {
        const currentProp = currentRelated && relatedProp.getProp(currentRelated, i);
        const upsertProp = upsertRelated && relatedProp.getProp(upsertRelated, i);

        if (currentProp !== upsertProp) {
          return ChangeType.HasRelationalChanges;
        }
      }
    }
  }

  return ChangeType.NoChanges;
}

module.exports = UpsertNode;
