import QueryBuilderBase from '../QueryBuilderBase';
import QueryBuilderOperation from './QueryBuilderOperation';
import {isKnexQueryBuilder} from '../../utils/dbUtils';

export default class WrappingQueryBuilderOperation extends QueryBuilderOperation {

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
  const skipUndefined = builder.shouldSkipUndefined();
  const knex = builder.knex();

  for (let i = 0, l = args.length; i < l; ++i) {
    const arg = args[i];

    if (arg === undefined) {
      if (skipUndefined) {
        return false;
      } else {
        throw new Error(`undefined passed as argument #${l} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
    } else if (arg instanceof QueryBuilderBase) {
      // Convert QueryBuilderBase instances into knex query builders.
      args[i] = arg.build();
    } else if (Array.isArray(arg)) {
      if (skipUndefined) {
        args[i] = withoutUndefined(arg);
      } else if (includesUndefined(arg)) {
        throw new Error(`undefined passed as an item in argument #${l} for '${op.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
      }
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
  return function wrappedKnexFunctionArg() {
    if (isKnexQueryBuilder(this)) {
      const knexQueryBuilder = this;
      // Wrap knex query builder into a QueryBuilderBase so that we can use
      // our extended query builder in nested queries.
      const wrappedQueryBuilder = new QueryBuilderBase(knex);

      func.call(wrappedQueryBuilder, wrappedQueryBuilder);
      wrappedQueryBuilder.buildInto(knexQueryBuilder);
    } else {
      // This case is for function argument `join` operation and other methods that
      // Don't take a query builder as the first parameter.
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
