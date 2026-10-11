const fs = require('fs');
const os = require('os');
const path = require('path');
const TestSession = require('./../../testUtils/TestSession');

// DATABASES environment variable can contain a comma separated list
// of databases to test.
const DATABASES = (process.env.DATABASES && process.env.DATABASES.split(',')) || [];

// A file per run by default, so that runs at the same time don't share it.
const SQLITE_FILE =
  process.env.OBJECTION_TEST_SQLITE_FILE ||
  path.join(os.tmpdir(), `objection_test_${process.pid}.db`);

// The defaults match the databases in docker-compose.yml. Each setting can be
// overridden with an environment variable, e.g. OBJECTION_TEST_POSTGRES_PORT.
// Empty variables count as unset.
function connection(client, defaults) {
  const settings = ['host', 'port', 'user', 'password', 'database'];
  return Object.fromEntries(
    settings.map((setting) => {
      const name = `OBJECTION_TEST_${client}_${setting}`.toUpperCase();
      return [setting, process.env[name] || defaults[setting]];
    }),
  );
}

describe('integration tests', () => {
  const testDatabaseConfigs = [
    {
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: {
        filename: SQLITE_FILE,
      },
      pool: {
        afterCreate: (conn, cb) => {
          conn.run('PRAGMA foreign_keys = ON', cb);
        },
      },
    },
    {
      client: 'mysql',
      connection: connection('mysql', {
        host: '127.0.0.1',
        port: 33306,
        user: 'objection',
        database: 'objection_test',
      }),
      pool: {
        min: 2,
        max: 10,
        afterCreate: (conn, cb) => {
          conn.query(`SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'`, (err) => {
            cb(err, conn);
          });
        },
      },
    },
    {
      client: 'postgres',
      connection: connection('postgres', {
        host: '127.0.0.1',
        port: 55432,
        user: 'objection',
        database: 'objection_test',
      }),
    },
    {
      client: 'mssql',
      connection: connection('mssql', {
        host: '127.0.0.1',
        port: 51433,
        user: 'sa',
        password: 'Objection1!',
        database: 'objection_test',
      }),
    },
  ].filter((it) => {
    // SQL Server only runs when requested, as its database isn't started by
    // default, see docker-compose.yml.
    return DATABASES.length === 0 ? it.client !== 'mssql' : DATABASES.includes(it.client);
  });

  const sessions = testDatabaseConfigs.map((knexConfig) => {
    const session = new TestSession({
      knexConfig,
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
      require('./manyToManyModify')(session);
      require('./withGraph')(session);
      require('./transactions')(session);
      require('./queryContext')(session);
      require('./compositeKeys')(session);
      require('./crossDb')(session);
      require('./viewsAndAliases')(session);
      require('./schema')(session);
      require('./knexSnakeCase')(session);
      require('./snakeCase')(session);
      require('./knexIdentifierMapping')(session);
      require('./graph/GraphInsert')(session);
      require('./relationModify')(session);
      require('./nonPrimaryKeyRelations')(session);
      require('./staticHooks')(session);
      require('./modifiers')(session);
      require('./toKnexQuery')(session);
      require('./relationOwnerGrouping')(session);

      if (session.isPostgres()) {
        require('./jsonQueries')(session);
        require('./jsonRelations')(session);
      }

      if (session.isMySql()) {
        require('./jsonQueriesMySql')(session);
      }
    });

    return session;
  });

  after(async () => {
    await Promise.all(
      sessions.map((session) => {
        return session.destroy();
      }),
    );

    if (!process.env.OBJECTION_TEST_SQLITE_FILE) {
      await fs.promises.rm(SQLITE_FILE, { force: true });
    }
  });
});
