import _ from 'lodash';
import parser from './parsers/relationExpressionParser';
import ValidationError from './../ValidationError';

const RECURSIVE_REGEX = /^\^(\d*)$/;
const ALL_RECURSIVE_REGEX = /^\*$/;

export default class RelationExpression {

  constructor(node, recursionDepth) {
    node = node || {};

    this.name = node.name || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || {};

    Object.defineProperty(this, 'recursionDepth', {
      enumerable: false,
      value: recursionDepth || 0
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

    return _.all(expr.children, (child, childName) => {
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

    return _.map(this.children, (val, key) => {
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
    })[0];
  }

  /**
   * @returns {boolean}
   */
  isAllRecursive() {
    return this.numChildren === 1 && _.all(this.children, (val, key) => ALL_RECURSIVE_REGEX.test(key));
  }

  /**
   * @returns {RelationExpression}
   */
  childExpression(childName) {
    if (this.isAllRecursive() || (childName === this.name && this.recursionDepth < this.maxRecursionDepth() - 1)) {
      return new RelationExpression(this, this.recursionDepth + 1);
    }

    if (this.children[childName]) {
      return new RelationExpression(this.children[childName]);
    } else {
      return null;
    }
  }

  /**
   * @returns {RelationExpression}
   */
  clone() {
    return new RelationExpression(JSON.parse(JSON.stringify(this)));
  }

  forEachChild(cb) {
    _.each(this.children, (child, childName) => {
      if (!ALL_RECURSIVE_REGEX.test(childName) && !RECURSIVE_REGEX.test(childName)) {
        cb(child, childName);
      }
    });
  }

  /**
   * @return {Array.<RelationExpression>}
   */
  expressionsAtPath(pathExpression) {
    let path = RelationExpression.parse(pathExpression);
    let expressions = [];
    RelationExpression.expressionsAtPath(this, path, expressions);
    return expressions;
  }

  /**
   * @private
   */
  static expressionsAtPath(target, path, expressions) {
    if (path.numChildren == 0) {
      expressions.push(target);
    } else {
      _.each(path.children, child => {
        let targetChild = target.children[child.name];

        if (targetChild) {
          this.expressionsAtPath(targetChild, child, expressions);
        }
      });
    }
  }
}
