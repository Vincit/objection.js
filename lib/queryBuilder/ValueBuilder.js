'use strict';

const { asArray, isObject } = require('../utils/objectUtils');
const { buildArg } = require('../utils/buildUtils');

class ValueBuilder {
  constructor(value) {
    this._value = value;
    this._cast = null;
    // Cast objects and arrays to json by default.
    this._toJson = isObject(value);
    this._toArray = false;
  }

  get cast() {
    return this._cast;
  }

  castText() {
    return this.castTo('text');
  }

  castInt() {
    return this.castTo('integer');
  }

  castBigInt() {
    return this.castTo('bigint');
  }

  castFloat() {
    return this.castTo('float');
  }

  castDecimal() {
    return this.castTo('decimal');
  }

  castReal() {
    return this.castTo('real');
  }

  castBool() {
    return this.castTo('boolean');
  }

  castJson() {
    this._toArray = false;
    this._toJson = true;
    this._cast = 'jsonb';
    return this;
  }

  castTo(sqlType) {
    this._cast = sqlType;
    return this;
  }

  asArray() {
    this._toJson = false;
    this._toArray = true;
    return this;
  }

  toKnexRaw(builder) {
    let sql = null;
    let bindings = null;

    if (this._toJson) {
      bindings = JSON.stringify(this._value);
      sql = '?';
    } else if (this._toArray) {
      bindings = asArray(this._value).map(it => buildArg(it, builder));
      sql = `ARRAY[${bindings.map(() => '?').join(', ')}]`;
    } else {
      bindings = this._value;
      sql = '?';
    }

    if (this._cast) {
      sql = `CAST(${sql} AS ${this._cast})`;
    }

    return builder.knex().raw(sql, bindings);
  }
}

function val(val) {
  return new ValueBuilder(val);
}

module.exports = {
  ValueBuilder,
  val
};
