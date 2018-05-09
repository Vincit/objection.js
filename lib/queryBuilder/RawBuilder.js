const { isPlainObject } = require('../utils/objectUtils');
const { buildArg } = require('../utils/buildUtils');

class RawBuilder {
  constructor(sql, args) {
    this._sql = sql;
    this._args = args;
  }

  toKnexRaw(knex) {
    let args = null;

    if (this._args.length === 1 && isPlainObject(this._args[0])) {
      args = buildObject(this._args[0], knex);
    } else {
      args = buildArray(this._args, knex);
    }

    if (args) {
      return knex.raw(this._sql, args);
    } else {
      return knex.raw(this._sql);
    }
  }
}

function buildArray(arr, knex) {
  const args = new Array(arr.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    args[i] = buildArg(arr[i], knex);
  }

  return args;
}

function buildObject(obj, knex) {
  const keys = Object.keys(obj);
  const args = {};

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    args[key] = buildArg(obj[key], knex);
  }

  return args;
}

function raw() {
  let sql = arguments[0];
  let args = null;

  if (arguments.length === 2 && Array.isArray(arguments[1])) {
    args = new Array(arguments[1].length);

    for (let i = 0, l = args.length; i < l; ++i) {
      args[i] = arguments[1][i];
    }
  } else {
    args = new Array(arguments.length - 1);

    for (let i = 1, l = arguments.length; i < l; ++i) {
      args[i - 1] = arguments[i];
    }
  }

  return new RawBuilder(sql, args);
}

module.exports = {
  RawBuilder,
  raw
};
