'use strict';

const Relation = require('../Relation');
const inheritModel = require('../../model/inheritModel').inheritModel;
const resolveModel = require('../../utils/resolveModel').resolveModel;
const mapAfterAllReturn = require('../../utils/promiseUtils').mapAfterAllReturn;
const RelationProperty = require('../RelationProperty');
const isSqlite = require('../../utils/knexUtils').isSqlite;
const getModel = () => require('../../model/Model');
const ref = require('../../queryBuilder/ReferenceBuilder').ref;

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
    const retVal = super.setMapping(mapping);

    let ctx = {
      mapping,
      ownerModelClass: this.ownerModelClass,
      relatedModelClass: this.relatedModelClass,
      ownerProp: this.ownerProp,
      relatedProp: this.relatedProp,

      joinModelClass: null,
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
    this.joinTableModelClass = ctx.joinModelClass;
    this.joinTableOwnerProp = ctx.joinTableOwnerProp;
    this.joinTableRelatedProp = ctx.joinTableRelatedProp;
    this.joinTableBeforeInsert = ctx.joinTableBeforeInsert;

    return retVal;
  }

  joinTableAlias(builder) {
    const table = builder.tableRefFor(this.joinTableModelClass);
    return `${table}_rel_${this.name}`;
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

    /* istanbul ignore if */
    if (opt.isColumnRef) {
      // This branch is only used by `objection-find`. Keep it for backward compat.
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

  join(builder, opt) {
    opt = opt || {};

    opt.joinOperation = opt.joinOperation || 'join';
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias(builder);
    opt.relatedJoinSelectQuery =
      opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
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

    return builder[opt.joinOperation](joinTableAsAlias, join => {
      const ownerProp = this.ownerProp;
      const joinTableOwnerProp = this.joinTableOwnerProp;

      for (let i = 0, l = ownerProp.size; i < l; ++i) {
        const joinTableOwnerRef = joinTableOwnerProp.ref(builder, i).table(opt.joinTableAlias);
        const ownerRef = ownerProp.ref(builder, i).table(opt.ownerTable);

        join.on(joinTableOwnerRef, ownerRef);
      }
    })[opt.joinOperation](relatedJoinSelect, join => {
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

  omitExtraProps(models) {
    if (this.joinTableExtras && this.joinTableExtras.length) {
      const props = this.joinTableExtras.map(extra => extra.aliasProp);

      for (let i = 0, l = models.length; i < l; ++i) {
        const queryProps = models[i].$$queryProps;

        // Omit extra properties instead of deleting themfrom the models so that they can
        // be used in the `$before` and `$after` hooks.
        models[i].$omitFromDatabaseJson(props);

        if (queryProps) {
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

function checkThroughObject(ctx) {
  const mapping = ctx.mapping;

  if (!mapping.join.through || typeof mapping.join.through !== 'object') {
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
  let joinModelClass = null;

  if (ctx.mapping.join.through.modelClass) {
    try {
      joinModelClass = resolveModel(
        ctx.mapping.join.through.modelClass,
        ctx.ownerModelClass.modelPaths,
        'join.through.modelClass'
      );
    } catch (err) {
      throw ctx.createError(err.message);
    }
  }

  return Object.assign(ctx, {joinModelClass});
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
  let joinModelClass = ctx.joinModelClass;

  const resolveModelClass = table => {
    if (joinModelClass === null) {
      joinModelClass = inheritModel(getModel());
      joinModelClass.tableName = table;
      joinModelClass.idColumn = null;
    }

    if (joinModelClass.getTableName() === table) {
      return joinModelClass;
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
    ctx: Object.assign(ctx, {joinModelClass}),
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
      joinTableProp: ctx.joinModelClass.columnNameToPropertyName(val),
      aliasCol: key,
      aliasProp: ctx.joinModelClass.columnNameToPropertyName(key)
    };
  });

  return Object.assign(ctx, {joinTableExtras});
}

function parseBeforeInsert(ctx) {
  let joinTableBeforeInsert;

  if (typeof ctx.mapping.join.through.beforeInsert === 'function') {
    joinTableBeforeInsert = ctx.mapping.join.through.beforeInsert;
  } else {
    joinTableBeforeInsert = model => model;
  }

  return Object.assign(ctx, {joinTableBeforeInsert});
}

function finalizeJoinModelClass(ctx) {
  if (ctx.joinModelClass.idColumn === null) {
    // We cannot know if the join table has a primary key. Therefore we set some
    // known column as the idColumn so that inserts will work.
    ctx.joinModelClass.idColumn = ctx.joinTableRelatedProp.cols;
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
