'use strict';

const { uniqBy } = require('../../utils/objectUtils');
const { Selection } = require('../operations/select/Selection');
const { createModifier } = require('../../utils/createModifier');
const { map: mapPromise } = require('../../utils/promiseUtils');
const { ValidationErrorType } = require('../../model/ValidationError');

const { TableTree } = require('./TableTree');
const { JoinResultParser } = require('./JoinResultParser');
const { ID_LENGTH_LIMIT } = require('./utils');

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
      }
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

    // Save the query that contains the user specified selects
    // for later use.
    userSelectQueries.set(tableNode, userSelectQuery);

    tableNode.relation.join(builder, {
      joinOperation: this.options.joinOperation,

      ownerTable: tableNode.parentNode.alias,
      relatedTableAlias: tableNode.alias,
      joinTableAlias: tableNode.joinTableAlias,

      relatedJoinSelectQuery: ensureIdAndRelationPropsAreSelected({
        builder: subqueryToJoin,
        tableNode,
      }),
    });

    for (const childNode of tableNode.childNodes) {
      this._buildJoinsForNode({ builder, tableNode: childNode, userSelectQueries });
    }
  }

  _buildSelects({ builder, tableNode, userSelectQueries }) {
    const { selections, internalSelections } = getSelectionsForNode({
      builder,
      tableNode,
      userSelectQueries,
    });

    for (const selection of selections) {
      checkAliasLength(tableNode.modelClass, selection.name);
    }

    // Save the selections that were added internally (not by the user)
    // so that we can later remove the corresponding properties when
    // parsing the result.
    this.internalSelections = internalSelections;

    builder.select(selectionsToStrings(selections));
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

function createSubqueryToJoin({ builder, tableNode, modifiers }) {
  const { relation, expression, modelClass } = tableNode;
  const modifierQuery = modelClass.query().childQueryOf(builder);

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
      []
    ),
  ];

  const selectStrings = uniqBy(cols)
    .filter((col) => !builder.hasSelectionAs(col, col))
    .map((col) => `${tableRef}.${col}`);

  return builder.select(selectStrings);
}

function getSelectionsForNode({ builder, tableNode, userSelectQueries }) {
  const userSelectQuery = userSelectQueries.get(tableNode);
  const userSelections = userSelectQuery.findAllSelections();
  const userSelectedAllColumns = isSelectAllSelectionSet(userSelections);

  let selections = [];
  let internalSelections = [];

  if (tableNode.parentNode) {
    selections = mapUserSelectionsFromSubqueryToMainQuery({ userSelections, tableNode });

    if (userSelectedAllColumns && tableNode.relation.isObjectionManyToManyRelation) {
      const extraSelections = getJoinTableExtraSelectionsForNode({ tableNode });
      selections = selections.concat(extraSelections);
    }
  }

  if (userSelectedAllColumns) {
    const allColumnSelections = getAllColumnSelectionsForNode({ builder, tableNode });
    selections = allColumnSelections.concat(selections);
  } else {
    const idSelections = getIdSelectionsForNode({ tableNode });

    for (const idSelection of idSelections) {
      if (!userSelectQuery.hasSelectionAs(idSelection.column, idSelection.column)) {
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

function mapUserSelectionsFromSubqueryToMainQuery({ userSelections, tableNode }) {
  return userSelections.filter(isNotSelectAll).map((selection) => {
    return new Selection(
      tableNode.alias,
      selection.name,
      tableNode.getColumnAliasForColumn(selection.name)
    );
  });
}

function getJoinTableExtraSelectionsForNode({ tableNode }) {
  return tableNode.relation.joinTableExtras.map((extra) => {
    return new Selection(
      tableNode.joinTableAlias,
      extra.joinTableCol,
      tableNode.getColumnAliasForColumn(extra.aliasCol)
    );
  });
}

function getAllColumnSelectionsForNode({ builder, tableNode }) {
  const table = builder.tableNameFor(tableNode.modelClass);
  const tableMeta = tableNode.modelClass.tableMetadata({ table });

  if (!tableMeta) {
    throw new Error(
      'table metadata has not been fetched. Are you trying to call toKnexQuery() for a withGraphJoined query? To make sure the table metadata is fetched see the objection.initialize function.'
    );
  }

  return tableMeta.columns.map((columnName) => {
    return new Selection(
      tableNode.alias,
      columnName,
      tableNode.getColumnAliasForColumn(columnName)
    );
  });
}

function getIdSelectionsForNode({ tableNode }) {
  return tableNode.modelClass.getIdColumnArray().map((columnName) => {
    return new Selection(
      tableNode.alias,
      columnName,
      tableNode.getColumnAliasForColumn(columnName)
    );
  });
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
  return selections.length === 0 || selections.some(isSelectAll);
}

function checkAliasLength(modelClass, alias) {
  if (alias.length > ID_LENGTH_LIMIT) {
    throw modelClass.createValidationError({
      type: ValidationErrorType.RelationExpression,
      message: `identifier ${alias} is over ${ID_LENGTH_LIMIT} characters long and would be truncated by the database engine.`,
    });
  }
}

module.exports = {
  RelationJoiner,
};
