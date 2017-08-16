'use strict';

const normalizeIds = require('../../utils/normalizeIds');
const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');

class ManyToManyRelateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.input = null;
    this.ids = null;
  }

  onAdd(builder, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedProp);
    return true;
  }

  queryExecutor(builder) {
    const joinModels = this.relation.createJoinModels(this.owner.$values(this.relation.ownerProp), this.ids);

    return this.relation
      .joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .insert(joinModels)
      .copyFrom(builder, /returning/)
      .runAfter(models => {
        if (Array.isArray(this.input)) {
          return models;
        } else {
          return models[0];
        }
      });
  }
}

module.exports = ManyToManyRelateOperation;
