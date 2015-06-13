var _ = require('lodash');
var os = require('os');
var path = require('path');
var modelTestUtils = require('./utils');

describe('integration tests', function () {

  _.each([{
    client: 'sqlite3',
    connection: {
      filename: path.join(os.tmpdir(), 'moron_test.db')
    }
  }, {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      database: 'moron_test',
    }
  }, {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'travis',
      database: 'moron_test'
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
      require('./update')(session);
      require('./patch')(session);
      require('./delete')(session);
      require('./relate')(session);
      require('./unrelate')(session);
      require('./eager')(session);
      require('./transactions')(session);

    });
  });

});
