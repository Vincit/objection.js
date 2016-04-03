import _ from 'lodash';
import {inherits, isSubclassOf} from '../utils/classUtils';
import memoize from '../utils/decorators/memoize';
import QueryBuilder from '../queryBuilder/QueryBuilder';

/**
 * @typedef {Object} RelationJoin

 * @property {string|Array.<string>} from
 * @property {string|Array.<string>} to
 * @property {Object} through
 * @property {Constructor.<Model>} through.modelClass
 * @property {string|Array.<string>} through.from
 * @property {string|Array.<string>} through.to
 * @property {Array.<string>} through.extra
 */

/**
 * @typedef {Object} RelationMapping
 *
 * @property {Constructor.<Model>|string} modelClass
 * @property {Relation} relation
 * @property {Object|function(QueryBuilder)} filter
 * @property {RelationJoin} [join]
 */

/**
 * @abstract
 */
export default class Relation {

  constructor(relationName, OwnerClass) {
    /**
     * @type {string}
     */
    this.name = relationName;

    /**
     * @type {Constructor.<Model>}
     */
    this.ownerModelClass = OwnerClass;

    /**
     * @type {Constructor.<Model>}
     */
    this.relatedModelClass = null;

    /**
     * @type {Array.<string>}
     */
    this.ownerCol = null;

    /**
     * @type {Array.<string>}
     */
    this.ownerProp = null;

    /**
     * @type {Array.<string>}
     */
    this.relatedCol = null;

    /**
     * @type {Array.<string>}
     */
    this.relatedProp = null;

    /**
     * @type {function (QueryBuilder)}
     */
    this.filter = null;
  }

  /**
   * @param {function=} subclassConstructor
   * @return {Constructor.<Model>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
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
   * @returns {knex}
   */
  knex() {
    return this.ownerModelClass.knex();
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullOwnerCol() {
    return _.map(this.ownerCol, col => this.ownerModelClass.tableName + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullRelatedCol() {
    return _.map(this.relatedCol, col => this.relatedModelClass.tableName + '.' + col);
  }

  /**
   * @returns {string}
   */
  @memoize
  relatedTableAlias() {
    return this.relatedModelClass.tableName + '_rel_' + this.name;
  }

  /**
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
   * @param {knex} knex
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

    return _.sortByAll(models, _.isArray(idProperty) ? idProperty : [idProperty]);
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
   * @param {string=} relatedTableAlias
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod, relatedTableAlias) {
    joinMethod = joinMethod || 'join';
    relatedTableAlias = relatedTableAlias || this.relatedTableAlias();

    let relatedTable = this.relatedModelClass.tableName;
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

  /**
   * @param {QueryBuilder} builder
   * @param {Array.<Model>} owners
   */
  find(builder, owners) {
    builder.onBuild(builder => {
      let ids = _(owners)
        .map(owner => owner.$values(this.ownerProp))
        .unique(id => id.join())
        .value();

      this.findQuery(builder, ids);
    });

    builder.runAfterModelCreate(related => {
      this.createRelationProp(owners, related);
      return related;
    });
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @protected
   */
  createRelationProp(owners, related) {
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
      const refItem = ref[i];
      const ndx = refItem.lastIndexOf('.');
      let tableName = refItem.substr(0, ndx).trim();
      let columnName = refItem.substr(ndx + 1, refItem.length).trim();

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
  throwError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      throw new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      throw new Error(`${this.constructor.name}: ${message}`);
    }
  }
}