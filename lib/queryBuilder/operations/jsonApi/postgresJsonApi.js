'use strict';

const parser = require('../../../utils/parseFieldExpression');
const { asArray, isObject, isString } = require('../../../utils/objectUtils');
const { isKnexRaw, isKnexQueryBuilder, isPostgres } = require('../../../utils/knexUtils');
const { warnOnce } = require('../../../utils/warnings');

/**
 * @typedef {String} FieldExpression
 *
 * Field expressions allow one to refer to separate JSONB fields inside columns.
 *
 * Syntax: <column reference>[:<json field reference>]
 *
 * e.g. `Person.jsonColumnName:details.names[1]` would refer to value `'Second'`
 * in column `Person.jsonColumnName` which has
 * `{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.
 *
 * First part `<column reference>` is compatible with column references used in
 * knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.
 *
 * Second part describes a path to an attribute inside the referred column.
 * It is optional and it always starts with colon which follows directly with
 * first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or
 * `Table.jsonArrayColumn:[321]`.
 *
 * Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference
 * to json keys / array indexes:
 *
 * e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly
 * both of the following objects `[null, [null,null,null, "I was accessed"]]` and
 * `{ "1": { "3" : "I was accessed" } }`
 *
 * Caveats when using special characters in keys:
 *
 * 1. `objectColumn.key` This is the most common syntax, good if you are
 *    not using dots or square brackets `[]` in your json object key name.
 * 2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
 * 3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
 * 4. Keys containing square brackets and quotes
 *    `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]`
 *    Column `{ "Double.\"Quote\".[]" : "I was referred",  "Single.'Quote'.[]" : "Mee too!" }`
 * 5. Empty keys `objectColumn:[""]` or `objectColumn:['']` Column `{ "" : "I was referred" }`
 * 99. Keys containing dots, square brackets, single quotes and double quotes in one json key is
 *     not currently supported
 */

// JSON field expressions and the `whereJson*()` methods generate Postgres-only
// SQL (ditojs#113). As some of it happens to run on other databases, only warn.
// TODO: Consider throwing an error instead in objection 4.0.
function warnIfNotPostgres(knex) {
  if (!isPostgres(knex)) {
    warnOnce(
      'JSON field expressions and the whereJson*() methods of objection are only supported ' +
        'on PostgreSQL. Use the JSON methods of knex like whereJsonPath() or jsonExtract() ' +
        'with other databases.',
    );
  }
}

// Returns the SQL and bindings of a field expression. The column is passed as an
// identifier binding (`??`), so that knex's `wrapIdentifier` (e.g. used by
// `knexSnakeCaseMappers()`) is applied to it.
function parseFieldExpression(expression, extractAsText) {
  let parsed = parser.parseFieldExpression(expression);
  let bindings = [parsed.columnName];
  // Reference the bare column when there is no json path, so that Postgres can
  // use indexes on it. `#>> '{}'` is still needed to extract the value as text.
  if (parsed.access.length === 0 && !extractAsText) {
    return ['??', bindings];
  }
  let extractor = extractAsText ? '#>>' : '#>';
  return [`??${extractor}${parser.toPostgresJsonPathLiteral(parsed.access)}`, bindings];
}

function whereJsonbRefOnLeftJsonbValOrRefOnRight(
  builder,
  fieldExpression,
  operator,
  jsonObjectOrFieldExpression,
  queryPrefix,
) {
  let queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
    fieldExpression,
    operator,
    jsonObjectOrFieldExpression,
    queryPrefix,
  );
  return builder.whereRaw.apply(builder, queryParams);
}

function whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
  fieldExpression,
  operator,
  jsonObjectOrFieldExpression,
  queryPrefix,
) {
  let [fieldReference, bindings] = parseFieldExpression(fieldExpression);
  let [rightHandSql, rightHandBindings] = rightHandExpression(jsonObjectOrFieldExpression);
  let query = ['(', fieldReference, ')::jsonb', operator, rightHandSql];

  if (queryPrefix) {
    query.unshift(queryPrefix);
  }

  return [query.join(' '), [...bindings, ...rightHandBindings]];
}

function rightHandExpression(jsonObjectOrFieldExpression) {
  if (isString(jsonObjectOrFieldExpression)) {
    let [rightHandReference, bindings] = parseFieldExpression(jsonObjectOrFieldExpression);
    return [`( ${rightHandReference} )::jsonb`, bindings];
  } else if (
    isKnexRaw(jsonObjectOrFieldExpression) ||
    isKnexQueryBuilder(jsonObjectOrFieldExpression)
  ) {
    // ref(), val(), raw() and subqueries, already converted to knex by the operation.
    return ['( ? )::jsonb', [jsonObjectOrFieldExpression]];
  } else if (isObject(jsonObjectOrFieldExpression)) {
    return ['?::jsonb', [JSON.stringify(jsonObjectOrFieldExpression)]];
  }

  throw new Error('Invalid right hand expression.');
}

function whereJsonFieldRightStringArrayOnLeftQuery(knex, fieldExpression, operator, keys) {
  let [fieldReference, bindings] = parseFieldExpression(fieldExpression);
  keys = asArray(keys);

  let questionMarksArray = keys.map((key) => {
    if (!isString(key)) {
      throw new Error('All keys to find must be strings.');
    }
    return '?';
  });

  return [
    `${fieldReference} ${operator.replace('?', '\\?')} array[${questionMarksArray.join(',')}]`,
    [...bindings, ...keys],
  ];
}

function whereJsonFieldQuery(knex, fieldExpression, operator, value) {
  let [fieldReference, bindings] = parseFieldExpression(fieldExpression, true);
  let normalizedOperator = normalizeOperator(knex, operator);

  // json type comparison takes json type in string format
  let cast;
  let valuePlaceholder = '?';
  let type = typeof value;

  if (type === 'number') {
    cast = '::NUMERIC';
  } else if (type === 'boolean') {
    cast = '::BOOLEAN';
  } else if (type === 'string') {
    cast = '::TEXT';
  } else if (value === null) {
    cast = '::TEXT';
    valuePlaceholder = 'NULL';
  } else {
    throw new Error('Value must be string, number, boolean or null.');
  }

  // Bind the value so that `?` in it isn't read as a binding placeholder.
  return [
    `(${fieldReference})${cast} ${normalizedOperator} ${valuePlaceholder}`,
    value === null ? bindings : [...bindings, value],
  ];
}

function normalizeOperator(knex, operator) {
  let trimmedLowerCase = operator.trim().toLowerCase();

  switch (trimmedLowerCase) {
    case 'is':
    case 'is not':
      return trimmedLowerCase;
    default:
      return knex.client.formatter().operator(operator);
  }
}

module.exports = {
  warnIfNotPostgres,
  parseFieldExpression: parseFieldExpression,
  whereJsonbRefOnLeftJsonbValOrRefOnRight: whereJsonbRefOnLeftJsonbValOrRefOnRight,
  whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams:
    whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams,
  whereJsonFieldRightStringArrayOnLeftQuery: whereJsonFieldRightStringArrayOnLeftQuery,
  whereJsonFieldQuery: whereJsonFieldQuery,
};
