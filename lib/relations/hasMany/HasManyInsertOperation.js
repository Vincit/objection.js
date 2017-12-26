const RelationInsertOperation = require('../RelationInsertOperation');
const { after } = require('../../utils/promiseUtils');

class HasManyInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;

    for (let i = 0, lm = this.models.length; i < lm; ++i) {
      const model = this.models[i];

      for (let j = 0, lp = relatedProp.size; j < lp; ++j) {
        relatedProp.setProp(model, j, ownerProp.getProp(this.owner, j));
      }
    }

    return retVal;
  }

  onAfter1(builder, ret) {
    const maybePromise = super.onAfter1(builder, ret);

    if (!this.assignResultToOwner) {
      return maybePromise;
    }

    return after(maybePromise, inserted => {
      this.owner.$appendRelated(this.relation, inserted);
      return inserted;
    });
  }
}

module.exports = HasManyInsertOperation;
