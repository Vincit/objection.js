import _ from 'lodash';
import Model from '../../model/Model';
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
  if (model !== null
      && typeof model === 'object'
      && typeof model.$afterGet === 'function'
      && model.$afterGet !== Model.prototype.$afterGet) {
    return afterReturn(model.$afterGet(builder.context()), result);
  } else {
    return result;
  }
}
