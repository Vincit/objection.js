const Bluebird = require('bluebird');
const Model = require('./model/Model');
const promiseUtils = require('./utils/promiseUtils');
const { isSubclassOf } = require('./utils/classUtils');
const { isFunction } = require('./utils/objectUtils');

function transaction() {
  // There must be at least one model class and the callback.
  if (arguments.length < 2) {
    return Bluebird.reject(
      new Error(
        'objection.transaction: provide at least one Model class to bind to the transaction or a knex instance'
      )
    );
  }

  let args = new Array(arguments.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    args[i] = arguments[i];
  }

  if (!isSubclassOf(args[0], Model) && isFunction(args[0].transaction)) {
    let knex = args[0];
    args = args.slice(1);

    // If the function is a generator, wrap it using Bluebird.coroutine.
    if (isGenerator(args[0])) {
      args[0] = Bluebird.coroutine(args[0]);
    }

    return knex.transaction.apply(knex, args);
  } else {
    // The last argument should be the callback and all other Model subclasses.
    let callback = args[args.length - 1];
    let modelClasses = args.slice(0, args.length - 1);
    let i;

    for (i = 0; i < modelClasses.length; ++i) {
      if (!isSubclassOf(modelClasses[i], Model)) {
        return Bluebird.reject(
          new Error('objection.transaction: all but the last argument should be Model subclasses')
        );
      }
    }

    let knex = modelClasses[0].knex();
    for (i = 0; i < modelClasses.length; ++i) {
      if (modelClasses[i].knex() !== knex) {
        return Bluebird.reject(
          new Error(
            'objection.transaction: all Model subclasses must be bound to the same database'
          )
        );
      }
    }

    // If the function is a generator, wrap it using Promise.coroutine.
    if (isGenerator(callback)) {
      callback = Bluebird.coroutine(callback);
    }

    return knex.transaction(trx => {
      let args = new Array(modelClasses.length + 1);

      for (let i = 0; i < modelClasses.length; ++i) {
        args[i] = modelClasses[i].bindTransaction(trx);
      }

      args[args.length - 1] = trx;

      return promiseUtils.try(() => {
        return callback.apply(trx, args);
      });
    });
  }
}

transaction.start = function(modelClassOrKnex) {
  let knex = modelClassOrKnex;

  if (isSubclassOf(modelClassOrKnex, Model)) {
    knex = modelClassOrKnex.knex();
  }

  if (!knex || !isFunction(knex.transaction)) {
    return Bluebird.reject(
      new Error(
        'objection.transaction.start: first argument must be a model class or a knex instance'
      )
    );
  }

  return new Bluebird((resolve, reject) => {
    knex
      .transaction(trx => {
        resolve(trx);
      })
      .catch(err => {
        reject(err);
      });
  });
};

function isGenerator(fn) {
  return fn && fn.constructor && fn.constructor.name === 'GeneratorFunction';
}

module.exports = transaction;
