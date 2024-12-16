'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { StaticHookArguments } = require('../StaticHookArguments');
const { isPromise, after, afterReturn } = require('../../utils/promiseUtils');
const { isObject } = require('../../utils/objectUtils');

class FindOperation extends QueryBuilderOperation {
  onBefore2(builder, result) {
    return afterReturn(callStaticBeforeFind(builder), result);
  }

  onAfter3(builder, results) {
    const opt = builder.findOptions();

    if (opt.dontCallFindHooks) {
      return results;
    } else {
      return callAfterFind(builder, results);
    }
  }
}

function callStaticBeforeFind(builder) {
  const args = StaticHookArguments.create({ builder });
  return builder.modelClass().beforeFind(args);
}

function callAfterFind(builder, result) {
  const opt = builder.findOptions();
  const maybePromise = callInstanceAfterFind(builder.context(), result, opt.callAfterFindDeeply);

  return after(maybePromise, () => callStaticAfterFind(builder, result));
}

function callStaticAfterFind(builder, result) {
  const args = StaticHookArguments.create({ builder, result });
  const maybePromise = builder.modelClass().afterFind(args);

  return after(maybePromise, (maybeResult) => {
    if (maybeResult === undefined) {
      return result;
    } else {
      return maybeResult;
    }
  });
}

function callInstanceAfterFind(ctx, results, deep) {
  if (Array.isArray(results)) {
    if (results.length === 1) {
      return callAfterFindForOne(ctx, results[0], results, deep);
    } else {
      return callAfterFindArray(ctx, results, deep);
    }
  } else {
    return callAfterFindForOne(ctx, results, results, deep);
  }
}

function callAfterFindArray(ctx, results, deep) {
  if (results.length === 0 || !isObject(results[0])) {
    return results;
  }

  const mapped = new Array(results.length);
  let containsPromise = false;

  for (let i = 0, l = results.length; i < l; ++i) {
    mapped[i] = callAfterFindForOne(ctx, results[i], results[i], deep);

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

function callAfterFindForOne(ctx, model, result, deep) {
  if (!isObject(model) || !model.$isObjectionModel) {
    return result;
  }

  if (deep) {
    const results = [];
    const containsPromise = callAfterFindForRelations(ctx, model, results);

    if (containsPromise) {
      return Promise.all(results).then(() => {
        return doCallAfterFind(ctx, model, result);
      });
    } else {
      return doCallAfterFind(ctx, model, result);
    }
  } else {
    return doCallAfterFind(ctx, model, result);
  }
}

function callAfterFindForRelations(ctx, model, results) {
  const keys = Object.keys(model);
  let containsPromise = false;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (isRelation(value)) {
      const maybePromise = callInstanceAfterFind(ctx, value, true);

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
  return Array.isArray(value) && value.length > 0 && isObject(value[0]);
}

function doCallAfterFind(ctx, model, result) {
  const afterFind = getAfterFindHook(model);

  if (afterFind !== null) {
    const maybePromise = afterFind.call(model, ctx);

    if (isPromise(maybePromise)) {
      return maybePromise.then(() => result);
    } else {
      return result;
    }
  } else {
    return result;
  }
}

function getAfterFindHook(model) {
  if (model.$afterFind !== model.$objectionModelClass.prototype.$afterFind) {
    return model.$afterFind;
  } else {
    return null;
  }
}

module.exports = {
  FindOperation,
};
