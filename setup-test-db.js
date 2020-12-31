const knex = require('knex');

// DATABASES environment variable can contain a comma separated list
// of databases to setup.
const DATABASES = (process.env.DATABASES && process.env.DATABASES.split(',')) || [];

const knexes = [];
const commands = [];

if (DATABASES.length === 0 || DATABASES.includes('postgres')) {
  const postgres = knex({
    client: 'postgres',

    connection: {
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
    },
  });

  knexes.push(postgres);
  commands.push(
    postgres.raw('DROP DATABASE IF EXISTS objection_test'),
    postgres.raw('DROP USER IF EXISTS objection'),
    postgres.raw('CREATE USER objection SUPERUSER'),
    postgres.raw('CREATE DATABASE objection_test')
  );
}

if (DATABASES.length === 0 || DATABASES.includes('mysql')) {
  const mysql = knex({
    client: 'mysql',

    connection: {
      user: 'root',
      host: 'localhost',
    },
  });

  knexes.push(mysql);
  commands.push(
    mysql.raw('DROP DATABASE IF EXISTS objection_test'),
    mysql.raw('DROP USER IF EXISTS objection'),
    mysql.raw('CREATE USER objection'),
    mysql.raw('GRANT ALL PRIVILEGES ON *.* TO objection'),
    mysql.raw('CREATE DATABASE objection_test')
  );
}

commands
  .reduce((promise, query) => {
    return promise.then(() => query);
  }, Promise.resolve())
  .then(() => {
    return Promise.all(knexes.map((it) => it.destroy()));
  });
