var expect = require('expect.js');
var moronUtils = require('../../src/moronUtils');

describe('moronUtils', function () {

  describe('isSubclassOf', function () {

    it ('should return false if one of the inputs is not a constructor', function () {
      expect(moronUtils.isSubclassOf(function () {}, {})).to.equal(false);
      expect(moronUtils.isSubclassOf({}, function () {})).to.equal(false);
    });

  });

});
