const getModel = () => require('../../model/Model');
const Relation = require('../Relation');
const RelationProperty = require('../RelationProperty');

const { ref } = require('../../queryBuilder/ReferenceBuilder');
const { isSqlite, isMySql } = require('../../utils/knexUtils');
const { inheritModel } = require('../../model/inheritModel');
const { resolveModel } = require('../../utils/resolveModel');
const { mapAfterAllReturn } = require('../../utils/promiseUtils');
const { isFunction, isObject } = require('../../utils/objectUtils');

const ManyToManyFindOperation = require('./find/ManyToManyFindOperation');
const ManyToManyInsertOperation = require('./insert/ManyToManyInsertOperation');
const ManyToManyRelateOperation = require('./relate/ManyToManyRelateOperation');

const ManyToManyUnrelateOperation = require('./unrelate/ManyToManyUnrelateOperation');
const ManyToManyUnrelateMySqlOperation = require('./unrelate/ManyToManyUnrelateMySqlOperation');
const ManyToManyUnrelateSqliteOperation = require('./unrelate/ManyToManyUnrelateSqliteOperation');

const ManyToManyUpdateOperation = require('./update/ManyToManyUpdateOperation');
const ManyToManyUpdateMySqlOperation = require('./update/ManyToManyUpdateMySqlOperation');
const ManyToManyUpdateSqliteOperation = require('./update/ManyToManyUpdateSqliteOperation');

const ManyToManyDeleteOperation = require('./delete/ManyToManyDeleteOperation');
const ManyToManyDeleteMySqlOperation = require('./delete/ManyToManyDeleteMySqlOperation');
const ManyToManyDeleteSqliteOperation = require('./delete/ManyToManyDeleteSqliteOperation');

class ManyToManyRelation extends Relation {
  setMapping(mapping) {
    const retVal = super.setMapping(mapping);

    let ctx = {
      mapping,
      ownerModelClass: this.ownerModelClass,
      relatedModelClass: this.relatedModelClass,
      ownerProp: this.ownerProp,
      relatedProp: this.relatedProp,

      joinTableModelClass: null,
      joinTableOwnerProp: null,
      joinTableRelatedProp: null,
      joinTableBeforeInsert: null,
      joinTableExtras: [],

      createError: msg => this.createError(msg)
    };

    ctx = checkThroughObject(ctx);
    ctx = resolveJoinModelClassIfDefined(ctx);
    ctx = createJoinProperties(ctx);
    ctx = parseExtras(ctx);
    ctx = parseBeforeInsert(ctx);
    ctx = finalizeJoinModelClass(ctx);

    this.joinTableExtras = ctx.joinTableExtras;
    this.joinTableModelClass = ctx.joinTableModelClass;
    this.joinTableOwnerProp = ctx.joinTableOwnerProp;
    this.joinTableRelatedProp = ctx.joinTableRelatedProp;
    this.joinTableBeforeInsert = ctx.joinTableBeforeInsert;

    return retVal;
  }

  get forbiddenMappingProperties() {
    return [];
  }

