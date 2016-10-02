import _ from 'lodash';
import Promise from 'bluebird';
import DelegateOperation from './DelegateOperation';
import GraphInserter from '../graphInserter/GraphInserter';
import {isPostgres} from '../../utils/dbUtils';

export default class InsertGraphOperation extends DelegateOperation {

  constructor(name, opt) {
    super(name, opt);

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
    const batchSize = isPostgres(builder.knex()) ? 100 : 1;

    let inserter = new GraphInserter({
      modelClass: ModelClass,
      models: this.models,
      allowedRelations: builder._allowedInsertExpression || null,
      knex: builder.knex()
    });

    return inserter.execute(tableInsertion => {
      const inputs = [];
      const others = [];
      const queries = [];

      let insertQuery = tableInsertion.modelClass
        .query()
        .childQueryOf(builder);

      for (let i = 0, l = tableInsertion.models.length; i < l; ++i) {
        const model = tableInsertion.models[i];

        // We skipped the validation above. We need to validate here since at this point
        // the models should no longer contain any special properties.
        model.$validate();

        if (tableInsertion.isInputModel[i]) {
          inputs.push(model);
        } else {
          others.push(model);
        }
      }

      batchInsert(inputs, insertQuery.clone().copyFrom(builder, /returning/), batchSize, queries);
      batchInsert(others, insertQuery.clone(), batchSize, queries);

      return Promise.all(queries);
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

function batchInsert(models, queryBuilder, batchSize, queries) {
  const batches = _.chunk(models, batchSize);

  for (let i = 0, l = batches.length; i < l; ++i) {
    queries.push(queryBuilder.clone().insert(batches[i]));
  }
}

