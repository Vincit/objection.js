const { resolveModel } = require('../../../lib/utils/resolveModel');
const expect = require('expect.js');
const path = require('path');

describe('resolveModule', function() {
  it("should throw a correct error when resolving a module which has a some error in it's body", () => {
    // see GH issue #962
    expect(() => {
      resolveModel(path.resolve(__dirname, '../relations/files/ModelWithARandomError.js'));
    }).throwError(/some random error/);
  });
});
