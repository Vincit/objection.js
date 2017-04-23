'use strict';

const util = require('util');
const expect = require('expect.js');
const utils = require('../../lib/utils/classUtils');
const hiddenData = require('../../lib/utils/hiddenData');
const memoize = require('../../lib/utils/decorators/memoize');

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

  describe('hiddenData', () => {
    let setHiddenData = hiddenData.createSetter('test');
    let getHiddenData = hiddenData.createGetter('test');

    it('should stored data under a non-enumerable $$hiddenData object', () => {
      let obj = {};

      setHiddenData(obj, {a: 'foo'});
      expect(obj.$$hiddenData).to.eql({test: {a: 'foo'}});
      // Should not be enumerable.
      for (let key in obj) {
        expect(key).to.not.equal('$$hiddenData');
      }

      let oldHiddenData = obj.$$hiddenData;
      setHiddenData(obj, {a: 'bar'});
      expect(obj.$$hiddenData).to.eql({test: {a: 'bar'}});
      expect(obj.$$hiddenData === oldHiddenData).to.equal(true);
      expect(getHiddenData(obj)).to.eql({a: 'bar'});
    });

    it('should not inherit hidden data from prototype', () => {
      let obj = {};

      setHiddenData(obj, 10);
      expect(getHiddenData(obj)).to.equal(10);

      let inherited = Object.create(obj);
      expect(getHiddenData(inherited)).to.equal(undefined);
      expect(inherited.$$hiddenData.test).to.equal(10);

      setHiddenData(inherited, 20);
      expect(getHiddenData(obj)).to.equal(10);
      expect(getHiddenData(inherited)).to.equal(20);
    });

    it('should inherit hidden data from prototype if inheritHiddenData is used', () => {
      let obj = {};

      setHiddenData(obj, 10);
      expect(getHiddenData(obj)).to.equal(10);

      let inherited = Object.create(obj);
      hiddenData.inheritHiddenData(obj, inherited);

      expect(getHiddenData(inherited)).to.equal(10);
      expect(inherited.$$hiddenData.test).to.equal(10);

      setHiddenData(inherited, 20);
      expect(getHiddenData(obj)).to.equal(10);
      expect(getHiddenData(inherited)).to.equal(20);
    });

  });

  describe('decorators', () => {

    describe('memoize', () => {

      it('should call method once and cache the value', () => {
        let obj = {};
        applyDecorator(obj, 'test', createIncrementor(), memoize);

        for (let i = 0; i < 10; ++i) {
          expect(obj.test()).to.equal(0);
        }
      });

      it('should not inherit memoized values from prototype', () => {
        let obj = {};
        applyDecorator(obj, 'test', createIncrementor(), memoize);

        for (let i = 0; i < 10; ++i) {
          expect(obj.test()).to.equal(0);
        }

        let inherited = Object.create(obj);

        for (let i = 0; i < 10; ++i) {
          expect(inherited.test()).to.equal(1);
        }
      });

    });

    function createIncrementor() {
      let value = 0;

      return () => {
        return value++;
      };
    }

    function applyDecorator(obj, prop, fun, decorator) {
      let desc = {
        value: fun
      };

      decorator(obj, prop, desc);
      Object.defineProperty(obj, prop, desc);
    }

  });

});
