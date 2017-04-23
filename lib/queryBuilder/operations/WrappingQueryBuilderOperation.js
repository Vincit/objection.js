'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');
const isKnexQueryBuilder = require('../../utils/knexUtils').isKnexQueryBuilder;
const isKnexJoinBuilder = require('../../utils/knexUtils').isKnexJoinBuilder;

let QueryBuilderBase = null;
let JoinBuilder = null;

class WrappingQueryBuilderOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.args = null;
  }

  call(builder, args) {
    const ret = wrapArgs(this, builder, args);
    this.args = args;
    return ret;
  }
}

function wrapArgs(op, builder, args) {
  // Preventing cyclic deps.
  QueryBuilderBase = QueryBuilderBase || requireQueryBuilderBase();

  const skipUndefined = builder.internalOptions().skipUndefined;
  const knex = builder.knex();

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (arg === undefined) {
      if (skipUndefined) {
        return false;
      } else {
        throw new Error(`undefined passed as argument #${l} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (arg && arg.isObjectionReferenceBuilder) {
      args[i] = knex.raw.apply(knex, args[i].toRawArgs());
    } else if (arg && arg.isObjectionQueryBuilderBase) {
      // Convert QueryBuilderBase instances into knex query builders.
      args[i] = arg.build();
    } else if (Array.isArray(arg)) {
      if (skipUndefined) {
        args[i] = withoutUndefined(arg);
      } else if (includesUndefined(arg)) {
        throw new Error(`undefined passed as an item in argument #${l} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
      // convert reference builders to knex.raw
      args[i] = args[i].map(arg => {
        return (arg && arg.isObjectionReferenceBuilder) ? knex.raw.apply(knex, arg.toRawArgs()) : arg;
      });
    } else if (typeof arg === 'function') {
      // If an argument is a function, knex calls it with a query builder as
      // first argument (and as `this` context). We wrap the query builder into
      // a QueryBuilderBase instance.
      args[i] = wrapFunctionArg(arg, knex);
    }
  }

  return true;
}

function wrapFunctionArg(func, knex) {
  // Preventing cyclic deps.
  QueryBuilderBase = QueryBuilderBase || requireQueryBuilderBase();
  JoinBuilder = JoinBuilder || requireJoinBuilder();

  return function wrappedKnexFunctionArg() {
    if (isKnexQueryBuilder(this)) {
      const knexQueryBuilder = this;
      const wrappedQueryBuilder = new QueryBuilderBase(knex);

      func.call(wrappedQueryBuilder, wrappedQueryBuilder);
      wrappedQueryBuilder.buildInto(knexQueryBuilder);
    } else if (isKnexJoinBuilder(this)) {
      const knexQueryBuilder = this;
      const joinClauseBuilder = new JoinBuilder(knex);

      func.call(joinClauseBuilder, joinClauseBuilder);
      joinClauseBuilder.buildInto(knexQueryBuilder);
    } else {
      return func.apply(this, arguments);
    }
  };
}

function withoutUndefined(arr) {
  const out = [];

  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] !== undefined) {
      out.push(arr[i]);
    }
  }

  return out;
}

function includesUndefined(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === undefined) {
      return true;
    }
  }

  return false;
}

function requireQueryBuilderBase() {
  return require('../QueryBuilderBase');
}

function requireJoinBuilder() {
  return require('../JoinBuilder');
}

module.exports = WrappingQueryBuilderOperation;
