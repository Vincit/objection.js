'use strict';

const { defineNonEnumerableProperty } = require('./modelUtils');
const { isPromise } = require('../utils/promiseUtils');

const TABLE_METADATA = '$$tableMetadata';

function fetchTableMetadata(
  modelClass,
  { parentBuilder = null, knex = null, force = false, table = null } = {},
) {
  // The table isn't necessarily same as `modelClass.getTableName()` for example if
  // a view is queried instead.
  if (!table) {
    if (parentBuilder) {
      table = parentBuilder.tableNameFor(modelClass);
    } else {
      table = modelClass.getTableName();
    }
  }

  // Call tableMetadata first instead of accessing the cache directly beause
  // tableMetadata may have been overriden.
  let metadata = modelClass.tableMetadata({ table });

  if (!force && metadata) {
    return Promise.resolve(metadata);
  }

  // Memoize metadata but only for modelClass. The hasOwnProperty check
  // will fail for subclasses and the value gets recreated.
  if (!modelClass.hasOwnProperty(TABLE_METADATA)) {
    defineNonEnumerableProperty(modelClass, TABLE_METADATA, new Map());
  }

  // The cache needs to be checked in addition to calling tableMetadata
  // because the cache may contain a temporary promise in which case
  // tableMetadata returns null.
  metadata = modelClass[TABLE_METADATA].get(table);

  if (!force && metadata) {
    return Promise.resolve(metadata);
  } else {
    const promise = modelClass
      .query(knex)
      .childQueryOf(parentBuilder)
      .columnInfo({ table })
      .then((columnInfo) => {
        const metadata = {
          columns: Object.keys(columnInfo),
        };

        modelClass[TABLE_METADATA].set(table, metadata);
        return metadata;
      })
      .catch((err) => {
        modelClass[TABLE_METADATA].delete(table);
        throw err;
      });

    modelClass[TABLE_METADATA].set(table, promise);
    return promise;
  }
}

function tableMetadata(modelClass, { table } = {}) {
  if (modelClass.hasOwnProperty(TABLE_METADATA)) {
    const metadata = modelClass[TABLE_METADATA].get(table || modelClass.getTableName());

    if (isPromise(metadata)) {
      return null;
    } else {
      return metadata;
    }
  } else {
    return null;
  }
}

module.exports = {
  fetchTableMetadata,
  tableMetadata,
};
