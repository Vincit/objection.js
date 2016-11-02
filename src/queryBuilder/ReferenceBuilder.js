import jsonFieldExpressionParser from './parsers/jsonFieldExpressionParser';

export default class ReferenceBuilder {

  constructor(fieldExpression) {
    this._reference = jsonFieldExpressionParser.parse(fieldExpression);
    this._cast = null;
  }

  asText() {
    return this.asType('text');
  }

  asInt() {
    return this.asType('integer');
  }

  asBigInt() {
    return this.asType('bigint');
  }

  asFloat() {
    return this.asType('float');
  }

  asDecimal() {
    return this.asType('decimal');
  }

  asReal() {
    return this.asType('real');
  }

  asBool() {
    return this.asType('boolean');
  }

  asJsonb() {
    return this.asType('jsonb');
  }

  asType(sqlType) {
    // we could maybe check some valid values here... at least fail on invalid chars 
    this._cast = sqlType;
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
    let query = this._cast ? `CAST(${referenceSql} AS ${this._cast})` : referenceSql;
    return [query, [this._reference.columnName]];
  }

}

let ref = fieldExpression => new ReferenceBuilder(fieldExpression);

export { ref };
