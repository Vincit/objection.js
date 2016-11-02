'use strict';

var expect = require('expect.js')
  , ref = require('../../../').ref
  , ReferenceBuilder = require('../../../lib/queryBuilder/ReferenceBuilder').default;

describe('ReferenceBuilder', function () {
  it('fail if reference cannot be parsed', function () {
    expect(function () { ref(); }).to.throwException();
    expect(function () { ref(''); }).to.throwException();
  });

  it('should create ReferenceBuilder', function () {
    let reference = ref('Awwww.ItWorks');
    expect(reference instanceof ReferenceBuilder).to.be.ok();
    expect(reference.toRawArgs()).to.eql(['??', ['Awwww.ItWorks']]);
  });

  it('should allow plain knex reference + casting', function () {
    let reference = ref('Table.Column').asBigInt();
    expect(reference.toRawArgs()).to.eql(['CAST(?? AS bigint)', ['Table.Column']]);
  });

  it('should allow field expression + casting', function () {
    let reference = ref('Table.Column:jsonAttr').asBool();
    expect(reference.toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS boolean)`, ['Table.Column']]);
  });

  it('should allow field expression + no casting', function () {
    let reference = ref('Table.Column:jsonAttr');
    expect(reference.toRawArgs()).to.eql([`??#>'{jsonAttr}'`, ['Table.Column']]);
  });

  it('should support few different casts', function () {
    expect(ref('Table.Column:jsonAttr').asText().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS text)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asInt().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS integer)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asBigInt().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS bigint)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asFloat().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS float)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asDecimal().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS decimal)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asReal().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS real)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asBool().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS boolean)`, ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').asJsonb().toRawArgs()).to.eql([`CAST(??#>>'{jsonAttr}' AS jsonb)`, ['Table.Column']]);
  });
});
