'use strict';

const { QueryTransformation } = require('./QueryTransformation');
const { isMySql } = require('../../utils/knexUtils');

/**
 * Mysql doesn't allow queries like this:
 *
 *   update foo set bar = 1 where id in (select id from foo)
 *
 * because the subquery is for the same table `foo` as the parent update query.
 * The same goes for delete queries too.
 *
 * This transformation wraps those subqueries like this:
 *
 *   update foo set bar = 1 where id in (select * from (select id from foo))
 */
class WrapMysqlModifySubqueryTransformation extends QueryTransformation {
  onConvertQueryBuilderBase(query, parentQuery) {
    const knex = parentQuery.unsafeKnex();

    // Cannot detect anything if, for whatever reason, a knex instance
    // or a transaction is not registered at this point.
    if (!knex) {
      return query;
    }

    // This transformation only applies to MySQL.
    if (!isMySql(knex)) {
      return query;
    }

    // This transformation only applies to update and delete queries.
    if (!parentQuery.isUpdate() && !parentQuery.isDelete()) {
      return query;
    }

    // If the subquery is for another table and the query doesn't join the
    // parent query's table, we're good to go.
    if (
      parentQuery.tableName() !== query.tableName() &&
      !hasJoinsToTable(query, parentQuery.tableName())
    ) {
      return query;
    }

    return query
      .modelClass()
      .query()
      .from(query.as('mysql_subquery_fix'));
  }
}

function hasJoinsToTable(query, tableName) {
  let found = false;

  query.forEachOperation(query.constructor.JoinSelector, op => {
    if (op.args[0] === tableName) {
      found = true;
      return false;
    }
  });

  return found;
}

module.exports = {
  WrapMysqlModifySubqueryTransformation
};
