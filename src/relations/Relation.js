import _ from 'lodash';
import {inherits, isSubclassOf} from '../utils/classUtils';
import {memoize} from '../utils/decorators';
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
 * @property {string|Array.<string>} from
 *    The relation column in the owner table. Must be given with the table name.
 *    For example `Person.id`. Composite key can be specified using an array of
 *    columns e.g. `['Person.a', 'Person.b']`. Note that neither this nor `to`
 *    need to be foreign keys or primary keys. You can join any column to
 *    any column.
 *
 * @property {string|Array.<string>} to
 *    The relation column in the related table. Must be given with the table name.
 *    For example `Movie.id`. Composite key can be specified using an array of
 *    columns e.g. `['Movie.a', 'Movie.b']`. Note that neither this nor `from`
 *    need to be foreign keys or primary keys. You can join any column to any column.
 *
 * @property {Object} through
 *    Describes the join table if the models are related through one.
 *
 * @property {Class.<Model>} through.modelClass
 *    If the there is model class available for the join table, it can be provided
 *    using this property.
 *
 * @property {string|Array.<string>} through.from
 *    The column that is joined to `from` property of the `RelationJoin`. For example
 *    `Person_Movie.actorId` where `Person_Movie` is the join table. Composite key can
 *    be specified using an array of columns e.g. `['Person_Movie.a', 'Person_Movie.b']`.
 *
 * @property {string|Array.<string>} through.to
 *    The column that is joined to `to` property of the `RelationJoin`. For example
 *    `Person_Movie.movieId` where `Person_Movie` is the join table. Composite key can
 *    be specified using an array of columns e.g. `['Person_Movie.a', 'Person_Movie.b']`.
 */

