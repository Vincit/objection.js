import _ from 'lodash';
import Relation from './Relation';
import inheritModel from '../model/inheritModel';
import {overwriteForDatabase} from '../utils/dbUtils';
import {isSubclassOf} from '../utils/classUtils';
import {memoize} from '../utils/decorators';

const ownerJoinColumnAliasPrefix = 'objectiontmpjoin';
const sqliteBuiltInRowId = '_rowid_';

/**
 * @ignore
 * @extends Relation
 */
@overwriteForDatabase()
export default class ManyToManyRelation extends Relation {

  constructor(...args) {
    super(...args);

    /**
     * The join table.
     *
     * @type {string}
     */
    this.joinTable = null;

    /**
     * The relation column in the join table that points to the owner table.
     *
     * @type {Array.<string>}
     */
    this.joinTableOwnerCol = null;

    /**
     * The relation property in the join model that points to the owner table.
     *
     * @type {Array.<string>}
     */
    this.joinTableOwnerProp = null;

    /**
     * The relation column in the join table that points to the related table.
     *
     * @type {Array.<string>}
     */
    this.joinTableRelatedCol = null;

    /**
     * The relation property in the join model that points to the related table.
     *
     * @type {Array.<string>}
     */
    this.joinTableRelatedProp = null;

    /**
     * The join table model class.
     *
     * This can be optionally given using the `join.through.modelClass` property,
     * otherwise an anonymous model class is created in `setMapping` method.
     *
     * @type {Class.<Model>}
     */
    this.joinTableModelClass = null;
  }

