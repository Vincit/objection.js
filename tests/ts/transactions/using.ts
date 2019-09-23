import { transaction, Transaction } from '../../../';
import { Animal } from '../fixtures/animal';
import { Person } from '../fixtures/person';
import Knex = require('knex');

(async () => {
  const knex = Person.knex();

  try {
    const scrappy = await transaction(knex, async trx => {
      const jennifer = await Person.query(trx).insert({
        firstName: 'Jennifer',
        lastName: 'Lawrence'
      });

      const scrappy = await jennifer.$relatedQuery('pets', trx).insert({ name: 'Scrappy' });

      return scrappy;
    });
  } catch (err) {
    throw err;
  }

  async function insertPersonAndPet(
    personAttrs: Partial<Person>,
    petAttrs: Partial<Animal>,
    trxOrKnex?: Transaction | Knex
  ) {
    const person = await Person.query(trxOrKnex).insert(personAttrs);

    return person.$relatedQuery('pets', trxOrKnex).insert(petAttrs);
  }

  const personAttrs = {};
  const petAttrs = {};

  // All following four ways to call insertPersonAndPet work:

  // 1.
  const trx = await transaction.start(Person.knex());

  await insertPersonAndPet(personAttrs, petAttrs, trx);
  await trx.commit();

  // 2.
  await transaction(Person.knex(), async trx => {
    await insertPersonAndPet(personAttrs, petAttrs, trx);
  });

  // 3.
  await insertPersonAndPet(personAttrs, petAttrs, Person.knex());

  // 4.
  await insertPersonAndPet(personAttrs, petAttrs);

  try {
    const scrappy = await transaction(Person, Animal, async (Person, Animal) => {
      // Person and Animal inside this function are bound to a newly
      // created transaction. The Person and Animal outside this function
      // are not! Even if you do `require('./models/Person')` inside this
      // function and start a query using the required `Person` it will
      // NOT take part in the transaction. Only the actual objects passed
      // to this function are bound to the transaction.

      await Person.query().insert({ firstName: 'Jennifer', lastName: 'Lawrence' });

      return Animal.query().insert({ name: 'Scrappy' });
    });
  } catch (err) {
    console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
  }

  try {
    const scrappy = await transaction(Person, async Person => {
      const jennifer = await Person.query().insert({ firstName: 'Jennifer', lastName: 'Lawrence' });

      // This creates a query using the `Animal` model class but we
      // don't need to give `Animal` as one of the arguments to the
      // transaction function because `jennifer` is an instance of
      // the `Person` that is bound to a transaction.
      return jennifer.$relatedQuery('pets').insert({ name: 'Scrappy' });
    });
  } catch (err) {
    console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
  }

  await transaction(Person, async BoundPerson => {
    // This will be executed inside the transaction.
    const jennifer = await BoundPerson.query().insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    // OH NO! This query is executed outside the transaction
    // since the `Animal` class is not bound to the transaction.
    await Animal.query().insert({ name: 'Scrappy' });

    // OH NO! This query is executed outside the transaction
    // since the `Person` class is not bound to the transaction.
    // BoundPerson !== Person.
    await Person.query().insert({ firstName: 'Bradley' });
  });

  await transaction(Person, async (Person, trx) => {
    // `trx` is the knex transaction object.
    // It can be passed to `transacting`, `query` etc.
    // methods, or used as a knex query builder.

    if (!trx) {
      throw new Error();
    }

    const jennifer = await trx('persons').insert({ firstName: 'Jennifer', lastName: 'Lawrence' });
    const scrappy = await Animal.query(trx).insert({ name: 'Scrappy' });
    const fluffy = await Animal.query()
      .transacting(trx)
      .insert({ name: 'Fluffy' });

    return {
      jennifer,
      scrappy,
      fluffy
    };
  });
})();
