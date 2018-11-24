const jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser');
const { isObject } = require('../utils/objectUtils');

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
    this._modelClass = null;

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

  get alias() {
    return this._as;
  }

  get tableName() {
    return this._table;
  }

  get isPlainColumnRef() {
    return this._reference.access.length === 0 && !this._cast && !this._toJson && !this._as;
  }

  get expression() {
    return this._expr;
  }

  get cast() {
    return this._cast;
  }

  get modelClass() {
    return this._modelClass;
  }

  fullColumn(builder) {
    const table = this.tableName
      ? this.tableName
      : this.modelClass
        ? builder.tableRefFor(this.modelClass.getTableName())
        : null;

    if (table) {
      return `${table}.${this.column}`;
    } else {
      return this.column;
    }
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
    this._toJson = true;
    return this;
  }

  castType(sqlType) {
    console.log(
      'castType(type) is deprecated. Use castTo(type) instead. castType(type) will be removed in 2.0'
    );
    return this.castTo(sqlType);
  }

  castTo(sqlType) {
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

  model(modelClass) {
    this._modelClass = modelClass;
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
    clone._modelClass = this._modelClass;

    return clone;
  }

  toRawArgs(builder) {
    let referenceSql = `??`;

    if (this._reference.access.length > 0) {
      let extractor = this._cast ? '#>>' : '#>';
      let jsonFieldRef = this._reference.access.map(field => field.ref).join(',');
      referenceSql = `??${extractor}'{${jsonFieldRef}}'`;
    }

    let castedRefQuery = this._cast ? `CAST(${referenceSql} AS ${this._cast})` : referenceSql;
    let toJsonQuery = this._toJson ? `to_jsonb(${castedRefQuery})` : castedRefQuery;

    if (this._as) {
      return [`${toJsonQuery} as ??`, [this.fullColumn(builder), this._as]];
    } else {
      return [toJsonQuery, [this.fullColumn(builder)]];
    }
  }

  toKnexRaw(builder) {
    if (this.isPlainColumnRef) {
      // Fast path for the most common case.
      return builder.knex().raw('??', this.fullColumn(builder));
    } else {
      return builder.knex().raw.apply(builder.knex(), this.toRawArgs(builder));
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

const ref = reference => {
  if (isObject(reference) && reference.isObjectionReferenceBuilder) {
    return reference;
  } else {
    return new ReferenceBuilder(reference);
  }
};

module.exports = {
  ReferenceBuilder,
  ref
};
