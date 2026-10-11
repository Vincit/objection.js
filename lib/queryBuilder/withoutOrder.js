'use strict';

const { FirstOperation } = require('./operations/FirstOperation');
const { isMsSql } = require('../utils/knexUtils');

// Removes the order of a subquery that only selects or joins rows. The order
// can come from a relation's `modify` or an `onBuild` hook of the context, so
// it's removed when the subquery is built.
function withoutOrder(subquery) {
  return subquery.onBuild(clearUnsupportedOrder);
}

// Without a limit, an order doesn't matter in subqueries and updates, and SQL
// Server rejects it there. With a limit it decides the rows, so we keep it, and
// SQL Server rejects an update rather than updating arbitrary rows.
function clearUnsupportedOrder(builder) {
  if (isMsSql(builder.knex()) && !hasLimit(builder)) {
    builder.clearOrder();
  }
}

function hasLimit(builder) {
  return (
    builder.has(/limit|offset/) ||
    // `first()` only adds its limit when the knex query is built.
    builder.findOperation(FirstOperation)?.shouldLimit(builder)
  );
}

module.exports = {
  withoutOrder,
  clearUnsupportedOrder,
};
