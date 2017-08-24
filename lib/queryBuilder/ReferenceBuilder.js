'use strict';

const jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser');

class ReferenceBuilder {

  constructor(expr) {
    this._reference = expr !== null && jsonFieldExpressionParser.parse(expr);
    this._columnParts = expr !== null && this._reference.columnName.split('.');
    this._cast = null;
    this._toJson = false;
    this._table = null;
    this._as = null;
  }

  get isObjectionReferenceBuilder() {
    return true;
  }

  get reference() {
    return this._reference;
  }

  get isPlainColumnRef() {
    return this._reference.access.length === 0 
      && !this._cast 
      && !this._toJson 
      && !this._as;
  }

  get column() {
    return this._columnParts[this._columnParts.length - 1];
  }

  get fullColumn() {
    const columnParts = this._columnParts;
    const column = columnParts[columnParts.length - 1];
    let table = null;

    if (columnParts.length === 2) {
      table = columnParts[0];
    }

    if (this._table) {
      table = this._table;
    }

    if (table) {
      return `${table}.${column}`;
    } else {
      return column;
    }
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

    clone._reference = this._reference;
    clone._columnParts = this._columnParts;
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

  build(knex) {
    if (this.isPlainColumnRef) {
      // Fast path for the most common case.
      return knex.raw('??', this.fullColumn);
    } else {
      return knex.raw.apply(knex, this.toRawArgs()); 
    }
  }
}

const ref = fieldExpression => new ReferenceBuilder(fieldExpression);

module.exports = {
  ReferenceBuilder,
  ref
};
