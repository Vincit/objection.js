const promiseUtils = require('../../utils/promiseUtils');

const { chunk } = require('../../utils/objectUtils');
const { isPostgres } = require('../../utils/knexUtils');

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

    const items = tableInsertion.items;
    for (let i = 0, l = items.length; i < l; ++i) {
      const item = items[i];
      const { model, relation } = item;
      // We need to validate here since at this point the models should no longer contain any special properties.
      const json = model.$validate(model, {
        dataPath: item.node.dataPath
      });
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

    return promiseUtils.map(queries, query => query.query, {
      concurrency: tableInsertion.modelClass.getConcurrency(builder.unsafeKnex())
    });
  };
};

function batchInsert(models, queryBuilder, batchSize, queries) {
  const batches = chunk(models, batchSize);

  for (let i = 0, l = batches.length; i < l; ++i) {
    queries.push({
      query: queryBuilder.clone().insert(batches[i])
    });
  }
}
