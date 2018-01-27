const util = require('util');
const expect = require('expect.js');
const utils = require('../../lib/utils/classUtils');
const compose = require('../../lib/utils/mixin').compose;
const mixin = require('../../lib/utils/mixin').mixin;
const snakeCase = require('../../lib/utils/identifierMapping').snakeCase;
const camelCase = require('../../lib/utils/identifierMapping').camelCase;
const snakeCaseKeys = require('../../lib/utils/identifierMapping').snakeCaseKeys;
const camelCaseKeys = require('../../lib/utils/identifierMapping').camelCaseKeys;

describe('utils', () => {
  describe('isSubclassOf', () => {
    function A() {}
    function B() {}
    function C() {}

    util.inherits(B, A);
    util.inherits(C, B);

    it('should return true for subclass constructor', () => {
      expect(utils.isSubclassOf(A, Object)).to.equal(true);
      expect(utils.isSubclassOf(B, A)).to.equal(true);
      expect(utils.isSubclassOf(C, B)).to.equal(true);
      expect(utils.isSubclassOf(C, A)).to.equal(true);
      expect(utils.isSubclassOf(A, B)).to.equal(false);
      expect(utils.isSubclassOf(B, C)).to.equal(false);
      expect(utils.isSubclassOf(A, C)).to.equal(false);
    });

    it('should return false if one of the inputs is not a constructor', () => {
      expect(utils.isSubclassOf(function() {}, {})).to.equal(false);
      expect(utils.isSubclassOf({}, function() {})).to.equal(false);
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

      const m3 = compose(m1, m2);
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

      function test(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel)).to.equal(snake);
          expect(snakeCaseKeys({ [camel]: 'foo' })).to.eql({ [snake]: 'foo' });

          expect(camelCase(snakeCase(camel))).to.equal(backToCamel);
          expect(camelCaseKeys(snakeCaseKeys({ [camel]: 'foo' }))).to.eql({ [backToCamel]: 'foo' });
        });
      }
    });
  });
});