  findQuery(builder, opt) {
    const joinTableOwnerRefs = this.joinTableOwnerProp.refs(builder);
    const joinTable = builder.tableNameFor(this.joinTable);
    const joinTableAlias = builder.tableRefFor(this.joinTable);

    builder.join(aliasedTableName(joinTable, joinTableAlias), join => {
      for (let i = 0, l = this.relatedProp.size; i < l; ++i) {
        const relatedRef = this.relatedProp.ref(builder, i);
        const joinTableRelatedRef = this.joinTableRelatedProp.ref(builder, i);

        join.on(relatedRef, joinTableRelatedRef);
      }
    });

    if (opt.isColumnRef) {
      for (let i = 0, l = joinTableOwnerRefs.length; i < l; ++i) {
        builder.where(joinTableOwnerRefs[i], ref(opt.ownerIds[i]));
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(joinTableOwnerRefs, opt.ownerIds);
    } else {
      builder.resolve([]);
    }

    return builder.modify(this.modify);
  }

  join(
    builder,
    {
      joinOperation = defaultJoinOperation(this, builder),
      relatedTableAlias = defaultRelatedTablealias(this, builder),
      relatedJoinSelectQuery = defaultRelatedJoinSelectQuery(this, builder),
      relatedTable = defaultRelatedTable(this, builder),
      ownerTable = defaultOwnerTable(this, builder),
      joinTableAlias = defaultJoinTableAlias(this, relatedTableAlias, builder)
    } = {}
  ) {
    let relatedJoinSelect = relatedJoinSelectQuery.modify(this.modify).as(relatedTableAlias);

    if (relatedJoinSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedJoinSelect = aliasedTableName(relatedTable, relatedTableAlias);
    }

    return builder[joinOperation](aliasedTableName(this.joinTable, joinTableAlias), join => {
      const ownerProp = this.ownerProp;
      const joinTableOwnerProp = this.joinTableOwnerProp;

      for (let i = 0, l = ownerProp.size; i < l; ++i) {
        const joinTableOwnerRef = joinTableOwnerProp.ref(builder, i).table(joinTableAlias);
        const ownerRef = ownerProp.ref(builder, i).table(ownerTable);

        join.on(joinTableOwnerRef, ownerRef);
      }
    })[joinOperation](relatedJoinSelect, join => {
      const relatedProp = this.relatedProp;
      const joinTableRelatedProp = this.joinTableRelatedProp;

      for (let i = 0, l = relatedProp.size; i < l; ++i) {
        const joinTableRelatedRef = joinTableRelatedProp.ref(builder, i).table(joinTableAlias);
        const relatedRef = relatedProp.ref(builder, i).table(relatedTableAlias);

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
    } else if (isMySql(builder.knex())) {
      return new ManyToManyUpdateMySqlOperation('update', {
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
        modelOptions: { patch: true },
        relation: this,
        owner: owner
      });
    } else if (isMySql(builder.knex())) {
      return new ManyToManyUpdateMySqlOperation('patch', {
        modelOptions: { patch: true },
        relation: this,
        owner: owner
      });
    } else {
      return new ManyToManyUpdateOperation('patch', {
        modelOptions: { patch: true },
        relation: this,
        owner: owner
      });
    }
  }

  delete(builder, owner) {
    if (isSqlite(builder.knex())) {
      return new ManyToManyDeleteSqliteOperation('delete', {
        relation: this,
        owner: owner
      });
    } else if (isMySql(builder.knex())) {
      return new ManyToManyDeleteMySqlOperation('delete', {
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
    } else if (isMySql(builder.knex())) {
      return new ManyToManyUnrelateMySqlOperation('unrelate', {
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

  omitExtraProps(models) {
    if (this.joinTableExtras && this.joinTableExtras.length) {
      const props = this.joinTableExtras.map(extra => extra.aliasProp);

      for (let i = 0, l = models.length; i < l; ++i) {
        const queryProps = models[i].$$queryProps;

        // Omit extra properties instead of deleting them from the models so that they can
        // be used in the `$before` and `$after` hooks.
        models[i].$omitFromDatabaseJson(props);

        if (queryProps) {
          // We can delete the query properties since they shouldn't be used by anything
          // other than `$toDatabaseJson()`.
          for (let j = 0; j < props.length; ++j) {
            const prop = props[j];

            if (prop in queryProps) {
              delete queryProps[prop];
            }
          }
        }
      }
    }
  }

  executeJoinTableBeforeInsert(models, queryContext, result) {
    return mapAfterAllReturn(
      models,
      model => this.joinTableBeforeInsert(model, queryContext),
      result
    );
  }
}

function defaultJoinOperation() {
  return 'join';
}

function defaultRelatedTablealias(relation, builder) {
  return builder.tableRefFor(relation.relatedModelClass.getTableName());
}

function defaultRelatedJoinSelectQuery(relation, builder) {
  return relation.relatedModelClass.query().childQueryOf(builder);
}

function defaultRelatedTable(relation, builder) {
  return builder.tableNameFor(relation.relatedModelClass.getTableName());
}

function defaultOwnerTable(relation, builder) {
  return builder.tableRefFor(relation.ownerModelClass.getTableName());
}

function defaultJoinTableAlias(relation, relatedTableAlias, builder) {
  const alias = builder.tableRefFor(relation.joinTable);

  if (alias === relation.joinTable) {
    return relation.ownerModelClass.joinTableAlias(relatedTableAlias);
  } else {
    return alias;
  }
}

function aliasedTableName(tableName, alias) {
  if (tableName === alias) {
    return tableName;
  } else {
    return `${tableName} as ${alias}`;
  }
}

function checkThroughObject(ctx) {
  const mapping = ctx.mapping;

  if (!isObject(mapping.join.through)) {
    throw ctx.createError('join must have a `through` object that describes the join table.');
  }

  if (!mapping.join.through.from || !mapping.join.through.to) {
    throw ctx.createError(
      'join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}'
    );
  }

  return ctx;
}

function resolveJoinModelClassIfDefined(ctx) {
  let joinTableModelClass = null;

  if (ctx.mapping.join.through.modelClass) {
    try {
      joinTableModelClass = resolveModel(
        ctx.mapping.join.through.modelClass,
        ctx.ownerModelClass.modelPaths,
        'join.through.modelClass'
      );
    } catch (err) {
      throw ctx.createError(err.message);
    }
  }

  return Object.assign(ctx, { joinTableModelClass });
}

function createJoinProperties(ctx) {
  let ret;

  let fromProp;
  let toProp;

  let relatedProp;
  let ownerProp;

  ret = createRelationProperty(ctx, ctx.mapping.join.through.from, 'join.through.from');
  fromProp = ret.prop;
  ctx = ret.ctx;

  ret = createRelationProperty(ctx, ctx.mapping.join.through.to, 'join.through.to');
  toProp = ret.prop;
  ctx = ret.ctx;

  if (fromProp.modelClass.getTableName() !== toProp.modelClass.getTableName()) {
    throw ctx.createError('join.through `from` and `to` must point to the same join table.');
  }

  if (ctx.relatedProp.modelClass.getTableName() === fromProp.modelClass.getTableName()) {
    relatedProp = fromProp;
    ownerProp = toProp;
  } else {
    relatedProp = toProp;
    ownerProp = fromProp;
  }

  return Object.assign(ctx, {
    joinTableOwnerProp: ownerProp,
    joinTableRelatedProp: relatedProp
  });
}

function createRelationProperty(ctx, refString, messagePrefix) {
  let prop = null;
  let joinTableModelClass = ctx.joinTableModelClass;

  const resolveModelClass = table => {
    if (joinTableModelClass === null) {
      joinTableModelClass = inheritModel(getModel());
      joinTableModelClass.tableName = table;
      joinTableModelClass.idColumn = null;
      joinTableModelClass.concurrency = ctx.ownerModelClass.concurrency;
    }

    if (joinTableModelClass.getTableName() === table) {
      return joinTableModelClass;
    } else {
      return null;
    }
  };

  try {
    prop = new RelationProperty(refString, resolveModelClass);
  } catch (err) {
    if (err instanceof RelationProperty.ModelNotFoundError) {
      throw ctx.createError('join.through `from` and `to` must point to the same join table.');
    } else {
      throw ctx.createError(
        `${messagePrefix} must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].`
      );
    }
  }

  return {
    ctx: Object.assign(ctx, { joinTableModelClass }),
    prop
  };
}

function parseExtras(ctx) {
  let extraDef = ctx.mapping.join.through.extra;

  if (!extraDef) {
    return ctx;
  }

  if (Array.isArray(extraDef)) {
    extraDef = extraDef.reduce((extraDef, col) => {
      extraDef[col] = col;
      return extraDef;
    }, {});
  }

  const joinTableExtras = Object.keys(extraDef).map(key => {
    const val = extraDef[key];

    return {
      joinTableCol: val,
      joinTableProp: ctx.joinTableModelClass.columnNameToPropertyName(val),
      aliasCol: key,
      aliasProp: ctx.joinTableModelClass.columnNameToPropertyName(key)
    };
  });

  return Object.assign(ctx, { joinTableExtras });
}

function parseBeforeInsert(ctx) {
  let joinTableBeforeInsert;

  if (isFunction(ctx.mapping.join.through.beforeInsert)) {
    joinTableBeforeInsert = ctx.mapping.join.through.beforeInsert;
  } else {
    joinTableBeforeInsert = model => model;
  }

  return Object.assign(ctx, { joinTableBeforeInsert });
}

function finalizeJoinModelClass(ctx) {
  if (ctx.joinTableModelClass.getIdColumn() === null) {
    // We cannot know if the join table has a primary key. Therefore we set some
    // known column as the idColumn so that inserts will work.
    ctx.joinTableModelClass.idColumn = ctx.joinTableRelatedProp.cols;
  }

  return ctx;
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
