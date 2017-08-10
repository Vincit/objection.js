'use strict';

const util = require('util');
const expect = require('expect.js');
const utils = require('../../lib/utils/classUtils');
const compose = require('../../lib/utils/mixin').compose;
const mixin = require('../../lib/utils/mixin').mixin;

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

    it ('should return false if one of the inputs is not a constructor', () => {
      expect(utils.isSubclassOf(function () {}, {})).to.equal(false);
      expect(utils.isSubclassOf({}, function () {})).to.equal(false);
    });

  });

  describe('mixin', () => {

    it('should mixin rest of the arguments to the first argument', () => {
      class X {}

      const m1 = C => class extends C {
        f() {
          return 1;
        }
      };

      const m2 = C => class extends C {
        f() {
          return super.f() + 1;
        }
      };
      
      const Y = mixin(X, m1, m2);
      const y = new Y();

      expect(y.f()).to.equal(2);

      const Z = mixin(X, [m1, m2]);
      const z = new Z();

      expect(z.f()).to.equal(2);
    });

  });

  describe('compose', () => {

    it('should compose multiple functions', () => {
      class X {}

      const m1 = C => class extends C {
        f() {
          return 1;
        }
      };

      const m2 = C => class extends C {
        f() {
          return super.f() + 1;
        }
      };

      const m3 = compose(m1, m2);
      const m4 = compose([m1, m2]);
      
      const Y = m3(X);
      const y = new Y();

      expect(y.f()).to.equal(2);

      const Z = m4(X);
      const z = new Z();

      expect(z.f()).to.equal(2);
    });

  });

});
