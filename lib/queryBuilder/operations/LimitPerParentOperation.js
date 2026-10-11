'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { RangeOperation } = require('./RangeOperation');
const { FirstOperation } = require('./FirstOperation');
const { isString, isNumber } = require('../../utils/objectUtils');
const { hasWindowFunctions, isKnexRaw } = require('../../utils/knexUtils');

// Without underscores, so that column name mappers don't change it.
const rowNumberColumn = 'objectiontmprownum';

// Applies the `limit()`, `offset()` and `first()` of a relation query that
// fetches the related models of many parents to each parent separately.
class LimitPerParentOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.findOperation = opt.findOperation;
  }

  onBuild(builder) {
    builder.addInternalSelection(rowNumberColumn);
  }

  // Return the limit and offset of the query, built into `knexBuilder` by any
  // of its operations, or `null` if it has none:
  getRange(knexBuilder, builder) {
    // `page()` and `range()` keep limiting all parents, as their total does.
    if (!builder.has(RangeOperation)) {
      const { limit = null, offset = null } = knexBuilder._single;
      // `first()` only limits the query with `useLimitInFirst`:
      const isFirst = builder.has(FirstOperation);

      if (limit !== null || offset !== null || isFirst) {
        return { limit: isFirst ? 1 : limit, offset: offset ?? 0 };
      }
    }

    return null;
  }

  // Called by `buildKnexQuery()` after the default table and select are set.
  onAfterBuildKnex(knexBuilder, builder) {
    const knex = builder.knex();
    const range = this.getRange(knexBuilder, builder);

    if (!range) {
      return knexBuilder;
    } else if (!hasWindowFunctions(knex)) {
      // `WhereInEagerOperation` fetches the related models of each parent with
      // a separate query then, so only `first()` still needs to be applied:
      return range.limit === null ? knexBuilder : knexBuilder.limit(range.limit);
    } else {
      const { limit, offset } = range;
      // Number the rows of each parent one level up, aliased as the related
      // table, so that the order can refer to the selected columns and their
      // aliases as in the query itself, e.g. to `id` when a joined table has
      // an `id` too. The order moves into the window function, as SQL Server
      // doesn't allow it in subqueries.
      const numberedQuery = knex
        .queryBuilder()
        .select('*')
        .rowNumber(rowNumberColumn, (window) =>
          window
            .orderBy(getWindowOrder(builder, knex))
            .partitionBy(this.findOperation.ownerKeyColumns()),
        )
        .from(
          knexBuilder
            .clone()
            .clear('with')
            .clear('limit')
            .clear('offset')
            .clear('order')
            .as(builder.tableRef()),
        );

      // Select the rows in range with the query itself, to keep its settings
      // like `timeout()`, and its common table expressions.
      knexBuilder
        .clear('select')
        .clear('where')
        .clear('join')
        .clear('union')
        .clear('group')
        .clear('having')
        .clear('order')
        .clear('limit')
        .clear('offset')
        .select('*')
        .from(numberedQuery.as(rowNumberColumn))
        .where(rowNumberColumn, '>', offset)
        .orderBy(rowNumberColumn);

      if (limit !== null) {
        // knex also accepts raw offsets:
        const end = isNumber(offset) ? offset + limit : knex.raw('? + ?', [offset, limit]);
        knexBuilder.where(rowNumberColumn, '<=', end);
      }

      return knexBuilder;
    }
  }
}

// Convert the `orderBy()` and `orderByRaw()` calls of the query to the order
// of knex's window functions.
function getWindowOrder(builder, knex) {
  const order = [];

  builder.forEachOperation(builder.constructor.OrderBySelector, (op) => {
    const args = op.getKnexArgs(builder);

    if (op.name === 'orderByRaw') {
      const [sql, bindings] = args;
      order.push({ column: isKnexRaw(sql) ? sql : knex.raw(sql, bindings) });
    } else {
      const [column, direction, nulls] = args;
      const items = Array.isArray(column)
        ? column.map((item) => (isString(item) ? { column: item } : item))
        : [{ column, order: direction, nulls }];

      for (const item of items) {
        if (item.nulls) {
          // Not all databases support `nulls first` and `nulls last`:
          order.push({
            column: knex.raw('(case when ? is null then 0 else 1 end)', [
              isString(item.column) ? knex.ref(item.column) : item.column,
            ]),
            order: item.nulls === 'first' ? 'asc' : 'desc',
          });
        }

        // Unlike in `orderBy()`, knex adds the direction to the window as it is:
        order.push({ column: item.column, order: /^desc$/i.test(item.order) ? 'desc' : 'asc' });
      }
    }
  });

  // SQL Server requires an order in the window function:
  return order.length ? order : [{ column: knex.raw('(select null)') }];
}

module.exports = {
  LimitPerParentOperation,
};
