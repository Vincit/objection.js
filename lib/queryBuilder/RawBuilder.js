'use strict';

class RawBuilder {

  constructor(sql, args) {
    this._sql = sql;
    this._args = args;
  }

  get isObjectionRawBuilder() {
    return true;
  }

  build(knex) {
    let args = null;

    if (Array.isArray(this._args)) {
      args = buildArray(this._args, knex);
    } else if (this._args) {
      args = buildObject(this._args, knex);
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

function buildArg(arg, knex) {
  if (!arg || typeof arg !== 'object') {
    return arg;
  }

  if (arg && arg.isObjectionRawBuilder) {
    return arg.build(knex);
  } else if (arg && arg.isObjectionReferenceBuilder) {
    return arg.build(knex);
  } else {
    return arg;
  }
}

function raw() {
  let sql = arguments[0];
  let args = null;

  if (arguments.length === 2 && arguments[1] && typeof arguments[1] === 'object') {
    args = arguments[1];
  } else if (arguments.length > 1) {
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
