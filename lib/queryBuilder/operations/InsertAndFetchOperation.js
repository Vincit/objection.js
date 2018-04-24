const InsertOperation = require('./InsertOperation');
const DelegateOperation = require('./DelegateOperation');

const { keyByProps } = require('../../model/modelUtils');
const { asArray } = require('../../utils/objectUtils');
const { after } = require('../../utils/promiseUtils');

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
          const modelsById = keyByProps(fetchedModels, idProps);

          // Instead of returning the freshly fetched models, update the input
          // models with the fresh values.
          insertedModelArray.forEach(insertedModel => {
            insertedModel.$set(modelsById.get(insertedModel.$propKey(idProps)));
          });

          return insertedModels;
        });
    });
  }
}

module.exports = InsertAndFetchOperation;
