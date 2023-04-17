const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = (session) => {
  describe(`patch() breaks if useDefineForClassField is enabled in tsconfig #2105`, () => {
    let knex = session.knex;
    let Person;

    before(() => {
      return knex.schema.dropTableIfExists('persons').createTable('persons', (table) => {
        table.increments('id').primary();
        table.string('firstName');
        table.string('lastName');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('persons');
    });

    before(() => {
      Person = class Person extends Model {
        constructor() {
          super(...arguments);
          Object.defineProperty(this, 'firstName', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0,
          });
          Object.defineProperty(this, 'lastName', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0,
          });
        }

        static get tableName() {
          return 'persons';
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => Person.query().delete());
    beforeEach(() => {
      return Person.query().insert({ firstName: 'John', lastName: 'Doe' });
    });

    it('test', () => {
      return Person.query()
        .where('lastName', 'Doe')
        .first()
        .then((person) => {
          return person
            .$query()
            .patch({ firstName: 'Jane' })
            .then((count) => person);
        })
        .then((person) => {
          expect(person.firstName).to.eql('Jane');
          expect(person.lastName).to.eql('Doe');
        });
    });
  });
};
