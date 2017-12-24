'use strict';

const keyBy = require('lodash/keyBy');
const InsertOperation = require('./InsertOperation');
const DelegateOperation = require('./DelegateOperation');
const asArray = require('../../utils/objectUtils').asArray;
const after = require('../../utils/promiseUtils').after;

class InsertAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }
  }

  onAfter2(builder, inserted) {
    const modelClass = builder.modelClass();
    const maybePromise = super.onAfter2(builder, inserted);

    return after(maybePromise, insertedModels => {
      const insertedModelArray = asArray(insertedModels);
      const idProps = modelClass.getIdPropertyArray();
      const idCols = builder.fullIdColumnFor(modelClass);
      const ids = insertedModelArray.map(model => model.$id());

      return modelClass
        .query()
        .childQueryOf(builder)
        .whereInComposite(idCols, ids)
        .castTo(builder.resultModelClass())
        .then(fetchedModels => {
          fetchedModels = keyBy(fetchedModels, model => model.$propKey(idProps));

          // Instead of returning the freshly fetched models, update the input
          // models with the fresh values.
          insertedModelArray.forEach(insertedModel => {
            insertedModel.$set(fetchedModels[insertedModel.$propKey(idProps)]);
          });

          return insertedModels;
        });
    });
  }
}

module.exports = InsertAndFetchOperation;
