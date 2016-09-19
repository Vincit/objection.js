'use strict';

var expect = require('expect.js')
  , ValidationError = require('../../../').ValidationError
  , RelationExpression = require('../../../').RelationExpression;

describe('RelationExpression', function () {

  describe('parse', function () {

    it('empty string', function () {
      testParse('', {
        name: null,
        args: [],
        numChildren: 0,
        children: {}
      });
    });

    it('non-string', function () {
      var expectedResult = {
        name: null,
        args: [],
        numChildren: 0,
        children: {}
      };

      testParse(null, expectedResult);
      testParse(false, expectedResult);
      testParse(true, expectedResult);
      testParse(1, expectedResult);
      testParse({}, expectedResult);
      testParse([], expectedResult);
    });

    describe('single relation', function () {

      it('single relation', function () {
        testParse('a', {
          name: null,
          args: [],
          numChildren: 1,
          children: {
            a: {
              name: 'a',
              args: [],
              numChildren: 0,
              children: {}
            }
          }
        });
      });

      it('list with one value', function () {
        testParse('[a]', {
          name: null,
          args: [],
          numChildren: 1,
          children: {
            a: {
              name: 'a',
              args: [],
              numChildren: 0,
              children: {}
            }
          }
        });
      });

      it('weird characters', function () {
        testParse('_-%§$?+1Aa!€^', {
          name: null,
          args: [],
          numChildren: 1,
          children: {
            "_-%§$?+1Aa!€^": {
              name: '_-%§$?+1Aa!€^',
              args: [],
              numChildren: 0,
              children: {}
            }
          }
        });
      });

    });

    describe('nested relations', function () {

      it('one level', function () {
        testParse('a.b', {
          name: null,
          args: [],
          numChildren: 1,
          children: {
            a: {
              name: 'a',
              args: [],
              numChildren: 1,
              children: {
                b: {
                  name: 'b',
                  args: [],
                  numChildren: 0,
                  children: {}
                }
              }
            }
          }
        });
      });

      it('two levels', function () {
        testParse('a.b.c', {
          name: null,
          args: [],
          numChildren: 1,
          children: {
            a: {
              name: 'a',
              args: [],
              numChildren: 1,
              children: {
                b: {
                  name: 'b',
                  args: [],
                  numChildren: 1,
                  children: {
                    c: {
                      name: 'c',
                      args: [],
                      numChildren: 0,
                      children: {}
                    }
                  }
                }
              }
            }
          }
        });
      });

    });

    it('multiple relations', function () {
      testParse('[a, b, c]', {
        name: null,
        args: [],
        numChildren: 3,
        children: {
          a: {
            name: 'a',
            args: [],
            numChildren: 0,
            children: {}
          },
          b: {
            name: 'b',
            args: [],
            numChildren: 0,
            children: {}
          },
          c: {
            name: 'c',
            args: [],
            numChildren: 0,
            children: {}
          }
        }
      });
    });

    it('multiple nested relations', function () {
      testParse('[a.b, c.d.e, f]', {
        name: null,
        args: [],
        numChildren: 3,
        children: {
          a: {
            name: 'a',
            args: [],
            numChildren: 1,
            children: {
              b: {
                name: 'b',
                args: [],
                numChildren: 0,
                children: {}
              }
            }
          },
          c: {
            name: 'c',
            args: [],
            numChildren: 1,
            children: {
              d: {
                name: 'd',
                args: [],
                numChildren: 1,
                children: {
                  e: {
                    name: 'e',
                    args: [],
                    numChildren: 0,
                    children: {}
                  }
                }
              }
            }
          },
          f: {
            name: 'f',
            args: [],
            numChildren: 0,
            children: {}
          }
        }
      });
    });

    it('deep nesting and nested lists', function () {
      testParse('[a.[b, c.[d, e.f]], g]', {
        name: null,
        args: [],
        numChildren: 2,
        children: {
          a: {
            name: 'a',
            args: [],
            numChildren: 2,
            children: {
              b: {
                name: 'b',
                args: [],
                numChildren: 0,
                children: []
              },
              c: {
                name: 'c',
                args: [],
                numChildren: 2,
                children: {
                  d: {
                    name: 'd',
                    args: [],
                    numChildren: 0,
                    children: []
                  },
                  e: {
                    name: 'e',
                    args: [],
                    numChildren: 1,
                    children: {
                      f: {
                        name: 'f',
                        args: [],
                        numChildren: 0,
                        children: {}
                      }
                    }
                  }
                }
              }
            }
          },
          g: {
            name: 'g',
            args: [],
            numChildren: 0,
            children: {}
          }
        }
      });
    });

    it('arguments', function () {
      testParse('[a(arg1,arg2,arg3), b(arg4) . [c(), d(arg5 arg6), e]]', {
        name: null,
        args: [],
        numChildren: 2,
        children: {
          a: {
            name: 'a',
            args: ['arg1', 'arg2', 'arg3'],
            numChildren: 0,
            children: {}
          },
          b: {
            name: 'b',
            args: ['arg4'],
            numChildren: 3,
            children: {
              c: {
                name: 'c',
                args: [],
                numChildren: 0,
                children: {}
              },
              d: {
                name: 'd',
                args: ['arg5', 'arg6'],
                numChildren: 0,
                children: {}
              },
              e: {
                name: 'e',
                args: [],
                numChildren: 0,
                children: {}
              }
            }
          }
        }
      });
    });

    it('should ignore whitespace', function () {
      testParse('\n\r\t  [ a (\narg1\n  arg2,arg3), \n \n b\n(arg4) . [c(), \td (arg5 arg6), e] \r] ', {
        name: null,
        args: [],
        numChildren: 2,
        children: {
          a: {
            name: 'a',
            args: ['arg1', 'arg2', 'arg3'],
            numChildren: 0,
            children: {}
          },
          b: {
            name: 'b',
            args: ['arg4'],
            numChildren: 3,
            children: {
              c: {
                name: 'c',
                args: [],
                numChildren: 0,
                children: {}
              },
              d: {
                name: 'd',
                args: ['arg5', 'arg6'],
                numChildren: 0,
                children: {}
              },
              e: {
                name: 'e',
                args: [],
                numChildren: 0,
                children: {}
              }
            }
          }
        }
      });
    });

    it('should fail gracefully on invalid input', function () {
      testParseFail('.');
      testParseFail('..');
      testParseFail('a.');
      testParseFail('.a');
      testParseFail('[');
      testParseFail(']');
      testParseFail('[[]]');
      testParseFail('[a');
      testParseFail('a]');
      testParseFail('[a.]');
      testParseFail('a.[b]]');
      testParseFail('a.[.]');
      testParseFail('a.[.b]');
      testParseFail('[a,,b]');
    });

  });

  describe('#nodesAtPath', function () {

    it('a from a', function () {
      testPath('a', 'a', [{
        name: 'a',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('a from a.a', function () {
      testPath('a.b', 'a', [{
        name: 'a',
        args: [],
        numChildren: 1,
        children: {
          b: {
            name: 'b',
            args: [],
            numChildren: 0,
            children: {}
          }
        }
      }]);
    });

    it('a.b from a', function () {
      testPath('a', 'a.b', []);
    });

    it('a.b from a.b', function () {
      testPath('a.b', 'a.b', [{
        name: 'b',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('a.b from a.[b, c]', function () {
      testPath('a.[b, c]', 'a.b', [{
        name: 'b',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('a.[b, c] from a.[b, c]', function () {
      testPath('a.[b, c]', 'a.[b, c]', [{
        name: 'b',
        args: [],
        numChildren: 0,
        children: {}
      }, {
        name: 'c',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('a.[b, d] from a.[b, c]', function () {
      testPath('a.[b, c]', 'a.[b, d]', [{
        name: 'b',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('[a, b.c.d.[e, f]] from [a, b.[g, c.[d.[e, f], i], h]]', function () {
      testPath('[a, b.[g, c.[d.[e, f], i], h]]', '[a, b.c.d.[e, f]]', [{
        name: 'a',
        args: [],
        numChildren: 0,
        children: {}
      }, {
        name: 'e',
        args: [],
        numChildren: 0,
        children: {}
      }, {
        name: 'f',
        args: [],
        numChildren: 0,
        children: {}
      }]);
    });

    it('b.c.d.[e, f] from [a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', function () {
      testPath('[a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', 'b.c.d.[e, f]', [{
        name: 'e',
        args: ['a1'],
        numChildren: 0,
        children: {}
      }, {
        name: 'f',
        args: ['a2'],
        numChildren: 0,
        children: {}
      }]);
    });

    it('b.c.d from [a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', function () {
      testPath('[a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', 'b.c.d', [{
        name: 'd',
        args: [],
        numChildren: 2,
        children: {
          e: {
            name: 'e',
            args: ['a1'],
            numChildren: 0,
            children: {}
          },
          f: {
            name: 'f',
            args: ['a2'],
            numChildren: 0,
            children: {}
          }
        }
      }]);
    });

  });

  describe('#toString', function () {
    testToString('a');
    testToString('a.b');
    testToString('a.[b, c]');
    testToString('a.[b, c.d]');
    testToString('[a, b]');
    testToString('[a.[b, c], d.e.f.[g, h.i]]');
    testToString('a.*');
    testToString('a.^');
    testToString('a.^3');
    testToString('[a.*, b.c.^]');
  });

  describe('#isSubExpression', function () {
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

    testSubExpression('a.b.*', 'a.b.*');
    testNotSubExpression('a.b.*', '*');
    testNotSubExpression('a.b.*', 'a.*');
    testNotSubExpression('a.b.*', 'a.[b.*, c]');

    testSubExpression('a', 'a');
    testSubExpression('a.b', 'a.b');
    testSubExpression('a.b.[c, d]', 'a.b.[c, d]');
    testSubExpression('[a.b.[c, d], e]', '[a.b.[c, d], e]');

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

    testSubExpression('a.^', 'a.^');
    testSubExpression('a.^', 'a.^100');
    testSubExpression('a.^3', 'a.^3');
    testSubExpression('a.^3', 'a.^2');
    testSubExpression('a.^3', 'a.^1');
    testSubExpression('a.^3', 'a.a.a');
    testSubExpression('a.^3', 'a.a');
    testSubExpression('a.^3', 'a');
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
    testNotSubExpression('a.^', 'a.[b, ^, c]');
    testNotSubExpression('a.^3', 'a.^');
    testNotSubExpression('a.^3', 'a.^4');
    testNotSubExpression('a.^3', 'a.a.a.a');
  });

  function testParse(str, parsed) {
    expect(RelationExpression.parse(str)).to.eql(parsed);
  }

  function testPath(str, path, expected) {
    expect(RelationExpression.parse(str)._nodesAtPath(path)).to.eql(expected);
  }

  function testToString(str) {
    it(str, function () {
      expect(RelationExpression.parse(str).toString()).to.equal(str);
    });
  }

  function testParseFail(str) {
    expect(function () {
      RelationExpression.parse(str);
    }).to.throwException(function (err) {
      expect(err).to.be.a(ValidationError);
    });
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
