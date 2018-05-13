const knex = require('knex');

const postgres = knex({
  client: 'postgres',

  connection: {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres'
  }
});

const mysql = knex({
  client: 'mysql',

  connection: {
    user: 'root',
    host: 'localhost'
  }
});

Promise.all([
  postgres.raw('CREATE USER objection SUPERUSER'),
  postgres.raw('CREATE DATABASE objection_test'),

  mysql.raw('CREATE USER objection'),
  mysql.raw('GRANT ALL PRIVILEGES ON *.* TO objection'),
  mysql.raw('CREATE DATABASE objection_test')
]).then(() => {
  Promise.all([
    postgres.destroy(),
    mysql.destroy()
  ]);
});