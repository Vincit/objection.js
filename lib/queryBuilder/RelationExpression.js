'use strict';

const _ = require('lodash');
const parser = require('./parsers/relationExpressionParser');
const ValidationError = require('../model/ValidationError');

const RECURSIVE_REGEX = /^\^(\d*)$/;
const ALL_RECURSIVE_REGEX = /^\*$/;

class RelationExpression {

  constructor(node, recursionDepth, filters) {
    node = node || {};

    this.name = node.name || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || {};

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
    if (expr instanceof RelationExpression) {
      return expr;
    } else if (!_.isString(expr) || _.isEmpty(expr.trim())) {
      return new RelationExpression();
    } else {
      try {
        return new RelationExpression(parser.parse(expr));
      } catch (err) {
        throw new ValidationError({
          message: 'Invalid relation expression "' + expr + '"',
          cause: err.message
        });
      }
    }
  }

  static fromGraph(graph) {
    if (!graph) {
      return new RelationExpression();
    }

    return new RelationExpression(modelGraphToNode(graph, newNode()));
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

    merged.numChildren += expr.numChildren;
    merged.children = _.merge(merged.children, expr.children);
    merged.args = _.merge(merged.args, expr.args);
    merged.filters = _.merge(merged.filters, expr.filters);

    // Handle recursive and all recursive nodes.
    visit(merged, (node, childNames) => {
      let maxName = null;
      let maxDepth = 0;
      let recurCount = 0;

      for (let i = 0, l = childNames.length; i < l; ++i) {
        const name = childNames[i];
        const depth = maxRecursionDepth(name);

        if (depth > 0) {
          recurCount++;
        }

        if (depth > maxDepth) {
          maxDepth = depth;
          maxName = name;
        }
      }

      if (recurCount > 0) {
        delete node.children[node.name];
      }

      if (recurCount > 1) {
        for (let i = 0, l = childNames.length; i < l; ++i) {
          const name = childNames[i];

          if (name !== maxName) {
            delete node.children[name];
          }
        }
      }
    });

    return merged;
  }

  isSubExpression(expr) {
    expr = RelationExpression.parse(expr);

    if (this.isAllRecursive()) {
      return true;
    }

    if (expr.isAllRecursive()) {
      return this.isAllRecursive();
    }

    if (this.name !== expr.name) {
      return false;
    }

    const maxRecursionDepth = expr.maxRecursionDepth();

    if (maxRecursionDepth > 0) {
      return this.isAllRecursive() || this.maxRecursionDepth() >= maxRecursionDepth;
    }

    return _.every(expr.children, (child, childName) => {
      var ownSubExpression = this.childExpression(childName);
      var subExpression = expr.childExpression(childName);

      return ownSubExpression && ownSubExpression.isSubExpression(subExpression);
    });
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

  childExpression(childName) {
    if (this.isAllRecursive() || (childName === this.name && this._recursionDepth < this.maxRecursionDepth() - 1)) {
      return new RelationExpression(this, this._recursionDepth + 1, this._filters);
    }

    if (this.children[childName]) {
      return new RelationExpression(this.children[childName], 0, this._filters);
    } else {
      return null;
    }
  }

  clone() {
    const node = {
      name: this.name,
      args: this.args,
      numChildren: this.numChildren,
      children: _.cloneDeep(this.children)
    };

    const filters = _.clone(this._filters);
    return new RelationExpression(node, this._recursionDepth, filters);
  }

  forEachChild(cb) {
    if (this.numChildren) {
      const keys = Object.keys(this.children);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const childName = keys[i];

        if (!ALL_RECURSIVE_REGEX.test(childName) && !RECURSIVE_REGEX.test(childName)) {
          cb(this.children[childName], childName);
        }
      }
    }
  }

  addAnonymousFilterAtPath(path, filter) {
    let filterNodes = this._nodesAtPath(path);
    let filters = this.filters;

    let idx = 0;
    let filterName = `_efe0_`;

    while (filters[filterName]) {
      filterName = `_efe${++idx}_`;
    }

    if (!_.isEmpty(filterNodes)) {
      filters[filterName] = filter;
      _.each(filterNodes, node => node.args.push(filterName));
    }
  }

  toString() {
    return toString(this);
  }

  _nodesAtPath(pathExpression) {
    let path = RelationExpression.parse(pathExpression);
    let nodes = [];

    RelationExpression.nodesAtPath(this, path, nodes);
    return nodes;
  }

  static nodesAtPath(target, path, expressions) {
    if (path.numChildren == 0) {
      expressions.push(target);
    } else {
      _.forOwn(path.children, child => {
        const targetChild = target.children[child.name];

        if (targetChild) {
          this.nodesAtPath(targetChild, child, expressions);
        }
      });
    }
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
  let childExpr = _.values(node.children).map(toString);

  if (childExpr.length > 1) {
    childExpr = `[${childExpr.join(', ')}]`;
  } else {
    childExpr = childExpr[0];
  }

  let str = node.name;

  if (node.args.length) {
    str += `(${node.args.join(', ')})`;
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

function newNode(name) {
  return {
    name: name || '',
    args: [],
    children: Object.create(null),
    numChildren: 0
  };
}

module.exports = RelationExpression;