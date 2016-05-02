import _ from 'lodash';
import DelegateOperation from './DelegateOperation';
import InsertWithRelated from '../InsertWithRelated';
import {isPostgres} from '../../utils/dbUtils';

export default class InsertWithRelatedOperation extends DelegateOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    // Our delegate method inherits from `InsertRelation`. Disable the call-time
    // validation. We do the validation in onAfterQuery instead.
    this.delegate.modelOptions.skipValidation = true;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    builder.resolve([]);

    return retVal;
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onBefore() {
    // Do nothing.
  }

  onBeforeInternal() {
    // Do nothing. We override this with empty implementation so that
    // the $beforeInsert() hooks are not called twice for the root models.
  }

  onBeforeBuild() {
    // Do nothing.
  }

  onBuild() {
    // Do nothing.
  }

  // We overrode all other hooks but this one and do all the work in here.
  // This is a bit hacky.
  onAfterQuery(builder) {
    const ModelClass = builder.modelClass();
    const batchSize = isPostgres(ModelClass.knex()) ? 100 : 1;

    let inserter = new InsertWithRelated({
      modelClass: ModelClass,
      models: this.models,
      allowedRelations: builder._allowedInsertExpression || null
    });

    return inserter.execute(tableInsertion => {
      let insertQuery = tableInsertion.modelClass
        .query()
        .childQueryOf(builder);

      // We skipped the validation above. We need to validate here since at this point
      // the models should no longer contain any special properties.
      _.each(tableInsertion.models, model => {
        model.$validate();
      });

      let inputs = _.filter(tableInsertion.models, (model, idx) => {
        return tableInsertion.isInputModel[idx];
      });

      let others = _.filter(tableInsertion.models, (model, idx) => {
        return !tableInsertion.isInputModel[idx];
      });

      return Promise.all(_.flatten([
        batchInsert(inputs, insertQuery.clone().copyFrom(builder, /returning/), batchSize),
        batchInsert(others, insertQuery.clone(), batchSize)
      ]));
    }).then(() => {
      return super.onAfterQuery(builder, this.models)
    });
  }

  onAfterInternal() {
    // We override this with empty implementation so that the $afterInsert() hooks
    // are not called twice for the root models.
    return this.isArray ? this.models : (this.models[0] || null);
  }
}

function batchInsert(models, queryBuilder, batchSize) {
  let batches = _.chunk(models, batchSize);
  return _.map(batches, batch => {
    return queryBuilder.clone().insert(batch)
  });
}

