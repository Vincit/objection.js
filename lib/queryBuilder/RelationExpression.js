const mergeWith = require('lodash/mergeWith');
const union = require('lodash/union');
const clone = require('lodash/clone');
const values = require('lodash/values');
const cloneDeep = require('lodash/cloneDeep');
const parser = require('./parsers/relationExpressionParser');
const { isObject } = require('../utils/objectUtils');

const RECURSIVE_REGEX = /^\^(\d*)$/;
const ALL_RECURSIVE_REGEX = /^\*$/;

class RelationExpression {
  constructor(node = {}, recursionDepth = 0) {
    this.name = node.name || null;
    this.alias = node.alias || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || Object.create(null);

    Object.defineProperty(this, 'recursionDepth', {
      enumerable: false,
      value: recursionDepth
    });
  }

  // Create a relation expression from a string or another
  // RelationExpression instance.
  static create(expr) {
    if (isObject(expr) && expr.isObjectionRelationExpression) {
      return expr;
    } else if (typeof expr !== 'string' || expr.trim().length === 0) {
      return new RelationExpression();
    } else {
      return new RelationExpression(parser.parse(expr));
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

  get maxRecursionDepth() {
    if (this.numChildren !== 1) {
      return 0;
    }

    const key = Object.keys(this.children)[0];
    return maxRecursionDepth(key);
  }

  get isAllRecursive() {
    if (this.numChildren !== 1) {
      return false;
    }

    const key = Object.keys(this.children)[0];
    return ALL_RECURSIVE_REGEX.test(key);
  }

  // Merges this relation expression with another. `expr` can be a string
  // or a RelationExpression instance.
  merge(expr) {
    const merged = this.clone();
    expr = RelationExpression.create(expr);

    merged.children = mergeWithUnion(merged.children, expr.children);
    merged.args = mergeWithUnion(merged.args, expr.args);
    merged.numChildren = Object.keys(merged.children).length;

    // Handle recursive and allRecursive nodes.
    visit(merged, (node, childAliases) => {
      let maxAlias = null;
      let maxDepth = 0;
      let recurCount = 0;

      for (let i = 0, l = childAliases.length; i < l; ++i) {
        const alias = childAliases[i];
        const depth = maxRecursionDepth(alias);

        if (depth > 0) {
          recurCount++;
        }

        if (depth > maxDepth) {
          maxDepth = depth;
          maxAlias = alias;
        }
      }

      if (recurCount > 0) {
        delete node.children[node.alias];
      }

      if (recurCount > 1) {
        for (let i = 0, l = childAliases.length; i < l; ++i) {
          const alias = childAliases[i];

          if (alias !== maxAlias) {
            delete node.children[alias];
          }
        }
      }
    });

    return merged;
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

    if (this.name !== expr.name) {
      return false;
    }

    const maxRecursionDepth = expr.maxRecursionDepth;

    if (maxRecursionDepth > 0) {
      return this.isAllRecursive || this.maxRecursionDepth >= maxRecursionDepth;
    }

    const childAliases = Object.keys(expr.children);

    for (let i = 0, l = childAliases.length; i < l; ++i) {
      const childAlias = childAliases[i];
      const ownSubExpression = this.childExpression(childAlias);
      const subExpression = expr.childExpression(childAlias);

      if (!ownSubExpression || !ownSubExpression.isSubExpression(subExpression)) {
        return false;
      }
    }

    return true;
  }

  // Returns a RelationExpression for a child node or null if there
  // is no child with the given alias or name `childAlias`.
  childExpression(childAlias) {
    if (
      this.isAllRecursive ||
      (childAlias === this.alias && this.recursionDepth < this.maxRecursionDepth - 1)
    ) {
      return new RelationExpression(this, this.recursionDepth + 1);
    }

    if (this.children[childAlias]) {
      return new RelationExpression(this.children[childAlias], 0);
    } else {
      return null;
    }
  }

  // Loops throught all children.
  forEachChildExpression(allRelations, cb) {
    const maxRecursionDepth = this.maxRecursionDepth;

    if (this.isAllRecursive) {
      const relationNames = Object.keys(allRelations);

      for (let i = 0, l = relationNames.length; i < l; ++i) {
        const relationName = relationNames[i];
        const node = newNode(relationName, this.children, this.numChildren);
        const relation = allRelations[relationName];
        const childExpr = new RelationExpression(node, 0);

        cb(childExpr, relation);
      }
    } else if (this.recursionDepth < maxRecursionDepth - 1) {
      const relation = allRelations[this.name] || null;
      const childExpr = new RelationExpression(this, this.recursionDepth + 1);

      cb(childExpr, relation);
    } else if (maxRecursionDepth === 0) {
      const childAliases = Object.keys(this.children);

      for (let i = 0, l = childAliases.length; i < l; ++i) {
        const childAlias = childAliases[i];
        const node = this.children[childAlias];
        const relation = allRelations[node.name] || null;
        const childExpr = new RelationExpression(node, 0);

        cb(childExpr, relation);
      }
    }
  }

  clone() {
    const node = {
      name: this.name,
      alias: this.alias,
      args: this.args,
      numChildren: this.numChildren,
      children: cloneDeep(this.children)
    };

    return new RelationExpression(node, this.recursionDepth);
  }

  rawNodesAtPath(path) {
    return findNodesAtPath(this, RelationExpression.create(path), []);
  }

  toString() {
    return toString(this);
  }
}

function maxRecursionDepth(key) {
  const rec = RECURSIVE_REGEX.exec(key);

  if (rec) {
    const maxDepth = rec[1];

    if (maxDepth) {
      return parseInt(maxDepth, 10);
    } else {
      return Number.POSITIVE_INFINITY;
    }
  } else {
    return 0;
  }
}

function visit(node, visitor) {
  const keys = Object.keys(node.children);

  visitor(node, keys);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const childNode = node.children[key];

    if (childNode) {
      visit(childNode, visitor);
    }
  }
}

function toString(node) {
  let childExpr = values(node.children).map(toString);
  let str = node.name;

  if (childExpr.length > 1) {
    childExpr = `[${childExpr.join(', ')}]`;
  } else {
    childExpr = childExpr[0];
  }

  if (node.args.length) {
    str += `(${node.args.join(', ')})`;
  }

  if (node.alias !== node.name) {
    str += ` as ${node.alias}`;
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

function modelToNode(model, node) {
  const modelClass = model.constructor;
  const relations = modelClass.getRelationArray();

  for (let r = 0, lr = relations.length; r < lr; ++r) {
    const relName = relations[r].name;

    if (model.hasOwnProperty(relName)) {
      let childNode = node.children[relName];

      if (!childNode) {
        childNode = newNode(relName);

        node.children[relName] = childNode;
        node.numChildren++;
      }

      modelGraphToNode(model[relName], childNode);
    }
  }
}

function newNode(name, children, numChildren) {
  return {
    name: name || '',
    alias: name || '',
    args: [],
    children: children || Object.create(null),
    numChildren: numChildren || 0
  };
}

function findNodesAtPath(target, path, results) {
  if (path.numChildren == 0) {
    // Path leaf reached, add target node to result set.
    results.push(target);
  } else {
    const childAliases = Object.keys(path.children);

    for (let i = 0, l = childAliases.length; i < l; ++i) {
      const childAlias = childAliases[i];
      const child = path.children[childAlias];
      const targetChild = target.children[childAlias];

      if (targetChild) {
        findNodesAtPath(targetChild, child, results);
      }
    }
  }

  return results;
}

function mergeWithUnion(obj1, obj2) {
  return mergeWith(obj1, obj2, unionArrays);
}

function unionArrays(arr1, arr2) {
  if (Array.isArray(arr1) && Array.isArray(arr2)) {
    return union(arr1, arr2);
  }
}

Object.defineProperties(RelationExpression.prototype, {
  isObjectionRelationExpression: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = RelationExpression;
