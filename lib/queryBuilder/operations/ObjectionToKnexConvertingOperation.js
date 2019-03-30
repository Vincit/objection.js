'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { isPlainObject, isObject, isFunction, once } = require('../../utils/objectUtils');
const { isKnexQueryBuilder, isKnexJoinBuilder } = require('../../utils/knexUtils');
const getJoinBuilder = once(() => require('../JoinBuilder').JoinBuilder);

// An abstract operation base class that converts all arguments from objection types
// to knex types. For example objection query builders are converted into knex query
// builders and objection RawBuilder instances are converted into knex Raw instances.
class ObjectionToKnexConvertingOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.args = null;
  }

  getKnexArgs(builder) {
    return convertArgs(this.name, builder, this.args);
  }

  onAdd(builder, args) {
    this.args = Array.from(args);
    return shouldBeAdded(this.name, builder, this.args);
  }

  clone() {
    const clone = super.clone();
    clone.args = this.args;
    return clone;
  }
}

function shouldBeAdded(opName, builder, args) {
  const skipUndefined = builder.internalOptions().skipUndefined;

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (isUndefined(arg)) {
      if (skipUndefined) {
        return false;
      } else {
        throw new Error(
          `undefined passed as argument #${i} for '${opName}' operation. Call skipUndefined() method to ignore the undefined values.`
        );
      }
    }
  }

  return true;
}

function convertArgs(opName, builder, args) {
  const skipUndefined = builder.internalOptions().skipUndefined;

  return args.map((arg, i) => {
    if (hasToKnexRawMethod(arg)) {
      return convertToKnexRaw(arg, builder);
    } else if (isObjectionQueryBuilderBase(arg)) {
      return convertQueryBuilderBase(arg, builder);
    } else if (isArray(arg)) {
      return convertArray(arg, builder, i, opName, skipUndefined);
    } else if (isFunction(arg)) {
      return convertFunction(arg, builder);
    } else if (isModel(arg)) {
      return convertModel(arg);
    } else if (isPlainObject(arg)) {
      return convertPlainObject(arg, builder, i, opName, skipUndefined);
    } else {
      return arg;
    }
  });
}

function isUndefined(item) {
  return item === undefined;
}

function hasToKnexRawMethod(item) {
  return isObject(item) && isFunction(item.toKnexRaw);
}

function convertToKnexRaw(item, builder) {
  return item.toKnexRaw(builder);
}

function isObjectionQueryBuilderBase(item) {
  return isObject(item) && item.isObjectionQueryBuilderBase === true;
}

function convertQueryBuilderBase(item, builder) {
  return item.subqueryOf(builder).toKnexQuery();
}

function isArray(item) {
  return Array.isArray(item);
}

function convertArray(arr, builder, i, opName, skipUndefined) {
  return arr.map(item => {
    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(
          `undefined passed as an item in argument #${i} for '${opName}' operation. Call skipUndefined() method to ignore the undefined values.`
        );
      }
    } else if (hasToKnexRawMethod(item)) {
      return convertToKnexRaw(item, builder);
    } else if (isObjectionQueryBuilderBase(item)) {
      return convertQueryBuilderBase(item);
    } else {
      return item;
    }
  });
}

function convertFunction(func, builder) {
  return function convertedKnexArgumentFunction(...args) {
    if (isKnexQueryBuilder(this)) {
      convertQueryBuilderFunction(this, func, builder);
    } else if (isKnexJoinBuilder(this)) {
      convertJoinBuilderFunction(this, func, builder);
    } else {
      return func.apply(this, args);
    }
  };
}

function convertQueryBuilderFunction(knexQueryBuilder, func, builder) {
  const convertedQueryBuilder = builder.constructor.forClass(builder.modelClass());

  convertedQueryBuilder.subqueryOf(builder).isPartial(true);
  func.call(convertedQueryBuilder, convertedQueryBuilder);

  convertedQueryBuilder.toKnexQuery(knexQueryBuilder);
}

function convertJoinBuilderFunction(knexJoinBuilder, func, builder) {
  const JoinBuilder = getJoinBuilder();
  const joinClauseBuilder = JoinBuilder.forClass(builder.modelClass());

  joinClauseBuilder.subqueryOf(builder).isPartial(true);
  func.call(joinClauseBuilder, joinClauseBuilder);

  joinClauseBuilder.toKnexQuery(knexJoinBuilder);
}

function isModel(item) {
  return isObject(item) && item.$isObjectionModel;
}

function convertModel(model) {
  return model.$toDatabaseJson();
}

function convertPlainObject(obj, builder, i, opName, skipUndefined) {
  return Object.keys(obj).reduce((out, key) => {
    const item = obj[key];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(
          `undefined passed as a property in argument #${i} for '${opName}' operation. Call skipUndefined() method to ignore the undefined values.`
        );
      }
    } else if (hasToKnexRawMethod(item)) {
      out[key] = convertToKnexRaw(item, builder);
    } else if (isObjectionQueryBuilderBase(item)) {
      out[key] = convertQueryBuilderBase(item, builder);
    } else {
      out[key] = item;
    }

    return out;
  }, {});
}

module.exports = {
  ObjectionToKnexConvertingOperation
};
