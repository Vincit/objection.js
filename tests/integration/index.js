'use strict';

var _ = require('lodash');
var os = require('os');
var path = require('path');
var modelTestUtils = require('./utils');

describe('integration tests', function () {

  var testDatabaseConfigs = [{
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: path.join(os.tmpdir(), 'objection_test.db')
    }
  }, {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'travis',
      database: 'objection_test'
    }
  }, {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
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

      require('./misc')(session);
      require('./find')(session);
      require('./insert')(session);
      require('./insertGraph')(session);
      require('./update')(session);
      require('./patch')(session);
      require('./delete')(session);
      require('./relate')(session);
      require('./unrelate')(session);
      require('./eager')(session);
      require('./transactions')(session);
      require('./queryContext')(session);
      require('./compositeKeys')(session);

      if (knexConfig.client === 'postgres') {
        require('./jsonQueries')(session);
      }
    });
  });

});
