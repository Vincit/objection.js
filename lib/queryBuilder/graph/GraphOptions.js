'use strict';

const { RelationExpression } = require('../RelationExpression');
const { isString } = require('../../utils/objectUtils');

const NO_RELATE = 'noRelate';
const NO_UNRELATE = 'noUnrelate';
const NO_INSERT = 'noInsert';
const NO_UPDATE = 'noUpdate';
const NO_DELETE = 'noDelete';

const UPDATE = 'update';
const RELATE = 'relate';
const UNRELATE = 'unrelate';
const INSERT_MISSING = 'insertMissing';
const FETCH_STRATEGY = 'fetchStrategy';
const ALLOW_REFS = 'allowRefs';
const ALLOW_MARKERS = 'allowMarkers';

// The options that are matched against the relation path of each node, see
// `_hasOption()`.
const NODE_OPTION_NAMES = [
  NO_RELATE,
  NO_UNRELATE,
  NO_INSERT,
  NO_UPDATE,
  NO_DELETE,
  UPDATE,
  RELATE,
  UNRELATE,
  INSERT_MISSING,
];

const OPTION_NAMES = [...NODE_OPTION_NAMES, FETCH_STRATEGY, ALLOW_REFS, ALLOW_MARKERS];

const FetchStrategy = {
  OnlyIdentifiers: 'OnlyIdentifiers',
  Everything: 'Everything',
  OnlyNeeded: 'OnlyNeeded',
};

class GraphOptions {
  // `rootRelationPath` is the relation path of the root node of a recursive
  // upsert in the original graph, against which the relation paths and
  // expressions of the options match.
  constructor(options, rootRelationPath = []) {
    if (options instanceof GraphOptions) {
      this.options = options.options;
      this.rootRelationPath = options.rootRelationPath;
    } else {
      this.options = parseRelationExpressions(options);
      this.rootRelationPath = rootRelationPath;
    }
  }

  isFetchStrategy(strategy) {
    if (!FetchStrategy[strategy]) {
      throw new Error(`unknown strategy "${strategy}"`);
    }

    if (!this.options[FETCH_STRATEGY]) {
      return strategy === FetchStrategy.OnlyNeeded;
    } else {
      return this.options[FETCH_STRATEGY] === strategy;
    }
  }

  isInsertOnly() {
    // NO_RELATE is not in the list, since the `insert only` mode does
    // relate things that can be related using inserts.
    // TODO: Use a special key for this.
    return [NO_DELETE, NO_UPDATE, NO_UNRELATE, INSERT_MISSING].every((opt) => {
      return this.options[opt] === true;
    });
  }

  // Like `shouldRelate` but ignores settings that explicitly disable relate operations.
  shouldRelateIgnoreDisable(node, graphData) {
    if (node.toBeUnrelatedOrDeleted) {
      return false;
    }

    if (node.isReference || node.isDbReference) {
      return true;
    }

    return (
      this._hasOption(node, RELATE) &&
      !getCurrentNode(node, graphData) &&
      !!node.parentEdge &&
      !!node.parentEdge.relation &&
      hasRelateProp(node) &&
      graphData.nodeDbExistence.doesNodeExistInDb(node)
    );
  }

  shouldRelate(node, graphData) {
    return !this._hasOption(node, NO_RELATE) && this.shouldRelateIgnoreDisable(node, graphData);
  }

  // Like `shouldInsert` but ignores settings that explicitly disable insert operations.
  shouldInsertIgnoreDisable(node, graphData) {
    if (node.toBeUnrelatedOrDeleted) {
      return false;
    }

    return (
      !getCurrentNode(node, graphData) &&
      !this.shouldRelateIgnoreDisable(node, graphData) &&
      (!node.hasId || this.shouldInsertMissing(node))
    );
  }

  shouldInsert(node, graphData) {
    return !this._hasOption(node, NO_INSERT) && this.shouldInsertIgnoreDisable(node, graphData);
  }

  shouldInsertMissing(node) {
    return this._hasOption(node, INSERT_MISSING);
  }

  // Like `shouldPatch() || shouldUpdate()` but ignores settings that explicitly disable
  // update or patch operations.
  shouldPatchOrUpdateIgnoreDisable(node, graphData) {
    if (node.toBeUnrelatedOrDeleted) {
      return false;
    }

    if (this.shouldRelate(node, graphData)) {
      // We should update all nodes that are going to be related. Note that
      // we don't actually update anything unless there is something to update
      // so this is just a preliminary test.
      return true;
    }

    return !!getCurrentNode(node, graphData);
  }

  shouldPatch(node, graphData) {
    return (
      this.shouldPatchOrUpdateIgnoreDisable(node, graphData) &&
      !this._hasOption(node, NO_UPDATE) &&
      !this._hasOption(node, UPDATE)
    );
  }

  shouldUpdate(node, graphData) {
    return (
      this.shouldPatchOrUpdateIgnoreDisable(node, graphData) &&
      !this._hasOption(node, NO_UPDATE) &&
      this._hasOption(node, UPDATE)
    );
  }

  // Like `shouldUnrelate` but ignores settings that explicitly disable unrelate operations.
  shouldUnrelateIgnoreDisable(currentNode) {
    return this._hasOption(currentNode, UNRELATE);
  }

