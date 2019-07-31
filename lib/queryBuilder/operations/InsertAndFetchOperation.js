'use strict';

const { InsertOperation } = require('./InsertOperation');
const { DelegateOperation } = require('./DelegateOperation');
const { keyByProps } = require('../../model/modelUtils');
const { asArray } = require('../../utils/objectUtils');

class InsertAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }
  }

  async onAfter2(builder, inserted) {
    const modelClass = builder.modelClass();
    const insertedModels = await super.onAfter2(builder, inserted);

    const insertedModelArray = asArray(insertedModels);
    const idProps = modelClass.getIdPropertyArray();
    const ids = insertedModelArray.map(model => model.$id());

    const fetchedModels = await modelClass
      .query()
      .childQueryOf(builder)
      .findByIds(ids)
      .castTo(builder.resultModelClass());

    const modelsById = keyByProps(fetchedModels, idProps);

    // Instead of returning the freshly fetched models, update the input
    // models with the fresh values.
    insertedModelArray.forEach(insertedModel => {
      insertedModel.$set(modelsById.get(insertedModel.$propKey(idProps)));
    });

    return insertedModels;
  }
}

module.exports = {
  InsertAndFetchOperation
};
