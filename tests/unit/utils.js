const util = require('util');
const expect = require('expect.js');
const Promise = require('bluebird');
const classUtils = require('../../lib/utils/classUtils');
const UpsertNode = require('../../lib/queryBuilder/graphUpserter/UpsertNode');
const getOptionsWithRelPathFromRoot = require('../../lib/utils/transformOptionsFromPath');

const {
  snakeCase,
  camelCase,
  snakeCaseKeys,
  camelCaseKeys
} = require('../../lib/utils/identifierMapping');

const { range } = require('lodash');
const { compose, mixin } = require('../../lib/utils/mixin');
const { get } = require('../../lib/utils/objectUtils');
const { map } = require('../../lib/utils/promiseUtils');

describe('utils', () => {
  describe('isSubclassOf', () => {
    function A() {}
    function B() {}
    function C() {}

    util.inherits(B, A);
    util.inherits(C, B);

    it('should return true for subclass constructor', () => {
      expect(classUtils.isSubclassOf(A, Object)).to.equal(true);
      expect(classUtils.isSubclassOf(B, A)).to.equal(true);
      expect(classUtils.isSubclassOf(C, B)).to.equal(true);
      expect(classUtils.isSubclassOf(C, A)).to.equal(true);
      expect(classUtils.isSubclassOf(A, B)).to.equal(false);
      expect(classUtils.isSubclassOf(B, C)).to.equal(false);
      expect(classUtils.isSubclassOf(A, C)).to.equal(false);
    });

    it('should return false if one of the inputs is not a constructor', () => {
      expect(classUtils.isSubclassOf(function() {}, {})).to.equal(false);
      expect(classUtils.isSubclassOf({}, function() {})).to.equal(false);
    });
  });

  describe('mixin', () => {
    it('should mixin rest of the arguments to the first argument', () => {
      class X {}

      const m1 = C =>
        class extends C {
          f() {
            return 1;
          }
        };

      const m2 = C =>
        class extends C {
          f() {
            return super.f() + 1;
          }
        };

      const Y = mixin(X, m1, m2);
      const y = new Y();

      expect(y.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Y.name).to.equal('X');
      }

      const Z = mixin(X, [m1, m2]);
      const z = new Z();

      expect(z.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Z.name).to.equal('X');
      }
    });
  });

  describe('compose', () => {
    it('should compose multiple functions', () => {
      class X {}

      const m1 = C =>
        class extends C {
          f() {
            return 1;
          }
        };

      const m2 = C =>
        class extends C {
          f() {
            return super.f() + 1;
          }
        };

      const m3 = compose(
        m1,
        m2
      );
      const m4 = compose([m1, m2]);

      const Y = m3(X);
      const y = new Y();

      expect(y.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Y.name).to.equal('X');
      }

      const Z = m4(X);
      const z = new Z();

      expect(z.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Z.name).to.equal('X');
      }
    });
  });

  describe('snakeCase module', () => {
    describe('snakeCase and camelCase functions', () => {
      test('*', '*');

      test('foo', 'foo');
      test('fooBar', 'foo_bar');
      test('foo1Bar2', 'foo1_bar2');
      test('fooBAR', 'foo_bar', 'fooBar');
      test('fooBaR', 'foo_ba_r');

      test('föö', 'föö');
      test('fööBär', 'föö_bär');
      test('föö1Bär2', 'föö1_bär2');
      test('fööBÄR', 'föö_bär', 'fööBär');
      test('fööBäR', 'föö_bä_r');

      test('foo1bar2', 'foo1bar2');
      test('Foo', 'foo', 'foo');
      test('FooBar', 'foo_bar', 'fooBar');
      test('märkäLänttiÄäliö', 'märkä_läntti_ääliö');

      test('fooBar:spamBaz:troloLolo', 'foo_bar:spam_baz:trolo_lolo');
      test('fooBar.spamBaz.troloLolo', 'foo_bar.spam_baz.trolo_lolo');

      testUnderscoreBeforeNumbers('*', '*');

      testUnderscoreBeforeNumbers('foo', 'foo');
      testUnderscoreBeforeNumbers('fooBar', 'foo_bar');
      testUnderscoreBeforeNumbers('foo1Bar2', 'foo_1_bar_2');
      testUnderscoreBeforeNumbers('fooBAR', 'foo_bar', 'fooBar');
      testUnderscoreBeforeNumbers('fooBaR', 'foo_ba_r');

      testUnderscoreBeforeNumbers('föö', 'föö');
      testUnderscoreBeforeNumbers('fööBär', 'föö_bär');
      testUnderscoreBeforeNumbers('föö1Bär2', 'föö_1_bär_2');
      testUnderscoreBeforeNumbers('föö09Bär90', 'föö_09_bär_90');
      testUnderscoreBeforeNumbers('fööBÄR', 'föö_bär', 'fööBär');
      testUnderscoreBeforeNumbers('fööBäR', 'föö_bä_r');

      testUnderscoreBeforeNumbers('foo1bar2', 'foo_1bar_2');
      testUnderscoreBeforeNumbers('Foo', 'foo', 'foo');
      testUnderscoreBeforeNumbers('FooBar', 'foo_bar', 'fooBar');
      testUnderscoreBeforeNumbers('märkäLänttiÄäliö', 'märkä_läntti_ääliö');

      testUnderscoreBeforeNumbers('fooBar:spamBaz:troloLolo', 'foo_bar:spam_baz:trolo_lolo');
      testUnderscoreBeforeNumbers('fooBar.spamBaz.troloLolo', 'foo_bar.spam_baz.trolo_lolo');

      function test(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel)).to.equal(snake);
          expect(snakeCaseKeys({ [camel]: 'foo' })).to.eql({ [snake]: 'foo' });

          expect(camelCase(snakeCase(camel))).to.equal(backToCamel);
          expect(camelCaseKeys(snakeCaseKeys({ [camel]: 'foo' }))).to.eql({ [backToCamel]: 'foo' });
        });
      }

      function testUnderscoreBeforeNumbers(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;
        const opt = { underscoreBeforeDigits: true };

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel, opt)).to.equal(snake);
          expect(camelCase(snakeCase(camel, opt), opt)).to.equal(backToCamel);
        });
      }
    });
  });

  describe('getOptionsWithRelPathFromRoot', () => {
    it('should return true for options set to true', () => {
      const opt = {
        [UpsertNode.OptionType.Relate]: true,
        [UpsertNode.OptionType.Unrelate]: true
      };

      const optTransformed = getOptionsWithRelPathFromRoot(opt, 'bogus.path');

      expect(optTransformed).to.eql(opt);
    });

    it('should remove option for options set to unknown path', () => {
      const opt = {
        [UpsertNode.OptionType.Relate]: ['begins.with.this.path'],
        [UpsertNode.OptionType.Unrelate]: true
      };

      const optTransformed = getOptionsWithRelPathFromRoot(opt, 'begins.with.different.path');

      expect(optTransformed).to.eql({
        [UpsertNode.OptionType.Unrelate]: true
      });
    });

    it('should remove equal and update longer paths', () => {
      const opt = {
        [UpsertNode.OptionType.Relate]: ['begins'],
        [UpsertNode.OptionType.Unrelate]: ['begins.with'],
        [UpsertNode.OptionType.InsertMissing]: ['begins.with.this', 'begins.with.also.this'],
        [UpsertNode.OptionType.Update]: ['begins.with.this.path']
      };

      const optTransformed = getOptionsWithRelPathFromRoot(opt, 'begins.with');

      expect(optTransformed).to.eql({
        [UpsertNode.OptionType.InsertMissing]: ['this', 'also.this'],
        [UpsertNode.OptionType.Update]: ['this.path']
      });
    });
  });

  describe('promiseUtils', () => {
    describe('map', () => {
      it('should work like Promise.all if concurrency is not given', () => {
        const numItems = 20;
        let running = 0;
        let maxRunning = 0;
        let startOrder = [];

        return map(range(numItems), (item, index) => {
          startOrder.push(item);
          running++;
          maxRunning = Math.max(maxRunning, running);

          return Promise.delay(Math.round(Math.random() * 10))
            .return(2 * item)
            .then(result => {
              --running;
              return result;
            });
        }).then(result => {
          expect(maxRunning).to.equal(numItems);
          expect(result).to.eql(range(numItems).map(it => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });

      it('should not start new operations after an error has been thrown', done => {
        const numItems = 20;

        let errorThrown = false;
        let callbackCalledAfterError = false;

        map(range(numItems), (item, index) => {
          if (errorThrown) {
            callbackCalledAfterError = true;
          }

          return Promise.delay(Math.round(Math.random() * 10)).then(() => {
            if (index === 10) {
              errorThrown = true;
              throw new Error('fail');
            } else {
              return item;
            }
          });
        })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err.message).to.equal('fail');
            expect(callbackCalledAfterError).to.equal(false);
            done();
          })
          .catch(done);
      });

      it('should only run opt.concurrency operations at a time', () => {
        const concurrency = 4;
        const numItems = 20;

        let running = 0;
        let startOrder = [];

        return map(
          range(numItems),
          (item, index) => {
            startOrder.push(item);
            running++;
            expect(running).to.be.lessThan(concurrency + 1);

            return Promise.delay(Math.round(Math.random() * 10))
              .return(2 * item)
              .then(result => {
                --running;
                return result;
              });
          },
          { concurrency }
        ).then(result => {
          expect(result).to.eql(range(numItems).map(it => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });

      it('should work with synchronous callbacks', () => {
        const concurrency = 4;
        const numItems = 20;
        let startOrder = [];

        return map(
          range(numItems),
          (item, index) => {
            startOrder.push(item);
            return 2 * item;
          },
          { concurrency }
        ).then(result => {
          expect(result).to.eql(range(numItems).map(it => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });
    });
  });
});
