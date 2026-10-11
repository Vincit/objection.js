'use strict';

const { uniqBy } = require('../../utils/objectUtils');
const { Selection } = require('../operations/select/Selection');
const { SelectOperation } = require('../operations/select/SelectOperation');
const { createModifier } = require('../../utils/createModifier');
const { map: mapPromise } = require('../../utils/promiseUtils');
const { ValidationErrorType } = require('../../model/ValidationError');

const { TableTree } = require('./TableTree');
const { JoinResultParser } = require('./JoinResultParser');
const { getIdentifierLengthLimit } = require('./utils');

/**
 * Given a relation expression, builds a query using joins to fetch it.
 */
class RelationJoiner {
  constructor({ modelClass }) {
    this.rootModelClass = modelClass;

    // The relation expression to join.
    this.expression = null;

    // Explicit modifiers for the relation expression.
    this.modifiers = null;

    this.options = defaultOptions();
    // The `joinOperation` options of the individual `withGraphJoined` calls.
    this.joinOperations = [];
    this.tableTree = null;
    this.internalSelections = null;
  }

  setExpression(expression) {
    if (!this.expression) {
      this.expression = expression;
    }

    return this;
  }

  setModifiers(modifiers) {
    if (!this.modifiers) {
      this.modifiers = modifiers;
    }

    return this;
  }

  setOptions(options) {
    this.options = Object.assign(this.options, options);
    return this;
  }

  setJoinOperations(joinOperations) {
    this.joinOperations = joinOperations;
    return this;
  }

  /**
   * Fetches the column information needed for building the select clauses.
   *
   * This must be called before calling `build(builder, true)`. `build(builder, false)`
   * can be called without this since it doesn't build selects.
   */
  fetchColumnInfo(builder) {
    const tableTree = this._getTableTree(builder);
    const allModelClasses = new Set(tableTree.nodes.map((node) => node.modelClass));

    return mapPromise(
      Array.from(allModelClasses),
      (modelClass) => modelClass.fetchTableMetadata({ parentBuilder: builder }),
      {
        concurrency: this.rootModelClass.getConcurrency(builder.unsafeKnex()),
      },
    );
  }

  build(builder, buildSelects = true) {
    const rootTableNode = this._getTableTree(builder).rootNode;
    const userSelectQueries = new Map([[rootTableNode, builder]]);

    for (const tableNode of rootTableNode.childNodes) {
      this._buildJoinsForNode({ builder, tableNode, userSelectQueries });
    }

    if (buildSelects) {
      this._buildSelects({ builder, tableNode: rootTableNode, userSelectQueries });
    }
  }

  // Whether the joins can return more than one row per root model.
  hasToManyJoins(builder) {
    return this._getTableTree(builder).nodes.some(
      (tableNode) => tableNode.relation && !tableNode.relation.isOneToOne(),
    );
  }

  parseResult(builder, flatRows) {
    const parser = JoinResultParser.create({
      tableTree: this._getTableTree(builder),
      omitColumnAliases: this.internalSelections.map((it) => it.alias),
    });

    return parser.parse(flatRows);
  }

  _getTableTree(builder) {
    if (!this.tableTree) {
      // Create the table tree lazily.
      this.tableTree = TableTree.create({
        rootModelClass: this.rootModelClass,
        rootTableAlias: builder.tableRef(),
        expression: this.expression,
        options: this.options,
      });
    }

    return this.tableTree;
  }

  _buildJoinsForNode({ builder, tableNode, userSelectQueries }) {
    const subqueryToJoin = createSubqueryToJoin({
      builder,
      tableNode,
      modifiers: this.modifiers,
    });

    const userSelectQuery = subqueryToJoin.clone();

    // relation.join applies the relation modifier that can
    // also contain selects.
    userSelectQuery.modify(tableNode.relation.modify);

    if (selectsOnlyAliasesKeepingSelectAll(findJoinSelections(userSelectQuery))) {
      // All columns are selected from the joined subquery in the main query,
      // so the subquery needs to select them too.
      subqueryToJoin.select(`${subqueryToJoin.tableRef()}.*`);
    }

    // Save the query that contains the user specified selects
    // for later use.
    userSelectQueries.set(tableNode, userSelectQuery);

    tableNode.relation.join(builder, {
      joinOperation: this._getJoinOperation(tableNode),

      ownerTable: tableNode.parentNode.alias,
      relatedTableAlias: tableNode.alias,
      joinTableAlias: tableNode.getJoinTableAlias(builder),

      relatedJoinSelectQuery: ensureIdAndRelationPropsAreSelected({
        builder: subqueryToJoin,
        tableNode,
      }),
    });

    for (const childNode of tableNode.childNodes) {
      this._buildJoinsForNode({ builder, tableNode: childNode, userSelectQueries });
    }
  }

  // Returns the `joinOperation` of the last `withGraphJoined` call that
  // contains the relation of `tableNode`, falling back to the default.
  _getJoinOperation(tableNode) {
    const path = [];

    for (let node = tableNode; node.parentNode; node = node.parentNode) {
      path.unshift(node.relationProperty);
    }

    for (let i = this.joinOperations.length - 1; i >= 0; --i) {
      const { expression, joinOperation } = this.joinOperations[i];

      if (containsPath(expression, path)) {
        return joinOperation;
      }
    }

    return this.options.joinOperation;
  }

