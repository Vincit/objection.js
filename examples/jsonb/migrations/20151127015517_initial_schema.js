exports.up = knex => {
  return knex.schema
    .createTable('Place', table => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
    })
    .raw('CREATE INDEX on ?? USING GIN (?? jsonb_path_ops)', ['Place', 'details'])
    .createTable('Hero', table => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
      table
        .integer('homeId')
        .unsigned()
        .references('id')
        .inTable('Place');
    })
    .raw('CREATE INDEX on ?? USING GIN (??)', ['Hero', 'details'])
    .raw("CREATE INDEX on ?? ((??#>>'{type}'))", ['Hero', 'details']);
};

exports.down = knex => {
  return knex.schema.dropTableIfExists('Hero').dropTableIfExists('Place');
};
