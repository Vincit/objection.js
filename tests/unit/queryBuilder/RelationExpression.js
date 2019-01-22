const expect = require('expect.js');
const { RelationExpression } = require('../../../');

describe('RelationExpression', () => {
  describe('parse', () => {
    it('empty expression', () => {
      testParse('', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false
      });

      testParse(
        {},
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      );
    });

    it('non-string', () => {
      let expectedResult = {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false
      };

      testParse(null, expectedResult);
      testParse(false, expectedResult);
      testParse(true, expectedResult);
      testParse(1, expectedResult);
      testParse({}, expectedResult);
      testParse([], expectedResult);
    });

    describe('single relation', () => {
      it('single relation', () => {
        testParse('a', {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        });

        testParse(
          {
            a: {}
          },
          {
            $name: null,
            $relation: null,
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            a: {
              $name: 'a',
              $relation: 'a',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        );
      });

      it('list with one value', () => {
        testParse('[a]', {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        });
      });

      it('weird characters', () => {
        testParse('_-%§$?+1Aa!€^', {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          '_-%§$?+1Aa!€^': {
            $name: '_-%§$?+1Aa!€^',
            $relation: '_-%§$?+1Aa!€^',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        });
      });
    });

    describe('nested relations', () => {
      it('one level', () => {
        testParse('a.b', {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            b: {
              $name: 'b',
              $relation: 'b',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        });
      });

      it('two levels', () => {
        testParse('a.b.c', {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            b: {
              $name: 'b',
              $relation: 'b',
              $modify: [],
              $recursive: false,
              $allRecursive: false,

              c: {
                $name: 'c',
                $relation: 'c',
                $modify: [],
                $recursive: false,
                $allRecursive: false
              }
            }
          }
        });

        testParse(
          {
            a: {
              b: {
                c: {}
              }
            }
          },
          {
            $name: null,
            $relation: null,
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            a: {
              $name: 'a',
              $relation: 'a',
              $modify: [],
              $recursive: false,
              $allRecursive: false,

              b: {
                $name: 'b',
                $relation: 'b',
                $modify: [],
                $recursive: false,
                $allRecursive: false,

                c: {
                  $name: 'c',
                  $relation: 'c',
                  $modify: [],
                  $recursive: false,
                  $allRecursive: false
                }
              }
            }
          }
        );
      });
    });

    it('multiple relations', () => {
      testParse('[a, b, c]', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        a: {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },

        b: {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },

        c: {
          $name: 'c',
          $relation: 'c',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });

      testParse(
        {
          a: true,
          b: {},
          c: true
        },
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          },

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          },

          c: {
            $name: 'c',
            $relation: 'c',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        }
      );
    });

    it('multiple nested relations', () => {
      testParse('[a.b, c.d.e, f]', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        a: {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        },

        c: {
          $name: 'c',
          $relation: 'c',
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          d: {
            $name: 'd',
            $relation: 'd',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            e: {
              $name: 'e',
              $relation: 'e',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        },

        f: {
          $name: 'f',
          $relation: 'f',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });

      testParse(
        {
          a: {
            b: true
          },

          c: {
            d: {
              e: {}
            }
          },

          f: {}
        },
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            b: {
              $name: 'b',
              $relation: 'b',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          },

          c: {
            $name: 'c',
            $relation: 'c',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            d: {
              $name: 'd',
              $relation: 'd',
              $modify: [],
              $recursive: false,
              $allRecursive: false,

              e: {
                $name: 'e',
                $relation: 'e',
                $modify: [],
                $recursive: false,
                $allRecursive: false
              }
            }
          },

          f: {
            $name: 'f',
            $relation: 'f',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        }
      );
    });

    it('deep nesting and nested lists', () => {
      testParse('[a.[b, c.[d, e.f]], g]', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        a: {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          },

          c: {
            $name: 'c',
            $relation: 'c',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            d: {
              $name: 'd',
              $relation: 'd',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            },
            e: {
              $name: 'e',
              $relation: 'e',
              $modify: [],
              $recursive: false,
              $allRecursive: false,

              f: {
                $name: 'f',
                $relation: 'f',
                $modify: [],
                $recursive: false,
                $allRecursive: false
              }
            }
          }
        },

        g: {
          $name: 'g',
          $relation: 'g',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });
    });

    it('arguments', () => {
      testParse('[a(arg1,arg2,arg3), b(arg4) . [c(), d(arg5 arg6), e]]', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        a: {
          $name: 'a',
          $relation: 'a',
          $modify: ['arg1', 'arg2', 'arg3'],
          $recursive: false,
          $allRecursive: false
        },

        b: {
          $name: 'b',
          $relation: 'b',
          $modify: ['arg4'],
          $recursive: false,
          $allRecursive: false,

          c: {
            $name: 'c',
            $relation: 'c',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          },

          d: {
            $name: 'd',
            $relation: 'd',
            $modify: ['arg5', 'arg6'],
            $recursive: false,
            $allRecursive: false
          },

          e: {
            $name: 'e',
            $relation: 'e',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        }
      });

      testParse(
        {
          a: {
            $modify: ['arg1', 'arg2', 'arg3']
          },

          b: {
            $modify: ['arg4'],

            c: true,

            d: {
              $modify: ['arg5', 'arg6']
            },

            e: {}
          }
        },
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: ['arg1', 'arg2', 'arg3'],
            $recursive: false,
            $allRecursive: false
          },

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: ['arg4'],
            $recursive: false,
            $allRecursive: false,

            c: {
              $name: 'c',
              $relation: 'c',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            },

            d: {
              $name: 'd',
              $relation: 'd',
              $modify: ['arg5', 'arg6'],
              $recursive: false,
              $allRecursive: false
            },

            e: {
              $name: 'e',
              $relation: 'e',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        }
      );

      testParse('a(f1).b(^f2, ^f3)', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        a: {
          $name: 'a',
          $relation: 'a',
          $modify: ['f1'],
          $recursive: false,
          $allRecursive: false,

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: ['^f2', '^f3'],
            $recursive: false,
            $allRecursive: false
          }
        }
      });
    });

    it('alias', () => {
      testParse('a as b', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        b: {
          $name: 'b',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });

      testParse(
        {
          b: {
            $relation: 'a'
          }
        },
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          b: {
            $name: 'b',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        }
      );

      testParse('aasb', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        aasb: {
          $name: 'aasb',
          $relation: 'aasb',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });

      testParse('[  as , b]', {
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        as: {
          $name: 'as',
          $relation: 'as',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },

        b: {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      });

      testParse(
        `a as aa.[
        b as bb,
        c as cc
      ]`,
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          aa: {
            $name: 'aa',
            $relation: 'a',
            $modify: [],
            $recursive: false,
            $allRecursive: false,

            bb: {
              $name: 'bb',
              $relation: 'b',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            },

            cc: {
              $name: 'cc',
              $relation: 'c',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        }
      );

      testParse(
        `a(f1, f2) as aa . [
        c(f3, f4) as cc,
        b as bb .[
          e,
          f as ff
        ]
      ]`,
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          aa: {
            $name: 'aa',
            $relation: 'a',
            $modify: ['f1', 'f2'],
            $recursive: false,
            $allRecursive: false,

            cc: {
              $name: 'cc',
              $relation: 'c',
              $modify: ['f3', 'f4'],
              $recursive: false,
              $allRecursive: false
            },

            bb: {
              $name: 'bb',
              $relation: 'b',
              $modify: [],
              $recursive: false,
              $allRecursive: false,

              e: {
                $name: 'e',
                $relation: 'e',
                $modify: [],
                $recursive: false,
                $allRecursive: false
              },

              ff: {
                $name: 'ff',
                $relation: 'f',
                $modify: [],
                $recursive: false,
                $allRecursive: false
              }
            }
          }
        }
      );
    });

    it('should ignore whitespace', () => {
      testParse(
        '\n\r\t  [ a (\narg1\n  arg2,arg3), \n \n b\n(arg4) . [c(), \td (arg5 arg6), e] \r] ',
        {
          $name: null,
          $relation: null,
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          a: {
            $name: 'a',
            $relation: 'a',
            $modify: ['arg1', 'arg2', 'arg3'],
            $recursive: false,
            $allRecursive: false
          },

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: ['arg4'],
            $recursive: false,
            $allRecursive: false,

            c: {
              $name: 'c',
              $relation: 'c',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            },

            d: {
              $name: 'd',
              $relation: 'd',
              $modify: ['arg5', 'arg6'],
              $recursive: false,
              $allRecursive: false
            },

            e: {
              $name: 'e',
              $relation: 'e',
              $modify: [],
              $recursive: false,
              $allRecursive: false
            }
          }
        }
      );
    });

    it('should throw with invalid input', () => {
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
      // Alias tests
      testParseFail('a asb');
      testParseFail('aas b');
      testParseFail('a asd b');
      // TODO: enable for v2.0.
      // testParseFail('[a.b, a.c]');
      // testParseFail('a.[b.c, b.d]');
    });
  });

  it('clone', () => {
    testClone('[aaa as a . bbb as b.^, c(f)]', {
      $name: null,
      $relation: null,
      $modify: [],
      $recursive: false,
      $allRecursive: false,

      a: {
        $name: 'a',
        $relation: 'aaa',
        $modify: [],
        $recursive: false,
        $allRecursive: false,

        b: {
          $name: 'b',
          $relation: 'bbb',
          $modify: [],
          $recursive: true,
          $allRecursive: false
        }
      },

      c: {
        $name: 'c',
        $relation: 'c',
        $modify: ['f'],
        $recursive: false,
        $allRecursive: false
      }
    });
  });

  describe('#expressionsAtPath', () => {
    it('a from a', () => {
      testPath('a', 'a', [
        {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('a from a.a', () => {
      testPath('a.b', 'a', [
        {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          b: {
            $name: 'b',
            $relation: 'b',
            $modify: [],
            $recursive: false,
            $allRecursive: false
          }
        }
      ]);
    });

    it('a.b from a', () => {
      testPath('a', 'a.b', []);
    });

    it('a.b from a.b', () => {
      testPath('a.b', 'a.b', [
        {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('a.b from a.[b, c]', () => {
      testPath('a.[b, c]', 'a.b', [
        {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('a.[b, c] from a.[b, c]', () => {
      testPath('a.[b, c]', 'a.[b, c]', [
        {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },
        {
          $name: 'c',
          $relation: 'c',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('a.[b, d] from a.[b, c]', () => {
      testPath('a.[b, c]', 'a.[b, d]', [
        {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('[a, b.c.d.[e, f]] from [a, b.[g, c.[d.[e, f], i], h]]', () => {
      testPath('[a, b.[g, c.[d.[e, f], i], h]]', '[a, b.c.d.[e, f]]', [
        {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },
        {
          $name: 'e',
          $relation: 'e',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        },
        {
          $name: 'f',
          $relation: 'f',
          $modify: [],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('b.c.d.[e, f] from [a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', () => {
      testPath('[a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', 'b.c.d.[e, f]', [
        {
          $name: 'e',
          $relation: 'e',
          $modify: ['a1'],
          $recursive: false,
          $allRecursive: false
        },
        {
          $name: 'f',
          $relation: 'f',
          $modify: ['a2'],
          $recursive: false,
          $allRecursive: false
        }
      ]);
    });

    it('b.c.d from [a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', () => {
      testPath('[a, b.[g, c.[d.[e(a1), f(a2)], i], h]]', 'b.c.d', [
        {
          $name: 'd',
          $relation: 'd',
          $modify: [],
          $recursive: false,
          $allRecursive: false,

          e: {
            $name: 'e',
            $relation: 'e',
            $modify: ['a1'],
            $recursive: false,
            $allRecursive: false
          },

          f: {
            $name: 'f',
            $relation: 'f',
            $modify: ['a2'],
            $recursive: false,
            $allRecursive: false
          }
        }
      ]);
    });
  });

  describe('#merge', () => {
    testMerge('a', 'b', '[a, b]');
    testMerge('a.b', 'b', '[a.b, b]');
    testMerge('a', 'b.c', '[a, b.c]');
    testMerge('[a, b]', '[b, c]', '[a, b, c]');
    testMerge('a.b', 'a.c', 'a.[b, c]');
    testMerge('[a.b, d]', 'a.c', '[a.[b, c], d]');
    testMerge('a.[c, d.e, g]', 'a.[c.l, d.[e.m, n], f]', 'a.[c.l, d.[e.m, n], g, f]');
    testMerge('a.^4', 'a.^3', 'a.^4');
    testMerge('a.^', 'a.^6', 'a.^');
    testMerge('a.^6', 'a.^', 'a.^');
    testMerge('a.a', 'a.^', 'a.^');
    testMerge('a(f)', 'a(g)', 'a(f, g)');
    testMerge('a.b(f)', 'a.b(g)', 'a.b(f, g)');
  });

  describe('#toString', () => {
    testToString('a');
    testToString('a.b');
    testToString('a as b.b as c');
    testToString('a as b.[b as c, d as e]');
    testToString('a.[b, c]');
    testToString('a.[b, c.d]');
    testToString('[a, b]');
    testToString('[a.[b, c], d.e.f.[g, h.i]]');
    testToString('a.*');
    testToString('a.^');
    testToString('a.^3');
    testToString('[a.*, b.c.^]');
  });

  describe('#toJSON', () => {
    testToJSON('a', {
      a: true
    });

    testToJSON('a.b', {
      a: {
        b: true
      }
    });

    testToJSON('a as b.b as c', {
      b: {
        $relation: 'a',
        c: {
          $relation: 'b'
        }
      }
    });

    testToJSON('a as b.[b as c, d as e]', {
      b: {
        $relation: 'a',
        c: {
          $relation: 'b'
        },
        e: {
          $relation: 'd'
        }
      }
    });

    testToJSON('a.[b, c]', {
      a: {
        b: true,
        c: true
      }
    });

    testToJSON('a.[b, c.d]', {
      a: {
        b: true,
        c: {
          d: true
        }
      }
    });

    testToJSON('[a, b]', {
      a: true,
      b: true
    });

    testToJSON('[a(f1, f2), b]', {
      a: {
        $modify: ['f1', 'f2']
      },
      b: true
    });

    testToJSON('[a.[b, c], d.e.f.[g, h.i]]', {
      a: {
        b: true,
        c: true
      },
      d: {
        e: {
          f: {
            g: true,
            h: {
              i: true
            }
          }
        }
      }
    });

    testToJSON('a.*', {
      a: {
        $allRecursive: true
      }
    });

    testToJSON('a.^', {
      a: {
        $recursive: true
      }
    });

    testToJSON('a.^3', {
      a: {
        $recursive: 3
      }
    });

    testToJSON('[a.*, b.c.^]', {
      a: {
        $allRecursive: true
      },
      b: {
        c: {
          $recursive: true
        }
      }
    });
  });

  describe('#isSubExpression', () => {
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

    testSubExpression('[a as aa.[c as cc . d as dd], b as bb]', 'a as aa');
    testSubExpression('[a as aa.[c as cc . d as dd], b as bb]', '[a as aa, b as bb]');
    testSubExpression('[a as aa.[c as cc . d as dd], b as bb]', 'a as aa . c as cc');
    testSubExpression('[a as aa.[c as cc . d as dd], b as bb]', 'a as aa . c as cc . d as dd');
  });

  describe('#forEachChildExrpression', () => {
    it('should traverse first level children', () => {
      const expr = RelationExpression.create('[a, b.c, d]');
      const items = [];

      const fakeModel = {
        getRelationNames() {
          return ['a', 'b', 'd'];
        },

        getRelationUnsafe(name) {
          return name + name;
        }
      };

      expr.forEachChildExpression(fakeModel, (expr, relation) => {
        items.push({ exprName: expr.$name, relation });
      });

      expect(items).to.eql([
        { exprName: 'a', relation: 'aa' },
        { exprName: 'b', relation: 'bb' },
        { exprName: 'd', relation: 'dd' }
      ]);
    });

    it('should work with recursive expressions', () => {
      const expr = RelationExpression.create('a.^');
      const items = [];

      const fakeModel = {
        getRelationNames() {
          return ['a'];
        },

        getRelationUnsafe(name) {
          return name + name;
        }
      };

      expr.forEachChildExpression(fakeModel, (expr, relation) => {
        items.push({ exprName: expr.$name, relation });

        expr.forEachChildExpression(fakeModel, (expr, relation) => {
          items.push({ exprName: expr.$name, relation });

          expr.forEachChildExpression(fakeModel, (expr, relation) => {
            items.push({ exprName: expr.$name, relation });
          });
        });
      });

      expect(items).to.eql([
        { exprName: 'a', relation: 'aa' },
        { exprName: 'a', relation: 'aa' },
        { exprName: 'a', relation: 'aa' }
      ]);
    });

    it('should work with limited recursive expressions', () => {
      const expr = RelationExpression.create('a.^2');
      const items = [];

      const fakeModel = {
        getRelationNames() {
          return ['a'];
        },

        getRelationUnsafe(name) {
          return name + name;
        }
      };

      expr.forEachChildExpression(fakeModel, (expr, relation) => {
        items.push({ exprName: expr.$name, relation });

        expr.forEachChildExpression(fakeModel, (expr, relation) => {
          items.push({ exprName: expr.$name, relation });

          expr.forEachChildExpression(fakeModel, (expr, relation) => {
            items.push({ exprName: expr.$name, relation });
          });
        });
      });

      expect(items).to.eql([{ exprName: 'a', relation: 'aa' }, { exprName: 'a', relation: 'aa' }]);
    });

    it('should work with all recursive expressions', () => {
      const expr = RelationExpression.create('a.*');
      const items = [];

      const fakeModel1 = {
        getRelationNames() {
          return ['a'];
        },

        getRelationUnsafe(name) {
          return name + name;
        }
      };

      const fakeModel2 = {
        getRelationNames() {
          return ['b', 'c', 'd'];
        },

        getRelationUnsafe(name) {
          return name + name;
        }
      };

      expr.forEachChildExpression(fakeModel1, (expr, relation) => {
        items.push({ exprName: expr.$name, relation });

        expr.forEachChildExpression(fakeModel2, (expr, relation) => {
          items.push({ exprName: expr.$name, relation });
        });
      });

      expect(items).to.eql([
        { exprName: 'a', relation: 'aa' },
        { exprName: 'b', relation: 'bb' },
        { exprName: 'c', relation: 'cc' },
        { exprName: 'd', relation: 'dd' }
      ]);
    });
  });

  function testParse(str, parsed) {
    expect(RelationExpression.create(str)).to.eql(parsed);
  }

  function testClone(expr, cloned) {
    expect(RelationExpression.create(expr).clone()).to.eql(cloned);
  }

  function testMerge(str1, str2, parsed) {
    it(str1 + ' + ' + str2 + ' --> ' + parsed, () => {
      expect(
        RelationExpression.create(str1)
          .merge(str2)
          .toString()
      ).to.equal(parsed);
      expect(
        RelationExpression.create(str1)
          .merge(RelationExpression.create(str2))
          .toString()
      ).to.equal(parsed);
    });
  }

  function testPath(str, path, expected) {
    expect(RelationExpression.create(str).expressionsAtPath(path)).to.eql(expected);
  }

  function testToString(str) {
    it(str, () => {
      expect(RelationExpression.create(str).toString()).to.equal(str);
    });
  }

  function testToJSON(str, expectedJson) {
    it(str, () => {
      const json = RelationExpression.create(str).toJSON();
      expect(json).to.eql(expectedJson);
      expect(RelationExpression.create(json).toString()).to.eql(str);
    });
  }

  function testParseFail(str) {
    expect(() => {
      RelationExpression.create(str);
    }).to.throwException();
  }

  function testSubExpression(str, subStr) {
    it('"' + subStr + '" is a sub expression of "' + str + '"', () => {
      expect(RelationExpression.create(str).isSubExpression(subStr)).to.equal(true);
    });
  }

  function testNotSubExpression(str, subStr) {
    it('"' + subStr + '" is not a sub expression of "' + str + '"', () => {
      expect(RelationExpression.create(str).isSubExpression(subStr)).to.equal(false);
    });
  }
});
