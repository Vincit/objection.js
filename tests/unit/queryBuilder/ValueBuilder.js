const expect = require('expect.js');
const { val, Model } = require('../../../');
const { ValueBuilder } = require('../../../lib/queryBuilder/ValueBuilder');

function toRawArgs(ref) {
  return ref._createRawArgs(Model.query());
}

describe('ValueBuilder', () => {
  it('should create ValueBuilder', () => {
    let builder = val('Awwww.ItWorks');
    expect(builder instanceof ValueBuilder).to.be.ok();
    expect(toRawArgs(builder)).to.eql(['?', ['Awwww.ItWorks']]);
  });

  it('should allow casting', () => {
    let builder = val('100').castBigInt();
    expect(toRawArgs(builder)).to.eql(['CAST(? AS bigint)', ['100']]);
  });

  it('should stringify when casting to json', () => {
    let builder = val({ value: 100 }).castJson();
    expect(toRawArgs(builder)).to.eql(['CAST(? AS jsonb)', ['{"value":100}']]);
  });

  it('should expand arrays', () => {
    let builder = val([1, 2, 3]).asArray();
    expect(toRawArgs(builder)).to.eql(['ARRAY[?, ?, ?]', [1, 2, 3]]);
  });

  it('should support aliasing', () => {
    let builder = val('Hello').as('greeting');
    expect(toRawArgs(builder)).to.eql(['? as ??', ['Hello', 'greeting']]);
  });

  it('should support simultaneous casting and aliasing', () => {
    let builder = val('1').castBigInt().as('total');
    expect(toRawArgs(builder)).to.eql(['CAST(? AS bigint) as ??', ['1', 'total']]);
  });
});
