'use strict';

const { RelationProperty } = require('./RelationProperty');

const { RelationFindOperation } = require('./RelationFindOperation');
const { RelationUpdateOperation } = require('./RelationUpdateOperation');
const { RelationDeleteOperation } = require('./RelationDeleteOperation');
const { RelationSubqueryOperation } = require('./RelationSubqueryOperation');

const { ref } = require('../queryBuilder/ReferenceBuilder');
const { resolveModel } = require('../utils/resolveModel');
const { get, isFunction } = require('../utils/objectUtils');
const { mapAfterAllReturn } = require('../utils/promiseUtils');
const { createModifier } = require('../utils/createModifier');

class Relation {
  constructor(relationName, OwnerClass) {
    this.name = relationName;
    this.ownerModelClass = OwnerClass;
    this.relatedModelClass = null;

    this.ownerProp = null;
    this.relatedProp = null;

    this.joinTableModelClass = null;
    this.joinTableOwnerProp = null;
    this.joinTableRelatedProp = null;
    this.joinTableBeforeInsert = null;
    this.joinTableExtras = [];

    this.modify = null;
    this.beforeInsert = null;
  }

  setMapping(mapping) {
    let ctx = {
      name: this.name,
      mapping,
      ownerModelClass: this.ownerModelClass,
      relatedModelClass: null,
      relatedProp: null,
      ownerProp: null,
      modify: null,
      beforeInsert: null,
      forbiddenMappingProperties: this.forbiddenMappingProperties,
      createError: msg => this.createError(msg)
    };

    ctx = checkForbiddenProperties(ctx);
    ctx = checkOwnerModelClass(ctx);
    ctx = checkRelatedModelClass(ctx);
    ctx = resolveRelatedModelClass(ctx);
    ctx = checkRelation(ctx);
    ctx = createJoinProperties(ctx);
    ctx = parseModify(ctx);
    ctx = parseBeforeInsert(ctx);

    this.relatedModelClass = ctx.relatedModelClass;
    this.ownerProp = ctx.ownerProp;
    this.relatedProp = ctx.relatedProp;
    this.modify = ctx.modify;
    this.beforeInsert = ctx.beforeInsert;
  }

  get forbiddenMappingProperties() {
    return ['join.through'];
  }

  get joinTable() {
    return this.joinTableModelClass ? this.joinTableModelClass.getTableName() : null;
  }

  get joinModelClass() {
    return this.getJoinModelClass(this.ownerModelClass.knex());
  }

  getJoinModelClass(knex) {
    return this.joinTableModelClass && knex !== this.joinTableModelClass.knex()
      ? this.joinTableModelClass.bindKnex(knex)
      : this.joinTableModelClass;
  }

  isOneToOne() {
    return false;
  }

  clone() {
    const relation = new this.constructor(this.name, this.ownerModelClass);

    relation.relatedModelClass = this.relatedModelClass;
    relation.ownerProp = this.ownerProp;
    relation.relatedProp = this.relatedProp;
    relation.modify = this.modify;
    relation.beforeInsert = this.beforeInsert;

    relation.joinTableModelClass = this.joinTableModelClass;
    relation.joinTableOwnerProp = this.joinTableOwnerProp;
    relation.joinTableRelatedProp = this.joinTableRelatedProp;
    relation.joinTableBeforeInsert = this.joinTableBeforeInsert;
    relation.joinTableExtras = this.joinTableExtras;

    return relation;
  }

  bindKnex(knex) {
    const bound = this.clone();

    bound.relatedModelClass = this.relatedModelClass.bindKnex(knex);
    bound.ownerModelClass = this.ownerModelClass.bindKnex(knex);

    if (this.joinTableModelClass) {
      bound.joinTableModelClass = this.joinTableModelClass.bindKnex(knex);
    }

    return bound;
  }

