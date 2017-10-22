'use strict';

const isTempColumn = require('../../utils/tmpColumnUtils').isTempColumn;
const BelongsToOneRelation = require('../../relations/belongsToOne/BelongsToOneRelation');

const UpsertNodeType = {
  Update: 'Update',
  Insert: 'Insert',
  Relate: 'Relate',
  Delete: 'Delete',
  Unrelate: 'Unrelate',
  None: 'None'
};

const ChangeType = {
  HasOwnChanges: 'HasOwnChanges',
  HasRelationalChanges: 'HasRelationalChanges',
  NoChanges: 'NoChanges'
};

class UpsertNode {

  constructor(parentNode, relExpr, upsertModel, currentModel, queryProps, opt) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.relPathFromRoot = getRelationPathFromRoot(this);
    this.upsertModel = upsertModel || null;
    this.queryProps = queryProps || new Map();
    this.currentModel = currentModel || null;
    this.relations = Object.create(null);
    this.opt = opt || {};
    this.type = getType(this);

    if (upsertModel && currentModel) {
      copyCurrentToUpsert(currentModel, upsertModel);
    }

    if (this.type === UpsertNodeType.Relate) {
      this.upsertModel[this.modelClass.dbRefProp] = this.upsertModel.$id();
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

function getType(node) {
  const isInRelation = !!node.relExpr.name;

  if (node.upsertModel !== null && node.currentModel === null && node.upsertModel.$hasId()) {
    if (hasOption(node, 'relate') && isInRelation) {
      if (hasOption(node, 'noRelate')) {
        return UpsertNodeType.None;
      } else {
        return UpsertNodeType.Relate;
      }
    } else if (hasOption(node, 'insertMissing')) {
      if (hasOption(node, 'noInsert')) {
        return UpsertNodeType.None;
      } else {
        return UpsertNodeType.Insert;
      }
    } else {
      throw new Error([
        `model (id=${node.upsertModel.$id()}) is not a child of model (id=${node.parentNode.upsertModel.$id()}).`,
        `If you want to relate it, use the relate: true option.`,
        `If you want to insert it with an id, use the insertMissing: true option`
      ].join(' '));
    }
  } else if (node.upsertModel !== null && node.currentModel === null) {
    if (hasOption(node, 'noInsert')) {
      return UpsertNodeType.None;
    } else {
      return UpsertNodeType.Insert;
    }
  } else if (node.upsertModel === null && node.currentModel !== null) {
    if (hasOption(node, 'unrelate')) {
      if (hasOption(node, 'noUnrelate')) {
        return UpsertNodeType.None;
      } else {
        return UpsertNodeType.Unrelate;
      }
    } else {
      if (hasOption(node, 'noDelete')) {
        return UpsertNodeType.None;
      } else {
        return UpsertNodeType.Delete;
      }
    }
  } else {
    const changeType = hasChanges(
      node.currentModel,
      node.upsertModel,
      node.queryProps
    );

    if (changeType == ChangeType.NoChanges) {
      return UpsertNodeType.None;
    } else if (changeType == ChangeType.HasOwnChanges) {
      if (hasOption(node, 'noUpdate')) {
        return UpsertNodeType.None;
      } else {
        return UpsertNodeType.Update;
      }
    } else if (changeType == ChangeType.HasRelationalChanges) {
      // Always create an update node for relational changes even if
      // `noUpdate` option is true.
      return UpsertNodeType.Update;
    }
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

function hasChanges(currentModel, upsertModel, queryProps) {
  const keys = Object.keys(upsertModel);
  const relations = upsertModel.constructor.getRelations();
  const upsertQueryProps = queryProps.get(upsertModel);

  // If the upsert model has query properties, we cannot know if they will change
  // the value. We need to return HasOwnChanges just in case.
  if (upsertQueryProps && Object.keys(upsertQueryProps).length > 0) {
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