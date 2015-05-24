var _ = require('lodash');
var os = require('os');
var path = require('path');
var modelTestUtils = require('./utils');

describe('integration tests', function () {

  _.each([{
    client: 'sqlite3',
    connection: {
      filename: path.join(os.tmpdir(), 'test.db')
    }
  }], function (knexConfig) {
    var session = modelTestUtils.initialize({
      knexConfig: knexConfig
    });

    before(function () {
      return session.createDb();
    });

    after(function () {
      return session.destroy();
    });

    describe(knexConfig.client, function () {

      require('./find')(session);
      require('./insert')(session);
      require('./eager')(session);

    });
  });

});
