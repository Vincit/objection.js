exports.up = knex => {
  return knex.schema
    .createTable('persons', table => {
      table.increments('id').primary();
      table
        .integer('parentId')
        .unsigned()
        .references('id')
        .inTable('persons');
      table.string('firstName');
      table.string('lastName');
      table.integer('age');
      table.json('address');
    })
    .createTable('movies', table => {
      table.increments('id').primary();
      table.string('name');
    })
    .createTable('animals', table => {
      table.increments('id').primary();
      table
        .integer('ownerId')
        .unsigned()
        .references('id')
        .inTable('persons');
      table.string('name');
      table.string('species');
    })
    .createTable('persons_movies', table => {
      table.increments('id').primary();
      table
        .integer('personId')
        .unsigned()
        .references('id')
        .inTable('persons')
        .onDelete('CASCADE');
      table
        .integer('movieId')
        .unsigned()
        .references('id')
        .inTable('movies')
        .onDelete('CASCADE');
    });
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('persons_movies')
    .dropTableIfExists('animals')
    .dropTableIfExists('movies')
    .dropTableIfExists('persons');
};
