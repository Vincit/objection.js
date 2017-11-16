'use strict';

const jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser');

class ReferenceBuilder {
  constructor(expr) {
    this._expr = expr;
    this._reference = null;
    this._column = null;
    this._table = null;
    this._cast = null;
    this._toJson = false;
    this._table = null;
    this._as = null;

    if (expr !== null) {
      const reference = jsonFieldExpressionParser.parse(expr);
      const colParts = reference.columnName.split('.');

      this._reference = reference;
      this._column = colParts[colParts.length - 1];

      if (colParts.length >= 2) {
        this._table = colParts.slice(0, colParts.length - 1).join('.');
      }
    }
  }

  get reference() {
    return this._reference;
  }

  get column() {
    return this._column;
  }

  get tableName() {
    return this._table;
  }

  get isPlainColumnRef() {
    return this._reference.access.length === 0 && !this._cast && !this._toJson && !this._as;
  }

  get fullColumn() {
    if (this.tableName) {
      return `${this.tableName}.${this.column}`;
    } else {
      return this.column;
    }
  }

  get expression() {
    return this._expr;
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

  from(table) {
    this._table = table;
    return this;
  }

  table(table) {
    this._table = table;
    return this;
  }

  as(as) {
    this._as = as;
    return this;
  }

  clone() {
    const clone = new this.constructor(null);

    clone._expr = this._expr;
    clone._reference = this._reference;
    clone._column = this._column;
    clone._table = this._table;
    clone._cast = this._cast;
    clone._toJson = this._toJson;
    clone._table = this._table;
    clone._as = this._as;

    return clone;
  }

  toRawArgs() {
    let referenceSql = `??`;

    if (this._reference.access.length > 0) {
      let extractor = this._cast ? '#>>' : '#>';
      let jsonFieldRef = this._reference.access.map(field => field.ref).join(',');
      referenceSql = `??${extractor}'{${jsonFieldRef}}'`;
    }

    let castedRefQuery = this._cast ? `CAST(${referenceSql} AS ${this._cast})` : referenceSql;
    let toJsonQuery = this._toJson ? `to_jsonb(${castedRefQuery})` : castedRefQuery;

    if (this._as) {
      return [`${toJsonQuery} as ??`, [this.fullColumn, this._as]];
    } else {
      return [toJsonQuery, [this.fullColumn]];
    }
  }

  toKnexRaw(knex) {
    if (this.isPlainColumnRef) {
      // Fast path for the most common case.
      return knex.raw('??', this.fullColumn);
    } else {
      return knex.raw.apply(knex, this.toRawArgs());
    }
  }
}

Object.defineProperties(ReferenceBuilder.prototype, {
  isObjectionReferenceBuilder: {
    enumerable: false,
    writable: false,
    value: true
  }
});

const ref = fieldExpression => new ReferenceBuilder(fieldExpression);

module.exports = {
  ReferenceBuilder,
  ref
};
