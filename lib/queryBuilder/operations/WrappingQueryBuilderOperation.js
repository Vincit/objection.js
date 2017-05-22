'use strict';

const memoize = require('lodash').memoize;
const QueryBuilderOperation = require('./QueryBuilderOperation');
const isKnexQueryBuilder = require('../../utils/knexUtils').isKnexQueryBuilder;
const isKnexJoinBuilder = require('../../utils/knexUtils').isKnexJoinBuilder;
const isKnexRaw = require('../../utils/knexUtils').isKnexRaw;

const getQueryBuilderBase = memoize(() => require('../QueryBuilderBase'));
const getJoinBuilder = memoize(() => require('../JoinBuilder'));

class WrappingQueryBuilderOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.args = null;
  }

  call(builder, args) {
    this.args = wrapArgs(this, builder, args);
    return this.args !== null;
  }
}

function wrapArgs(op, builder, args) {
  const skipUndefined = builder.internalOptions().skipUndefined;
  const knex = builder.knex();
  const out = new Array(args.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (isUndefined(arg)) {
      return wrapUndefined(i, op, skipUndefined);
    } else if (isObjectionReferenceBuilder(arg)) {
      out[i] = wrapReferenceBuilder(arg, knex, skipUndefined);
    } else if (isObjectionQueryBuilderBase(arg)) {
      out[i] = wrapQueryBuilderBase(arg);
    } else if (isArray(arg)) {
      out[i] = wrapArray(arg, knex, i, op, skipUndefined);
    } else if (isFunction(arg)) {
      out[i] = wrapFunction(arg, knex);
    } else if (isPlainObject(arg)) {
      out[i] = wrapObject(arg, knex, i, op, skipUndefined);
    } else {
      out[i] = arg;
    }
  }

  return out;
}

function isUndefined(arg) {
  return arg === undefined;
}

function wrapUndefined(i, op, skipUndefined) {
  if (skipUndefined) {
    return null;
  } else {
    throw new Error(`undefined passed as argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
  }
}

function isObjectionReferenceBuilder(item) {
  return item !== null && item.isObjectionReferenceBuilder === true;
}

function wrapReferenceBuilder(builder, knex) {
  return knex.raw.apply(knex, builder.toRawArgs());
}

function isObjectionQueryBuilderBase(item) {
  return item !== null && item.isObjectionQueryBuilderBase === true;
}

function wrapQueryBuilderBase(builder) {
  return builder.build();
}

function isArray(arg) {
  return Array.isArray(arg);
}

function wrapArray(arr, knex, i, op, skipUndefined) {
  const out = [];

  for (let j = 0, l = arr.length; j < l; ++j) {
    const item = arr[j];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(`undefined passed as an item in argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (isObjectionReferenceBuilder(item)) {
      out.push(wrapReferenceBuilder(item, knex));
    } else if (isObjectionQueryBuilderBase(item)) {
      out.push(wrapQueryBuilderBase(item));
    } else {
      out.push(item);
    }
  }

  return out;
}

function isFunction(arg) {
  return typeof arg === 'function';
}

function wrapFunction(func, knex) {
  return function wrappedKnexFunctionArg() {
    if (isKnexQueryBuilder(this)) {
      wrapQueryBuilderFunction(this, func, knex)
    } else if (isKnexJoinBuilder(this)) {
      wrapJoinBuilderFunction(this, func, knex);
    } else {
      return func.apply(this, arguments);
    }
  };
}

function wrapQueryBuilderFunction(knexQueryBuilder, func, knex) {
  const QueryBuilderBase = getQueryBuilderBase();
  const wrappedQueryBuilder = new QueryBuilderBase(knex);

  func.call(wrappedQueryBuilder, wrappedQueryBuilder);
  wrappedQueryBuilder.buildInto(knexQueryBuilder);
}

function wrapJoinBuilderFunction(knexJoinBuilder, func, knex) {
  const JoinBuilder = getJoinBuilder();
  const joinClauseBuilder = new JoinBuilder(knex);

  func.call(joinClauseBuilder, joinClauseBuilder);
  joinClauseBuilder.buildInto(knexJoinBuilder);
}

function isPlainObject(arg) {
  return arg !== null 
    && (!arg.constructor || arg.constructor === Object)
    && (!arg.toString || arg.toString === Object.prototype.toString)
}

function wrapObject(obj, knex, i, op, skipUndefined) {
  const out = {};
  const keys = Object.keys(obj);

  for (let j = 0, l = keys.length; j < l; ++j) {
    const key = keys[j];
    const item = obj[key];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(`undefined passed as an item in argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (isObjectionReferenceBuilder(item)) {
      out[key] = wrapReferenceBuilder(item, knex);
    } else if (isObjectionQueryBuilderBase(item)) {
      out[key] = wrapQueryBuilderBase(item);
    } else {
      out[key] = item;
    }
  }

  return out;
}

module.exports = WrappingQueryBuilderOperation;