  findQuery(builder, opt) {
    const relatedRefs = this.relatedProp.refs(builder);

    if (opt.isColumnRef) {
      for (let i = 0, l = relatedRefs.length; i < l; ++i) {
        builder.where(relatedRefs[i], ref(opt.ownerIds[i]));
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(relatedRefs, opt.ownerIds);
    } else {
      builder.resolve([]);
    }

    return this.applyModify(builder);
  }

  applyModify(builder) {
    try {
      return builder.modify(this.modify);
    } catch (err) {
      if (err instanceof this.relatedModelClass.ModifierNotFoundError) {
        throw this.createError(err.message);
      } else {
        throw err;
      }
    }
  }

  join(
    builder,
    {
      joinOperation = 'join',
      relatedTableAlias = builder.tableRefFor(this.relatedModelClass.getTableName()),
      relatedJoinSelectQuery = this.relatedModelClass.query().childQueryOf(builder),
      relatedTable = builder.tableNameFor(this.relatedModelClass.getTableName()),
      ownerTable = builder.tableRefFor(this.ownerModelClass.getTableName())
    } = {}
  ) {
    let relatedJoinSelect = this.applyModify(relatedJoinSelectQuery).as(relatedTableAlias);

    if (relatedJoinSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedJoinSelect = aliasedTableName(relatedTable, relatedTableAlias);
    }

    return builder[joinOperation](relatedJoinSelect, join => {
      const relatedProp = this.relatedProp;
      const ownerProp = this.ownerProp;

      for (let i = 0, l = relatedProp.size; i < l; ++i) {
        const relatedRef = relatedProp.ref(builder, i).table(relatedTableAlias);
        const ownerRef = ownerProp.ref(builder, i).table(ownerTable);

        join.on(relatedRef, ownerRef);
      }
    });
  }

  insert(builder, owner) {
    /* istanbul ignore next */
    throw this.createError('not implemented');
  }

  update(builder, owner) {
    return new RelationUpdateOperation('update', {
      relation: this,
      owner: owner
    });
  }

  patch(builder, owner) {
    return new RelationUpdateOperation('patch', {
      relation: this,
      owner: owner,
      modelOptions: { patch: true }
    });
  }

  find(builder, owners) {
    return new RelationFindOperation('find', {
      relation: this,
      owners: owners
    });
  }

  subQuery(builder) {
    return new RelationSubqueryOperation('subQuery', {
      relation: this
    });
  }

  delete(builder, owner) {
    return new RelationDeleteOperation('delete', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    /* istanbul ignore next */
    throw this.createError('not implemented');
  }

  unrelate(builder, owner) {
    /* istanbul ignore next */
    throw this.createError('not implemented');
  }

  hasRelateProp(model) {
    return model.$hasProps(this.relatedProp.props);
  }

  setRelateProp(model, values) {
    for (let i = 0, l = this.relatedProp.size; i < l; ++i) {
      this.relatedProp.setProp(model, i, values[i]);
    }
  }

  executeBeforeInsert(models, queryContext, result) {
    return mapAfterAllReturn(models, model => this.beforeInsert(model, queryContext), result);
  }

  createError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      return new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      return new Error(`${this.constructor.name}: ${message}`);
    }
  }
}

Object.defineProperties(Relation, {
  isObjectionRelationClass: {
    enumerable: false,
    writable: false,
    value: true
  }
});

Object.defineProperties(Relation.prototype, {
  isObjectionRelation: {
    enumerable: false,
    writable: false,
    value: true
  }
});

function checkForbiddenProperties(ctx) {
  ctx.forbiddenMappingProperties.forEach(prop => {
    if (get(ctx.mapping, prop.split('.')) !== undefined) {
      throw ctx.createError(`Property ${prop} is not supported for this relation type.`);
    }
  });

  return ctx;
}

function checkOwnerModelClass(ctx) {
  if (!isFunction(ctx.ownerModelClass) || !ctx.ownerModelClass.isObjectionModelClass) {
    throw ctx.createError(`Relation's owner is not a subclass of Model`);
  }

  return ctx;
}

