'use strict';

const isTempColumn = require('../../utils/tmpColumnUtils').isTempColumn;

const UpsertNodeType = {
  Update: 'Update',
  Insert: 'Insert',
  Relate: 'Relate',
  Delete: 'Delete'
};

class UpsertNode {

  constructor(parentNode, relExpr, upsertModel, currentModel) {
    this.parentNode = parentNode || null;
    this.relExpr = relExpr;
    this.upsertModel = upsertModel || null;
    this.currentModel = currentModel || null;
    this.relations = Object.create(null);

    if (upsertModel && currentModel) {
      const props = Object.keys(currentModel);

      for (let i = 0, l = props.length; i < l; ++i) {
        const prop = props[i];

        if (!isTempColumn(prop) && upsertModel[prop] === undefined) {
          upsertModel[prop] = currentModel[prop];
        }
      }
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

module.exports = UpsertNode;