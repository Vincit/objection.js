'use strict';

const merge = require('lodash/merge');
const clone = require('lodash/clone');
const values = require('lodash/values');
const cloneDeep = require('lodash/cloneDeep');
const parser = require('./parsers/relationExpressionParser');

const RECURSIVE_REGEX = /^\^(\d*)$/;
const ALL_RECURSIVE_REGEX = /^\*$/;

class RelationExpression {
  constructor(node, recursionDepth, filters) {
    node = node || {};

    this.name = node.name || null;
    this.alias = node.alias || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || Object.create(null);

    Object.defineProperty(this, '_recursionDepth', {
      enumerable: false,
      value: recursionDepth || 0
    });

    Object.defineProperty(this, '_filters', {
      enumerable: false,
      writable: true,
      value: filters || {}
    });
  }

  static parse(expr) {
    if (expr && expr.isObjectionRelationExpression === true) {
      return expr;
    } else if (typeof expr !== 'string' || expr.trim().length === 0) {
      return new RelationExpression();
    } else {
      return new RelationExpression(parser.parse(expr));
    }
  }

  static fromGraph(graph) {
    if (!graph) {
      return new RelationExpression();
    } else {
      return new RelationExpression(modelGraphToNode(graph, newNode()));
    }
  }

  get filters() {
    return this._filters;
  }

  set filters(filters) {
    this._filters = filters || {};
  }

  merge(expr) {
    const merged = this.clone();
    expr = RelationExpression.parse(expr);

    merged.children = merge(merged.children, expr.children);
    merged.args = merge(merged.args, expr.args);
    merged.filters = merge(merged.filters, expr.filters);
    merged.numChildren = Object.keys(merged.children).length;

    // Handle recursive and all recursive nodes.
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

  isSubExpression(expr) {
    expr = RelationExpression.parse(expr);
    // Need to defined these here to prevent an optimization bailout.
    let maxRecursionDepth, childAliases;

    if (this.isAllRecursive()) {
      return true;
    }

    if (expr.isAllRecursive()) {
      return this.isAllRecursive();
    }

    if (this.name !== expr.name) {
      return false;
    }

    maxRecursionDepth = expr.maxRecursionDepth();

    if (maxRecursionDepth > 0) {
      return this.isAllRecursive() || this.maxRecursionDepth() >= maxRecursionDepth;
    }

    childAliases = Object.keys(expr.children);

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

  maxRecursionDepth() {
    if (this.numChildren !== 1) {
      return 0;
    }

    const key = Object.keys(this.children)[0];
    return maxRecursionDepth(key);
  }

  isAllRecursive() {
    if (this.numChildren !== 1) {
      return false;
    }

    const key = Object.keys(this.children)[0];
    return ALL_RECURSIVE_REGEX.test(key);
  }

  childExpression(childAlias) {
    if (
      this.isAllRecursive() ||
      (childAlias === this.alias && this._recursionDepth < this.maxRecursionDepth() - 1)
    ) {
      return new RelationExpression(this, this._recursionDepth + 1, this._filters);
    }

    if (this.children[childAlias]) {
      return new RelationExpression(this.children[childAlias], 0, this._filters);
    } else {
      return null;
    }
  }

  forEachChildExpression(allRelations, cb) {
    const maxRecursionDepth = this.maxRecursionDepth();

    if (this.isAllRecursive()) {
      const relationNames = Object.keys(allRelations);

      for (let i = 0, l = relationNames.length; i < l; ++i) {
        const relationName = relationNames[i];
        const node = newNode(relationName, this.children, this.numChildren);
        const relation = allRelations[relationName];
        const childExpr = new RelationExpression(node, 0, this._filters);

        cb(childExpr, relation);
      }
    } else if (this._recursionDepth < maxRecursionDepth - 1) {
      const relation = allRelations[this.name] || null;
      const childExpr = new RelationExpression(this, this._recursionDepth + 1, this._filters);

      cb(childExpr, relation);
    } else if (maxRecursionDepth === 0) {
      const childAliases = Object.keys(this.children);

      for (let i = 0, l = childAliases.length; i < l; ++i) {
        const childAlias = childAliases[i];
        const node = this.children[childAlias];
        const relation = allRelations[node.name] || null;
        const childExpr = new RelationExpression(node, 0, this._filters);

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

    const filters = clone(this._filters);
    return new RelationExpression(node, this._recursionDepth, filters);
  }

  addAnonymousFilterAtPath(path, filter) {
    const filterNodes = this.rawNodesAtPath(path);
    const filters = this.filters;

    let idx = 0;
    let filterName = `_efe0_`;

    while (filters[filterName]) {
      filterName = `_efe${++idx}_`;
    }

    if (filterNodes.length !== 0) {
      filters[filterName] = filter;

      for (let i = 0, l = filterNodes.length; i < l; ++i) {
        filterNodes[i].args.push(filterName);
      }
    }
  }

  rawNodesAtPath(path) {
    return findNodesAtPath(this, RelationExpression.parse(path), []);
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

Object.defineProperties(RelationExpression.prototype, {
  isObjectionRelationExpression: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = RelationExpression;
