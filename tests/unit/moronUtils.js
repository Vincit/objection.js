var util = require('util');
var expect = require('expect.js');
var moronUtils = require('../../src/moronUtils');

describe('moronUtils', function () {

  describe('isSubclassOf', function () {
    function A() {}
    function B() {}
    function C() {}

    util.inherits(B, A);
    util.inherits(C, B);

    it('should return true for subclass constructor', function () {
      expect(moronUtils.isSubclassOf(A, Object)).to.equal(true);
      expect(moronUtils.isSubclassOf(B, A)).to.equal(true);
      expect(moronUtils.isSubclassOf(C, B)).to.equal(true);
      expect(moronUtils.isSubclassOf(C, A)).to.equal(true);
      expect(moronUtils.isSubclassOf(A, B)).to.equal(false);
      expect(moronUtils.isSubclassOf(B, C)).to.equal(false);
      expect(moronUtils.isSubclassOf(A, C)).to.equal(false);
    });

    it ('should return false if one of the inputs is not a constructor', function () {
      expect(moronUtils.isSubclassOf(function () {}, {})).to.equal(false);
      expect(moronUtils.isSubclassOf({}, function () {})).to.equal(false);
    });

  });

});
