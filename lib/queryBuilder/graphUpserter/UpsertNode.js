'use strict';

const isTempColumn = require('../../utils/tmpColumnUtils').isTempColumn;
const BelongsToOneRelation = require('../../relations/belongsToOne/BelongsToOneRelation');

const UpsertNodeType = {
  Update: 'Update',
  Insert: 'Insert',
  Relate: 'Relate',
  Delete: 'Delete',
  None: 'None'
};

class UpsertNode {

  constructor(parentNode, relExpr, upsertModel, currentModel, queryProps, opt) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.upsertModel = upsertModel || null;
    this.queryProps = queryProps || new Map();
    this.currentModel = currentModel || null;
    this.hasChanges = true;
    this.relations = Object.create(null);
    this.opt = opt || {};
    this.type = null;

    if (upsertModel && currentModel) {
      copyCurrentToUpsert(currentModel, upsertModel);
    }

    if (getType(this) === UpsertNodeType.Relate) {
      this.upsertModel[this.modelClass.dbRefProp] = this.upsertModel.$id();
    }

    if (getType(this) === UpsertNodeType.Update) {
      this.hasChanges = hasChanges(currentModel, upsertModel, this.queryProps);
    }

    if (this.upsertModel !== null && this.currentModel === null && this.upsertModel.$hasId() && getType(this) === UpsertNodeType.None) {
      throw new Error([
        `model (id=${this.upsertModel.$id()}) is not a child of model (id=${this.parentNode.upsertModel.$id()}).`,
        `If you want to relate it, use the relate: true option.`,
        `If you want to insert it with an id, use the insertMissing: true option`
      ].join(' '));
    }

    // Do not turn this into a getter. We don't want the type to change, ever.
    this.type = getType(this);
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

    if (!isTempColumn(prop) && upsertModel[prop] === undefined) {
      upsertModel[prop] = currentModel[prop];
    }
  }
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
      const relatedProp = relations[key].relatedProp;
      const hasChanges = [];

      for (let i = 0, l = relatedProp.size; i < l; ++i) {
        const currentProp = currentModel[key] && relatedProp.getProp(currentModel[key], i);
        const upsertProp = upsertModel[key] && relatedProp.getProp(upsertModel[key], i);
        hasChanges.push(currentProp !== upsertProp);
      }

      if (hasChanges.indexOf(true) !== -1) {
        return true;
      }
    }
  }

  return false;
}

function getType(node) {
  const isInRelation = !!node.relExpr.name;

  if (node.upsertModel !== null && node.currentModel === null && node.upsertModel.$hasId()) {
    if (node.opt.relate && isInRelation) {
      return UpsertNodeType.Relate;
    } else if (node.opt.insertMissing) {
      return UpsertNodeType.Insert;
    } else {
      return UpsertNodeType.None;
    }
  } else if (node.upsertModel !== null && node.currentModel === null) {
    return UpsertNodeType.Insert;
  } else if (node.upsertModel === null && node.currentModel !== null) {
    return UpsertNodeType.Delete;
  } else if (!node.hasChanges) {
    return UpsertNodeType.None;
  } else {
    return UpsertNodeType.Update;
  }
}

module.exports = UpsertNode;