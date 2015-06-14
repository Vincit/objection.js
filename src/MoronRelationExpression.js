'use strict';

var _ = require('lodash')
  , MoronValidationError = require('./MoronValidationError');

/**
 * @ignore
 * @constructor
 */
function MoronRelationExpressionNode(name) {
  this.name = name;
  this.children = [];
}

/**
 * @ignore
 * @constructor
 */
function MoronRelationExpressionParser() {
  this.str = null;
}

MoronRelationExpressionParser.parse = function (str) {
  return new MoronRelationExpressionParser().parse(str);
};

MoronRelationExpressionParser.prototype.parse = function (str) {
  this.str = str;

  if (!_.isString(str) || !str) {
    return new MoronRelationExpression([]);
  } else {
    return new MoronRelationExpression(this._parse(str));
  }
};

MoronRelationExpressionParser.prototype._parse = function (str) {
  var rootNodes = [];
  var nodes = rootNodes;

  this._forEachToken(str, '.', function (token) {
    nodes = this._parseIterator(token, nodes);
  });

  return rootNodes;
};

MoronRelationExpressionParser.prototype._parseIterator = function (token, nodes) {
  if (isArrayToken(token)) {
    return this._parseArrayToken(token, nodes);
  } else {
    return this._parseToken(token, nodes);
  }
};

MoronRelationExpressionParser.prototype._parseArrayToken = function (arrayToken, nodes) {
  arrayToken = stripArrayChars(arrayToken);

  this._forEachToken(arrayToken, ',', function (token) {
    this._parseArrayIterator(token, nodes);
  });

  return nodes;
};

MoronRelationExpressionParser.prototype._parseArrayIterator = function (token, nodes) {
  var rel = this._parse(token);

  for (var i = 0, l = rel.length; i < l; ++i) {
    nodes.push(rel[i]);
  }
};

MoronRelationExpressionParser.prototype._parseToken = function (token, nodes) {
  if (token.length === 0) {
    this._throwInvalidExpressionError();
  }

  var node = new MoronRelationExpressionNode(token);
  nodes.push(node);

  return node.children;
};

MoronRelationExpressionParser.prototype._forEachToken = function (str, separator, callback) {
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

MoronRelationExpressionParser.prototype._throwInvalidExpressionError = function () {
  throw new MoronValidationError({relationExpression: 'invalid relation expression: ' + this.str});
};

/**
 * @constructor
 */
function MoronRelationExpression(nodes) {
  this.nodes = nodes;
}

MoronRelationExpression.parse = function (expression) {
  return MoronRelationExpressionParser.parse(expression);
};

MoronRelationExpression.prototype.isRecursive = function (relationName) {
  for (var i = 0, l = this.nodes.length; i < l; ++i) {
    var node = this.nodes[i];

    if (node.name === relationName) {
      return node.children.length === 1 && node.children[0].name === '^';
    }
  }

  return false;
};

MoronRelationExpression.prototype.isAllRecursive = function () {
  return this.nodes.length === 1 && this.nodes[0].name === '*';
};

MoronRelationExpression.prototype.relation = function (relationName) {
  if (this.isAllRecursive()) {
    return this;
  }

  for (var i = 0, l = this.nodes.length; i < l; ++i) {
    var node = this.nodes[i];

    if (node.name !== relationName) {
      continue;
    }

    if (this.isRecursive(node.name)) {
      return new MoronRelationExpression([node]);
    } else {
      return new MoronRelationExpression(node.children);
    }
  }

  return null;
};

MoronRelationExpression.prototype.isSubExpression = function (expr) {
  if (!(expr instanceof MoronRelationExpression)) {
    expr = MoronRelationExpressionParser.parse(expr);
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

module.exports = MoronRelationExpression;
