'use strict';

const isTempColumn = require('../../utils/tmpColumnUtils').isTempColumn;

const UpsertNodeType = {
  Update: 'Update',
  Insert: 'Insert',
  Relate: 'Relate',
  Delete: 'Delete',
  None: 'None'
};

class UpsertNode {

  constructor(parentNode, relExpr, upsertModel, currentModel, queryProps) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.upsertModel = upsertModel || null;
    this.queryProps = queryProps;
    this.currentModel = currentModel || null;
    this.hasChanges = true;
    this.relations = Object.create(null);

    if (upsertModel && currentModel) {
      copyCurrentToUpsert(currentModel, upsertModel);
    }

    if (this.type === UpsertNodeType.Relate) {
      this.upsertModel[this.modelClass.dbRefProp] = this.upsertModel.$id();
    }

    if (this.type === UpsertNodeType.Update) {
      this.hasChanges = hasChanges(currentModel, upsertModel, this.queryProps);
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

  get type() {
    const isInRelation = !!this.relExpr.name;

    if (isInRelation && this.upsertModel !== null && this.upsertModel.$hasId() && this.currentModel === null) {
      // In case this node is in a relation, the upsert model has an id and a
      // model with that id doesn't currently exist in the relation, this node
      // represents at `relate` operation.
      return UpsertNodeType.Relate;
    } else if (this.upsertModel !== null && this.currentModel === null) {
      return UpsertNodeType.Insert;
    } else if (this.upsertModel === null && this.currentModel !== null) {
      return UpsertNodeType.Delete;
    } else if (!this.hasChanges) {
      return UpsertNodeType.None;
    } else {
      return UpsertNodeType.Update;
    }
  }

  toJSON() {
    return {
      type: this.type,
      id: (this.upsertModel && this.upsertModel.$id()) || (this.currentModel && this.currentModel.$id()) || null,
      hasUpsertModel: this.upsertModel !== null,
      hasCurrentModel: this.currentModel !== null,
      relations: this.relations
    };
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
    }
  }

  return false;
}

module.exports = UpsertNode;