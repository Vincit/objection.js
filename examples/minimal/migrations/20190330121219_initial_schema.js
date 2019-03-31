exports.up = knex => {
  return knex.schema.createTable('persons', table => {
    table.increments('id').primary();
    table.string('firstName');
    table.string('lastName');
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists('persons');
};