  /**
   * @override
   * @inheritDoc
   */
  setMapping(mapping) {
    let retVal = super.setMapping(mapping);

    // Avoid require loop and import here.
    let Model = require(__dirname + '/../model/Model').default;

    if (!_.isObject(mapping.join.through)) {
      this.throwError('join must have the `through` that describes the join table.');
    }

    if (!mapping.join.through.from || !mapping.join.through.to) {
      this.throwError('join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}');
    }

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTableFrom = this.parseReference(mapping.join.through.from);
    let joinTableTo = this.parseReference(mapping.join.through.to);

    if (!joinTableFrom.table || _.isEmpty(joinTableFrom.columns)) {
      this.throwError('join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    }

    if (!joinTableTo.table || _.isEmpty(joinTableTo.columns)) {
      this.throwError('join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    }

    if (joinTableFrom.table !== joinTableTo.table) {
      this.throwError('join.through `from` and `to` must point to the same join table.');
    }

    this.joinTable = joinTableFrom.table;

    if (joinFrom.table === this.ownerModelClass.tableName) {
      this.joinTableOwnerCol = joinTableFrom.columns;
      this.joinTableRelatedCol = joinTableTo.columns;
    } else {
      this.joinTableRelatedCol = joinTableFrom.columns;
      this.joinTableOwnerCol = joinTableTo.columns;
    }

    if (mapping.join.through.modelClass) {
      let modelClass = mapping.join.through.modelClass;

      try {
        if (_.isString(modelClass)) {
          modelClass = require(modelClass);

          // Compatibility with babel `export default`.
          if (!isSubclassOf(modelClass, Model) && isSubclassOf(modelClass.default, Model)) {
            modelClass = modelClass.default;
          }
        }
      } catch (err) {
        // Do nothing.
      }

      if (!isSubclassOf(modelClass, Model)) {
        this.throwError('Join table model class is not a subclass of Model');
      }

      this.joinTableModelClass = modelClass;
    } else {
      this.joinTableModelClass = inheritModel(Model);
      this.joinTableModelClass.tableName = this.joinTable;
      // We cannot know if the join table has a primary key. Therefore we set some
      // known column as the idColumn so that inserts will work.
      this.joinTableModelClass.idColumn = this.joinTableRelatedCol;
    }

    this.joinTableOwnerProp = this.propertyName(this.joinTableOwnerCol, this.joinTableModelClass);
    this.joinTableRelatedProp = this.propertyName(this.joinTableRelatedCol, this.joinTableModelClass);

    return retVal;
  }

  /**
   * Reference to the column in the join table that refers to `fullOwnerCol()`.
   *
   * For example: [`Person_Movie.actorId`].
   *
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableOwnerCol() {
    return _.map(this.joinTableOwnerCol, col => this.joinTable + '.' + col);
  }

  /**
   * Reference to the column in the join table that refers to `fullRelatedCol()`.
   *
   * For example: [`Person_Movie.movieId`].
   *
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableRelatedCol() {
    return _.map(this.joinTableRelatedCol, col => this.joinTable + '.' + col);
  }

  /**
   * Alias to use for the join table when joining with the owner table.
   *
   * For example: `Person_Movie_rel_movies`.
   *
   * @returns {string}
   */
  joinTableAlias() {
    return this.joinTable + '_rel_' + this.name;
  }

  /**
   * @inheritDoc
   * @override
   */
  clone() {
    let relation = super.clone();

    relation.joinTable = this.joinTable;
    relation.joinTableOwnerCol = this.joinTableOwnerCol;
    relation.joinTableOwnerProp = this.joinTableOwnerProp;
    relation.joinTableRelatedCol = this.joinTableRelatedCol;
    relation.joinTableRelatedProp = this.joinTableRelatedProp;
    relation.joinTableModelClass = this.joinTableModelClass;

    return relation;
  }

  /**
   * @inheritDoc
   * @override
   */
  bindKnex(knex) {
    let bound = super.bindKnex(knex);
    bound.joinTableModelClass = this.joinTableModelClass.bindKnex(knex);
    return bound;
  }

  /**
   * @override
   * @inheritDoc
   * @returns {QueryBuilder}
   */
  findQuery(builder, ownerIds, isColumnRef) {
    let fullRelatedCol = this.fullRelatedCol();

    builder.join(this.joinTable, join => {
      _.each(this.fullJoinTableRelatedCol(), (joinTableRelatedCol, idx) => {
        join.on(joinTableRelatedCol, fullRelatedCol[idx]);
      });
    });

    if (isColumnRef) {
      _.each(this.fullJoinTableOwnerCol(), (joinTableOwnerCol, idx) => {
        builder.whereRef(joinTableOwnerCol, ownerIds[idx]);
      });
    } else {
      if (_(ownerIds).flatten().all(id => _.isNull(id) || _.isUndefined(id))) {
        // Nothing to fetch.
        builder.resolve([]);
      } else {
        builder.whereInComposite(this.fullJoinTableOwnerCol(), ownerIds);
      }
    }

    return builder.call(this.filter);
  }

  /**
   * @override
   * @inheritDoc
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod) {
    joinMethod = joinMethod || 'join';

    let joinTable = this.joinTable;
    let relatedTable = this.relatedModelClass.tableName;

    let joinTableAlias = this.joinTableAlias();
    let relatedTableAlias = this.relatedTableAlias();

    let joinTableAsAlias = joinTable + ' as ' +  joinTableAlias;
    let relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;

    let joinTableOwnerCol = _.map(this.joinTableOwnerCol, col => joinTableAlias + '.' + col);
    let joinTableRelatedCol = _.map(this.joinTableRelatedCol, col => joinTableAlias + '.' + col);

    let ownerCol = this.fullOwnerCol();
    let relatedCol = _.map(this.relatedCol, col => relatedTableAlias + '.' + col);

    return builder
      [joinMethod](joinTableAsAlias, join => {
        _.each(joinTableOwnerCol, (joinTableOwnerCol, idx) => {
          join.on(joinTableOwnerCol, ownerCol[idx]);
        });
      })
      [joinMethod](relatedTableAsAlias, join => {
        _.each(joinTableRelatedCol, (joinTableRelatedCol, idx) => {
          join.on(joinTableRelatedCol, relatedCol[idx]);
        });
      })
      .call(this.filter);
  }

  /**
   * @override
   * @inheritDoc
   */
  find(builder, owners) {
    const ownerJoinColumnAlias = _.times(this.joinTableOwnerCol.length, idx => ownerJoinColumnAliasPrefix + idx);
    const ownerJoinPropertyAlias = _.map(ownerJoinColumnAlias, alias => this.relatedModelClass.columnNameToPropertyName(alias));

    builder.onBuild(builder => {
      let ids = _(owners)
        .map(owner => owner.$values(this.ownerProp))
        .unique(id => id.join())
        .value();

      if (!builder.has(/select/)) {
        // If the user hasn't specified a select clause, select the related model's columns.
        // If we don't do this we also get the join table's columns.
        builder.select(this.relatedModelClass.tableName + '.*');
      }

      this.findQuery(builder, ids);

      // We must select the owner join columns so that we know for which owner model the related
      // models belong to after the requests.
      _.each(this.fullJoinTableOwnerCol(), (fullJoinTableOwnerCol, idx) => {
        builder.select(fullJoinTableOwnerCol + ' as ' + ownerJoinColumnAlias[idx]);
      });
    });

    builder.runAfterModelCreate(related => {
      let relatedByOwnerId = _.groupBy(related, related => related.$values(ownerJoinPropertyAlias));

      _.each(owners, owner => {
        owner[this.name] = relatedByOwnerId[owner.$values(this.ownerProp)] || [];
      });

      // Delete the temporary join aliases.
      _.each(related, rel => {
        _.each(ownerJoinPropertyAlias, alias => {
          delete rel[alias];
        });
      });

      return related;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  insert(builder, owner, insertion) {
    builder.onBuild(builder => {
      builder.$$insert(insertion);
    });

    builder.runAfterModelCreate(related => {
      let ownerId = owner.$values(this.ownerProp);
      let relatedIds = _.map(related, related => related.$values(this.relatedProp));
      let joinModels = this._createJoinModels(ownerId, relatedIds);

      owner[this.name] = this.mergeModels(owner[this.name], related);

      // Insert the join rows to the join table.
      return this.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .return(related);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  update(builder, owner, update) {
    builder.onBuild(builder => {
      this._selectForModify(builder, owner).$$update(update).call(this.filter);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  delete(builder, owner) {
    builder.onBuild(builder => {
      this._selectForModify(builder, owner).$$delete().call(this.filter);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  relate(builder, owner, ids) {
    ids = this.normalizeId(ids, this.relatedProp.length);

    builder.setQueryExecutor(builder => {
      let joinModels = this._createJoinModels(owner.$values(this.ownerProp), ids);

      return this.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .runAfter(_.constant({}));
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  @overwriteForDatabase({
    sqlite3: 'unrelate_sqlite3'
  })
  unrelate(builder, owner) {
    builder.setQueryExecutor(builder => {
      let selectRelatedColQuery = this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .copyFrom(builder, /where/i)
        .select(this.fullRelatedCol())
        .call(this.filter);

      return this.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .delete()
        .whereComposite(this.fullJoinTableOwnerCol(), owner.$values(this.ownerProp))
        .whereInComposite(this.fullJoinTableRelatedCol(), selectRelatedColQuery)
        .runAfter(_.constant({}));
    });
  }

  /**
   * Special unrelate implementation for sqlite3. sqlite3 doesn't support multi-value
   * where-in clauses. We need to use the built-in _rowid_ instead.
   *
   * @private
   */
  unrelate_sqlite3(builder, owner) {
    builder.setQueryExecutor(builder => {
      let joinTableAlias = this.joinTableAlias();
      let joinTableAsAlias = this.joinTable + ' as ' + joinTableAlias;
      let joinTableAliasRowId = joinTableAlias + '.' + sqliteBuiltInRowId;
      let joinTableRowId = this.joinTable + '.' + sqliteBuiltInRowId;

      let ownerId = owner.$values(this.ownerProp);
      let fullRelatedCol = this.fullRelatedCol();

      let selectRelatedQuery = this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .copyFrom(builder, /where/i)
        .select(joinTableAliasRowId)
        .call(this.filter)
        .whereComposite(this.fullJoinTableOwnerCol(), ownerId)
        .join(joinTableAsAlias, join => {
          _.each(this.fullJoinTableRelatedCol(), (joinTableRelatedCol, idx) => {
            join.on(joinTableRelatedCol, fullRelatedCol[idx]);
          });
        });

      return this.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .delete()
        .whereIn(joinTableRowId, selectRelatedQuery)
        .runAfter(_.constant({}));
    });
  }

  /**
   * @private
   */
  @overwriteForDatabase({
    sqlite3: '_selectForModify_sqlite3'
  })
  _selectForModify(builder, owner) {
    let ownerId = owner.$values(this.ownerProp);

    let idQuery = this.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(this.fullJoinTableRelatedCol())
      .whereComposite(this.fullJoinTableOwnerCol(), ownerId);

    return builder.whereInComposite(this.fullRelatedCol(), idQuery);
  }

  /**
   * Special _selectForModify implementation for sqlite3. sqlite3 doesn't support multi-value
   * where-in clauses. We need to use the built-in _rowid_ instead.
   *
   * @private
   */
  _selectForModify_sqlite3(builder, owner) {
    let relatedTable = this.relatedModelClass.tableName;
    let relatedTableAlias = this.relatedTableAlias();
    let relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
    let relatedTableAliasRowId = relatedTableAlias + '.' + sqliteBuiltInRowId;
    let relatedTableRowId = relatedTable + '.' + sqliteBuiltInRowId;

    let fullRelatedCol = this.fullRelatedCol();
    let ownerId = owner.$values(this.ownerProp);

    let selectRelatedQuery = this.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(relatedTableAliasRowId)
      .whereComposite(this.fullJoinTableOwnerCol(), ownerId)
      .join(relatedTableAsAlias, join => {
        _.each(this.fullJoinTableRelatedCol(), (joinTableRelatedCol, idx) => {
          join.on(joinTableRelatedCol, fullRelatedCol[idx]);
        });
      });

    return builder.whereInComposite(relatedTableRowId, selectRelatedQuery);
  }

  /**
   * @private
   */
  _createJoinModels(ownerId, relatedIds) {
    return _.map(relatedIds, relatedId => {
      let joinModel = {};

      _.each(this.joinTableOwnerProp, (joinTableOwnerProp, idx) => {
        joinModel[joinTableOwnerProp] = ownerId[idx];
      });

      _.each(this.joinTableRelatedProp, (joinTableRelatedProp, idx) => {
        joinModel[joinTableRelatedProp] = relatedId[idx];
      });

      return joinModel;
    });
  }
}