function checkRelatedModelClass(ctx) {
  if (!ctx.mapping.modelClass) {
    throw ctx.createError('modelClass is not defined');
  }

  return ctx;
}

function resolveRelatedModelClass(ctx) {
  let relatedModelClass;

  try {
    relatedModelClass = resolveModel(
      ctx.mapping.modelClass,
      ctx.ownerModelClass.modelPaths,
      'modelClass'
    );
  } catch (err) {
    throw ctx.createError(err.message);
  }

  return Object.assign(ctx, { relatedModelClass });
}

function checkRelation(ctx) {
  if (!ctx.mapping.relation) {
    throw ctx.createError('relation is not defined');
  }

  if (!isFunction(ctx.mapping.relation) || !ctx.mapping.relation.isObjectionRelationClass) {
    throw ctx.createError('relation is not a subclass of Relation');
  }

  return ctx;
}

function createJoinProperties(ctx) {
  const mapping = ctx.mapping;

  if (!mapping.join || !mapping.join.from || !mapping.join.to) {
    throw ctx.createError(
      'join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}'
    );
  }

  const fromProp = createRelationProperty(ctx, mapping.join.from, 'join.from');
  const toProp = createRelationProperty(ctx, mapping.join.to, 'join.to');

  let ownerProp;
  let relatedProp;

  if (fromProp.modelClass.getTableName() === ctx.ownerModelClass.getTableName()) {
    ownerProp = fromProp;
    relatedProp = toProp;
  } else if (toProp.modelClass.getTableName() === ctx.ownerModelClass.getTableName()) {
    ownerProp = toProp;
    relatedProp = fromProp;
  } else {
    throw ctx.createError('join: either `from` or `to` must point to the owner model table.');
  }

  if (ownerProp.props.some(it => it === ctx.name)) {
    throw ctx.createError(
      `join: relation name and join property '${ctx.name}' cannot have the same name. If you cannot change one or the other, you can use $parseDatabaseJson and $formatDatabaseJson methods to convert the column name.`
    );
  }

  if (relatedProp.modelClass.getTableName() !== ctx.relatedModelClass.getTableName()) {
    throw ctx.createError('join: either `from` or `to` must point to the related model table.');
  }

  return Object.assign(ctx, { ownerProp, relatedProp });
}

function createRelationProperty(ctx, refString, propName) {
  try {
    return new RelationProperty(refString, table => {
      return [ctx.ownerModelClass, ctx.relatedModelClass].find(it => it.getTableName() === table);
    });
  } catch (err) {
    if (err instanceof RelationProperty.ModelNotFoundError) {
      throw ctx.createError(
        `join: either \`from\` or \`to\` must point to the owner model table and the other one to the related table. It might be that specified table '${err.tableName}' is not correct`
      );
    } else if (err instanceof RelationProperty.InvalidReferenceError) {
      throw ctx.createError(
        `${propName} must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].`
      );
    } else {
      throw err;
    }
  }
}

function parseModify(ctx) {
  const mapping = ctx.mapping;
  const modifier = mapping.modify || mapping.filter;
  const modify =
    modifier &&
    createModifier({
      modifier,
      modelClass: ctx.relatedModelClass
    });

  return Object.assign(ctx, { modify });
}

function parseBeforeInsert(ctx) {
  let beforeInsert;

  if (isFunction(ctx.mapping.beforeInsert)) {
    beforeInsert = ctx.mapping.beforeInsert;
  } else {
    beforeInsert = model => model;
  }

  return Object.assign(ctx, { beforeInsert });
}

function containsNonNull(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    const val = arr[i];

    if (Array.isArray(val)) {
      if (containsNonNull(val)) {
        return true;
      }
    } else if (val !== null && val !== undefined) {
      return true;
    }
  }

  return false;
}

function aliasedTableName(tableName, alias) {
  if (tableName === alias) {
    return tableName;
  } else {
    return `${tableName} as ${alias}`;
  }
}

module.exports = {
  Relation
};
