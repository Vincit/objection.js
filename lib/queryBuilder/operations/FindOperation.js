const QueryBuilderOperation = require('./QueryBuilderOperation');

const { isPromise } = require('../../utils/promiseUtils');
const { isObject } = require('../../utils/objectUtils');

class FindOperation extends QueryBuilderOperation {
  onAfter3(builder, results) {
    const opt = builder.findOptions();

    if (opt.dontCallAfterGet) {
      return results;
    } else {
      return callAfterGet(builder.context(), results, opt.callAfterGetDeeply);
    }
  }
}

function callAfterGet(ctx, results, deep) {
  if (Array.isArray(results)) {
    if (results.length === 1) {
      return callAfterGetForOne(ctx, results[0], results, deep);
    } else {
      return callAfterGetArray(ctx, results, deep);
    }
  } else {
    return callAfterGetForOne(ctx, results, results, deep);
  }
}

function callAfterGetArray(ctx, results, deep) {
  if (results.length === 0 || !isObject(results[0])) {
    return results;
  }

  const mapped = new Array(results.length);
  let containsPromise = false;

  for (let i = 0, l = results.length; i < l; ++i) {
    mapped[i] = callAfterGetForOne(ctx, results[i], results[i], deep);

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

function callAfterGetForOne(ctx, model, result, deep) {
  if (!isObject(model) || !model.$isObjectionModel) {
    return result;
  }

  if (deep) {
    const results = [];
    const containsPromise = callAfterGetForRelations(ctx, model, results);

    if (containsPromise) {
      return Promise.all(results).then(() => {
        return doCallAfterGet(ctx, model, result);
      });
    } else {
      return doCallAfterGet(ctx, model, result);
    }
  } else {
    return doCallAfterGet(ctx, model, result);
  }
}

function callAfterGetForRelations(ctx, model, results) {
  const keys = Object.keys(model);
  let containsPromise = false;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (isRelation(value)) {
      const maybePromise = callAfterGet(ctx, value, true);

      if (isPromise(maybePromise)) {
        containsPromise = true;
      }

      results.push(maybePromise);
    }
  }

  return containsPromise;
}

function isRelation(value) {
  return (
    (isObject(value) && value.$isObjectionModel) ||
    (isNonEmptyObjectArray(value) && value[0].$isObjectionModel)
  );
}

function isNonEmptyObjectArray(value) {
  return Array.isArray(value) && value.length && isObject(value[0]);
}

function doCallAfterGet(ctx, model, result) {
  if (model.$afterGet !== model.$objectionModelClass.prototype.$afterGet) {
    const maybePromise = model.$afterGet(ctx);

    if (isPromise(maybePromise)) {
      return maybePromise.then(() => result);
    } else {
      return result;
    }
  } else {
    return result;
  }
}

module.exports = FindOperation;
