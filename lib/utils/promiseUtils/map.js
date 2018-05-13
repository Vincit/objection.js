const isPromise = require('./isPromise');

function map(items, mapper, opt = {}) {
  return new Promise((resolve, reject) => {
    const concurrency = opt.concurrency || Number.MAX_SAFE_INTEGER;

    let rejected = false;
    let i = 0;
    let numFinished = 0;
    let results = new Array(items.length);

    while (i < concurrency && i < items.length) {
      executeNext();
    }

    function executeNext() {
      try {
        if (rejected) {
          return;
        }

        const index = i++;
        const item = items[index];
        const maybePromise = mapper(item, index);

        if (isPromise(maybePromise)) {
          maybePromise.then(result => afterExecute(result, index)).catch(onError);
        } else {
          process.nextTick(() => afterExecute(maybePromise, index));
        }
      } catch (err) {
        onError(err);
      }
    }

    function afterExecute(result, index) {
      if (rejected) {
        return;
      }

      results[index] = result;
      numFinished++;

      if (numFinished === items.length) {
        resolve(results);
      }

      if (i < items.length) {
        executeNext();
      }
    }

    function onError(err) {
      rejected = true;

      reject(err);
    }
  });
}

module.exports = map;
