const os = require('os');
const path = require('path');
const TestSession = require('./../../testUtils/TestSession');
const Bluebird = require('bluebird');

// Helps debugging.
Bluebird.longStackTraces();

describe('integration tests', () => {
  const testDatabaseConfigs = [
    {
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: {
        filename: path.join(os.tmpdir(), 'objection_test.db')
      }
    },
    {
      client: 'mysql',
      connection: {
        host: '127.0.0.1',
        user: 'objection',
        database: 'objection_test'
      },
      pool: {
        min: 2,
        max: 50,
        afterCreate: (conn, cb) => {
          conn.query(`SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'`, err => {
            cb(err, conn);
          });
        }
      }
    },
    {
      client: 'postgres',
      connection: {
        host: '127.0.0.1',
        user: 'objection',
        database: 'objection_test'
      }
    }
  ];

  const sessions = testDatabaseConfigs.map(knexConfig => {
    const session = new TestSession({
      knexConfig
    });

    describe(knexConfig.client, () => {
      before(() => {
        return session.createDb();
      });

      require('./misc')(session);
      require('./find')(session);
      require('./insert')(session);
      require('./insertGraph')(session);
      require('./upsertGraph')(session);
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
      require('./viewsAndAliases')(session);
      require('./schema')(session);
      require('./knexSnakeCase')(session);
      require('./knexIdentifierMapping')(session);

      if (session.isPostgres()) {
        require('./jsonQueries')(session);
        require('./jsonRelations')(session);
      }
    });

    return session;
  });

  after(() => {
    return Promise.all(
      sessions.map(session => {
        return session.destroy();
      })
    );
  });
});
