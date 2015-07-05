var util = require('util');
var expect = require('expect.js');
var utils = require('../../src/utils');

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

});
