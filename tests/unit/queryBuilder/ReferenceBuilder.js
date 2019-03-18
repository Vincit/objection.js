const expect = require('expect.js');
const { ref, Model } = require('../../../');
const { ReferenceBuilder } = require('../../../lib/queryBuilder/ReferenceBuilder');

function toRawArgs(ref) {
  return ref._createRawArgs(Model.query());
}

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
    expect(toRawArgs(reference)).to.eql(['??', ['Awwww.ItWorks']]);
  });

  it('table method should replace table', () => {
    let reference = ref('Table.Column').table('Foo');
    expect(toRawArgs(reference)).to.eql(['??', ['Foo.Column']]);
  });

  it('should allow plain knex reference + casting', () => {
    let reference = ref('Table.Column').castBigInt();
    expect(toRawArgs(reference)).to.eql(['CAST(?? AS bigint)', ['Table.Column']]);
  });

  it('should allow field expression + casting', () => {
    let reference = ref('Table.Column:jsonAttr').castBool();
    expect(toRawArgs(reference)).to.eql(["CAST(??#>>'{jsonAttr}' AS boolean)", ['Table.Column']]);
  });

  it('should allow field expression + no casting', () => {
    let reference = ref('Table.Column:jsonAttr');
    expect(toRawArgs(reference)).to.eql(["??#>'{jsonAttr}'", ['Table.Column']]);
  });

  it('should support few different casts', () => {
    expect(toRawArgs(ref('Table.Column:jsonAttr').castText())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS text)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castInt())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS integer)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castBigInt())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS bigint)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castFloat())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS float)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castDecimal())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS decimal)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castReal())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS real)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castBool())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS boolean)",
      ['Table.Column']
    ]);
    expect(toRawArgs(ref('Table.Column').castJson())).to.eql(['to_jsonb(??)', ['Table.Column']]);
  });
});
