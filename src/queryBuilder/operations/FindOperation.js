'use strict';

const clone = require('lodash/clone');
const QueryBuilderOperation = require('./QueryBuilderOperation');
const isPromise = require('../../utils/promiseUtils').isPromise;
const Promise = require('bluebird');

class FindOperation extends QueryBuilderOperation {

  clone(props) {
    props = props || {};
    const opt = Object.assign({}, this.opt, props.opt);
    return new this.constructor(this.name, opt);
  }

  onAfter(builder, results) {
    if (this.opt.dontCallAfterGet) {
      return results;
    } else {
      return callAfterGet(builder.context(), results, !!this.opt.callAfterGetDeeply);
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
  if (results.length === 0 || typeof results[0] !== 'object') {
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
  if (!model || !model.isObjectionModel) {
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
  const relations = model.constructor.getRelationArray();
  let containsPromise = false;

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relName = relations[i].name;

    if (model[relName]) {
      const maybePromise = callAfterGet(ctx, model[relName], true);

      if (isPromise(maybePromise)) {
        containsPromise = true;
      }

      results.push(maybePromise);
    }
  }

  return containsPromise;
}

function doCallAfterGet(ctx, model, result) {
  if (model.$afterGet !== model.objectionModelClass.prototype.$afterGet) {
    const maybePromise = model.$afterGet(ctx);

    if (maybePromise instanceof Promise) {
      return maybePromise.return(result);
    } else if (isPromise(maybePromise)) {
      return maybePromise.then(() => result);
    } else {
      return result;
    }
  } else {
    return result;
  }
}

module.exports = FindOperation;
