import _ from 'lodash';
import parser from './parsers/relationExpressionParser';
import ValidationError from './../ValidationError';

const RECURSIVE_REGEX = /^\^(\d*)$/;
const ALL_RECURSIVE_REGEX = /^\*$/;

export default class RelationExpression {

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

  /**
   * @param {string|RelationExpression} expr
   * @returns {RelationExpression}
   */
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

  get filters() {
    return this._filters;
  }

  set filters(filters) {
    this._filters = filters || {};
  }

  /**
   * @param {string|RelationExpression} expr
   * @returns {boolean}
   */
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

  /**
   * @returns {number}
   */
  maxRecursionDepth() {
    if (this.numChildren !== 1) {
      return 0;
    }

    const key = Object.keys(this.children)[0];
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

  /**
   * @returns {boolean}
   */
  isAllRecursive() {
    if (this.numChildren !== 1) {
      return false;
    }

    const key = Object.keys(this.children)[0];
    return ALL_RECURSIVE_REGEX.test(key);
  }

  /**
   * @returns {RelationExpression}
   */
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

  /**
   * @returns {RelationExpression}
   */
  clone() {
    return new RelationExpression(JSON.parse(JSON.stringify(this)), this._recursionDepth, _.clone(this._filters));
  }

  forEachChild(cb) {
    _.forOwn(this.children, (child, childName) => {
      if (!ALL_RECURSIVE_REGEX.test(childName) && !RECURSIVE_REGEX.test(childName)) {
        cb(child, childName);
      }
    });
  }

  /**
   * @param {string|RelationExpression} path
   * @param {function(QueryBuilder)} filter
   */
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

  /**
   * @returns {string}
   */
  toString() {
    return toString(this);
  }

  /**
   * @private
   * @return {Array.<Object>}
   */
  _nodesAtPath(pathExpression) {
    let path = RelationExpression.parse(pathExpression);
    let nodes = [];

    RelationExpression.nodesAtPath(this, path, nodes);
    return nodes;
  }

  /**
   * @private
   */
  static nodesAtPath(target, path, expressions) {
    if (path.numChildren == 0) {
      expressions.push(target);
    } else {
      _.forOwn(path.children, child => {
        let targetChild = target.children[child.name];

        if (targetChild) {
          this.nodesAtPath(targetChild, child, expressions);
        }
      });
    }
  }
}

function toString(node) {
  let childExpr = _.values(node.children).map(toString);

  if (childExpr.length > 1) {
    childExpr = '[' + childExpr.join(', ') + ']';
  } else {
    childExpr = childExpr[0];
  }

  let str = node.name;

  if (node.args.length) {
    str += '(' + node.args.join(', ') + ')'
  }

  if (childExpr) {
    if (str) {
      return str + '.' + childExpr;
    } else {
      return childExpr;
    }
  } else {
    return str;
  }
}