  _buildSelects({ builder, tableNode, userSelectQueries }) {
    const { selections, internalSelections } = getSelectionsForNode({
      builder,
      tableNode,
      userSelectQueries,
    });

    const lengthLimit = getIdentifierLengthLimit(builder.knex());

    for (const selection of selections) {
      checkAliasLength(tableNode.modelClass, selection.name, lengthLimit);
    }

    // Save the selections that were added internally (not by the user)
    // so that we can later remove the corresponding properties. The root
    // ones are registered with the builder, which removes them from the
    // result models after all eager operations have run, as they may still
    // need them. The nested ones are removed when parsing the result.
    this.internalSelections = [];

    for (const selection of internalSelections) {
      if (selection.table === tableNode.alias) {
        builder.addInternalSelection(
          tableNode.modelClass.columnNameToPropertyName(selection.column),
        );
      } else {
        this.internalSelections.push(selection);
      }
    }

    // Each column is selected only once, as SQL Server returns duplicate column
    // names as arrays of values. Aggregates don't select their columns.
    removeRootSelectAll(builder);
    const userSelectQuery = builder.clone().clear(isAggregateOperation);
    builder.select(
      selectionsToStrings(
        selections.filter(
          (it) => !userSelectQuery.hasSelectionAs(`${it.table}.${it.column}`, it.alias, true),
        ),
      ),
    );
  }
}

function defaultOptions() {
  return {
    joinOperation: 'leftJoin',
    minimize: false,
    separator: ':',
    aliases: {},
  };
}

function containsPath(expression, path) {
  for (const name of path) {
    expression = expression.childExpression(name);

    if (!expression) {
      return false;
    }
  }

  return true;
}

function createSubqueryToJoin({ builder, tableNode, modifiers }) {
  const { relation, expression, modelClass } = tableNode;
  const modifierQuery = modelClass.query().childQueryOf(builder, { isJoinChildQuery: true });

  for (const modifierName of expression.node.$modify) {
    const modifier = createModifier({
      modifier: modifierName,
      modelClass,
      modifiers,
    });

    try {
      modifier(modifierQuery);
    } catch (err) {
      if (err instanceof modelClass.ModifierNotFoundError) {
        throw modelClass.createValidationError({
          type: ValidationErrorType.RelationExpression,
          message: `could not find modifier "${modifierName}" for relation "${relation.name}"`,
        });
      } else {
        throw err;
      }
    }
  }

  return modifierQuery;
}

function ensureIdAndRelationPropsAreSelected({ builder, tableNode }) {
  const tableRef = builder.tableRef();

  const cols = [
    ...builder.modelClass().getIdColumnArray(),
    ...tableNode.relation.relatedProp.cols,
    ...tableNode.childNodes.reduce(
      (cols, childNode) => [...cols, ...childNode.relation.ownerProp.cols],
      [],
    ),
  ];

  const hasSelectionAs = createHasSelectionAs(builder);
  const selectStrings = uniqBy(cols)
    .filter((col) => !hasSelectionAs(col))
    .map((col) => `${tableRef}.${col}`);

  return builder.select(selectStrings);
}

function getSelectionsForNode({ builder, tableNode, userSelectQueries }) {
  const userSelectQuery = userSelectQueries.get(tableNode);
  const userSelections = findUserSelections(userSelectQuery, tableNode);
  const userSelectedAllColumns = isSelectAllSelectionSet(userSelections);

  let selections = [];
  let internalSelections = [];

  if (tableNode.parentNode) {
    selections = mapUserSelectionsFromSubqueryToMainQuery({ userSelections, tableNode });

    if (userSelectedAllColumns && tableNode.relation.isObjectionManyToManyRelation) {
      const extraSelections = getJoinTableExtraSelectionsForNode({ builder, tableNode });
      selections = selections.concat(extraSelections);
    }
  }

  if (userSelectedAllColumns) {
    const allColumnSelections = getAllColumnSelectionsForNode({ builder, tableNode });
    selections = allColumnSelections.concat(selections);
  } else {
    const idSelections = getIdSelectionsForNode({ tableNode });
    const hasUserSelectionAs = createHasUserSelectionAs(userSelectQuery, tableNode);

    for (const idSelection of idSelections) {
      if (!hasUserSelectionAs(idSelection.column)) {
        selections.push(idSelection);
        internalSelections.push(idSelection);
      }
    }
  }

  for (const childNode of tableNode.childNodes) {
    const childResult = getSelectionsForNode({ builder, tableNode: childNode, userSelectQueries });

    selections = selections.concat(childResult.selections);
    internalSelections = internalSelections.concat(childResult.internalSelections);
  }

  return {
    selections,
    internalSelections,
  };
}

