const jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser');

class ReferenceBuilder {

  constructor(fieldExpression) {
    // for premature optimization _reference could be lazy memoized getter... 
    this._reference = jsonFieldExpressionParser.parse(fieldExpression);
    this._cast = null;
    this._toJson = false;
    this._as = null; // TODO: UNIT TEST
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
    // maybe different for mysql, no need to support postgres plain json
    this._toJson = true;
    return this;
  }

  castType(sqlType) {
    // we could maybe check some valid values here... at least fail on invalid chars 
    this._cast = sqlType;
    return this;
  }

  as(as) {
    this._as = as;
    return this;
  }

  toRawArgs() {
    let referenceSql = `??`;
 
    // if json field ref
    if (this._reference.access.length > 0) {
      // TODO: for mysql this needs separate implementation... maybe something like SELECT JSON_EXTRACT('{"id": 14, "name": "Aztalan"}', '$.name');
      let extractor = this._cast ? '#>>' : '#>';
      let jsonFieldRef = this._reference.access.map(field => field.ref).join(',');  
      referenceSql = `??${extractor}'{${jsonFieldRef}}'`;
    }

    let castedRefQuery = this._cast ? `CAST(${referenceSql} AS ${this._cast})` : referenceSql;
    let toJsonQuery = this._toJson ? `to_jsonb(${castedRefQuery})` : castedRefQuery;

    if (this._as) {
      return [`${toJsonQuery} AS ??`, [this._reference.columnName, this._as]];
    } else {
      return [toJsonQuery, [this._reference.columnName]];
    }
  }

}

let ref = fieldExpression => new ReferenceBuilder(fieldExpression);

module.exports = {
  ReferenceBuilder,
  ref
};
