'use strict';

const Relation = require('../Relation');
const inheritModel = require('../../model/inheritModel');
const isSqlite = require('../../utils/knexUtils').isSqlite;

const ManyToManyFindOperation = require('./ManyToManyFindOperation');
const ManyToManyInsertOperation = require('./ManyToManyInsertOperation');
const ManyToManyRelateOperation = require('./ManyToManyRelateOperation');
const ManyToManyUnrelateOperation = require('./ManyToManyUnrelateOperation');
const ManyToManyUnrelateSqliteOperation = require('./ManyToManyUnrelateSqliteOperation');
const ManyToManyUpdateOperation = require('./ManyToManyUpdateOperation');
const ManyToManyUpdateSqliteOperation = require('./ManyToManyUpdateSqliteOperation');
const ManyToManyDeleteOperation = require('./ManyToManyDeleteOperation');
const ManyToManyDeleteSqliteOperation = require('./ManyToManyDeleteSqliteOperation');

const sqliteBuiltInRowId = '_rowid_';

class ManyToManyRelation extends Relation {

  setMapping(mapping) {
    let retVal = super.setMapping(mapping);

    // Avoid require loop and import here.
    let Model = require(__dirname + '/../../model/Model');

    if (!mapping.join.through || typeof mapping.join.through !== 'object') {
      this.throwError('join must have the `through` that describes the join table.');
    }

    if (!mapping.join.through.from || !mapping.join.through.to) {
      this.throwError('join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}');
    }

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTableFrom = this.parseReference(mapping.join.through.from);
    let joinTableTo = this.parseReference(mapping.join.through.to);
    let joinTableExtra = mapping.join.through.extra || [];

    if (!joinTableFrom.table || !joinTableFrom.columns.length) {
      this.throwError('join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    }

    if (!joinTableTo.table || !joinTableTo.columns.length) {
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
    this.joinTableExtras = this.parseExtras(joinTableExtra);

    return retVal;
  }

  joinTableAlias(builder) {
    const table = builder.tableRefFor(this._joinTableModelClass);
    return `${table}_rel_${this.name}`;
  }

  fullJoinTableRelatedCol(builder) {
    const table = builder.tableRefFor(this._joinTableModelClass);
    const col = new Array(this.joinTableRelatedCol.length);

    for (let i = 0, l = col.length; i < l; ++i) {
      col[i] = `${table}.${this.joinTableRelatedCol[i]}`;
    }

    return col;
  }

  fullJoinTableOwnerCol(builder) {
    const table = builder.tableRefFor(this._joinTableModelClass);
    const col = new Array(this.joinTableOwnerCol.length);

    for (let i = 0, l = col.length; i < l; ++i) {
      col[i] = `${table}.${this.joinTableOwnerCol[i]}`;
    }

    return col;
  }

  bindKnex(knex) {
    let bound = super.bindKnex(knex);
    bound._joinTableModelClass = this._joinTableModelClass.bindKnex(knex);
    return bound;
  }

  findQuery(builder, opt) {
    builder.join(this.joinTable, join => {
      const fullRelatedCol = this.fullRelatedCol(builder);
      const fullJoinTableRelatedCol = this.fullJoinTableRelatedCol(builder);

      for (let i = 0, l = fullJoinTableRelatedCol.length; i < l; ++i) {
        join.on(fullJoinTableRelatedCol[i], fullRelatedCol[i]);
      }
    });

    if (opt.isColumnRef) {
      const fullJoinTableOwnerCol = this.fullJoinTableOwnerCol(builder);

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
        builder.whereInComposite(this.fullJoinTableOwnerCol(builder), opt.ownerIds);
      } else {
        builder.resolve([]);
      }
    }

    return builder.modify(this.modify);
  }

  join(builder, opt) {
    opt = opt || {};

    opt.joinOperation = opt.joinOperation || 'join';
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias(builder);
    opt.relatedJoinSelectQuery = opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
    opt.relatedTable = opt.relatedTable || builder.tableNameFor(this.relatedModelClass);
    opt.ownerTable = opt.ownerTable || builder.tableRefFor(this.ownerModelClass);
    opt.joinTableAlias = opt.joinTableAlias || `${opt.relatedTableAlias}_join`;

    const joinTableAsAlias = `${this.joinTable} as ${opt.joinTableAlias}`;
    const joinTableOwnerCol = this.joinTableOwnerCol.map(col => `${opt.joinTableAlias}.${col}`);
    const joinTableRelatedCol = this.joinTableRelatedCol.map(col => `${opt.joinTableAlias}.${col}`);

    const relatedCol = this.relatedCol.map(col => `${opt.relatedTableAlias}.${col}`);
    const ownerCol = this.ownerCol.map(col => `${opt.ownerTable}.${col}`);

    let relatedJoinSelect = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    if (relatedJoinSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedJoinSelect = `${opt.relatedTable} as ${opt.relatedTableAlias}`
    }

    return builder
      [opt.joinOperation](joinTableAsAlias, join => {
        for (let i = 0, l = joinTableOwnerCol.length; i < l; ++i) {
          join.on(joinTableOwnerCol[i], ownerCol[i]);
        }
      })
      [opt.joinOperation](relatedJoinSelect, join => {
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
      .select(this.fullJoinTableRelatedCol(builder))
      .whereComposite(this.fullJoinTableOwnerCol(builder), ownerId);

    return builder.whereInComposite(this.fullRelatedCol(builder), idQuery);
  }

  selectForModifySqlite(builder, owner) {
    const relatedTable = builder.tableNameFor(this.relatedModelClass);
    const relatedTableAlias = this.relatedTableAlias(builder);
    const relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
    const relatedTableAliasRowId = relatedTableAlias + '.' + sqliteBuiltInRowId;
    const relatedTableRowId = relatedTable + '.' + sqliteBuiltInRowId;

    const selectRelatedQuery = this.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(relatedTableAliasRowId)
      .whereComposite(this.fullJoinTableOwnerCol(builder), owner.$values(this.ownerProp))
      .join(relatedTableAsAlias, join => {
        const fullJoinTableRelatedCols = this.fullJoinTableRelatedCol(builder);
        const fullRelatedCol = this.fullRelatedCol(builder);

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

      for (let j = 0, lp = this.joinTableExtras.length; j < lp; ++j) {
        const extra = this.joinTableExtras[j];
        const extraValue = rel[extra.aliasProp];

        if (extraValue !== undefined) {
          joinModel[extra.joinTableProp] = extraValue;
        }
      }

      joinModels[i] = joinModel;
    }

    return joinModels;
  }

  omitExtraProps(models) {
    if (this.joinTableExtras && this.joinTableExtras.length) {
      const props = this.joinTableExtras.map(extra => extra.aliasProp);

      for (let i = 0, l = models.length; i < l; ++i) {
        models[i].$omitFromDatabaseJson(props);
      }
    }
  }

  parseExtras(extras) {
    if (Array.isArray(extras)) {
      extras = extras.reduce((extras, col) => {
        extras[col] = col;
        return extras;
      }, {});
    }

    return Object.keys(extras).map(key => {
      const val = extras[key];

      return {
        joinTableCol: val,
        joinTableProp: this._joinTableModelClass.columnNameToPropertyName(val),
        aliasCol: key,
        aliasProp: this._joinTableModelClass.columnNameToPropertyName(key)
      };
    });
  }
}

module.exports = ManyToManyRelation;