// Like `builder.findAllSelections()`, but aggregates select their aliases
// instead of the columns they're passed. Aggregates without an alias are left
// out, as their column name differs between databases.
function findJoinSelections(builder) {
  let selections = [];

  builder.forEachOperation(true, (op) => {
    if (op.constructor === SelectOperation) {
      selections = selections.concat(op.aggregateSelections || op.selections);
    }
  });

  return selections;
}

// Create a `(column) => builder.hasSelectionAs(column, column)` function that
// ignores the columns passed to aggregates, as they don't select them. Clone
// the builder once, not once per column.
function createHasSelectionAs(builder) {
  if (builder.has(isAggregateOperation)) {
    const selectionQuery = builder.clone().clear(isAggregateOperation);
    // Explicit, as a query with only aggregates doesn't select all columns.
    return (column) => selectionQuery.hasSelectionAs(column, column, true);
  } else {
    return (column) => builder.hasSelectionAs(column, column);
  }
}

// Only the joined subqueries select aggregates by their aliases. The root
// query keeps treating the columns passed to them as selected.
function findUserSelections(builder, tableNode) {
  if (tableNode.parentNode) {
    return findJoinSelections(builder);
  } else {
    return builder.findAllSelections();
  }
}

function createHasUserSelectionAs(builder, tableNode) {
  if (tableNode.parentNode) {
    return createHasSelectionAs(builder);
  } else {
    return (column) => builder.hasSelectionAs(column, column);
  }
}

function isAggregateOperation(op) {
  return op.constructor === SelectOperation && op.aggregateSelections !== null;
}

function mapUserSelectionsFromSubqueryToMainQuery({ userSelections, tableNode }) {
  return userSelections.filter(isNotSelectAll).map((selection) => {
    return new Selection(
      tableNode.alias,
      selection.name,
      tableNode.getColumnAliasForColumn(selection.name),
    );
  });
}

function getJoinTableExtraSelectionsForNode({ builder, tableNode }) {
  return tableNode.relation.joinTableExtras.map((extra) => {
    return new Selection(
      tableNode.getJoinTableAlias(builder),
      extra.joinTableCol,
      tableNode.getColumnAliasForColumn(extra.aliasCol),
    );
  });
}

function getAllColumnSelectionsForNode({ builder, tableNode }) {
  const table = builder.tableNameFor(tableNode.modelClass);
  const tableMeta = tableNode.modelClass.tableMetadata({ table });

  if (!tableMeta) {
    throw new Error(
      `table metadata has not been fetched for table '${table}'. Are you trying to call toKnexQuery() for a withGraphJoined query? To make sure the table metadata is fetched see the objection.initialize function.`,
    );
  }

  return tableMeta.columns.map((columnName) => {
    return new Selection(
      tableNode.alias,
      columnName,
      tableNode.getColumnAliasForColumn(columnName),
    );
  });
}

function getIdSelectionsForNode({ tableNode }) {
  return tableNode.modelClass.getIdColumnArray().map((columnName) => {
    return new Selection(
      tableNode.alias,
      columnName,
      tableNode.getColumnAliasForColumn(columnName),
    );
  });
}

// The selections of all columns of the root table replace the user's `*`, which
// would select them a second time, and a bare `*` also the columns of the
// joined tables under the same names.
function removeRootSelectAll(builder) {
  const tableRef = builder.tableRef();
  const isRootSelectAll = (selection) =>
    selection.column === '*' && (!selection.table || selection.table === tableRef);
  const isSelect = (op) =>
    op.constructor === SelectOperation && !isAggregateOperation(op) && !op.isDistinctOn;

  builder.forEachOperation(isSelect, (op) => {
    op.args = op.args.filter((arg) => {
      const selection = Selection.create(arg);
      return !selection || !isRootSelectAll(selection);
    });
    op.selections = op.selections.filter((selection) => !isRootSelectAll(selection));
  });

  // An empty `distinct()` still makes the whole select distinct.
  builder.clear((op) => isSelect(op) && op.name !== 'distinct' && op.args.length === 0);
}

function selectionsToStrings(selections) {
  return selections.map((selection) => {
    const selectStr = `${selection.table}.${selection.column}`;
    return `${selectStr} as ${selection.alias}`;
  });
}

function isSelectAll(selection) {
  return selection.column === '*';
}

function isNotSelectAll(selection) {
  return selection.column !== '*';
}

function isSelectAllSelectionSet(selections) {
  selections = selections.filter(isNotKeepingSelectAll);
  return selections.length === 0 || selections.some(isSelectAll);
}

function isNotKeepingSelectAll(selection) {
  return !selection.keepsSelectAll;
}

function selectsOnlyAliasesKeepingSelectAll(selections) {
  return selections.length > 0 && selections.every((it) => it.keepsSelectAll);
}

function checkAliasLength(modelClass, alias, lengthLimit) {
  if (alias.length > lengthLimit) {
    throw modelClass.createValidationError({
      type: ValidationErrorType.RelationExpression,
      message:
        `identifier ${alias} is over ${lengthLimit} characters long and would be truncated by the database engine. ` +
        'Use the `minimize` option of withGraphJoined() to shorten the aliases.',
    });
  }
}

module.exports = {
  RelationJoiner,
};
