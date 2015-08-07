'use strict';

var _ = require('lodash')
  , ValidationError = require('./ValidationError');

/**
 * @ignore
 * @constructor
 */
function RelationExpressionNode(name) {
  this.name = name;
  this.children = [];
}

/**
 * @ignore
 * @constructor
 */
function RelationExpressionParser() {
  this.str = null;
}

RelationExpressionParser.parse = function (str) {
  return new RelationExpressionParser().parse(str);
};

RelationExpressionParser.prototype.parse = function (str) {
  this.str = str;

  if (!_.isString(str) || !str) {
    return new RelationExpression([]);
  } else {
    return new RelationExpression(this._parse(str));
  }
};

RelationExpressionParser.prototype._parse = function (str) {
  var rootNodes = [];
  var nodes = rootNodes;

  this._forEachToken(str, '.', function (token) {
    nodes = this._parseIterator(token, nodes);
  });

  return rootNodes;
};

RelationExpressionParser.prototype._parseIterator = function (token, nodes) {
  if (isArrayToken(token)) {
    return this._parseArrayToken(token, nodes);
  } else {
    return this._parseToken(token, nodes);
  }
};

RelationExpressionParser.prototype._parseArrayToken = function (arrayToken, nodes) {
  arrayToken = stripArrayChars(arrayToken);

  this._forEachToken(arrayToken, ',', function (token) {
    this._parseArrayIterator(token, nodes);
  });

  return nodes;
};

RelationExpressionParser.prototype._parseArrayIterator = function (token, nodes) {
  var rel = this._parse(token);

  for (var i = 0, l = rel.length; i < l; ++i) {
    nodes.push(rel[i]);
  }
};

RelationExpressionParser.prototype._parseToken = function (token, nodes) {
  if (token.length === 0) {
    this._throwInvalidExpressionError();
  }

  var node = new RelationExpressionNode(token);
  nodes.push(node);

  return node.children;
};

RelationExpressionParser.prototype._forEachToken = function (str, separator, callback) {
  var bracketDepth = 0;
  var previousMatchIndex = -1;
  var token = null;
  var i = 0;

  for (var l = str.length; i <= l; ++i) {
    // We handle the last token by faking that there is a
    // separator after the last character.
    var c = (i === l) ? separator : str.charAt(i);

    if (c === '[') {
      bracketDepth++;
    } else if (c === ']') {
      bracketDepth--;
    } else if (c === separator && bracketDepth === 0) {
      token = str.substring(previousMatchIndex + 1, i).trim();
      callback.call(this, token);
      previousMatchIndex = i;
    }
  }

  if (bracketDepth !== 0) {
    this._throwInvalidExpressionError();
  }
};

RelationExpressionParser.prototype._throwInvalidExpressionError = function () {
  throw new ValidationError({relationExpression: 'invalid relation expression: ' + this.str});
};

/**
 * Relation expression is a simple DSL for expressing relation trees.
 *
 * For example an expression `children.[movies.actors.[pets, children], pets]` represents a tree:
 *
 * ```
 *               children
 *               (Person)
 *                  |
 *          -----------------
 *          |               |
 *        movies           pets
 *       (Movie)         (Animal)
 *          |
 *        actors
 *       (Person)
 *          |
 *     -----------
 *     |         |
 *    pets    children
 *  (Animal)  (Person)
 *
 * ```
 *
 * The model classes are shown in parenthesis.
 *
 * This class rarely needs to be used directly. The relation expression can be given to a bunch
 * of functions in objection.js. For example:
 *
 * ```js
 * Person
 *   .query()
 *   .eager('children.[movies.actors.[pets, children], pets]')
 *   .then(function (persons) {
 *     // All persons have the given relation tree fetched.
 *     console.log(persons[0].children[0].movies[0].actors[0].pets[0].name);
 *   });
 * ```
 *
 * There are two tokens that have special meaning: `*` and `^`. `*` means "all relations recursively" and
 * `^` means "this relation recursively".
 *
 * For example `children.*` means "relation `children` and all its relations, and all their relations and ...".
 * The `*` token must be used with caution or you will end up fetching your entire database.
 *
 * Expression `parent.^` is equivalent to `parent.parent.parent.parent...` up to the point a relation no longer
 * has results for the `parent` relation.
 *
 * @param nodes {Array.<RelationExpressionNode>}
 * @constructor
 */
function RelationExpression(nodes) {
  /**
   * @type Array.<RelationExpressionNode>
   */
  this.nodes = nodes;
}

/**
 * Parses an expression string into a {@link RelationExpression} object.
 *
 * @param {String} expression
 * @returns {RelationExpression}
 */
RelationExpression.parse = function (expression) {
  return RelationExpressionParser.parse(expression);
};

/**
 * @protected
 * @returns {boolean}
 */
RelationExpression.prototype.isRecursive = function (relationName) {
  for (var i = 0, l = this.nodes.length; i < l; ++i) {
    var node = this.nodes[i];

    if (node.name === relationName) {
      return node.children.length === 1 && node.children[0].name === '^';
    }
  }

  return false;
};

/**
 * @protected
 * @returns {boolean}
 */
RelationExpression.prototype.isAllRecursive = function () {
  return this.nodes.length === 1 && this.nodes[0].name === '*';
};

/**
 * @protected
 * @returns {RelationExpression}
 */
RelationExpression.prototype.relation = function (relationName) {
  if (this.isAllRecursive()) {
    return this;
  }

  for (var i = 0, l = this.nodes.length; i < l; ++i) {
    var node = this.nodes[i];

    if (node.name !== relationName) {
      continue;
    }

    if (this.isRecursive(node.name)) {
      return new RelationExpression([node]);
    } else {
      return new RelationExpression(node.children);
    }
  }

  return null;
};

/**
 * Tests if another expression is a sub expression of this one.
 *
 * Expression B is a sub expression of expression A if:
 *
 * - A and B have the same root
 * - And each path from root to a leaf in B can be found in A
 *
 * For example sub expressions of `children.[movies.actors, pets]` are:
 *
 * - `children`
 * - `children.movies`
 * - `children.pets`
 * - `children.movies.actors`
 * - `children.[movies, pets]`
 * - `children.[movies.actors, pets]`
 *
 * @param {String|RelationExpression} expr
 * @returns {boolean}
 */
RelationExpression.prototype.isSubExpression = function (expr) {
  if (!(expr instanceof RelationExpression)) {
    expr = RelationExpressionParser.parse(expr);
  }

  if (expr.isAllRecursive()) {
    return this.isAllRecursive();
  }

  for (var i = 0, l = expr.nodes.length; i < l; ++i) {
    var relationName = expr.nodes[i].name;

    if (expr.isRecursive(relationName) && (this.isAllRecursive() || this.isRecursive(relationName))) {
      return true;
    }

    var subExpression = expr.relation(relationName);
    var ownSubExpression = this.relation(relationName);

    if (!ownSubExpression || !ownSubExpression.isSubExpression(subExpression)) {
      return false;
    }
  }

  return true;
};

function isArrayToken(token) {
  return token.length >= 2 && token.charAt(0) === '[' && token.charAt(token.length - 1) === ']';
}

function stripArrayChars(token) {
  return token.substring(1, token.length - 1);
}

module.exports = RelationExpression;
