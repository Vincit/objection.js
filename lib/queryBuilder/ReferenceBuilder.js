'use strict';

const jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser');

class ReferenceBuilder {

  constructor(fieldExpression) {
    this._reference = jsonFieldExpressionParser.parse(fieldExpression);
    this._cast = null;
    this._toJson = false;
    this._table = null;
    this._as = null;
  }

  get isObjectionReferenceBuilder() {
    return true;
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

  as(as) {
    this._as = as;
    return this;
  }

  toRawArgs() {
    let referenceSql = `??`;
    let columnName = this._reference.columnName;

    if (this._table) {
      columnName = `${this._table}.${columnName}`;
    }
 
    if (this._reference.access.length > 0) {
      let extractor = this._cast ? '#>>' : '#>';
      let jsonFieldRef = this._reference.access.map(field => field.ref).join(',');  
      referenceSql = `??${extractor}'{${jsonFieldRef}}'`;
    }

    let castedRefQuery = this._cast ? `CAST(${referenceSql} AS ${this._cast})` : referenceSql;
    let toJsonQuery = this._toJson ? `to_jsonb(${castedRefQuery})` : castedRefQuery;

    if (this._as) {
      return [`${toJsonQuery} AS ??`, [columnName, this._as]];
    } else {
      return [toJsonQuery, [columnName]];
    }
  }

  build(knex) {
    return knex.raw.apply(knex, this.toRawArgs());
  }
}

const ref = fieldExpression => new ReferenceBuilder(fieldExpression);

module.exports = {
  ReferenceBuilder,
  ref
};
