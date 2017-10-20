const Knex = require('knex');
const objection = require('objection');
const knexConfig = require('../knexfile');
const knex = Knex(knexConfig.development);
objection.Model.knex(knex);
knex.migrate.latest().then(() => console.log('Migrated.'));

// wait

const Person = require('./lib/models/Person').default;

Person.query()
  .insertGraph({
    firstName: 'Testy',
    lastName: 'McTesterson',
    pets: [
      {
        name: 'Fluffy McTesterson'
      }
    ]
  })
  .then(result => {
    console.log('InsertGraph done:');
    console.dir(result);
  });

Person.query()
  .where('firstName', 'Testy')
  .then(result => {
    console.log('where found:');
    console.dir(result);
  });
