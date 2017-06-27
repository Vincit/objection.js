'use strict';

const Relation = require('../Relation');
const inheritModel = require('../../model/inheritModel').inheritModel;
const resolveModel = require('../../utils/resolveModel').resolveModel
const isSqlite = require('../../utils/knexUtils').isSqlite;
const getModel = () => require('../../model/Model');

const ManyToManyFindOperation = require('./ManyToManyFindOperation');
const ManyToManyInsertOperation = require('./ManyToManyInsertOperation');
const ManyToManyRelateOperation = require('./ManyToManyRelateOperation');
const ManyToManyUnrelateOperation = require('./ManyToManyUnrelateOperation');
const ManyToManyUnrelateSqliteOperation = require('./ManyToManyUnrelateSqliteOperation');
const ManyToManyUpdateOperation = require('./ManyToManyUpdateOperation');
const ManyToManyUpdateSqliteOperation = require('./ManyToManyUpdateSqliteOperation');
const ManyToManyDeleteOperation = require('./ManyToManyDeleteOperation');
const ManyToManyDeleteSqliteOperation = require('./ManyToManyDeleteSqliteOperation');

const SQLITE_BUILTIN_ROW_ID = '_rowid_';

class ManyToManyRelation extends Relation {

  setMapping(mapping) {
    let retVal = super.setMapping(mapping);
    let Model = getModel();

    if (!mapping.join.through || typeof mapping.join.through !== 'object') {
      throw this.createError('join must have a `through` object that describes the join table.');
    }

    if (!mapping.join.through.from || !mapping.join.through.to) {
      throw this.createError('join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}');
    }

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTableFrom = this.parseReference(mapping.join.through.from);
    let joinTableTo = this.parseReference(mapping.join.through.to);
    let joinTableExtra = mapping.join.through.extra || [];

    if (!joinTableFrom.table || !joinTableFrom.columns.length) {
      throw this.createError('join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    }

    if (!joinTableTo.table || !joinTableTo.columns.length) {
      throw this.createError('join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    }

    if (joinTableFrom.table !== joinTableTo.table) {
      throw this.createError('join.through `from` and `to` must point to the same join table.');
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
      try {
        this._joinTableModelClass = resolveModel(mapping.join.through.modelClass, this.ownerModelClass.modelPaths, 'join.through.modelClass');
      } catch (err) {
        throw this.createError(err.message);
      }
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
    const fullJoinTableOwnerCol = this.fullJoinTableOwnerCol(builder);

    builder.join(this.joinTable, join => {
      const fullRelatedCol = this.fullRelatedCol(builder);
      const fullJoinTableRelatedCol = this.fullJoinTableRelatedCol(builder);

      for (let i = 0, l = fullJoinTableRelatedCol.length; i < l; ++i) {
        join.on(fullJoinTableRelatedCol[i], fullRelatedCol[i]);
      }
    });

    if (opt.isColumnRef) {
      for (let i = 0, l = fullJoinTableOwnerCol.length; i < l; ++i) {
        builder.whereRef(fullJoinTableOwnerCol[i], opt.ownerIds[i]);
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(fullJoinTableOwnerCol, opt.ownerIds);
    } else {
      builder.resolve([]);
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
    let relatedJoinSelect = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    if (relatedJoinSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedJoinSelect = `${opt.relatedTable} as ${opt.relatedTableAlias}`;
    }

    return builder
      [opt.joinOperation](joinTableAsAlias, join => {
        for (let i = 0, l = this.joinTableOwnerCol.length; i < l; ++i) {
          const joinTableOwnerCol = `${opt.joinTableAlias}.${this.joinTableOwnerCol[i]}`;
          const ownerCol = `${opt.ownerTable}.${this.ownerCol[i]}`;

          join.on(joinTableOwnerCol, ownerCol);
        }
      })
      [opt.joinOperation](relatedJoinSelect, join => {
        for (let i = 0, l = this.joinTableRelatedCol.length; i < l; ++i) {
          const joinTableRelatedCol = `${opt.joinTableAlias}.${this.joinTableRelatedCol[i]}`;
          const relatedCol = `${opt.relatedTableAlias}.${this.relatedCol[i]}`;

          join.on(joinTableRelatedCol, relatedCol);
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

  omitExtraProps(models, queryProps) {
    if (this.joinTableExtras && this.joinTableExtras.length) {
      const props = this.joinTableExtras.map(extra => extra.aliasProp);

      for (let i = 0, l = models.length; i < l; ++i) {
        // Don't delete the extra properties from the models so that they can
        // be used in the `$before` and `$after` hooks.
        models[i].$omitFromDatabaseJson(props);

        if (queryProps) {
          const propObj = queryProps.get(models[i]);

          if (propObj) {
            for (let j = 0; j < props.length; ++j) {
              const prop = props[j];

              if (prop in propObj) {
                delete propObj[prop];
              }
            }
          }
        }
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

function containsNonNull(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    const val = arr[i];

    if (Array.isArray(val) && containsNonNull(val)) {
      return true;
    } else if (val !== null && val !== undefined) {
      return true;
    }
  }

  return false;
}

module.exports = ManyToManyRelation;
