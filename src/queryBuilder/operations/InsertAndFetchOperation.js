import _ from 'lodash';
import DelegateOperation from './DelegateOperation';
import {after} from '../../utils/promiseUtils';

export default class InsertAndFetchOperation extends DelegateOperation {

  onAfterInternal(builder, inserted) {
    const maybePromise = super.onAfterInternal(builder, inserted);

    return after(maybePromise, insertedModels => {
      let insertedModelArray = _.isArray(insertedModels) ? insertedModels : [insertedModels];
      let idProps = builder.modelClass().getIdPropertyArray();

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
