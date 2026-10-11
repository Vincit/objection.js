'use strict';

// Removes the order of a subquery that only selects or joins rows, where an
// order doesn't matter without a limit, and SQL Server rejects it. The order can
// come from a relation's `modify` or an `onBuild` hook of the context, so it's
// removed when the subquery is built.
function withoutOrder(subquery) {
  return subquery.onBuild((builder) => {
    if (!builder.has(/limit|offset/)) {
      builder.clearOrder();
    }
  });
}

module.exports = {
  withoutOrder,
};
