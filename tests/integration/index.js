'use strict';

const os = require('os');
const path = require('path');
const TestSession = require('./../../testUtils/TestSession');

describe('integration tests', () => {

  const testDatabaseConfigs = [{
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: path.join(os.tmpdir(), 'objection_test.db')
    }
  }, {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'objection',
      database: 'objection_test'
    }
  }, {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      user: 'objection',
      database: 'objection_test'
    }
  }];

  testDatabaseConfigs.forEach(knexConfig => {

    const session = new TestSession({
      knexConfig: knexConfig
    });

    describe(knexConfig.client, () => {

      before(() =>  {
        return session.createDb();
      });

      after(() => {
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
      require('./crossDb')(session);

      if (knexConfig.client === 'postgres') {
        require('./jsonQueries')(session);
      }
    });
  });

});
