'use strict';

var expect = require('expect.js')
  , ref = require('../../../').ref
  , ReferenceBuilder = require('../../../lib/queryBuilder/ReferenceBuilder').ReferenceBuilder;

describe('ReferenceBuilder', function () {
  it('fail if reference cannot be parsed', function () {
    expect(function () { ref(); }).to.throwException();
    expect(function () { ref(''); }).to.throwException();
  });

  it('should create ReferenceBuilder', function () {
    var reference = ref('Awwww.ItWorks');
    expect(reference instanceof ReferenceBuilder).to.be.ok();
    expect(reference.toRawArgs()).to.eql(['??', ['Awwww.ItWorks']]);
  });

  it('should allow plain knex reference + casting', function () {
    var reference = ref('Table.Column').castBigInt();
    expect(reference.toRawArgs()).to.eql(['CAST(?? AS bigint)', ['Table.Column']]);
  });

  it('should allow field expression + casting', function () {
    var reference = ref('Table.Column:jsonAttr').castBool();
    expect(reference.toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS boolean)", ['Table.Column']]);
  });

  it('should allow field expression + no casting', function () {
    var reference = ref('Table.Column:jsonAttr');
    expect(reference.toRawArgs()).to.eql(["??#>'{jsonAttr}'", ['Table.Column']]);
  });

  it('should support few different casts', function () {
    expect(ref('Table.Column:jsonAttr').castText().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS text)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castInt().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS integer)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castBigInt().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS bigint)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castFloat().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS float)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castDecimal().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS decimal)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castReal().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS real)", ['Table.Column']]);
    expect(ref('Table.Column:jsonAttr').castBool().toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS boolean)", ['Table.Column']]);
    expect(ref('Table.Column').castJson().toRawArgs()).to.eql(["to_jsonb(??)", ['Table.Column']]);
  });
});
