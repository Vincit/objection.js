exports.up = knex => {
  return knex.schema
    .createTable('Person', table => {
      table.increments('id').primary();
      table
        .integer('parentId')
        .unsigned()
        .references('id')
        .inTable('Person');
      table.string('firstName');
      table.string('lastName');
      table.integer('age');
      table.json('address');
      table.bigInteger('createdAt').notNullable();
      table.bigInteger('updatedAt').notNullable();
    })
    .createTable('Movie', table => {
      table.increments('id').primary();
      table.string('name');
    })
    .createTable('Animal', table => {
      table.increments('id').primary();
      table
        .integer('ownerId')
        .unsigned()
        .references('id')
        .inTable('Person');
      table.string('name');
      table.string('species');
    })
    .createTable('Person_Movie', table => {
      table.increments('id').primary();
      table
        .integer('personId')
        .unsigned()
        .references('id')
        .inTable('Person')
        .onDelete('CASCADE');
      table
        .integer('movieId')
        .unsigned()
        .references('id')
        .inTable('Movie')
        .onDelete('CASCADE');
    });
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('Person_Movie')
    .dropTableIfExists('Animal')
    .dropTableIfExists('Movie')
    .dropTableIfExists('Person');
};
