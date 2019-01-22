'use strict';

const parser = require('./parsers/relationExpressionParser');
const { isObject, cloneDeep, isNumber, isString, union } = require('../utils/objectUtils');
const { RelationDoesNotExistError } = require('../model/RelationDoesNotExistError');

class RelationExpressionParseError extends Error {}
class DuplicateRelationError extends RelationExpressionParseError {
  constructor(relationName) {
    super();
    this.relationName = relationName;
  }
}

class RelationExpression {
  constructor(node = {}, recursionDepth = 0) {
    this.$name = node.$name || null;
    this.$relation = node.$relation || null;
    this.$modify = node.$modify || [];
    this.$recursive = node.$recursive || false;
    this.$allRecursive = node.$allRecursive || false;

    const childNames = getChildNames(node);

    for (const childName of childNames) {
      this[childName] = node[childName];
    }

    // These are non-enumerable so that the enumerable interface of this
    // class instance is the same as the result from relationExpressionParser.
    Object.defineProperties(this, {
      recursionDepth: {
        enumerable: false,
        value: recursionDepth
      },

      childNames: {
        enumerable: false,
        value: childNames
      },

      rawNode: {
        enumerable: false,
        value: node
      }
    });
  }

  // Create a relation expression from a string, a pojo or another
  // RelationExpression instance.
  static create(expr) {
    if (isObject(expr)) {
      if (expr.isObjectionRelationExpression) {
        return expr;
      } else {
        return new RelationExpression(normalizeNode(expr));
      }
    } else if (isString(expr)) {
      if (expr.trim().length === 0) {
        return new RelationExpression();
      } else {
        try {
          return new RelationExpression(parser.parse(expr));
        } catch (err) {
          if (err.duplicateRelationName) {
            throw new DuplicateRelationError(err.duplicateRelationName);
          } else {
            throw new RelationExpressionParseError(err.message);
          }
        }
      }
    } else {
      return new RelationExpression();
    }
  }

  // Create a relation expression from a model graph.
  static fromModelGraph(graph) {
    if (!graph) {
      return new RelationExpression();
    } else {
      return new RelationExpression(modelGraphToNode(graph, newNode()));
    }
  }

  static getChildNames(exprObject) {
    return getChildNames(exprObject);
  }

  get numChildren() {
    return this.childNames.length;
  }

  get maxRecursionDepth() {
    if (isNumber(this.$recursive)) {
      return this.$recursive;
    } else {
      return this.$recursive ? Number.MAX_SAFE_INTEGER : 0;
    }
  }

  get isAllRecursive() {
    return this.$allRecursive;
  }

  // Merges this relation expression with another. `expr` can be a string,
  // a pojo, or a RelationExpression instance.
  merge(expr) {
    return new RelationExpression(mergeNodes(this, RelationExpression.create(expr)));
  }

  // Returns true if `expr` is contained by this expression. For example
  // `a.b` is contained by `a.[b, c]`.
  isSubExpression(expr) {
    expr = RelationExpression.create(expr);

    if (this.isAllRecursive) {
      return true;
    }

    if (expr.isAllRecursive) {
      return this.isAllRecursive;
    }

    if (this.$relation !== expr.$relation) {
      return false;
    }

    const maxRecursionDepth = expr.maxRecursionDepth;

    if (maxRecursionDepth > 0) {
      return this.isAllRecursive || this.maxRecursionDepth >= maxRecursionDepth;
    }

    for (const childName of expr.childNames) {
      const ownSubExpression = this.childExpression(childName);
      const subExpression = expr.childExpression(childName);

      if (!ownSubExpression || !ownSubExpression.isSubExpression(subExpression)) {
        return false;
      }
    }

    return true;
  }

  // Returns a RelationExpression for a child node or null if there
  // is no child with the given name `childName`.
  childExpression(childName) {
    if (
      this.isAllRecursive ||
      (childName === this.$name && this.recursionDepth < this.maxRecursionDepth - 1)
    ) {
      return new RelationExpression(this, this.recursionDepth + 1);
    }

    const child = this[childName];

    if (child) {
      return new RelationExpression(child, 0);
    } else {
      return null;
    }
  }

  // Loops throught all first level children.
  forEachChildExpression(modelClass, cb) {
    const maxRecursionDepth = this.maxRecursionDepth;

    if (this.isAllRecursive) {
      for (const relationName of modelClass.getRelationNames()) {
        const node = newNode(relationName, true);
        const relation = modelClass.getRelationUnsafe(relationName);
        const childExpr = new RelationExpression(node, 0);

        cb(childExpr, relation);
      }
    } else if (this.recursionDepth < maxRecursionDepth - 1) {
      const relation = modelClass.getRelationUnsafe(this.$name) || null;
      const childExpr = new RelationExpression(this, this.recursionDepth + 1);

      cb(childExpr, relation);
    } else if (maxRecursionDepth === 0) {
      for (const childName of this.childNames) {
        const node = this[childName];
        const relation = modelClass.getRelationUnsafe(node.$relation);

        if (!relation) {
          throw new RelationDoesNotExistError(node.$relation);
        }

        const childExpr = new RelationExpression(node, 0);

        cb(childExpr, relation);
      }
    }
  }

  expressionsAtPath(path) {
    return findExpressionsAtPath(this, RelationExpression.create(path), []);
  }

  clone() {
    return new RelationExpression(toNode(this), this.recursionDepth);
  }

  toString() {
    return toString(this);
  }

  toJSON() {
    return toJSON(this);
  }

