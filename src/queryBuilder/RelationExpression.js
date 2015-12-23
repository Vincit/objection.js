import _ from 'lodash';
import parser from './parsers/relationExpressionParser';
import ValidationError from './../ValidationError';

/**
 * Relation expression is a simple DSL for expressing relation trees.
 *
 * For example an expression `children.[movies.actors.[pets, children], pets]` represents a tree:
 *
 * ```
 *               children
 *               (Person)
 *                  |
 *          -----------------
 *          |               |
 *        movies           pets
 *       (Movie)         (Animal)
 *          |
 *        actors
 *       (Person)
 *          |
 *     -----------
 *     |         |
 *    pets    children
 *  (Animal)  (Person)
 *
 * ```
 *
 * The model classes are shown in parenthesis.
 *
 * This class rarely needs to be used directly. The relation expression can be given to a bunch
 * of functions in objection.js. For example:
 *
 * ```js
 * Person
 *   .query()
 *   .eager('children.[movies.actors.[pets, children], pets]')
 *   .then(function (persons) {
 *     // All persons have the given relation tree fetched.
 *     console.log(persons[0].children[0].movies[0].actors[0].pets[0].name);
 *   });
 * ```
 *
 * There are two tokens that have special meaning: `*` and `^`. `*` means "all relations recursively" and
 * `^` means "this relation recursively".
 *
 * For example `children.*` means "relation `children` and all its relations, and all their relations and ...".
 * The `*` token must be used with caution or you will end up fetching your entire database.
 *
 * Expression `parent.^` is equivalent to `parent.parent.parent.parent...` up to the point a relation no longer
 * has results for the `parent` relation.
 *
 * Relation expressions can also have arguments. Arguments are listed in parenthesis after the relation names
 * like this:
 *
 * ```js
 * children(arg1, arg2).[movies.actors(arg3), pets]
 * ```
 *
 * In this example `children` relation had arguments `arg1` and `arg2` and `actors` relation had
 * the argument `arg3`.
 */
export default class RelationExpression {

  constructor(node) {
    node = node || {};
    this.name = node.name || null;
    this.args = node.args || [];
    this.numChildren = node.numChildren || 0;
    this.children = node.children || {};
  }

  /**
   * Parses an expression string into a {@link RelationExpression} object.
   *
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
   * Tests if another expression is a sub expression of this one.
   *
   * Expression B is a sub expression of expression A if:
   *
   * - A and B have the same root
   * - And each path from root to a leaf in B can be found in A
   *
   * For example sub expressions of `children.[movies.actors, pets]` are:
   *
   * - `children`
   * - `children.movies`
   * - `children.pets`
   * - `children.movies.actors`
   * - `children.[movies, pets]`
   * - `children.[movies.actors, pets]`
   *
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
   * @ignore
   * @returns {boolean}
   */
  isRecursive() {
    return !!_.find(this.children, {name: '^'});
  }

  /**
   * @ignore
   * @returns {boolean}
   */
  isAllRecursive() {
    return this.numChildren === 1 && this.children[Object.keys(this.children)[0]].name === '*';
  }

  /**
   * @ignore
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
   * @ignore
   */
  forEachChild(cb) {
    _.each(this.children, (child, childName) => {
      if (childName !== '*' && childName !== '^') {
        cb(child, childName);
      }
    });
  }
}
