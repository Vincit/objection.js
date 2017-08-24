'use strict';

const Relation = require('../Relation');
const inheritModel = require('../../model/inheritModel').inheritModel;
const resolveModel = require('../../utils/resolveModel').resolveModel
const RelationProperty = require('../RelationProperty');
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

    let joinModelClass = null;

    if (mapping.join.through.modelClass) {
      try {
        joinModelClass = resolveModel(
          mapping.join.through.modelClass, 
          this.ownerModelClass.modelPaths, 
          'join.through.modelClass'
        );
      } catch (err) {
        throw this.createError(err.message);
      }
    } else {
      joinModelClass = inheritModel(Model)
      // These need to be assigned later when we know them.
      joinModelClass.idColumn = null;
      joinModelClass.tableName = null;
    }

    const resolveModelClass = (table) => {
      if (joinModelClass.tableName === null) {
        // TODO: holy shit this is ugly.
        joinModelClass.tableName = table;
      }

      if (joinModelClass.tableName === table) {
        return joinModelClass;
      } else {
        return null;
      }
    }

    let joinTableFrom;
    let joinTableTo;

    try {
      joinTableFrom = new RelationProperty(mapping.join.through.from, resolveModelClass);
    } catch (err) {
      if (err instanceof RelationProperty.ModelNotFoundError) {
        throw this.createError('join.through `from` and `to` must point to the same join table.');
      } else {
        throw this.createError('join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
      }
    }

    try {
      joinTableTo = new RelationProperty(mapping.join.through.to, resolveModelClass);
    } catch (err) {
      if (err instanceof RelationProperty.ModelNotFoundError) {
        throw this.createError('join.through `from` and `to` must point to the same join table.');
      } else {
        throw this.createError('join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
      }    
    }

    let joinTableExtra = mapping.join.through.extra || [];

    if (joinTableFrom.modelClass.tableName !== joinTableTo.modelClass.tableName) {
      throw this.createError('join.through `from` and `to` must point to the same join table.');
    }

    this._joinTableModelClass = joinModelClass;

    if (this.relatedProp.modelClass.tableName === joinTableFrom.modelClass.tableName) {
      this.joinTableRelatedProp = joinTableFrom;
      this.joinTableOwnerProp = joinTableTo;
    } else {
      this.joinTableRelatedProp = joinTableTo;
      this.joinTableOwnerProp = joinTableFrom;
    }

    this.joinTableExtras = this.parseExtras(joinTableExtra);

    if (this._joinTableModelClass.idColumn === null) {
      // We cannot know if the join table has a primary key. Therefore we set some
      // known column as the idColumn so that inserts will work.
      this._joinTableModelClass.idColumn = this.joinTableRelatedProp.cols();
    }

    return retVal;
  }

  joinTableAlias(builder) {
    const table = builder.tableRefFor(this._joinTableModelClass);
    return `${table}_rel_${this.name}`;
  }

  bindKnex(knex) {
    let bound = super.bindKnex(knex);
    bound._joinTableModelClass = this._joinTableModelClass.bindKnex(knex);
    return bound;
  }

  findQuery(builder, opt) {
    const joinTableOwnerRefs = this.joinTableOwnerProp.refs(builder);

    builder.join(this.joinTable, join => {
      for (let i = 0, l = this.relatedProp.size; i < l; ++i) {
        const relatedRef = this.relatedProp.ref(builder, i);
        const joinTableRelatedRef = this.joinTableRelatedProp.ref(builder, i);

        join.on(relatedRef, joinTableRelatedRef);
      }
    });

    if (opt.isColumnRef) {
      for (let i = 0, l = joinTableOwnerRefs.length; i < l; ++i) {
        builder.whereRef(joinTableOwnerRefs[i], opt.ownerIds[i]);
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(joinTableOwnerRefs, opt.ownerIds);
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
        const ownerProp = this.ownerProp;
        const joinTableOwnerProp = this.joinTableOwnerProp;

        for (let i = 0, l = ownerProp.size; i < l; ++i) {
          const joinTableOwnerRef = joinTableOwnerProp.ref(builder, i).table(opt.joinTableAlias);
          const ownerRef = ownerProp.ref(builder, i).table(opt.ownerTable);

          join.on(joinTableOwnerRef, ownerRef);
        }
      })
      [opt.joinOperation](relatedJoinSelect, join => {
        const relatedProp = this.relatedProp;
        const joinTableRelatedProp = this.joinTableRelatedProp;

        for (let i = 0, l = relatedProp.size; i < l; ++i) {
          const joinTableRelatedRef = joinTableRelatedProp.ref(builder, i).table(opt.joinTableAlias);
          const relatedRef = relatedProp.ref(builder, i).table(opt.relatedTableAlias);

          join.on(joinTableRelatedRef, relatedRef);
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

      for (let j = 0, lp = this.joinTableOwnerProp.size; j < lp; ++j) {
        this.joinTableOwnerProp.setProp(joinModel, j, ownerId[j]);
      }

      for (let j = 0, lp = this.joinTableRelatedProp.size; j < lp; ++j) {
        this.joinTableRelatedProp.setProp(joinModel, j, this.relatedProp.getProp(rel, j));
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
