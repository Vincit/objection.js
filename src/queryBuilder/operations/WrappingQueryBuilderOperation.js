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
    const skipUndefined = builder.shouldSkipUndefined();
    const knex = builder.knex();

    for (let i = 0, l = args.length; i < l; ++i) {
      if (args[i] === undefined) {
        if (skipUndefined) {
          return false;
        } else {
          throw new Error(`undefined passed as argument #${l} for '${this.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
        }
      } else if (args[i] instanceof QueryBuilderBase) {
        // Convert QueryBuilderBase instances into knex query builders.
        args[i] = args[i].build();
      } else if (_.isArray(args[i])) {
        if (skipUndefined) {
          args[i] = _.filter(args[i], it => !_.isUndefined(it));
        } else if (_.includes(args[i], undefined)) {
          throw new Error(`undefined passed as an item in argument #${l} for '${this.name}' operation. Call skipUndefined() method to ignore the undefined values.`);
        }
      } else if (typeof args[i] === 'function') {
        // If an argument is a function, knex calls it with a query builder as
        // first argument (and as `this` context). We wrap the query builder into
        // a QueryBuilderBase instance.
        args[i] = wrapFunctionArg(args[i], knex);
      }
    }

    this.args = args;
    return true;
  }
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
