
exports.up = function (knex) {
  return knex.schema
    .createTable('Person', function (table) {
      table.bigincrements('id').primary();
      table.biginteger('parentId').unsigned().references('id').inTable('Person');
      table.string('firstName');
      table.string('lastName');
      table.integer('age');
      table.json('address');
    })
    .createTable('Movie', function (table) {
      table.bigincrements('id').primary();
      table.string('name');
    })
    .createTable('Animal', function (table) {
      table.bigincrements('id').primary();
      table.biginteger('ownerId').unsigned().references('id').inTable('Person');
      table.string('name');
      table.string('species');
    })
    .createTable('Person_Movie', function (table) {
      table.bigincrements('id').primary();
      table.biginteger('personId').unsigned().references('id').inTable('Person').onDelete('CASCADE');
      table.biginteger('movieId').unsigned().references('id').inTable('Movie').onDelete('CASCADE');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('Person_Movie')
    .dropTableIfExists('Animal')
    .dropTableIfExists('Movie')
    .dropTableIfExists('Person');
};
