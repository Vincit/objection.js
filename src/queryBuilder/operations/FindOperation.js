import Model from '../../model/Model';
import QueryBuilderOperation from './QueryBuilderOperation';
import {isPromise, afterReturn} from '../../utils/promiseUtils';
import Promise from 'bluebird';

export default class FindOperation extends QueryBuilderOperation {

  onAfter(builder, results) {
    if (Array.isArray(results)) {
      if (results.length === 1) {
        return callAfterGet(builder, results[0], results);
      } else {
        return callAfterGetArray(builder, results);
      }
    } else {
      return callAfterGet(builder, results, results);
    }
  }
}

function callAfterGetArray(builder, results) {
  if (results.length === 0 || typeof results[0] !== 'object') {
    return results;
  }

  const mapped = new Array(results.length);
  let containsPromise = false;

  for (let i = 0, l = results.length; i < l; ++i) {
    mapped[i] = callAfterGet(builder, results[i], results[i]);

    if (isPromise(mapped[i])) {
      containsPromise = true;
    }
  }

  if (containsPromise) {
    return Promise.all(mapped);
  } else {
    return mapped;
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
