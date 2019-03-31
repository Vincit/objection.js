const Knex = require('knex');
const knexConfig = require('./knexfile');

const { Model } = require('objection');
const { Person } = require('./models/Person');

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to the knex instance.
Model.knex(knex);

async function main() {
  // Delete all persons from the db.
  await Person.query().delete();

  // Insert one row to the database.
  await Person.query().insert({
    firstName: 'Jennifer',
    lastName: 'Aniston'
  });

  // Read all rows from the db.
  const people = await Person.query();

  console.log(people);
}

main()
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });
