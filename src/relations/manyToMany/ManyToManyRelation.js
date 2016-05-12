import _ from 'lodash';
import Relation from '../Relation';
import ModelBase from '../../model/ModelBase';
import inheritModel from '../../model/inheritModel';
import normalizeIds from '../../utils/normalizeIds';
import {isSqlite} from '../../utils/dbUtils';
import {isSubclassOf} from '../../utils/classUtils';
import memoize from '../../utils/decorators/memoize';

import ManyToManyFindOperation from './ManyToManyFindOperation';
import ManyToManyInsertOperation from './ManyToManyInsertOperation';
import ManyToManyRelateOperation from './ManyToManyRelateOperation';
import ManyToManyUnrelateOperation from './ManyToManyUnrelateOperation';
import ManyToManyUnrelateSqliteOperation from './ManyToManyUnrelateSqliteOperation';
import ManyToManyUpdateOperation from './ManyToManyUpdateOperation';
import ManyToManyUpdateSqliteOperation from './ManyToManyUpdateSqliteOperation';
import ManyToManyDeleteOperation from './ManyToManyDeleteOperation';
import ManyToManyDeleteSqliteOperation from './ManyToManyDeleteSqliteOperation';

const sqliteBuiltInRowId = '_rowid_';

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
    let Model = require(__dirname + '/../../model/Model').default;

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
      if (_(ownerIds).flatten().every(id => _.isNull(id) || _.isUndefined(id))) {
        // Nothing to fetch.
        builder.resolve([]);
      } else {
        builder.whereInComposite(this.fullJoinTableOwnerCol(), ownerIds);
      }
    }

    return builder.modify(this.filter);
  }

  /**
   * @returns {QueryBuilder}
   */
  join(builder, joinOperation, relatedTableAlias) {
    joinOperation = joinOperation || 'join';
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
      [joinOperation](joinTableAsAlias, join => {
        _.each(joinTableOwnerCol, (joinTableOwnerCol, idx) => {
          join.on(joinTableOwnerCol, ownerCol[idx]);
        });
      })
      [joinOperation](relatedTableAsAlias, join => {
        _.each(joinTableRelatedCol, (joinTableRelatedCol, idx) => {
          join.on(joinTableRelatedCol, relatedCol[idx]);
        });
      })
      .modify(this.filter);
  }

  find(builder, owners) {
    return new ManyToManyFindOperation(builder, 'find', {
      relation: this,
      owners: owners
    });
  }

  insert(builder, owner) {
    return new ManyToManyInsertOperation(builder, 'insert', {
      relation: this,
      owner: owner
    });
  }

  update(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUpdateSqliteOperation(builder, 'update', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyUpdateOperation(builder, 'update', {
        relation: this,
        owner: owner
      });
    }
  }

  patch(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUpdateSqliteOperation(builder, 'patch', {
        relation: this,
        owner: owner,
        modelOptions: {patch: true}
      });
    } else {
      return new ManyToManyUpdateOperation(builder, 'patch', {
        relation: this,
        owner: owner,
        modelOptions: {patch: true}
      });
    }
  }

  delete(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyDeleteSqliteOperation(builder, 'delete', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyDeleteOperation(builder, 'delete', {
        relation: this,
        owner: owner
      });
    }
  }

  relate(builder, owner) {
    return new ManyToManyRelateOperation(builder, 'relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUnrelateSqliteOperation(builder, 'unrelate', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyUnrelateOperation(builder, 'unrelate', {
        relation: this,
        owner: owner
      });
    }
  }

  selectForModify(builder, owner) {
    let ownerId = owner.$values(this.ownerProp);

    let idQuery = this.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(this.fullJoinTableRelatedCol())
      .whereComposite(this.fullJoinTableOwnerCol(), ownerId);

    return builder.whereInComposite(this.fullRelatedCol(), idQuery);
  }

  selectForModifySqlite(builder, owner) {
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
    if (!_.isEmpty(this.joinTableExtraProps)) {
      _.each(models, model => model.$omitFromDatabaseJson(this.joinTableExtraProps));
    }
  }
}
