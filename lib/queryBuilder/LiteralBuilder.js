'use strict';

const asArray = require('../utils/objectUtils').asArray;

class LiteralBuilder {
  constructor(value) {
    this._value = value;
    this._cast = null;
    // Cast objects and arrays to json by default.
    this._toJson = value && typeof value === 'object';
    this._toArray = false;
  }

  get cast() {
    return this._cast;
  }

  castText() {
    return this.castType('text');
  }

  castInt() {
    return this.castType('integer');
  }

  castBigInt() {
    return this.castType('bigint');
  }

  castFloat() {
    return this.castType('float');
  }

  castDecimal() {
    return this.castType('decimal');
  }

  castReal() {
    return this.castType('real');
  }

  castBool() {
    return this.castType('boolean');
  }

  castJson() {
    this._toArray = false;
    this._toJson = true;
    return this;
  }

  castArray() {
    this._toJson = false;
    this._toArray = true;
    return this;
  }

  castType(sqlType) {
    this._cast = sqlType;
    return this;
  }

  toKnexRaw(knex) {
    if (this._toJson) {
      return knex.raw(`CAST(? AS jsonb)`, JSON.stringify(this._value));
    } else if (this._toArray) {
      const value = asArray(this._value);
      return knex.raw(`array[${value.map(() => '?').join(', ')}]`, value);
    } else if (this._cast) {
      return knex.raw(`CAST(? AS ${this._cast})`, this._value);
    } else {
      return knex.raw('?', this._value);
    }
  }
}

function lit(val) {
  return new LiteralBuilder(val);
}

module.exports = {
  LiteralBuilder,
  lit
};
