var _ = require('lodash');
var os = require('os');
var path = require('path');
var Promise = require('bluebird');
var modelTestUtils = require('./utils');

describe('integration tests', function () {

  var testDatabaseConfigs = [{
    client: 'sqlite3',
    connection: {
      filename: path.join(os.tmpdir(), 'objection_test.db')
    }
  }, {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      database: 'objection_test'
    }
  }, {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'travis',
      database: 'objection_test'
    }
  }];

  _.each(testDatabaseConfigs, function (knexConfig) {

    var session = modelTestUtils.initialize({
      knexConfig: knexConfig
    });

    describe(knexConfig.client, function () {
      before(function () {
        return session.createDb();
      });

      after(function () {
        return session.destroy();
      });

      require('./find')(session);
      require('./insert')(session);
      require('./update')(session);
      require('./patch')(session);
      require('./delete')(session);
      require('./relate')(session);
      require('./unrelate')(session);
      require('./eager')(session);
      require('./transactions')(session);

      if (knexConfig.client === 'postgres') {
        require('./json-queries')(session);
      }
    });
  });

});
