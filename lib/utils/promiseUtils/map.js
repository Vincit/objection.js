const isPromise = require('./isPromise');

// Works like Bluebird.map.
function promiseMap(items, mapper, opt) {
  switch (items.length) {
    case 0:
      return mapZero();
    case 1:
      return mapOne(items, mapper);
    default:
      return mapMany(items, mapper, opt);
  }
}

function mapZero() {
  return Promise.resolve([]);
}

function mapOne(items, mapper) {
  try {
    const maybePromise = mapper(items[0], 0);

    if (isPromise(maybePromise)) {
      return maybePromise.then(wrapArray);
    } else {
      return Promise.resolve(wrapArray(maybePromise));
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

function wrapArray(item) {
  return [item];
}

function mapMany(items, mapper, opt = {}) {
  return new Promise((resolve, reject) => {
    const concurrency = opt.concurrency || Number.MAX_SAFE_INTEGER;

    const ctx = {
      reject,
      resolve,
      rejected: false,
      index: 0,
      numFinished: 0,
      results: new Array(items.length),
      items,
      mapper
    };

    while (ctx.index < concurrency && ctx.index < items.length && !ctx.rejected) {
      executeNext(ctx);
    }
  });
}

function executeNext(ctx) {
  try {
    if (ctx.rejected) {
      return;
    }

    const index = ctx.index++;
    const item = ctx.items[index];
    const maybePromise = ctx.mapper(item, index);

    if (isPromise(maybePromise)) {
      maybePromise.then(result => afterExecute(ctx, result, index)).catch(err => onError(ctx, err));
    } else {
      process.nextTick(() => afterExecute(ctx, maybePromise, index));
    }

    return null;
  } catch (err) {
    onError(ctx, err);
  }
}

function afterExecute(ctx, result, index) {
  if (ctx.rejected) {
    return null;
  }

  ctx.results[index] = result;
  ctx.numFinished++;

  if (ctx.numFinished === ctx.items.length) {
    ctx.resolve(ctx.results);
  }

  if (ctx.index < ctx.items.length) {
    executeNext(ctx);
  }

  return null;
}

function onError(ctx, err) {
  ctx.rejected = true;
  ctx.reject(err);
}

module.exports = promiseMap;
