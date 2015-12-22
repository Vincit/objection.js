import _ from 'lodash';
import utils from '../utils';
import QueryBuilder from '../queryBuilder/QueryBuilder';

/**
 * @typedef {Object} RelationJoin
 *
 * An object literal that describes how two tables are related to one another. For example:
 *
 * ```js
 * {
 *   from: 'Animal.ownerId',
 *   to: 'Person.id'
 * }
 * ```
 *
 * or in the case of a many-to-many relation:
 *
 * ```js
 * {
 *   from: 'Person.id',
 *   through: {
 *     from: 'Person_Movie.actorId',
 *     to: 'Person_Movie.movieId'
 *   },
 *   to: 'Movie.id'
 * }
 * ```
 *
 * @property {string} from
 *    The relation column in the owner table. Must be given with the table name.
 *    For example `Person.id`. Note that neither this nor `to` need to be foreign
 *    keys or primary keys. You can join any column to any column.
 *
 * @property {string} to
 *    The relation column in the related table. Must be given with the table name.
 *    For example `Movie.id`. Note that neither this nor `from` need to be foreign
 *    keys or primary keys. You can join any column to any column.
 *
 * @property {Object} through
 *    Describes the join table if the models are related through one.
 *
 * @property {Model} through.modelClass
 *    If the there is model class available for the join table, it can be provided
 *    using this property.
 *
 * @property {string} through.from
 *    The column that is joined to `from` property of the `RelationJoin`. For example
 *    `Person_Movie.actorId` where `Person_Movie` is the join table.
 *
 * @property {string} through.to
 *    The column that is joined to `to` property of the `RelationJoin`. For example
 *    `Person_Movie.movieId` where `Person_Movie` is the join table.
 */

/**
 * @typedef {Object} RelationMapping
 *
 * @property {Model|string} modelClass
 *    A {@link Model} subclass constructor or an absolute path to a module that exports one.
 *
 * @property {Relation} relation
 *    A relation constructor. You can use one of Model.OneToOneRelation, Model.OneToManyRelation and
 *    Model.ManyToManyRelation or even write your own relation type by subclassing {@link Relation}.
 *
 * @property {Object|function(QueryBuilder)} filter
 *    Additional filter for the relation. It can be either a hash of {column: 'value'} pairs or
 *    a function that takes a QueryBuilder as a parameter.
 *
 * @property {RelationJoin} [join]
 *    An object that describes how the two models are related.
 */

/**
 * Represents a relation between two `Model` subclasses.
 *
 * This is an abstract base class and should never be instantiated.
 *
 * @param {string} relationName
 *    Name of the relation.
 *
 * @param {Model} OwnerClass
 *    The Model subclass that owns this relation.
 *
 * @ignore
 * @abstract
 */
export default class Relation {

  constructor(relationName, OwnerClass) {
    /**
     * Name of the relation.
     *
     * @type {string}
     */
    this.name = relationName;

    /**
     * The owner class of this relation.
     *
     * This must be a subclass of Model.
     *
     * @type {Class<Model>}
     */
    this.ownerModelClass = OwnerClass;

    /**
     * The related class.
     *
     * This must be a subclass of Model.
     *
     * @type {Class<Model>}
     */
    this.relatedModelClass = null;

    /**
     * The relation column in the owner table.
     *
     * @type {string}
     */
    this.ownerCol = null;

    /**
     * The relation property in the owner model.
     *
     * @type {string}
     */
    this.ownerProp = null;

    /**
     * The relation column in the related table.
     *
     * @type {string}
     */
    this.relatedCol = null;

    /**
     * The relation property in the related model.
     *
     * @type {string}
     */
    this.relatedProp = null;

    /**
     * Optional additional filter query.
     *
     * @type {function (QueryBuilder)}
     */
    this.filter = null;
  }

