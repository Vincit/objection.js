'use strict';

const chunk = require('lodash/chunk');
const Promise = require('bluebird');
const isPostgres = require('../../utils/knexUtils').isPostgres;

const POSTGRES_INSERT_BATCH_SIZE = 100;

module.exports = builder => {
  // Postgres is the only db engine that returns identifiers of all inserted rows. Therefore
  // we can insert batches only with postgres.
  const batchSize = isPostgres(builder.knex()) ? POSTGRES_INSERT_BATCH_SIZE : 1;

  return tableInsertion => {
    const inputs = [];
    const others = [];
    const queries = [];

    let insertQuery = tableInsertion.modelClass.query().childQueryOf(builder);

    for (let i = 0, l = tableInsertion.items.length; i < l; ++i) {
      const model = tableInsertion.items[i].model;
      const relation = tableInsertion.items[i].relation;

      // We need to validate here since at this point the models should no longer contain any special properties.
      const json = model.$validate();

      // Set the return value back to model in case defaults were set.
      model.$set(json);

      if (relation) {
        others.push(model);
      } else {
        inputs.push(model);
      }
    }

    batchInsert(inputs, insertQuery.clone().copyFrom(builder, /returning/), batchSize, queries);
    batchInsert(others, insertQuery.clone(), batchSize, queries);

    return Promise.map(queries, query => query, {
      concurrency: tableInsertion.modelClass.concurrency
    });
  };
};

function batchInsert(models, queryBuilder, batchSize, queries) {
  const batches = chunk(models, batchSize);

  for (let i = 0, l = batches.length; i < l; ++i) {
    queries.push(queryBuilder.clone().insert(batches[i]));
  }
}
