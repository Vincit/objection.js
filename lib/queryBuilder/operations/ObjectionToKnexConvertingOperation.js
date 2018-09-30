const once = require('../../utils/objectUtils').once;
const QueryBuilderOperation = require('./QueryBuilderOperation');

const { isPlainObject, isObject, isFunction } = require('../../utils/objectUtils');
const { isKnexQueryBuilder, isKnexJoinBuilder } = require('../../utils/knexUtils');

const getQueryBuilderBase = once(() => require('../QueryBuilderBase'));
const getJoinBuilder = once(() => require('../JoinBuilder'));

// An abstract operation base class that converts all arguments from objection types
// to knex types. For example objection query builders are converted into knex query
// builders and objection RawBuilder instances are converted into knex Raw instances.
class ObjectionToKnexConvertingOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.args = null;
  }

  onAdd(builder, args) {
    this.args = args;
    return shouldBeAdded(this.name, builder, args);
  }

  onBuild(builder) {
    this.args = convertArgs(this.name, builder, this.args);
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
  const out = new Array(args.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (hasToKnexRawMethod(arg)) {
      out[i] = convertToKnexRaw(arg, builder);
    } else if (isObjectionQueryBuilderBase(arg)) {
      out[i] = convertQueryBuilderBase(arg, builder);
    } else if (isArray(arg)) {
      out[i] = convertArray(arg, builder, i, opName, skipUndefined);
    } else if (isFunction(arg)) {
      out[i] = convertFunction(arg, builder);
    } else if (isModel(arg)) {
      out[i] = convertModel(arg);
    } else if (isPlainObject(arg)) {
      out[i] = convertPlainObject(arg, builder, i, opName, skipUndefined);
    } else {
      out[i] = arg;
    }
  }

  return out;
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
  return item.subqueryOf(builder).build();
}

function isArray(item) {
  return Array.isArray(item);
}

function convertArray(arr, builder, i, opName, skipUndefined) {
  const out = [];

  for (let j = 0, l = arr.length; j < l; ++j) {
    const item = arr[j];

    if (item === undefined) {
      if (!skipUndefined) {
        throw new Error(
          `undefined passed as an item in argument #${i} for '${opName}' operation. Call skipUndefined() method to ignore the undefined values.`
        );
      }
    } else if (hasToKnexRawMethod(item)) {
      out.push(convertToKnexRaw(item, builder));
    } else if (isObjectionQueryBuilderBase(item)) {
      out.push(convertQueryBuilderBase(item));
    } else {
      out.push(item);
    }
  }

  return out;
}

function convertFunction(func, builder) {
  return function convertedKnexArgumentFunction() {
    if (isKnexQueryBuilder(this)) {
      convertQueryBuilderFunction(this, func, builder);
    } else if (isKnexJoinBuilder(this)) {
      convertJoinBuilderFunction(this, func, builder);
    } else {
      return func.apply(this, arguments);
    }
  };
}

function convertQueryBuilderFunction(knexQueryBuilder, func, builder) {
  const QueryBuilderBase = getQueryBuilderBase();
  const convertedQueryBuilder = new QueryBuilderBase(builder.knex());

  convertedQueryBuilder.subqueryOf(builder);
  func.call(convertedQueryBuilder, convertedQueryBuilder);
  convertedQueryBuilder.buildInto(knexQueryBuilder);
}

function convertJoinBuilderFunction(knexJoinBuilder, func, builder) {
  const JoinBuilder = getJoinBuilder();
  const joinClauseBuilder = new JoinBuilder(builder.knex());

  joinClauseBuilder.subqueryOf(builder);
  func.call(joinClauseBuilder, joinClauseBuilder);
  joinClauseBuilder.buildInto(knexJoinBuilder);
}

function isModel(item) {
  return isObject(item) && item.$isObjectionModel;
}

function convertModel(model) {
  return model.$toDatabaseJson();
}

function convertPlainObject(obj, builder, i, opName, skipUndefined) {
  const out = {};
  const keys = Object.keys(obj);

  for (let j = 0, l = keys.length; j < l; ++j) {
    const key = keys[j];
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
  }

  return out;
}

module.exports = ObjectionToKnexConvertingOperation;
