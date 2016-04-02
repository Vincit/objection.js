import _ from 'lodash';
import Relation from './Relation';
import ModelBase from '../model/ModelBase';
import inheritModel from '../model/inheritModel';
import normalizeIds from '../utils/normalizeIds';
import {overwriteForDatabase} from '../utils/dbUtils';
import {isSubclassOf} from '../utils/classUtils';
import memoize from '../utils/decorators/memoize';

const ownerJoinColumnAliasPrefix = 'objectiontmpjoin';
const sqliteBuiltInRowId = '_rowid_';

@overwriteForDatabase()
export default class ManyToManyRelation extends Relation {

  constructor(...args) {
    super(...args);

    /**
     * @type {string}
     */
    this.joinTable = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableOwnerCol = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableOwnerProp = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableRelatedCol = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableRelatedProp = null;

    /**
     * @type {Constructor.<Model>}
     */
    this.joinTableModelClass = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableExtraCols = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableExtraProps = null;
  }

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
    let joinTableExtra = mapping.join.through.extra || [];

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
    this.joinTableExtraCols = joinTableExtra;

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
    this.joinTableExtraProps = this.propertyName(this.joinTableExtraCols, this.joinTableModelClass);

    return retVal;
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableOwnerCol() {
    return _.map(this.joinTableOwnerCol, col => this.joinTable + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableRelatedCol() {
    return _.map(this.joinTableRelatedCol, col => this.joinTable + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableExtraCols() {
    return _.map(this.joinTableExtraCols, col => this.joinTable + '.' + col);
  }

  /**
   * @returns {string}
   */
  joinTableAlias() {
    return this.joinTable + '_rel_' + this.name;
  }

  /**
   * @returns {ManyToManyRelation}
   */
  clone() {
    let relation = super.clone();

    relation.joinTable = this.joinTable;
    relation.joinTableOwnerCol = this.joinTableOwnerCol;
    relation.joinTableOwnerProp = this.joinTableOwnerProp;
    relation.joinTableRelatedCol = this.joinTableRelatedCol;
    relation.joinTableRelatedProp = this.joinTableRelatedProp;
    relation.joinTableModelClass = this.joinTableModelClass;
    relation.joinTableExtraCols = this.joinTableExtraCols;
    relation.joinTableExtraProps = this.joinTableExtraProps;

    return relation;
  }

  /**
   * @returns {ManyToManyRelation}
   */
  bindKnex(knex) {
    let bound = super.bindKnex(knex);
    bound.joinTableModelClass = this.joinTableModelClass.bindKnex(knex);
    return bound;
  }

  /**
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
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod, relatedTableAlias) {
    joinMethod = joinMethod || 'join';
    relatedTableAlias = relatedTableAlias || this.relatedTableAlias();

    let joinTable = this.joinTable;
    let relatedTable = this.relatedModelClass.tableName;

    let joinTableAlias = this.joinTableAlias();
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

        // Also select all extra columns.
        _.each(this.fullJoinTableExtraCols(), col => {
          builder.select(col);
        });
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

  insert(builder, owner, insertion) {
    this.omitExtraProps(insertion.models());

    builder.onBuild(builder => {
      builder.$$insert(insertion);
    });

    builder.runAfterModelCreate(related => {
      let ownerId = owner.$values(this.ownerProp);
      let joinModels = this.createJoinModels(ownerId, related);

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

  update(builder, owner, update) {
    builder.onBuild(builder => {
      this._selectForModify(builder, owner).$$update(update).call(this.filter);
    });
  }

  delete(builder, owner) {
    builder.onBuild(builder => {
      this._selectForModify(builder, owner).$$delete().call(this.filter);
    });
  }

  relate(builder, owner, ids) {
    ids = normalizeIds(ids, this.relatedProp);

    builder.setQueryExecutor(builder => {
      let joinModels = this.createJoinModels(owner.$values(this.ownerProp), ids);

      return this.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .runAfter(_.constant({}));
    });
  }

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

  createJoinModels(ownerId, related) {
    return _.map(related, related => {
      let joinModel = {};

      _.each(this.joinTableOwnerProp, (joinTableOwnerProp, idx) => {
        joinModel[joinTableOwnerProp] = ownerId[idx];
      });

      _.each(this.joinTableRelatedProp, (joinTableRelatedProp, idx) => {
        joinModel[joinTableRelatedProp] = related[this.relatedProp[idx]];
      });

      _.each(this.joinTableExtraProps, extraProp => {
        if (!_.isUndefined(related[extraProp])) {
          joinModel[extraProp] = related[extraProp];
        }
      });

      return joinModel;
    });
  }

  omitExtraProps(models) {
    _.each(models, model => model.$omitFromDatabaseJson(this.joinTableExtraProps));
  }
}
