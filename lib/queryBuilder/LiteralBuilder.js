'use strict';

const LazyBuilder = require('./LazyBuilder').LazyBuilder;

class LiteralBuilder extends LazyBuilder {

  constructor(value) {
    super();

    this._value = value;
    this._cast = null;
    this._toJson = false;
  }

  get isObjectionLiteralBuilder() {
    return true;
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
    this._toJson = true;
    return this;
  }

  castType(sqlType) {
    this._cast = sqlType;
    return this;
  }

  build(knex) {
    if (this._toJson) {
      return knex.raw(`CAST(? as jsonb)`, JSON.stringify(this._value));
    } else if (this._cast) {
      return knex.raw(`CAST(? as ${this._cast})`, this._value);
    } else {
      return this._value;
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
