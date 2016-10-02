import _ from 'lodash';
import Relation from '../Relation';
import inheritModel from '../../model/inheritModel';
import {isSqlite} from '../../utils/dbUtils';
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
      this._joinTableModelClass = this.resolveModel(Model, mapping.join.through.modelClass, 'join.through.modelClass');
    } else {
      this._joinTableModelClass = inheritModel(Model);
      this._joinTableModelClass.tableName = this.joinTable;
      // We cannot know if the join table has a primary key. Therefore we set some
      // known column as the idColumn so that inserts will work.
      this._joinTableModelClass.idColumn = this.joinTableRelatedCol;
    }

    this.joinTableOwnerProp = this.propertyName(this.joinTableOwnerCol, this._joinTableModelClass);
    this.joinTableRelatedProp = this.propertyName(this.joinTableRelatedCol, this._joinTableModelClass);
    this.joinTableExtraProps = this.propertyName(this.joinTableExtraCols, this._joinTableModelClass);

    return retVal;
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableOwnerCol() {
    return this.joinTableOwnerCol.map(col => this.joinTable + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableRelatedCol() {
    return this.joinTableRelatedCol.map(col => this.joinTable + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullJoinTableExtraCols() {
    return this.joinTableExtraCols.map(col => this.joinTable + '.' + col);
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
  bindKnex(knex) {
    let bound = super.bindKnex(knex);
    bound._joinTableModelClass = this._joinTableModelClass.bindKnex(knex);
    return bound;
  }

  /**
   * @returns {QueryBuilder}
   */
  findQuery(builder, opt) {
    builder.join(this.joinTable, join => {
      const fullRelatedCol = this.fullRelatedCol();
      const fullJoinTableRelatedCol = this.fullJoinTableRelatedCol();

      for (let i = 0, l = fullJoinTableRelatedCol.length; i < l; ++i) {
        join.on(fullJoinTableRelatedCol[i], fullRelatedCol[i]);
      }
    });

    if (opt.isColumnRef) {
      const fullJoinTableOwnerCol = this.fullJoinTableOwnerCol();

      for (let i = 0, l = fullJoinTableOwnerCol.length; i < l; ++i) {
        builder.whereRef(fullJoinTableOwnerCol[i], opt.ownerIds[i]);
      }
    } else {
      let hasIds = false;

      for (let i = 0, l = opt.ownerIds.length; i < l; ++i) {
        const id = opt.ownerIds[i];

        if (id) {
          hasIds = true;
          break;
        }
      }

      if (hasIds) {
        builder.whereInComposite(this.fullJoinTableOwnerCol(), opt.ownerIds);
      } else {
        builder.resolve([]);
      }
    }

    return builder.modify(this.modify);
  }

  /**
   * @returns {QueryBuilder}
   */
  join(builder, opt) {
    opt = opt || {};

    opt.joinOperation = opt.joinOperation || 'join';
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias();
    opt.relatedJoinSelectQuery = opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
    opt.relatedTable = opt.relatedTable || this.relatedModelClass.tableName;
    opt.ownerTable = opt.ownerTable || this.ownerModelClass.tableName;
    opt.joinTableAlias = opt.joinTableAlias || `${opt.relatedTableAlias}_join`;

    const joinTableAsAlias = `${this.joinTable} as ${opt.joinTableAlias}`;
    const joinTableOwnerCol = this.joinTableOwnerCol.map(col => `${opt.joinTableAlias}.${col}`);
    const joinTableRelatedCol = this.joinTableRelatedCol.map(col => `${opt.joinTableAlias}.${col}`);

    const relatedCol = this.relatedCol.map(col => `${opt.relatedTableAlias}.${col}`);
    const ownerCol = this.ownerCol.map(col => `${opt.ownerTable}.${col}`);

    const relatedJoinSelectQuery = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    return builder
      [opt.joinOperation](joinTableAsAlias, join => {
        for (let i = 0, l = joinTableOwnerCol.length; i < l; ++i) {
          join.on(joinTableOwnerCol[i], ownerCol[i]);
        }
      })
      [opt.joinOperation](relatedJoinSelectQuery, join => {
        for (let i = 0, l = joinTableRelatedCol.length; i < l; ++i) {
          join.on(joinTableRelatedCol[i], relatedCol[i]);
        }
      });
  }

  find(builder, owners) {
    return new ManyToManyFindOperation('find', {
      relation: this,
      owners: owners
    });
  }

  insert(builder, owner) {
    return new ManyToManyInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  update(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUpdateSqliteOperation('update', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyUpdateOperation('update', {
        relation: this,
        owner: owner
      });
    }
  }

  patch(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUpdateSqliteOperation('patch', {
        relation: this,
        owner: owner,
        modelOptions: {patch: true}
      });
    } else {
      return new ManyToManyUpdateOperation('patch', {
        relation: this,
        owner: owner,
        modelOptions: {patch: true}
      });
    }
  }

  delete(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyDeleteSqliteOperation('delete', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyDeleteOperation('delete', {
        relation: this,
        owner: owner
      });
    }
  }

  relate(builder, owner) {
    return new ManyToManyRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyUnrelateSqliteOperation('unrelate', {
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyUnrelateOperation('unrelate', {
        relation: this,
        owner: owner
      });
    }
  }

  selectForModify(builder, owner) {
    let ownerId = owner.$values(this.ownerProp);

    let idQuery = this.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(this.fullJoinTableRelatedCol())
      .whereComposite(this.fullJoinTableOwnerCol(), ownerId);

    return builder.whereInComposite(this.fullRelatedCol(), idQuery);
  }

  selectForModifySqlite(builder, owner) {
    const relatedTable = this.relatedModelClass.tableName;
    const relatedTableAlias = this.relatedTableAlias();
    const relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
    const relatedTableAliasRowId = relatedTableAlias + '.' + sqliteBuiltInRowId;
    const relatedTableRowId = relatedTable + '.' + sqliteBuiltInRowId;

    const selectRelatedQuery = this.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(relatedTableAliasRowId)
      .whereComposite(this.fullJoinTableOwnerCol(), owner.$values(this.ownerProp))
      .join(relatedTableAsAlias, join => {
        const fullJoinTableRelatedCols = this.fullJoinTableRelatedCol();
        const fullRelatedCol = this.fullRelatedCol();

        for (let i = 0, l = fullJoinTableRelatedCols.length; i < l; ++i) {
          join.on(fullJoinTableRelatedCols[i], fullRelatedCol[i]);
        }
      });

    return builder.whereInComposite(relatedTableRowId, selectRelatedQuery);
  }

  createJoinModels(ownerId, related) {
    const joinModels = new Array(related.length);

    for (let i = 0, lr = related.length; i < lr; ++i) {
      const rel = related[i];
      let joinModel = {};

      for (let j = 0, lp = this.joinTableOwnerProp.length; j < lp; ++j) {
        joinModel[this.joinTableOwnerProp[j]] = ownerId[j];
      }

      for (let j = 0, lp = this.joinTableRelatedProp.length; j < lp; ++j) {
        joinModel[this.joinTableRelatedProp[j]] = rel[this.relatedProp[j]];
      }

      for (let j = 0, lp = this.joinTableExtraProps.length; j < lp; ++j) {
        const prop = this.joinTableExtraProps[j];
        const extraValue = rel[prop];

        if (!_.isUndefined(extraValue)) {
          joinModel[prop] = extraValue;
        }
      }

      joinModels[i] = joinModel;
    }

    return joinModels;
  }

  omitExtraProps(models) {
    if (!_.isEmpty(this.joinTableExtraProps)) {
      for (let i = 0, l = models.length; i < l; ++i) {
        models[i].$omitFromDatabaseJson(this.joinTableExtraProps);
      }
    }
  }
}
