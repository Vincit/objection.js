import _ from 'lodash';
import QueryBuilderBase from '../QueryBuilderBase';
import QueryBuilderOperation from './QueryBuilderOperation';
import {isKnexQueryBuilder} from '../../utils/dbUtils';

export default class WrappingQueryBuilderOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.args = null;
  }

  call(builder, args) {
    if (!wrapArgs(args, builder.knex())) {
      return false;
    }

    this.args = args;
    return true;
  }
}

function wrapArgs(args, knex) {
  for (let i = 0, l = args.length; i < l; ++i) {
    if (_.isUndefined(args[i])) {
      // None of the query builder methods should accept undefined. Do nothing if
      // one of the arguments is undefined. This enables us to do things like
      // `.where('name', req.query.name)` without checking if req.query has the
      // property `name`.
      return false;
    } else if (args[i] instanceof QueryBuilderBase) {
      // Convert QueryBuilderBase instances into knex query builders.
      args[i] = args[i].build();
    } else if (_.isFunction(args[i])) {
      // If an argument is a function, knex calls it with a query builder as
      // first argument (and as `this` context). We wrap the query builder into
      // a QueryBuilderBase instance.
      args[i] = wrapFunctionArg(args[i], knex);
    }
  }

  return true;
}

function wrapFunctionArg(func, knex) {
  return function () {
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
