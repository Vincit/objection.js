import _ from 'lodash';
import utils from '../utils';
import Relation from './Relation';
import inheritModel from '../model/inheritModel';
const ownerJoinColumnAlias = 'objectiontmpjoin';;

/**
 * @ignore
 * @extends Relation
 */
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
     * @type {string}
     */
    this.joinTableOwnerCol = null;

    /**
     * The relation property in the join model that points to the owner table.
     *
     * @type {string}
     */
    this.joinTableOwnerProp = null;

    /**
     * The relation column in the join table that points to the related table.
     *
     * @type {string}
     */
    this.joinTableRelatedCol = null;

    /**
     * The relation property in the join model that points to the related table.
     *
     * @type {string}
     */
    this.joinTableRelatedProp = null;

    /**
     * The join table model class.
     *
     * This can be optionally given using the `join.through.modelClass` property,
     * otherwise an anonymous model class is created in `setMapping` method.
     *
     * @type {Class<Model>}
     */
    this.joinTableModelClass = null;
  }

  /**
   * @override
   * @inheritDoc
   */
  setMapping(mapping) {
    // Avoid require loop and import here.
    let Model = require(__dirname + '/../model/Model').default;

    let retVal = Relation.prototype.setMapping.call(this, mapping);
    let errorPrefix = this.ownerModelClass.name + '.relationMappings.' + this.name;

    if (!_.isObject(mapping.join.through)) {
      throw new Error(errorPrefix + '.join must have the `through` that describes the join table.');
    }

    if (!_.isString(mapping.join.through.from) || !_.isString(mapping.join.through.to)) {
      throw new Error(errorPrefix + '.join.through must be an object that describes the join table. For example: {from: \'JoinTable.someId\', to: \'JoinTable.someOtherId\'}');
    }

    let joinFrom = Relation.parseColumn(mapping.join.from);
    let joinTableFrom = Relation.parseColumn(mapping.join.through.from);
    let joinTableTo = Relation.parseColumn(mapping.join.through.to);

    if (!joinTableFrom.table || !joinTableFrom.name) {
      throw new Error(errorPrefix + '.join.through.from must have format JoinTable.columnName. For example `JoinTable.someId`.');
    }

    if (!joinTableTo.table || !joinTableTo.name) {
      throw new Error(errorPrefix + '.join.through.to must have format JoinTable.columnName. For example `JoinTable.someId`.');
    }

    if (joinTableFrom.table !== joinTableTo.table) {
      throw new Error(errorPrefix + '.join.through `from` and `to` must point to the same join table.');
    }

    this.joinTable = joinTableFrom.table;

    if (joinFrom.table === this.ownerModelClass.tableName) {
      this.joinTableOwnerCol = joinTableFrom.name;
      this.joinTableRelatedCol = joinTableTo.name;
    } else {
      this.joinTableRelatedCol = joinTableFrom.name;
      this.joinTableOwnerCol = joinTableTo.name;
    }

    if (mapping.join.through.modelClass) {
      if (!utils.isSubclassOf(mapping.join.through.modelClass, Model)) {
        throw new Error('Join table model class is not a subclass of Model');
      }

      this.joinTableModelClass = mapping.join.through.modelClass;
    } else {
      this.joinTableModelClass = inheritModel(Model);
      this.joinTableModelClass.tableName = this.joinTable;
      // We cannot know if the join table has a primary key. Therefore we set some
      // known column as the idColumn so that inserts will work.
      this.joinTableModelClass.idColumn = this.joinTableRelatedCol;
    }

    this.joinTableOwnerProp = this.joinTableModelClass.columnNameToPropertyName(this.joinTableOwnerCol);
    this.joinTableRelatedProp = this.joinTableModelClass.columnNameToPropertyName(this.joinTableRelatedCol);

    return retVal;
  }

  /**
   * Reference to the column in the join table that refers to `fullOwnerCol()`.
   *
   * For example: `Person_Movie.actorId`.
   *
   * @returns {string}
   */
  fullJoinTableOwnerCol() {
    return this.joinTable + '.' + this.joinTableOwnerCol;
  }

  /**
   * Reference to the column in the join table that refers to `fullRelatedCol()`.
   *
   * For example: `Person_Movie.movieId`.
   *
   * @returns {string}
   */
  fullJoinTableRelatedCol() {
    return this.joinTable + '.' + this.joinTableRelatedCol;
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
  findQuery(builder, ownerCol, isColumnRef) {
    builder.join(this.joinTable, this.fullJoinTableRelatedCol(), this.fullRelatedCol());

    if (isColumnRef) {
      builder.whereRef(this.fullJoinTableOwnerCol(), ownerCol);
    } else {
      if (_.isArray(ownerCol)) {
        builder.whereIn(this.fullJoinTableOwnerCol(), ownerCol);
      } else {
        builder.where(this.fullJoinTableOwnerCol(), ownerCol);
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

    let joinTableOwnerCol = joinTableAlias + '.' + this.joinTableOwnerCol;
    let joinTableRelatedCol = joinTableAlias + '.' + this.joinTableRelatedCol;

    let ownerCol = this.fullOwnerCol();
    let relatedCol = relatedTableAlias + '.' + this.relatedCol;

    return builder
      [joinMethod](joinTableAsAlias, joinTableOwnerCol, ownerCol)
      [joinMethod](relatedTableAsAlias, joinTableRelatedCol, relatedCol)
      .call(this.filter);
  }

  /**
   * @override
   * @inheritDoc
   */
  find(builder, owners) {
    builder.onBuild(builder => {
      let ownerIds = _.pluck(owners, this.ownerProp);
      let ownerJoinColumn = this.fullJoinTableOwnerCol();

      if (!builder.has(/select/)) {
        // If the user hasn't specified a select clause, select the related model's columns.
        // If we don't do this we also get the join table's columns.
        builder.select(this.relatedModelClass.tableName + '.*');
      }

      this.findQuery(builder, ownerIds).select(ownerJoinColumn + ' as ' + ownerJoinColumnAlias);
    });

    builder.runAfterModelCreate(related => {
      // The ownerJoinColumnAlias column name may have been changed by the `$parseDatabaseJson`
      // method of the related model class. We need to do the same conversion here.
      let ownerJoinPropAlias = this.relatedModelClass.columnNameToPropertyName(ownerJoinColumnAlias);
      let relatedByOwnerId = _.groupBy(related, ownerJoinPropAlias);

      _.each(owners,owner => {
        owner[this.name] = relatedByOwnerId[owner[this.ownerProp]] || [];
      });

      _.each(related, rel => {
        delete rel[ownerJoinPropAlias];
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
      let ownerId = owner[this.ownerProp];
      let relatedIds = _.pluck(related, this.relatedProp);
      let joinModels = this._createJoinModels(ownerId, relatedIds);

      owner[this.name] = this.mergeModels(owner[this.name], related);

      // Insert the join rows to the join table.
      return this.joinTableModelClass
        .bindKnex(builder.modelClass().knex())
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
      let idSelectQuery = this._makeFindIdQuery(builder, owner[this.ownerProp]);

      builder
        .$$update(update)
        .whereIn(this.relatedModelClass.getFullIdColumn(), idSelectQuery)
        .call(this.filter);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  patch(builder, owner, patch) {
    return this.update(builder, owner, patch);
  }

  /**
   * @override
   * @inheritDoc
   */
  delete(builder, owner) {
    builder.onBuild(builder => {
      let idSelectQuery = this._makeFindIdQuery(builder, owner[this.ownerProp]);

      builder
        .$$delete()
        .whereIn(this.relatedModelClass.getFullIdColumn(), idSelectQuery)
        .call(this.filter);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  relate(builder, owner, ids) {
    builder.setQueryExecutor(() => {
      let joinModels = this._createJoinModels(owner[this.ownerProp], ids);

      return this.joinTableModelClass
        .bindKnex(this.ownerModelClass.knex())
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
  unrelate(builder, owner) {
    builder.setQueryExecutor(builder => {
      let idSelectQuery = this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .copyFrom(builder, /where/i)
        .select(this.fullRelatedCol())
        .call(this.filter);

      return this.joinTableModelClass
        .bindKnex(this.ownerModelClass.knex())
        .query()
        .childQueryOf(builder)
        .delete()
        .where(this.fullJoinTableOwnerCol(), owner[this.ownerProp])
        .whereIn(this.fullJoinTableRelatedCol(), idSelectQuery)
        .runAfter(_.constant({}));
    });
  }

  /**
   * @private
   */
  _makeFindIdQuery(builder, ownerId) {
    return this.joinTableModelClass
      .bindKnex(this.ownerModelClass.knex())
      .query()
      .childQueryOf(builder)
      .select(this.fullJoinTableRelatedCol())
      .where(this.fullJoinTableOwnerCol(), ownerId);
  }

  /**
   * @private
   */
  _createJoinModels(ownerId, relatedIds) {
    return _.map(relatedIds, relatedId => {
      let joinModel = {};

      joinModel[this.joinTableOwnerProp] = ownerId;
      joinModel[this.joinTableRelatedProp] = relatedId;

      return joinModel;
    });
  }
}
