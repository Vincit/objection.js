var _ = require('lodash');

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

  for (var i = 0, l = str.length; i < l; ++i) {
    var c = str.charAt(i);
    // Tokens are separated by dots.
    if (c === '.') {
      tokens.push(str.substring(tokenStart, i));
      tokenStart = i + 1;
    }
    // The last token may be an array token.
    if (tokenStart < str.length && str.charAt(tokenStart) === '[') {
      tokens.push(parseArrayToken(str.substring(tokenStart)));
      i = tokenStart = str.length;
      break;
    }
  }

  if (tokenStart !== str.length) {
    // Last token.
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
    if (c === '[') ++depth;
    else if (c === ']') --depth;
    else if (c === ',' && depth === 0) {
      tokens.push(str.substring(tokenStart, i));
      tokenStart = i + 1;
    }
  }

  if (tokenStart !== str.length - 1) {
    // Last token.
    tokens.push(str.substring(tokenStart, str.length - 1));
  }

  for (var j = 0; j < tokens.length; ++j) {
    tokens[j] = parseTokens(tokens[j]);
  }

  return tokens;
}

/**
 * @private
 */
function tokensToObject(value, root) {
  root = root || {};

  var origRoot = root;
  var prevRoot = null;
  var prevItem = null;

  if (_.isEqual(value, ['*'])) {
    // Special case meaning 'all relations recursively'.
    return EagerType.AllRecursive;
  }

  for (var i = 0, l = value.length; i < l; ++i) {
    var item = value[i];

    if (_.isString(item)) {

      if (i === l - 1) {
        // We have found a leaf.
        if (item === '*') {
          prevRoot[prevItem] = EagerType.AllRecursive;
        } else if (item === '^') {
          prevRoot[prevItem] = EagerType.Recursive;
        } else {
          root[item] = EagerType.None;
        }
      } else if (!_.isObject(root[item])) {
        root[item] = {};
      }

      prevRoot = root;
      root = root[item];
    } else if (_.isArray(item)) {
      tokensToObject(item, root);
    }

    prevItem = item;
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

module.exports = MoronEagerExpression;