  /**
   * Makes the given constructor a subclass of this class.
   *
   * @param {function=} subclassConstructor
   * @return {function}
   */
  static extend(subclassConstructor) {
    utils.inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * Constructs the instance based on a mapping data.
   *
   * @param {RelationMapping} mapping
   */
  setMapping(mapping) {
    // Avoid require loop and import here.
    let Model = require(__dirname + '/../model/Model').default;

    if (!utils.isSubclassOf(this.ownerModelClass, Model)) {
      throw new Error('Relation\'s owner is not a subclass of Model');
    }

    let errorPrefix = `${this.ownerModelClass.name}.relationMappings.${this.name}`;

    if (!mapping.modelClass) {
      throw new Error(errorPrefix + '.modelClass is not defined');
    }

    if (_.isString(mapping.modelClass)) {
      try {
        // babel 6 style of exposing es6 exports to commonjs https://github.com/babel/babel/issues/2683
        let relatedModelClassModule = require(mapping.modelClass);
        this.relatedModelClass = utils.isSubclassOf(relatedModelClassModule.default, Model) ?
          relatedModelClassModule.default : relatedModelClassModule;
      } catch (err) {
        throw new Error(errorPrefix + '.modelClass is an invalid file path to a model class.');
      }

      if (!utils.isSubclassOf(this.relatedModelClass, Model)) {
        throw new Error(errorPrefix + '.modelClass is a valid path to a module, but the module doesn\'t export a Model subclass.');
      }
    } else {
      this.relatedModelClass = mapping.modelClass;

      if (!utils.isSubclassOf(this.relatedModelClass, Model)) {
        throw new Error(errorPrefix + '.modelClass is not a subclass of Model or a file path to a module that exports one.');
      }
    }

    if (!mapping.relation) {
      throw new Error(errorPrefix + '.relation is not defined');
    }

    if (!utils.isSubclassOf(mapping.relation, Relation)) {
      throw new Error(errorPrefix + '.relation is not a subclass of Relation');
    }

    if (!mapping.join || !_.isString(mapping.join.from) || !_.isString(mapping.join.to)) {
      throw new Error(errorPrefix + '.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
    }

    let joinOwner = null;
    let joinRelated = null;

    let joinFrom = Relation.parseColumn(mapping.join.from);
    let joinTo = Relation.parseColumn(mapping.join.to);

    if (!joinFrom.table || !joinFrom.name) {
      throw new Error(errorPrefix + '.join.from must have format TableName.columnName. For example `SomeTable.id`.');
    }

    if (!joinTo.table || !joinTo.name) {
      throw new Error(errorPrefix + '.join.to must have format TableName.columnName. For example `SomeTable.id`.');
    }

    if (joinFrom.table === this.ownerModelClass.tableName) {
      joinOwner = joinFrom;
      joinRelated = joinTo;
    } else if (joinTo.table === this.ownerModelClass.tableName) {
      joinOwner = joinTo;
      joinRelated = joinFrom;
    } else {
      throw new Error(errorPrefix + '.join: either `from` or `to` must point to the owner model table.');
    }

    if (joinRelated.table !== this.relatedModelClass.tableName) {
      throw new Error(errorPrefix + '.join: either `from` or `to` must point to the related model table.');
    }

    this.ownerProp = this._propertyName(joinOwner, this.ownerModelClass);
    this.ownerCol = joinOwner.name;
    this.relatedProp = this._propertyName(joinRelated, this.relatedModelClass);
    this.relatedCol = joinRelated.name;
    this.filter = Relation.parseFilter(mapping);
  }

  /**
   * Reference to the relation column in the owner model's table.
   *
   * For example: `Person.id`.
   *
   * @returns {string}
   */
  fullOwnerCol() {
    return this.ownerModelClass.tableName + '.' + this.ownerCol;
  }

  /**
   * Reference to the relation column in the related model's table.
   *
   * For example: `Movie.id`.
   *
   * @returns {string}
   */
  fullRelatedCol() {
    return this.relatedModelClass.tableName + '.' + this.relatedCol;
  }

  /**
   * Alias to use for the related table when joining with the owner table.
   *
   * For example: `Movie_rel_movies`.
   *
   * @returns {string}
   */
  relatedTableAlias() {
    return this.relatedModelClass.tableName + '_rel_' + this.name;
  }

  /**
   * Clones this relation.
   *
   * @returns {Relation}
   */
  clone() {
    let relation = new this.constructor(this.name, this.ownerModelClass);

    relation.relatedModelClass = this.relatedModelClass;
    relation.ownerCol = this.ownerCol;
    relation.ownerProp = this.ownerProp;
    relation.relatedCol = this.relatedCol;
    relation.relatedProp = this.relatedProp;
    relation.filter = this.filter;

    return relation;
  }

  /**
   * Returns a clone of this relation with `relatedModelClass` and `ownerModelClass` bound to the given knex.
   *
   * See `Model.bindKnex`.
   *
   * @param knex
   * @returns {Relation}
   */
  bindKnex(knex) {
    let bound = this.clone();

    bound.relatedModelClass = this.relatedModelClass.bindKnex(knex);
    bound.ownerModelClass = this.ownerModelClass.bindKnex(knex);

    return bound;
  }

  /**
   * @protected
   * @param {Array.<Model>} models1
   * @param {Array.<Model>} models2
   * @returns {Array.<Model>}
   */
  mergeModels(models1, models2) {
    models1 = _.compact(models1);
    models2 = _.compact(models2);
    let modelsById = Object.create(null);

    _.forEach(models1, function (model) {
      modelsById[model.$id()] = model;
    });

    _.forEach(models2, function (model) {
      modelsById[model.$id()] = model;
    });

    return _.sortBy(_.values(modelsById), function (model) {
      return model.$id();
    })
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {number|string} ownerCol
   * @param {boolean} isColumnRef
   * @returns {QueryBuilder}
   */
  findQuery(builder, ownerCol, isColumnRef) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {string} joinMethod
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object|Array.<Model>|Array.<Object>} owners
   */
  find(builder, owners) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   * @param {InsertionOrUpdate} insertion
   */
  insert(builder, owner, insertion) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   * @param {InsertionOrUpdate} update
   */
  update(builder, owner, update) {
    return builder;
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   * @param {InsertionOrUpdate} patch
   */
  patch(builder, owner, patch) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   */
  delete(builder, owner) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   * @param {number|string|Array.<number>|Array.<string>} ids
   */
  relate(builder, owner, ids) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   */
  unrelate(builder, owner) {
    throw new Error('not implemented');
  }

  /**
   * @private
   */
  _propertyName(column, modelClass) {
    let propertyName = modelClass.columnNameToPropertyName(column.name);

    if (!propertyName) {
      throw new Error(modelClass.name +
        '.$parseDatabaseJson probably transforms the value of the column ' + column.name + '.' +
        ' This is a no-no because ' + column.name +
        ' is needed in the relation ' + this.ownerModelClass.tableName + '.' + this.name);
    }

    return propertyName;
  }

  /**
   * @protected
   */
  static parseFilter(mapping) {
    if (_.isFunction(mapping.filter)) {
      return mapping.filter;
    } else if (_.isObject(mapping.filter)) {
      return function (queryBuilder) {
        queryBuilder.where(mapping.filter);
      };
    } else {
      return _.noop;
    }
  }

  /**
   * @protected
   */
  static parseColumn(column) {
    let parts = column.split('.');

    return {
      table: parts[0] && parts[0].trim(),
      name: parts[1] && parts[1].trim()
    };
  }
}