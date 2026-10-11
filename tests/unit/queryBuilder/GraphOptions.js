const expect = require('expect.js');
const { GraphOptions } = require('../../../lib/queryBuilder/graph/GraphOptions');

describe('GraphOptions', () => {
  function createNode(relationPathKey) {
    const relationPath = relationPathKey ? relationPathKey.split('.') : [];
    return { relationPath, relationPathKey };
  }

  function matches(noInsert, relationPathKey, rootRelationPath) {
    const options = new GraphOptions({ noInsert }, rootRelationPath);
    return options._hasOption(createNode(relationPathKey), 'noInsert');
  }

  describe('relation expressions', () => {
    for (const [expression, relationPathKey, expected] of [
      ['*', '', false],
      ['*', 'a', true],
      ['*', 'a.b.c', true],
      ['a', 'a', true],
      ['a', 'a.b', false],
      ['a.b', 'a', false],
      ['a.b', 'a.b', true],
      ['a.b', 'a.b.c', false],
      ['[p, m.r]', 'p', true],
      ['[p, m.r]', 'm', false],
      ['[p, m.r]', 'm.r', true],
      ['a.[b, c]', 'a', false],
      ['a.[b, c]', 'a.c', true],
      ['a.*', 'a', false],
      ['a.*', 'a.b', true],
      ['a.*', 'a.b.c', true],
      ['a.^', 'a', true],
      ['a.^', 'a.a.a', true],
      ['a.^', 'a.b', false],
      ['a.^2', 'a.a', true],
      ['a.^2', 'a.a.a', false],
    ]) {
      it(`'${expression}' should ${expected ? '' : 'not '}match '${relationPathKey}'`, () => {
        expect(matches(expression, relationPathKey)).to.equal(expected);
      });
    }

    it('should match the full relation path in recursive upserts', () => {
      expect(matches('a.b', 'b', ['a'])).to.equal(true);
      expect(matches('a.b', '', ['a'])).to.equal(false);
      expect(matches('a', '', ['a'])).to.equal(true);
    });

    for (const [expression, message] of [
      ['', 'the expression is empty'],
      [' ', 'the expression is empty'],
      ['[]', 'the expression is empty'],
      ['a as b', 'aliases like "a as b" are not supported'],
      ['a.[b, c as d]', 'aliases like "c as d" are not supported'],
    ]) {
      it(`should throw for '${expression}'`, () => {
        expect(() => new GraphOptions({ noInsert: expression })).to.throwException((err) => {
          expect(err.message).to.equal(
            `invalid relation expression "${expression}" in noInsert option: ${message}`,
          );
        });
      });
    }
  });

  describe('rebasedOptions', () => {
    function rebasedMatches(noInsert, rootRelationPathKey, relationPathKey) {
      const options = new GraphOptions({ noInsert }).rebasedOptions(
        createNode(rootRelationPathKey),
      );
      return options._hasOption(createNode(relationPathKey), 'noInsert');
    }

    for (const noInsert of [['a', 'a.b', 'ab.c', 'x.a'], '[a.b, ab.c, x.a]']) {
      it(`should match ${JSON.stringify(noInsert)} against the full relation path`, () => {
        expect(rebasedMatches(noInsert, 'a', 'b')).to.equal(true);
        expect(rebasedMatches(noInsert, 'a', 'c')).to.equal(false);
        expect(rebasedMatches(noInsert, 'a', 'a')).to.equal(false);
        expect(rebasedMatches(noInsert, 'x', 'a')).to.equal(true);
      });
    }

    it('should match the new root', () => {
      expect(rebasedMatches(['a'], 'a', '')).to.equal(true);
      expect(rebasedMatches('a', 'a', '')).to.equal(true);
      expect(rebasedMatches(['a'], 'b', '')).to.equal(false);
      expect(rebasedMatches(['a.b'], 'a.b', '')).to.equal(true);
      expect(rebasedMatches(['b'], 'a.b', '')).to.equal(false);
    });
  });
});
