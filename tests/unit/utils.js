var util = require('util');
var expect = require('expect.js');
var utils = require('../../lib/utils/classUtils');
var hiddenData = require('../../lib/utils/hiddenData');
var memoize = require('../../lib/utils/decorators/memoize');

describe('utils', function () {

  describe('isSubclassOf', function () {
    function A() {}
    function B() {}
    function C() {}

    util.inherits(B, A);
    util.inherits(C, B);

    it('should return true for subclass constructor', function () {
      expect(utils.isSubclassOf(A, Object)).to.equal(true);
      expect(utils.isSubclassOf(B, A)).to.equal(true);
      expect(utils.isSubclassOf(C, B)).to.equal(true);
      expect(utils.isSubclassOf(C, A)).to.equal(true);
      expect(utils.isSubclassOf(A, B)).to.equal(false);
      expect(utils.isSubclassOf(B, C)).to.equal(false);
      expect(utils.isSubclassOf(A, C)).to.equal(false);
    });

    it ('should return false if one of the inputs is not a constructor', function () {
      expect(utils.isSubclassOf(function () {}, {})).to.equal(false);
      expect(utils.isSubclassOf({}, function () {})).to.equal(false);
    });

  });

  describe('hiddenData', function () {
    var setHiddenData = hiddenData.createSetter('test');
    var getHiddenData = hiddenData.createGetter('test');

    it('should stored data under a non-enumerable $$hiddenData object', function () {
      var obj = {};

      setHiddenData(obj, {a: 'foo'});
      expect(obj.$$hiddenData).to.eql({test: {a: 'foo'}});
      // Should not be enumerable.
      for (var key in obj) {
        expect(key).to.not.equal('$$hiddenData');
      }

      var oldHiddenData = obj.$$hiddenData;
      setHiddenData(obj, {a: 'bar'});
      expect(obj.$$hiddenData).to.eql({test: {a: 'bar'}});
      expect(obj.$$hiddenData === oldHiddenData).to.equal(true);
      expect(getHiddenData(obj)).to.eql({a: 'bar'});
    });

    it('should not inherit hidden data from prototype', function () {
      var obj = {};

      setHiddenData(obj, 10);
      expect(getHiddenData(obj)).to.equal(10);

      var inherited = Object.create(obj);
      expect(getHiddenData(inherited)).to.equal(undefined);
      expect(inherited.$$hiddenData.test).to.equal(10);

      setHiddenData(inherited, 20);
      expect(getHiddenData(obj)).to.equal(10);
      expect(getHiddenData(inherited)).to.equal(20);
    });

    it('should inherit hidden data from prototype if inheritHiddenData is used', function () {
      var obj = {};

      setHiddenData(obj, 10);
      expect(getHiddenData(obj)).to.equal(10);

      var inherited = Object.create(obj);
      hiddenData.inheritHiddenData(obj, inherited);

      expect(getHiddenData(inherited)).to.equal(10);
      expect(inherited.$$hiddenData.test).to.equal(10);

      setHiddenData(inherited, 20);
      expect(getHiddenData(obj)).to.equal(10);
      expect(getHiddenData(inherited)).to.equal(20);
    });

  });

  describe('decorators', function () {

    describe('memoize', function () {

      it('should call method once and cache the value', function () {
        var obj = {};
        applyDecorator(obj, 'test', createIncrementor(), memoize);

        for (var i = 0; i < 10; ++i) {
          expect(obj.test()).to.equal(0);
        }
      });

      it('should not inherit memoized values from prototype', function () {
        var obj = {};
        applyDecorator(obj, 'test', createIncrementor(), memoize);

        for (var i = 0; i < 10; ++i) {
          expect(obj.test()).to.equal(0);
        }

        var inherited = Object.create(obj);

        for (var i = 0; i < 10; ++i) {
          expect(inherited.test()).to.equal(1);
        }
      });

    });

    function createIncrementor() {
      var value = 0;

      return function () {
        return value++;
      };
    }

    function applyDecorator(obj, prop, fun, decorator) {
      var desc = {
        value: fun
      };

      decorator(obj, prop, desc);
      Object.defineProperty(obj, prop, desc);
    }

  });

});