  toPojo() {
    return toNode(this);
  }
}

// All enumerable properties of a node that don't start with `$`
// are child nodes.
function getChildNames(node) {
  const childNames = [];

  for (const key of Object.keys(node)) {
    if (key[0] !== '$') {
      childNames.push(key);
    }
  }

  return childNames;
}

function toString(node) {
  const childNames = getChildNames(node);

  let childExpr = childNames.map(childName => node[childName]).map(toString);
  let str = node.$relation;

  if (node.$recursive) {
    if (isNumber(node.$recursive)) {
      str += '.^' + node.$recursive;
    } else {
      str += '.^';
    }
  } else if (node.$allRecursive) {
    str += '.*';
  }

  if (childExpr.length > 1) {
    childExpr = `[${childExpr.join(', ')}]`;
  } else {
    childExpr = childExpr[0];
  }

  if (node.$modify.length) {
    str += `(${node.$modify.join(', ')})`;
  }

  if (node.$name !== node.$relation) {
    str += ` as ${node.$name}`;
  }

  if (childExpr) {
    if (str) {
      return `${str}.${childExpr}`;
    } else {
      return childExpr;
    }
  } else {
    return str;
  }
}

function toJSON(node, nodeName = null) {
  const json = {};

  if (node.$name && node.$name !== nodeName) {
    json.$name = node.$name;
  }

  if (node.$relation && node.$relation !== nodeName) {
    json.$relation = node.$relation;
  }

  // TODO: !isArray(x) -> x.slice() ?
  if (!Array.isArray(node.$modify) || node.$modify.length > 0) {
    json.$modify = node.$modify.slice();
  }

  if (node.$recursive) {
    json.$recursive = node.$recursive;
  }

  if (node.$allRecursive) {
    json.$allRecursive = node.$allRecursive;
  }

  for (const childName of getChildNames(node)) {
    const childNode = node[childName];
    const childJson = toJSON(childNode, childName);

    if (Object.keys(childJson).length === 0) {
      json[childName] = true;
    } else {
      json[childName] = childJson;
    }
  }

  return json;
}

function toNode(expr) {
  const node = {
    $name: expr.$name,
    $relation: expr.$relation,
    $modify: expr.$modify.slice(),
    $recursive: expr.$recursive,
    $allRecursive: expr.$allRecursive
  };

  for (const childName of expr.childNames) {
    node[childName] = cloneDeep(expr[childName]);
  }

  return node;
}

function modelGraphToNode(models, node) {
  if (!models) {
    return;
  }

  if (Array.isArray(models)) {
    for (let i = 0, l = models.length; i < l; ++i) {
      modelToNode(models[i], node);
    }
  } else {
    modelToNode(models, node);
  }

  return node;
}

// TODO: recursion check
function modelToNode(model, node) {
  const modelClass = model.constructor;
  const relationNames = modelClass.getRelationNames();

  for (let r = 0, lr = relationNames.length; r < lr; ++r) {
    const relName = relationNames[r];

    if (model.hasOwnProperty(relName)) {
      let childNode = node[relName];

      if (!childNode) {
        childNode = newNode(relName);
        node[relName] = childNode;
      }

      modelGraphToNode(model[relName], childNode);
    }
  }
}

function newNode(name, allRecusive = false) {
  return {
    $name: name || null,
    $relation: name || null,
    $modify: [],
    $recursive: false,
    $allRecursive: allRecusive
  };
}

function normalizeNode(node, name = null) {
  const normalized = {
    $name: node.$name || name,
    $relation: node.$relation || name,
    $modify: node.$modify || [],
    $recursive: node.$recursive || false,
    $allRecursive: node.$allRecursive || false
  };

  for (const childName of getChildNames(node)) {
    const childNode = node[childName];

    if (isObject(childNode) || childNode === true) {
      normalized[childName] = normalizeNode(childNode, childName);
    }
  }

  return normalized;
}

function findExpressionsAtPath(target, path, results) {
  if (path.childNames.length == 0) {
    // Path leaf reached, add target node to result set.
    results.push(target);
  } else {
    for (const childName of path.childNames) {
      const pathChild = path.childExpression(childName);
      const targetChild = target.childExpression(childName);

      if (targetChild) {
        findExpressionsAtPath(targetChild, pathChild, results);
      }
    }
  }

  return results;
}

function mergeNodes(node1, node2) {
  const node = {
    $name: node1.$name,
    $relation: node1.$relation,
    $modify: union(node1.$modify, node2.$modify),
    $recursive: mergeRecursion(node1.$recursive, node2.$recursive),
    $allRecursive: node1.$allRecursive || node2.$allRecursive
  };

  if (!node.$recursive && !node.$allRecursive) {
    for (const childName of union(getChildNames(node1), getChildNames(node2))) {
      const child1 = node1[childName];
      const child2 = node2[childName];

      if (child1 && child2) {
        node[childName] = mergeNodes(child1, child2);
      } else {
        node[childName] = child1 || child2;
      }
    }
  }

  return node;
}

function mergeRecursion(rec1, rec2) {
  if (rec1 === true || rec2 === true) {
    return true;
  } else if (isNumber(rec1) && isNumber(rec2)) {
    return Math.max(rec1, rec2);
  } else {
    return rec1 || rec2;
  }
}

Object.defineProperties(RelationExpression.prototype, {
  isObjectionRelationExpression: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = {
  RelationExpression,
  RelationExpressionParseError,
  DuplicateRelationError
};
