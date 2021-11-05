const knex = require('knex');

// DATABASES environment variable can contain a comma separated list
// of databases to setup. Defaults to all databases.
const DATABASES = (process.env.DATABASES && process.env.DATABASES.split(',')) || [
  'postgres',
  'mysql',
];

async function setup() {
  if (DATABASES.includes('postgres')) {
    const postgres = await createKnex({
      client: 'postgres',

      connection: {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
      },
    });

    await postgres.raw('DROP DATABASE IF EXISTS objection_test');
    await postgres.raw('DROP USER IF EXISTS objection');
    await postgres.raw('CREATE USER objection SUPERUSER');
    await postgres.raw('CREATE DATABASE objection_test');

    await postgres.destroy();
  }

  if (DATABASES.includes('mysql')) {
    const mysql = await createKnex({
      client: 'mysql',

      connection: {
        user: 'root',
        host: 'localhost',
      },
    });

    await mysql.raw('DROP DATABASE IF EXISTS objection_test');
    await mysql.raw('DROP USER IF EXISTS objection');
    await mysql.raw('CREATE USER objection');
    await mysql.raw('GRANT ALL PRIVILEGES ON *.* TO objection');
    await mysql.raw('CREATE DATABASE objection_test');

    await mysql.destroy();
  }
}

async function createKnex(config) {
  const startTime = new Date();

  while (true) {
    try {
      const knexInstance = knex(config);
      await knexInstance.raw('SELECT 1');
      return knexInstance;
    } catch (err) {
      const now = new Date();

      if (now.getTime() - startTime.getTime() > 60000) {
        process.exit(1);
      } else {
        console.log(`failed to connect to ${config.client}. Trying again soon`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

setup();
