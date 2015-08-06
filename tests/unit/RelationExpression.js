var expect = require('expect.js')
  , RelationExpression = require('../../lib/RelationExpression');

describe('RelationExpression', function () {

  describe('parse', function () {

    it('empty string', function () {
      testParse('', {nodes: []});
    });

    it('non-string', function () {
      testParse(null, {nodes: []});
      testParse(false, {nodes: []});
      testParse(true, {nodes: []});
      testParse(1, {nodes: []});
      testParse({}, {nodes: []});
      testParse([], {nodes: []});
    });

    it('single relation', function () {
      testParse('a', {
        nodes: [{
          name: 'a',
          children: []
        }]
      });
      testParse('[a]', {
        nodes: [{
          name: 'a',
          children: []
        }]
      });
      testParse('[[[a]]]', {
        nodes: [{
          name: 'a',
          children: []
        }]
      });
    });

    it('nested relations', function () {
      testParse('a.b', {
        nodes: [{
          name: 'a',
          children: [{
            name: 'b',
            children: []
          }]
        }]
      });
      testParse('a.b.c', {
        nodes: [{
          name: 'a',
          children: [{
            name: 'b',
            children: [{
              name: 'c',
              children: []
            }]
          }]
        }]
      });
    });

    it('multiple relations', function () {
      testParse('[a, b, c]', {
        nodes: [{
          name: 'a',
          children: []
        }, {
          name: 'b',
          children: []
        }, {
          name: 'c',
          children: []
        }]
      });
    });

    it('multiple nested relations', function () {
      testParse('[a.b, c.d.e, f]', {
        nodes: [{
          name: 'a',
          children: [{
            name: 'b',
            children: []
          }]
        }, {
          name: 'c',
          children: [{
            name: 'd',
            children: [{
              name: 'e',
              children: []
            }]
          }]
        }, {
          name: 'f',
          children: []
        }]
      });
    });

    it('multiple sub relations', function () {
      testParse('[a.[b, c.[d, e.f]], g]', {
        nodes: [{
          name: 'a',
          children: [{
            name: 'b',
            children: []
          }, {
            name: 'c',
            children: [{
              name: 'd',
              children: []
            }, {
              name: 'e',
              children: [{
                name: 'f',
                children: []
              }]
            }]
          }]
        }, {
          name: 'g',
          children: []
        }]
      });
    });

    it('should fail gracefully on invalid input', function () {
      testParseFail('.');
      testParseFail('..');
      testParseFail('a.');
      testParseFail('.a');
      testParseFail('[');
      testParseFail(']');
      testParseFail('[]');
      testParseFail('[[]]');
      testParseFail('[a');
      testParseFail('a]');
      testParseFail('[a.]');
      testParseFail('a.[b]]');
      testParseFail('a.[.]');
      testParseFail('a.[.b]');
      testParseFail('[a,,b]');
      testParseFail('[a,b,]');
    });

  });

  describe('#isSubExpression', function () {

    // Everything is a sub expression of *.
    testSubExpression('*', 'a');
    testSubExpression('*', '[a, b]');
    testSubExpression('*', 'a.b');
    testSubExpression('*', 'a.b.[c, d]');
    testSubExpression('*', '[a, b.c, c.d.[e, f.g.[h, i]]]');
    testSubExpression('*', '*');
    testSubExpression('*', 'a.*');
    testSubExpression('*', 'a.^');
    testSubExpression('a.*', 'a');
    testSubExpression('a.*', 'a.b');
    testSubExpression('a.*', 'a.*');
    testSubExpression('a.*', 'a.^');
    testSubExpression('a.*', 'a.b.c');
    testSubExpression('a.*', 'a.[b, c]');
    testSubExpression('a.*', 'a.[b, c.d]');
    testSubExpression('a.[b.*, c]', 'a.b.c.d');
    testSubExpression('a.[b.*, c]', 'a.[b.c.d, c]');
    testSubExpression('a.[b.*, c]', 'a.[b.[c, d], c]');
    testNotSubExpression('a.*', 'b');
    testNotSubExpression('a.*', 'c');
    testNotSubExpression('a.*', '[a, b]');
    testNotSubExpression('a.*', '*');
    testNotSubExpression('a.[b.*, c]', 'a.[b.c.d, c.d]');

    // * in sub expression requires * in expression.
    testSubExpression('a.b.*', 'a.b.*');
    testNotSubExpression('a.b.*', '*');
    testNotSubExpression('a.b.*', 'a.*');
    testNotSubExpression('a.b.*', 'a.[b.*, c]');

    // Equal.
    testSubExpression('a', 'a');
    testSubExpression('a.b', 'a.b');
    testSubExpression('a.b.[c, d]', 'a.b.[c, d]');
    testSubExpression('[a.b.[c, d], e]', '[a.b.[c, d], e]');

    // Subs.
    testSubExpression('a.b', 'a');
    testNotSubExpression('a', 'a.b');

    testSubExpression('a.b.c', 'a');
    testSubExpression('a.b.c', 'a.b');
    testNotSubExpression('a', 'a.b.c');
    testNotSubExpression('a.b', 'a.b.c');

    testSubExpression('a.[b, c]', 'a');
    testSubExpression('a.[b, c]', 'a.b');
    testSubExpression('a.[b, c]', 'a.c');
    testNotSubExpression('a.[b, c]', 'a.c.d');
    testNotSubExpression('a.[b, c]', 'b');
    testNotSubExpression('a.[b, c]', 'c');

    testSubExpression('[a.b.[c, d.e], b]', 'a');
    testSubExpression('[a.b.[c, d.e], b]', 'b');
    testSubExpression('[a.b.[c, d.e], b]', 'a.b');
    testSubExpression('[a.b.[c, d.e], b]', 'a.b.c');
    testSubExpression('[a.b.[c, d.e], b]', 'a.b.d');
    testSubExpression('[a.b.[c, d.e], b]', 'a.b.d.e');
    testSubExpression('[a.b.[c, d.e], b]', '[a.b.[c, d], b]');
    testSubExpression('[a.b.[c, d.e], b]', '[a.b.[c, d.[e]], b]');
    testNotSubExpression('[a.b.[c, d.e], b]', 'c');
    testNotSubExpression('[a.b.[c, d.e], b]', 'b.c');
    testNotSubExpression('[a.b.[c, d.e], b]', '[a, b, c]');
    testNotSubExpression('[a.b.[c, d.e], b]', 'a.b.e');
    testNotSubExpression('[a.b.[c, d.e], b]', '[a.b.e, b]');
    testNotSubExpression('[a.b.[c, d.e], b]', '[a.b.c, c]');
    testNotSubExpression('[a.b.[c, d.e], b]', 'a.b.[c, e]');
    testNotSubExpression('[a.b.[c, d.e], b]', 'a.b.[c, d, e]');
    testNotSubExpression('[a.b.[c, d.e], b]', 'a.b.[c, d.[e, f]]');

    // EagerType.Recursive.
    testSubExpression('a.^', 'a.^');
    testSubExpression('a.^', 'a.a');
    testSubExpression('a.^', 'a.a.^');
    testSubExpression('a.^', 'a.a.a');
    testSubExpression('a.^', 'a.a.a.^');
    testSubExpression('[a.^, b.[c.^, d]]', 'a');
    testSubExpression('[a.^, b.[c.^, d]]', 'b.c');
    testSubExpression('[a.^, b.[c.^, d]]', 'b.c.^');
    testSubExpression('[a.^, b.[c.^, d]]', '[a, b]');
    testSubExpression('[a.^, b.[c.^, d]]', '[b.c, b.d]');
    testSubExpression('[a.^, b.[c.^, d]]', '[b.c.c.c, b.d]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.^, b]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.a, b]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.a.^, b.c]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.a.^, b.c.^]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.a.^, b.c.c]');
    testSubExpression('[a.^, b.[c.^, d]]', '[a.a.^, b.[c.c.c, d]]');
    testNotSubExpression('a.^', 'b');
    testNotSubExpression('a.^', 'a.b');
    testNotSubExpression('a.^', 'a.a.b');
    testNotSubExpression('a.^', 'a.a.b.^');
    testNotSubExpression('[a.^, b.[c.^, d]]', 'a.b');
    testNotSubExpression('[a.^, b.[c.^, d]]', '[c, b]');
    testNotSubExpression('[a.^, b.[c.^, d]]', '[c, b]');
    testNotSubExpression('[a.^, b.[c.^, d]]', 'b.c.d');

  });

  function testParse(str, parsed) {
    expect(RelationExpression.parse(str)).to.eql(parsed);
  }

  function testParseFail(str) {
    expect(function () {
      RelationExpression.parse(str);
    }).to.throwException();
  }

  function testSubExpression(str, subStr) {
    it('"' + subStr + '" is a sub expression of "' + str + '"', function () {
      expect(RelationExpression.parse(str).isSubExpression(subStr)).to.equal(true);
    });
  }

  function testNotSubExpression(str, subStr) {
    it('"' + subStr + '" is not a sub expression of "' + str + '"', function () {
      expect(RelationExpression.parse(str).isSubExpression(subStr)).to.equal(false);
    });
  }

});
