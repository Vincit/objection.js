var _ = require('lodash');
var MoronValidationError = require('./MoronValidationError');

/**
 * Eager fetch type.
 *
 * @enum {Number}
 */
var EagerType = {
  /**
   * Fetch nothing.
   */
  None: 0,
  /**
   * Fetch one relation recursively (meaningless in the root).
   */
  Recursive: 1,
  /**
   * Fetch all relations recursively.
   */
  AllRecursive: 2
};

/**
 * Class for parsing an eager expression string into an object format that can be easily converted into a query.
 *
 * Examples of the strings:
 *
 * ```
 * 'father'
 * 'father.mother'
 * 'father.[father, mother]'
 * '[father, mother.[siblings.children, children]]'
 * ```
 *
 * Currently best documentation for this is the MoronEagerExpression test suite in the tests folder.
 *
 * @constructor
 */
function MoronEagerExpression(str) {
  this.str = str || '';
  this.obj = parse(this.str);
}

MoronEagerExpression.prototype.isSubExpression = function (input) {
  if (input instanceof MoronEagerExpression) {
    input = input.obj;
  } else if (_.isString(input)) {
    input = parse(input);
  }
  return isSubExpression(input, this.obj);
};

MoronEagerExpression.prototype.toString = function () {
  return JSON.stringify(this.obj, null, 2);
};

MoronEagerExpression.parse = function (str) {
  return new MoronEagerExpression(str);
};

MoronEagerExpression.EagerType = EagerType;

/**
 * @private
 */
function parse(str) {
  if (!_.isString(str) || _.isEmpty(str)) {
    return {};
  }

  // Remove whitespace.
  str = str.replace(/\s+/g, '');
  return tokensToObject(parseTokens(str));
}

/**
 * @private
 */
function parseTokens(str) {
  var tokens = [];
  var tokenStart = 0;
  var arrayToken = null;

  for (var i = 0, l = str.length; i < l; ++i) {
    var c = str.charAt(i);

    // Tokens are separated by dots.
    if (c === '.') {
      var token = str.substring(tokenStart, i);

      if (token.length === 0) {
        throwInvalidExpressionError();
      }

      tokens.push(token);
      tokenStart = i + 1;
    }

    // The last token may be an array token.
    if (tokenStart < str.length && str.charAt(tokenStart) === '[' && str.charAt(str.length - 1) === ']') {
      arrayToken = str.substring(tokenStart);
      break;
    }

    // If we get here the character is part of a relation name.
    // Check that it is one of the accepted characters.
    if (c === '[' || c === ']') {
      throwInvalidExpressionError();
    }
  }

  if (tokenStart === str.length) {
    throwInvalidExpressionError();
  }

  if (arrayToken) {
    tokens.push(parseArrayToken(arrayToken));
  } else {
    tokens.push(str.substring(tokenStart));
  }

  return tokens;
}

/**
 * @private
 */
function parseArrayToken(str) {
  var depth = 0;
  var tokenStart = 1;
  var tokens = [];

  for (var i = tokenStart, l = str.length - 1; i < l; ++i) {
    var c = str.charAt(i);
    if (c === '[') { ++depth; }
    else if (c === ']') { --depth; }
    else if (c === ',' && depth === 0) {
      tokens.push(str.substring(tokenStart, i));
      tokenStart = i + 1;
    }
  }

  if (tokenStart < str.length - 1) {
    // Last token.
    tokens.push(str.substring(tokenStart, str.length - 1));
  }

  if (depth !== 0 || tokens.length === 0 || tokenStart === str.length - 1) {
    throwInvalidExpressionError();
  }

  for (var j = 0; j < tokens.length; ++j) {
    tokens[j] = parseTokens(tokens[j]);
  }

  return tokens;
}

/**
 * @private
 */
function tokensToObject(tokens, root) {
  root = root || Object.create(null);

  var origRoot = root;
  var prevRoot = null;
  var prevToken = null;

  if (tokens.length === 1 && tokens[0] === '*') {
    // Special case meaning 'all relations recursively'.
    return EagerType.AllRecursive;
  }

  for (var i = 0, l = tokens.length; i < l; ++i) {
    var token = tokens[i];

    if (_.isString(token)) {

      if (i === l - 1) {
        // We have found a leaf.
        if (token === '*') {
          prevRoot[prevToken] = EagerType.AllRecursive;
        } else if (token === '^') {
          prevRoot[prevToken] = EagerType.Recursive;
        } else {
          root[token] = EagerType.None;
        }
      } else if (!_.isObject(root[token])) {
        root[token] = {};
      }

      prevRoot = root;
      root = root[token];
    } else if (_.isArray(token)) {
      tokensToObject(token, root);
    }

    prevToken = token;
  }

  return origRoot;
}

/**
 * @private
 */
function isSubExpression(subTree, tree) {
  if (_.isUndefined(tree) || _.isNull(tree)) {
    return false;
  }

  if (tree === EagerType.AllRecursive) {
    return true;
  }

  if (subTree === EagerType.None) {
    return true;
  }

  if (subTree === EagerType.AllRecursive) {
    return tree === EagerType.AllRecursive;
  }

  if (subTree === EagerType.Recursive) {
    return tree === EagerType.Recursive;
  }

  if (_.isObject(subTree)) {
    for (var key in subTree) {
      var subTreeValue = subTree[key];
      var treeValue = tree[key];

      // If the parent tree has for example a.^ then we allow
      // the subTree to be a.^, a.a, a.a.a, a.a.a.^, etc.
      if (treeValue === EagerType.Recursive && subTreeValue !== EagerType.Recursive) {
        treeValue = {};
        treeValue[key] = EagerType.Recursive;
      }

      if (!isSubExpression(subTreeValue, treeValue)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * @private
 */
function throwInvalidExpressionError() {
  throw new MoronValidationError({eagerExpression: 'invalid eager expression'});
}

module.exports = MoronEagerExpression;
