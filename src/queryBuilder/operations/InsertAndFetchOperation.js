import _ from 'lodash';
import InsertOperation from './InsertOperation';
import DelegateOperation from './DelegateOperation';
import {after} from '../../utils/promiseUtils';

export default class InsertAndFetchOperation extends DelegateOperation {

  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }
  }

  onAfterInternal(builder, inserted) {
    const maybePromise = super.onAfterInternal(builder, inserted);

    return after(maybePromise, insertedModels => {
      const insertedModelArray = Array.isArray(insertedModels) ? insertedModels : [insertedModels];
      const idProps = builder.modelClass().getIdPropertyArray();

      return builder.modelClass()
        .query()
        .childQueryOf(builder)
        .whereInComposite(builder.modelClass().getFullIdColumn(), insertedModelArray.map(model => model.$id()))
        .then(fetchedModels => {
          fetchedModels = _.keyBy(fetchedModels, model => model.$propKey(idProps));

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
