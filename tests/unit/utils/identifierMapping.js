const { camelCaseKeys } = require('../../../lib/utils/identifierMapping');
const expect = require('expect.js');

describe('camelCaseKeys', function() {
  it('should not descend into nested objects', () => {
    const jsonB = { snake_a: 'foo', snake_b: 'bar' };
    const dbResult = { column_name: jsonB };
    const expected = { columnName: jsonB };

    expect(camelCaseKeys(dbResult)).to.eql(expected);
  });
});
