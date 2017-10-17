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

    if (
      this.upsertModel !== null &&
      this.currentModel === null &&
      this.upsertModel.$hasId() &&
      this.type === UpsertNodeType.None
    ) {
      throw new Error(
        [
          `model (id=${this.upsertModel.$id()}) is not a child of model (id=${this.parentNode.upsertModel.$id()}).`,
          `If you want to relate it, use the relate: true option.`,
          `If you want to insert it with an id, use the insertMissing: true option`
        ].join(' ')
      );
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

  if (
    node.upsertModel !== null &&
    node.currentModel === null &&
    node.upsertModel.$hasId()
  ) {
    if (hasOption(node, 'relate') && isInRelation) {
      return UpsertNodeType.Relate;
    } else if (hasOption(node, 'insertMissing')) {
      return UpsertNodeType.Insert;
    } else {
      return UpsertNodeType.None;
    }
  } else if (node.upsertModel !== null && node.currentModel === null) {
    return UpsertNodeType.Insert;
  } else if (node.upsertModel === null && node.currentModel !== null) {
    if (hasOption(node, 'unrelate')) {
      return UpsertNodeType.Unrelate;
    } else {
      return UpsertNodeType.Delete;
    }
  } else if (
    !hasChanges(node.currentModel, node.upsertModel, node.queryProps)
  ) {
    return UpsertNodeType.None;
  } else {
    return UpsertNodeType.Update;
  }
}

function hasOption(node, optName) {
  if (Array.isArray(node.opt[optName])) {
    return node.opt[optName].indexOf(node.relPathFromRoot) !== -1;
  } else {
    return !!node.opt[optName];
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
  // the value. We need to return true just in case.
  if (upsertQueryProps && Object.keys(upsertQueryProps).length > 0) {
    return true;
  }

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (!relations[key] && currentModel[key] !== upsertModel[key]) {
      return true;
    } else if (relations[key] instanceof BelongsToOneRelation) {
      // If the the property is a `BelongsToOneRelation` me may need to update
      // this model if the related model changes causing this model's relation
      // property to need updating.
      const relatedProp = relations[key].relatedProp;
      const currentRelated = currentModel[key];
      const upsertRelated = upsertModel[key];

      for (let i = 0, l = relatedProp.size; i < l; ++i) {
        const currentProp =
          currentRelated && relatedProp.getProp(currentRelated, i);
        const upsertProp =
          upsertRelated && relatedProp.getProp(upsertRelated, i);

        if (currentProp !== upsertProp) {
          return true;
        }
      }
    }
  }

  return false;
}

module.exports = UpsertNode;