  shouldUnrelate(currentNode, graphData) {
    const node = getNode(currentNode, graphData.graph);
    if (node && node.toBeUnrelated) return true;

    return (
      !node &&
      !this._hasOption(currentNode, NO_UNRELATE) &&
      this.shouldUnrelateIgnoreDisable(currentNode)
    );
  }

  shouldDelete(currentNode, graphData) {
    const node = getNode(currentNode, graphData.graph);
    // `#unrelate` takes precedence over `#delete` if both are set.
    if (node && node.toBeDeleted && !node.toBeUnrelated) return true;

    return (
      !node &&
      !this._hasOption(currentNode, NO_DELETE) &&
      !this.shouldUnrelateIgnoreDisable(currentNode)
    );
  }

  shouldInsertOrRelate(node, graphData) {
    return this.shouldInsert(node, graphData) || this.shouldRelate(node, graphData);
  }

  shouldDeleteOrUnrelate(currentNode, graphData) {
    return this.shouldDelete(currentNode, graphData) || this.shouldUnrelate(currentNode, graphData);
  }

  allowRefs() {
    return !!this.options[ALLOW_REFS];
  }

  allowMarkers() {
    return !!this.options[ALLOW_MARKERS];
  }

  // The options of recursive upserts keep matching against the relation paths
  // of the original graph, which the relation paths of the new root lead to.
  rebasedOptions(newRoot) {
    return new GraphOptions(this.options, [...this.rootRelationPath, ...newRoot.relationPath]);
  }

  _hasOption(node, optionName) {
    const option = this.options[optionName];

    if (isRelationExpression(option)) {
      return matchesRelationExpression(option, this._relationPath(node));
    } else if (Array.isArray(option)) {
      return option.includes(this._relationPath(node).join('.'));
    } else if (typeof option === 'boolean') {
      return option;
    } else if (option === undefined) {
      return false;
    } else {
      throw new Error(
        `expected ${optionName} option value "${option}" to be a boolean, an array of relation paths or a relation expression`,
      );
    }
  }

  // The relation path of the node in the original graph, see `rebasedOptions()`.
  _relationPath(node) {
    return [...this.rootRelationPath, ...node.relationPath];
  }
}

// Parses the string values of the node options into relation expressions,
// once per operation.
function parseRelationExpressions(options) {
  let parsedOptions = options;

  for (const optionName of NODE_OPTION_NAMES) {
    const option = options[optionName];

    if (isString(option)) {
      if (parsedOptions === options) {
        parsedOptions = { ...options };
      }

      parsedOptions[optionName] = parseRelationExpression(optionName, option);
    }
  }

  return parsedOptions;
}

function parseRelationExpression(optionName, expression) {
  const createError = (message) => {
    return new Error(
      `invalid relation expression "${expression}" in ${optionName} option: ${message}`,
    );
  };

  let parsedExpression;

  try {
    parsedExpression = RelationExpression.create(expression);
  } catch (err) {
    throw createError(err.message);
  }

  if (parsedExpression.isEmpty && !parsedExpression.node.$allRecursive) {
    throw createError('the expression is empty');
  }

  // Relation paths are matched by relation name, so aliases would never match.
  const alias = findAlias(parsedExpression.node);

  if (alias) {
    throw createError(`aliases like "${alias.$relation} as ${alias.$name}" are not supported`);
  }

  return parsedExpression;
}

function findAlias(node) {
  for (const childName of node.$childNames) {
    const child = node[childName];

    if (child.$name !== child.$relation) {
      return child;
    }

    const alias = findAlias(child);

    if (alias) {
      return alias;
    }
  }

  return null;
}

// A relation path matches a relation expression when it leads to a leaf of
// the expression, like it would match the same relation paths in an array:
// `'movies.reviews'` matches `movies.reviews` but not `movies`. `'*'` matches
// all relations below it and recursive expressions like `'parent.^'` match
// every level of the recursion. The root has no relation path and never
// matches.
function matchesRelationExpression(expression, relationPath) {
  if (relationPath.length === 0) {
    return false;
  }

  for (const relationName of relationPath) {
    expression = expression.childExpression(relationName);

    if (!expression) {
      return false;
    }
  }

  // Below `*`, the expression stays on the same node with increasing depth.
  if (expression.node.$allRecursive) {
    return expression.recursionDepth > 0;
  } else {
    return expression.isEmpty;
  }
}

function isRelationExpression(value) {
  return !!value && value.isObjectionRelationExpression === true;
}

function getCurrentNode(node, graphData) {
  if (!graphData || !node) {
    return null;
  }

  return graphData.currentGraph.nodeForNode(node);
}

// For `HasMany` and `HasOne` relations, the relate prop is the id of the
// related model. Use the id state of the input graph, since the parent's
// insert copies the foreign key into the related model, which can complete
// a composite id that contains it and would turn an insert into a relate (#2544).
function hasRelateProp(node) {
  const relation = node.parentEdge.relation;

  if (relation.isObjectionHasManyRelation) {
    return node.hasId;
  } else {
    return relation.hasRelateProp(node.obj);
  }
}

function getNode(currentNode, graph) {
  if (!graph || !currentNode) {
    return null;
  }

  return graph.nodeForNode(currentNode);
}

module.exports = {
  GraphOptions,
  OPTION_NAMES,
  FetchStrategy,
};
