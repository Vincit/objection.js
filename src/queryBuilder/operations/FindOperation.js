import _ from 'lodash';
import QueryBuilderOperation from './QueryBuilderOperation';
import {afterReturn, mapAfterAllReturn} from '../../utils/promiseUtils';

export default class FindOperation extends QueryBuilderOperation {
  onAfter(builder, results) {
    if (_.isArray(results)) {
      if (results.length === 1) {
        return callAfterGet(builder, results[0], results);
      } else {
        return mapAfterAllReturn(results, result => callAfterGet(builder, result, result), results);
      }
    } else {
      return callAfterGet(builder, results, results);
    }
  }
}

function callAfterGet(builder, model, result) {
  if (_.isObject(model) && _.isFunction(model.$afterGet)) {
    return afterReturn(model.$afterGet(builder.context()), result);
  } else {
    return result;
  }
}
