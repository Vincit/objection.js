exports.up = (knex) => {
  return knex.schema.createTable("person", (table) => {
    table.increments("id").primary();
    table.string("name");
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("person");
