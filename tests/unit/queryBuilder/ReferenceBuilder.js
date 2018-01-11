const expect = require('expect.js');
const ref = require('../../../').ref;
const ReferenceBuilder = require('../../../lib/queryBuilder/ReferenceBuilder').ReferenceBuilder;

describe('ReferenceBuilder', () => {
  it('fail if reference cannot be parsed', () => {
    expect(() => {
      ref();
    }).to.throwException();
    expect(() => {
      ref('');
    }).to.throwException();
  });

  it('should create ReferenceBuilder', () => {
    let reference = ref('Awwww.ItWorks');
    expect(reference instanceof ReferenceBuilder).to.be.ok();
    expect(reference.toRawArgs()).to.eql(['??', ['Awwww.ItWorks']]);
  });

  it('table method should replace table', () => {
    let reference = ref('Table.Column').table('Foo');
    expect(reference.toRawArgs()).to.eql(['??', ['Foo.Column']]);
  });

  it('should allow plain knex reference + casting', () => {
    let reference = ref('Table.Column').castBigInt();
    expect(reference.toRawArgs()).to.eql(['CAST(?? AS bigint)', ['Table.Column']]);
  });

  it('should allow field expression + casting', () => {
    let reference = ref('Table.Column:jsonAttr').castBool();
    expect(reference.toRawArgs()).to.eql(["CAST(??#>>'{jsonAttr}' AS boolean)", ['Table.Column']]);
  });

  it('should allow field expression + no casting', () => {
    let reference = ref('Table.Column:jsonAttr');
    expect(reference.toRawArgs()).to.eql(["??#>'{jsonAttr}'", ['Table.Column']]);
  });

  it('should support few different casts', () => {
    expect(
      ref('Table.Column:jsonAttr')
        .castText()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS text)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castInt()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS integer)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castBigInt()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS bigint)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castFloat()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS float)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castDecimal()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS decimal)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castReal()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS real)", ['Table.Column']]);
    expect(
      ref('Table.Column:jsonAttr')
        .castBool()
        .toRawArgs()
    ).to.eql(["CAST(??#>>'{jsonAttr}' AS boolean)", ['Table.Column']]);
    expect(
      ref('Table.Column')
        .castJson()
        .toRawArgs()
    ).to.eql(['to_jsonb(??)', ['Table.Column']]);
  });
});
