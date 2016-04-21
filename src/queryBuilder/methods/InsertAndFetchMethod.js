import _ from 'lodash';
import DelegateMethod from './DelegateMethod';
import {after} from '../../utils/promiseUtils';

export default class InsertAndFetchMethod extends DelegateMethod {

  onAfterModelCreate(builder, inserted) {
    const maybePromise = super.onAfterModelCreate(builder, inserted);

    return after(maybePromise, insertedModels => {
      let insertedModelArray = _.isArray(insertedModels) ? insertedModels : [insertedModels];

      return builder.modelClass()
        .query()
        .childQueryOf(builder)
        .whereInComposite(builder.modelClass().getFullIdColumn(), _.map(insertedModelArray, model => model.$id()))
        .then(fetchedModels => {
          fetchedModels = _.keyBy(fetchedModels, model => model.$id());

          // Instead of returning the freshly fetched models, update the input
          // models with the fresh values.
          _.each(insertedModelArray, insertedModel => {
            insertedModel.$set(fetchedModels[insertedModel.$id()]);
          });

          return insertedModels;
        });
    });
  }
}
