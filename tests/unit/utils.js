var util = require('util');
var expect = require('expect.js');
var utils = require('../../lib/utils/classUtils');
var hiddenData = require('../../lib/utils/hiddenData');
var memoize = require('../../lib/utils/decorators/memoize').default;

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
    var setHiddenData = hiddenData.createHiddenDataSetter('test');
    var getHiddenData = hiddenData.createHiddenDataGetter('test');


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