/**
 * @typedef {Object} RelationMapping
 *
 * @property {Class.<Model>|string} modelClass
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
     * @type {Class.<Model>}
     */
    this.ownerModelClass = OwnerClass;

    /**
     * The related class.
     *
     * This must be a subclass of Model.
     *
     * @type {Class.<Model>}
     */
    this.relatedModelClass = null;

    /**
     * The relation column in the owner table.
     *
     * @type {Array.<string>}
     */
    this.ownerCol = null;

    /**
     * The relation property in the owner model.
     *
     * @type {Array.<string>}
     */
    this.ownerProp = null;

    /**
     * The relation column in the related table.
     *
     * @type {Array.<string>}
     */
    this.relatedCol = null;

    /**
     * The relation property in the related model.
     *
     * @type {Array.<string>}
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
   * @return {Class.<Model>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
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

    if (!isSubclassOf(this.ownerModelClass, Model)) {
      this.throwError('Relation\'s owner is not a subclass of Model');
    }

    if (!mapping.modelClass) {
      this.throwError('modelClass is not defined');
    }

    if (_.isString(mapping.modelClass)) {
      try {
        // babel 6 style of exposing es6 exports to commonjs https://github.com/babel/babel/issues/2683
        let relatedModelClassModule = require(mapping.modelClass);
        this.relatedModelClass = isSubclassOf(relatedModelClassModule.default, Model) ?
          relatedModelClassModule.default : relatedModelClassModule;
      } catch (err) {
        this.throwError('modelClass is an invalid file path to a model class.');
      }

      if (!isSubclassOf(this.relatedModelClass, Model)) {
        this.throwError('modelClass is a valid path to a module, but the module doesn\'t export a Model subclass.');
      }
    } else {
      this.relatedModelClass = mapping.modelClass;

      if (!isSubclassOf(this.relatedModelClass, Model)) {
        this.throwError('modelClass is not a subclass of Model or a file path to a module that exports one.');
      }
    }

    if (!mapping.relation) {
      this.throwError('relation is not defined');
    }

    if (!isSubclassOf(mapping.relation, Relation)) {
      this.throwError('relation is not a subclass of Relation');
    }

    if (!mapping.join || !mapping.join.from || !mapping.join.to) {
      this.throwError('join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}');
    }

    let joinOwner = null;
    let joinRelated = null;

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTo = this.parseReference(mapping.join.to);

    if (!joinFrom.table || _.isEmpty(joinFrom.columns)) {
      this.throwError('join.from must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (!joinTo.table || _.isEmpty(joinTo.columns)) {
      this.throwError('join.to must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (joinFrom.table === this.ownerModelClass.tableName) {
      joinOwner = joinFrom;
      joinRelated = joinTo;
    } else if (joinTo.table === this.ownerModelClass.tableName) {
      joinOwner = joinTo;
      joinRelated = joinFrom;
    } else {
      this.throwError('join: either `from` or `to` must point to the owner model table.');
    }

    if (joinRelated.table !== this.relatedModelClass.tableName) {
      this.throwError('join: either `from` or `to` must point to the related model table.');
    }

    this.ownerCol = joinOwner.columns;
    this.ownerProp = this.propertyName(this.ownerCol, this.ownerModelClass);
    this.relatedCol = joinRelated.columns;
    this.relatedProp = this.propertyName(this.relatedCol, this.relatedModelClass);
    this.filter = this.parseFilter(mapping);
  }

  /**
   * Return the knex connection.
   */
  knex() {
    return this.ownerModelClass.knex();
  }

  /**
   * Reference to the relation column in the owner model's table.
   *
   * For example: [`Person.id`].
   *
   * @returns {Array.<string>}
   */
  @memoize
  fullOwnerCol() {
    return _.map(this.ownerCol, col => this.ownerModelClass.tableName + '.' + col);
  }

  /**
   * Reference to the relation column in the related model's table.
   *
   * For example: [`Movie.id`].
   *
   * @returns {Array.<string>}
   */
  @memoize
  fullRelatedCol() {
    return _.map(this.relatedCol, col => this.relatedModelClass.tableName + '.' + col);
  }

  /**
   * Alias to use for the related table when joining with the owner table.
   *
   * For example: `Movie_rel_movies`.
   *
   * @returns {string}
   */
  @memoize
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
    let modelsById = Object.create(null);

    models1 = _.compact(models1);
    models2 = _.compact(models2);

    _.forEach(models1, function (model) {
      modelsById[model.$id()] = model;
    });

    _.forEach(models2, function (model) {
      modelsById[model.$id()] = model;
    });

    let models = _.values(modelsById);
    if (models.length === 0) {
      return [];
    }

    let modelClass = models[0].constructor;
    let idProperty = modelClass.getIdProperty();
    if (!_.isArray(idProperty)) {
      idProperty = [idProperty];
    }

    return _.sortByAll(models, idProperty);
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Array.<string>|Array.<Array.<(string|number)>>} ownerIds
   * @param {boolean=} isColumnRef
   * @returns {QueryBuilder}
   */
  findQuery(builder, ownerIds, isColumnRef) {
    let fullRelatedCol = this.fullRelatedCol();

    if (isColumnRef) {
      _.each(fullRelatedCol, (col, idx) => {
        builder.whereRef(col, ownerIds[idx]);
      });
    } else {
      if (_(ownerIds).flatten().all(id => _.isNull(id) || _.isUndefined(id))) {
        // Nothing to fetch.
        builder.resolve([]);
      } else {
        builder.whereInComposite(fullRelatedCol, ownerIds);
      }
    }

    return builder.call(this.filter);
  }

  /**
   * @param {QueryBuilder} builder
   * @param {string=} joinMethod
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod) {
    joinMethod = joinMethod || 'join';

    let relatedTable = this.relatedModelClass.tableName;
    let relatedTableAlias = this.relatedTableAlias();

    let relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
    let relatedCol = _.map(this.relatedCol, col => relatedTableAlias + '.' + col);
    let ownerCol = this.fullOwnerCol();

    return builder
      [joinMethod](relatedTableAsAlias, join => {
        _.each(relatedCol, (relatedCol, idx) => {
          join.on(relatedCol, '=', ownerCol[idx]);
        });
      })
      .call(this.filter);
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Array.<Model>} owners
   */
  find(builder, owners) {
    this.throwError('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @param {InsertionOrUpdate} insertion
   */
  insert(builder, owner, insertion) {
    this.throwError('not implemented');
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @param {InsertionOrUpdate} update
   */
  update(builder, owner, update) {
    builder.onBuild(builder => {
      this.findQuery(builder, [owner.$values(this.ownerProp)]);
      builder.$$update(update);
    });
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @param {InsertionOrUpdate} patch
   */
  patch(builder, owner, patch) {
    return this.update(builder, owner, patch);
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   */
  delete(builder, owner) {
    builder.onBuild(builder => {
      this.findQuery(builder, [owner.$values(this.ownerProp)]);
      builder.$$delete();
    });
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   * @param {number|string|Array.<number|string>|Array.<Array.<number|string>>} ids
   */
  relate(builder, owner, ids) {
    this.throwError('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model|Object} owner
   */
  unrelate(builder, owner) {
    this.throwError('not implemented');
  }

  /**
   * @protected
   */
  propertyName(columns, modelClass) {
    return _.map(columns, column => {
      let propertyName = modelClass.columnNameToPropertyName(column);

      if (!propertyName) {
        throw new Error(modelClass.name +
          '.$parseDatabaseJson probably transforms the value of the column ' + column + '.' +
          ' This is a no-no because ' + column +
          ' is needed in the relation ' + this.ownerModelClass.tableName + '.' + this.name);
      }

      return propertyName;
    });
  }

  /**
   * @protected
   */
  parseFilter(mapping) {
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
  parseReference(ref) {
    if (!_.isArray(ref)) {
      ref = [ref];
    }

    let table = null;
    let columns = [];

    for (let i = 0; i < ref.length; ++i) {
      let parts = ref[i].split('.');
      let tableName = parts[0] && parts[0].trim();
      let columnName = parts[1] && parts[1].trim();

      if (!tableName || (table && table !== tableName) || !columnName) {
        return {
          table: null,
          columns: []
        };
      } else {
        table = tableName;
      }

      columns.push(columnName);
    }

    return {
      table: table,
      columns: columns
    };
  }

  /**
   * @protected
   */
  normalizeId(ids, compositeLength) {
    let isComposite = compositeLength > 1;

    if (isComposite) {
      // For composite ids these two are okay:
      //
      // 1. [1, 3, 4]
      // 2. [[1, 3, 4], [4, 6, 1]]
      //
      if (!_.isArray(ids) || (!_.isArray(ids[0]) && ids.length !== compositeLength)) {
        this.throwError(`Invalid composite key ${ids}`);
      }

      // Normalize to array of arrays.
      if (!_.isArray(ids[0])) {
        ids = [ids];
      }
    } else {
      // Normalize to array of arrays.
      if (!_.isArray(ids)) {
        ids = [[ids]];
      } else if (!_.isArray(ids[0])) {
        ids = _.map(ids, id => [id]);
      }
    }

    _.each(ids, id => {
      if (id.length !== compositeLength) {
        this.throwError(`Id ${id} has invalid length. Expected ${compositeLength}`)
      }
    });

    return ids;
  }

  /**
   * @protected
   */
  throwError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      throw new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      throw new Error(`${this.constructor.name}: ${message}`);
    }
  }
}