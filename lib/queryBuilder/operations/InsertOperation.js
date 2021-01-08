'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { StaticHookArguments } = require('../StaticHookArguments');
const { after, mapAfterAllReturn } = require('../../utils/promiseUtils');
const { isPostgres, isSqlite, isMySql, isMsSql } = require('../../utils/knexUtils');
const { isObject } = require('../../utils/objectUtils');

// Base class for all insert operations.
class InsertOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.models = null;
    this.isArray = false;
    this.modelOptions = Object.assign({}, this.opt.modelOptions || {});
  }

  onAdd(builder, args) {
    const json = args[0];
    const modelClass = builder.modelClass();

    this.isArray = Array.isArray(json);
    this.models = modelClass.ensureModelArray(json, this.modelOptions);

    return true;
  }

  async onBefore2(builder, result) {
    if (this.models.length > 1 && !isPostgres(builder.knex()) && !isMsSql(builder.knex())) {
      throw new Error('batch insert only works with Postgresql and SQL Server');
    } else {
      await callBeforeInsert(builder, this.models);
      return result;
    }
  }

  onBuildKnex(knexBuilder, builder) {
    if (!isSqlite(builder.knex()) && !isMySql(builder.knex()) && !builder.has(/returning/)) {
      // If the user hasn't specified a `returning` clause, we make sure
      // that at least the identifier is returned.
      knexBuilder = knexBuilder.returning(builder.modelClass().getIdColumn());
    }

    return knexBuilder.insert(this.models.map((model) => model.$toDatabaseJson(builder)));
  }

  onAfter1(_, ret) {
    if (!Array.isArray(ret) || !ret.length || ret === this.models) {
      // Early exit if there is nothing to do.
      return this.models;
    }

    if (isObject(ret[0])) {
      // If the user specified a `returning` clause the result may be an array of objects.
      // Merge all values of the objects to our models.
      for (let i = 0, l = this.models.length; i < l; ++i) {
        this.models[i].$set(ret[i]);
      }
    } else {
      // If the return value is not an array of objects, we assume it is an array of identifiers.
      for (let i = 0, l = this.models.length; i < l; ++i) {
        const model = this.models[i];

        // Don't set the id if the model already has one. MySQL and Sqlite don't return the correct
        // primary key value if the id is not generated in db, but given explicitly.
        if (!model.$id()) {
          model.$id(ret[i]);
        }
      }
    }

    return this.models;
  }

  onAfter2(builder, models) {
    const result = this.isArray ? models : models[0] || null;
    return callAfterInsert(builder, this.models, result);
  }

  toFindOperation() {
    return null;
  }

  clone() {
    const clone = super.clone();

    clone.models = this.models;
    clone.isArray = this.isArray;

    return clone;
  }
}

function callBeforeInsert(builder, models) {
  const maybePromise = callInstanceBeforeInsert(builder, models);
  return after(maybePromise, () => callStaticBeforeInsert(builder));
}

function callInstanceBeforeInsert(builder, models) {
  return mapAfterAllReturn(models, (model) => model.$beforeInsert(builder.context()), models);
}

function callStaticBeforeInsert(builder) {
  const args = StaticHookArguments.create({ builder });
  return builder.modelClass().beforeInsert(args);
}

function callAfterInsert(builder, models, result) {
  const maybePromise = callInstanceAfterInsert(builder, models);
  return after(maybePromise, () => callStaticAfterInsert(builder, result));
}

function callInstanceAfterInsert(builder, models) {
  return mapAfterAllReturn(models, (model) => model.$afterInsert(builder.context()), models);
}

function callStaticAfterInsert(builder, result) {
  const args = StaticHookArguments.create({ builder, result });
  const maybePromise = builder.modelClass().afterInsert(args);

  return after(maybePromise, (maybeResult) => {
    if (maybeResult === undefined) {
      return result;
    } else {
      return maybeResult;
    }
  });
}

module.exports = {
  InsertOperation,
};
