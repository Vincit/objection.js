'use strict';

const { normalizeIds } = require('../../../utils/normalizeIds');
const { RelateOperation } = require('../../../queryBuilder/operations/RelateOperation');

class ManyToManyRelateOperation extends RelateOperation {
  onAdd(_, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedProp);
    return true;
  }

  queryExecutor(builder) {
    const ownerId = this.relation.ownerProp.getProps(this.owner);
    const joinModelClass = this.relation.getJoinModelClass(builder.knex());

    const joinModels = this.relation
      .createJoinModels(ownerId, this.ids)
      .map(it => joinModelClass.fromJson(it));

    return joinModelClass
      .query()
      .childQueryOf(builder)
      .runBefore((_, builder) =>
        this.relation.executeJoinTableBeforeInsert(joinModels, builder.context(), null)
      )
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

module.exports = {
  ManyToManyRelateOperation
};
