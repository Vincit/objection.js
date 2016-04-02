import _ from 'lodash';
import parser from './parsers/relationExpressionParser';
import ValidationError from './../ValidationError';

export default class RelationExpression {

  constructor(node) {
    node = node || {};
    this.name = node.name || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || {};
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

    if (expr.isRecursive()) {
      return this.isAllRecursive() || this.isRecursive();
    }

    return _.all(expr.children, (child, childName) => {
      var ownSubExpression = this.childExpression(childName);
      var subExpression = expr.childExpression(childName);

      return ownSubExpression && ownSubExpression.isSubExpression(subExpression);
    });
  }

  /**
   * @returns {boolean}
   */
  isRecursive() {
    return !!this.children['^'];
  }

  /**
   * @returns {boolean}
   */
  isAllRecursive() {
    return this.numChildren === 1 && !!this.children['*'];
  }

  /**
   * @returns {RelationExpression}
   */
  childExpression(childName) {
    if (this.isAllRecursive() || (this.isRecursive() && childName === this.name)) {
      return this;
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
      if (childName !== '*' && childName !== '^') {
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
