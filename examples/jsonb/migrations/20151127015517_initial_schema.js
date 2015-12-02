
exports.up = function (knex) {
  return knex.schema
    .createTable('Place', function (table) {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
    })
    .createTable('Hero', function (table) {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
      table.integer('homeId').unsigned().references('id').inTable('Place');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('Hero')
    .dropTableIfExists('Place');
};
