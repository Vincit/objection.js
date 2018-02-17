const normalizeIds = require('../../../utils/normalizeIds');
const RelateOperation = require('../../../queryBuilder/operations/RelateOperation');

class ManyToManyRelateOperation extends RelateOperation {
  onAdd(builder, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedProp);
    return true;
  }

  queryExecutor(builder) {
    const ownerId = this.relation.ownerProp.getProps(this.owner);
    const joinModels = this.relation.createJoinModels(ownerId, this.ids);
    const joinModelClass = this.relation.getJoinModelClass(builder.knex());

    for (let i = 0, l = joinModels.length; i < l; ++i) {
      joinModels[i] = joinModelClass.fromJson(joinModels[i]);
    }

    return joinModelClass
      .query()
      .childQueryOf(builder)
      .runBefore((result, builder) =>
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

module.exports = ManyToManyRelateOperation;
