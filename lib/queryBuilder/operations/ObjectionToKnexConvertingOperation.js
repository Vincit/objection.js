'use strict';

const memoize = require('lodash').memoize;
const QueryBuilderOperation = require('./QueryBuilderOperation');
const isKnexQueryBuilder = require('../../utils/knexUtils').isKnexQueryBuilder;
const isKnexJoinBuilder = require('../../utils/knexUtils').isKnexJoinBuilder;
const isKnexRaw = require('../../utils/knexUtils').isKnexRaw;

const getQueryBuilderBase = memoize(() => require('../QueryBuilderBase'));
const getJoinBuilder = memoize(() => require('../JoinBuilder'));

// An abstract operation base class that converts all arguments from objection types
// to knex types. For example objection query builders are converted into knex query
// builders and objection RawBuilder instances are converted into knex Raw instances.
class ObjectionToKnexConvertingOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.args = null;
  }

  onAdd(builder, args) {
    this.args = convertArgs(this, builder, args);
    return this.args !== null;
  }
}

function convertArgs(op, builder, args) {
  const skipUndefined = builder.internalOptions().skipUndefined;
  const knex = builder.knex();
  const out = new Array(args.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (isUndefined(arg)) {
      return convertUndefined(i, op, skipUndefined);
    } else if (isObjectionReferenceBuilder(arg)) {
      out[i] = convertReferenceBuilder(arg, knex);
    } else if (isObjectionRawBuilder(arg)) {
      out[i] = convertRawBuilder(arg, knex);
    } else if (isObjectionQueryBuilderBase(arg)) {
      out[i] = convertQueryBuilderBase(arg);
    } else if (isArray(arg)) {
      out[i] = convertArray(arg, knex, i, op, skipUndefined);
    } else if (isFunction(arg)) {
      out[i] = convertFunction(arg, knex);
    } else if (isModel(arg)) {
      out[i] = convertModel(arg, knex);
    } else if (isPlainObject(arg)) {
      out[i] = convertPlainObject(arg, knex, i, op, skipUndefined);
    } else {
      out[i] = arg;
    }
  }

  return out;
}

function isUndefined(item) {
  return item === undefined;
}

function convertUndefined(i, op, skipUndefined) {
  if (skipUndefined) {
    return null;
  } else {
    throw new Error(`undefined passed as argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
  }
}

function isObjectionReferenceBuilder(item) {
  return item !== null && item.isObjectionReferenceBuilder === true;
}

function convertReferenceBuilder(builder, knex) {
  return builder.build(knex);
}

function isObjectionRawBuilder(item) {
  return item !== null && item.isObjectionRawBuilder === true;
}

function convertRawBuilder(builder, knex) {
  return builder.build(knex);
}

function isObjectionQueryBuilderBase(item) {
  return item !== null && item.isObjectionQueryBuilderBase === true;
}

function convertQueryBuilderBase(builder) {
  return builder.build();
}

function isArray(item) {
  return Array.isArray(item);
}

function convertArray(arr, knex, i, op, skipUndefined) {
  const out = [];

  for (let j = 0, l = arr.length; j < l; ++j) {
    const item = arr[j];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(`undefined passed as an item in argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (isObjectionReferenceBuilder(item)) {
      out.push(convertReferenceBuilder(item, knex));
    } else if (isObjectionRawBuilder(item)) {
      out.push(convertRawBuilder(item, knex));
    } else if (isObjectionQueryBuilderBase(item)) {
      out.push(convertQueryBuilderBase(item));
    } else {
      out.push(item);
    }
  }

  return out;
}

function isFunction(item) {
  return typeof item === 'function';
}

function convertFunction(func, knex) {
  return function convertedKnexArgumentFunction() {
    if (isKnexQueryBuilder(this)) {
      convertQueryBuilderFunction(this, func, knex)
    } else if (isKnexJoinBuilder(this)) {
      convertJoinBuilderFunction(this, func, knex);
    } else {
      return func.apply(this, arguments);
    }
  };
}

function convertQueryBuilderFunction(knexQueryBuilder, func, knex) {
  const QueryBuilderBase = getQueryBuilderBase();
  const convertpedQueryBuilder = new QueryBuilderBase(knex);

  func.call(convertpedQueryBuilder, convertpedQueryBuilder);
  convertpedQueryBuilder.buildInto(knexQueryBuilder);
}

function convertJoinBuilderFunction(knexJoinBuilder, func, knex) {
  const JoinBuilder = getJoinBuilder();
  const joinClauseBuilder = new JoinBuilder(knex);

  func.call(joinClauseBuilder, joinClauseBuilder);
  joinClauseBuilder.buildInto(knexJoinBuilder);
}

function isModel(item) {
  return item != null && item.$isObjectionModel;
}

function convertModel(model) {
  return model.$toDatabaseJson();
}

function isPlainObject(item) {
  return item !== null
    && typeof item === 'object'
    && (!item.constructor || item.constructor === Object)
    && (!item.toString || item.toString === Object.prototype.toString)
}

function convertPlainObject(obj, knex, i, op, skipUndefined) {
  const out = {};
  const keys = Object.keys(obj);

  for (let j = 0, l = keys.length; j < l; ++j) {
    const key = keys[j];
    const item = obj[key];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(`undefined passed as a property in argument #${i} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (isObjectionReferenceBuilder(item)) {
      out[key] = convertReferenceBuilder(item, knex);
    } else if (isObjectionRawBuilder(item)) {
      out[key] = convertRawBuilder(item, knex);
    } else if (isObjectionQueryBuilderBase(item)) {
      out[key] = convertQueryBuilderBase(item);
    } else {
      out[key] = item;
    }
  }

  return out;
}

module.exports = ObjectionToKnexConvertingOperation;
