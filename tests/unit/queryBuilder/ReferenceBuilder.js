const Knex = require('knex');
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

  it('should quote empty keys in field expressions', () => {
    expect(toRawArgs(ref('Table.Column:[""]'))).to.eql([`??#>'{""}'`, ['Table.Column']]);
    expect(toRawArgs(ref("Table.Column:a[''].b").castText())).to.eql([
      `CAST(??#>>'{a,"",b}' AS text)`,
      ['Table.Column'],
    ]);
  });

  it('should quote keys with special characters in field expressions', () => {
    expect(toRawArgs(ref('Table.Column:["a,b"][{c}]'))).to.eql([
      `??#>'{"a,b","{c}"}'`,
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref("Table.Column:['a\\\"b']"))).to.eql([
      `??#>'{"a\\\\\\"b"}'`,
      ['Table.Column'],
    ]);
  });

  it('should escape single quotes and question marks in json path keys', () => {
    expect(toRawArgs(ref("Table.Column:x') or 1=1 --"))).to.eql([
      `??#>'{"x'') or 1=1 --"}'`,
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:a?b').castText().as('x'))).to.eql([
      `CAST(??#>>'{a\\?b}' AS text) as ??`,
      ['Table.Column', 'x'],
    ]);
    // Backslashes are doubled inside the quoted text array element.
    expect(toRawArgs(ref(`Table.Column:["a\\'?b"]`))).to.eql([
      `??#>'{"a\\\\''\\?b"}'`,
      ['Table.Column'],
    ]);
    // knex drops backslashes in front of `?`, so they are written as octal
    // escapes in an escape string literal.
    expect(toRawArgs(ref(`Table.Column:["a\\?'b"]`))).to.eql([
      `??#>E'{"a\\134\\134\\?''b"}'`,
      ['Table.Column'],
    ]);
  });

  it('should keep backslashes in front of question marks in json path keys', () => {
    class TestModel extends Model {
      static get tableName() {
        return 'Table';
      }
    }
    const { sql } = TestModel.query(Knex({ client: 'pg' }))
      .select(ref(`Table.Column:["a\\?b"]`))
      .toKnexQuery()
      .toSQL()
      .toNative();
    expect(sql).to.contain(`"Table"."Column"#>E'{"a\\134\\134?b"}'`);
  });

  it('should keep bindings in order when used as a column in whereIn', () => {
    class TestModel extends Model {
      static get tableName() {
        return 'Table';
      }
    }
    const { sql, bindings } = TestModel.query(Knex({ client: 'pg' }))
      .whereIn(ref('Table.Column:a?b').castInt(), [1])
      .toKnexQuery()
      .toSQL()
      .toNative();
    expect(sql).to.contain(`CAST("Table"."Column"#>>'{a?b}' AS integer) in ($1)`);
    expect(bindings).to.eql([1]);
  });

  it('should support few different casts', () => {
    expect(toRawArgs(ref('Table.Column:jsonAttr').castText())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS text)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castInt())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS integer)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castBigInt())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS bigint)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castFloat())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS float)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castDecimal())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS decimal)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castReal())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS real)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column:jsonAttr').castBool())).to.eql([
      "CAST(??#>>'{jsonAttr}' AS boolean)",
      ['Table.Column'],
    ]);
    expect(toRawArgs(ref('Table.Column').castJson())).to.eql(['to_jsonb(??)', ['Table.Column']]);
  });
});
