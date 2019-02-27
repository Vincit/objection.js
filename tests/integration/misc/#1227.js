const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = session => {
  describe(`primary key to primary key relations with upsertGraph #1227`, () => {
    let knex = session.knex;
    let Person, Animal;

    before(() => {
      return knex.schema
        .dropTableIfExists('cousins')
        .dropTableIfExists('persons')
        .createTable('persons', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('pets', table => {
          table
            .integer('id')
            .unsigned()
            .primary()
            .references('persons.id');
          table.string('name');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('pets').dropTableIfExists('persons');
    });

    beforeEach(() => {
      Animal = class Animal extends Model {
        static get tableName() {
          return 'pets';
        }
      };

      Animal.knex(knex);
    });

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'persons';
        }

        static get relationMappings() {
          return {
            pet: {
              modelClass: Animal,
              relation: Model.HasOneRelation,
              join: {
                from: 'persons.id',
                to: 'pets.id'
              }
            }
          };
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => Animal.query().delete());
    beforeEach(() => Person.query().delete());

    it('should be able to insert a primary key to primary key hasOne relation', () => {
      return Person.query()
        .upsertGraph({
          name: 'person',
          pet: {
            name: 'pet'
          }
        })
        .then(person => {
          return Person.query()
            .findById(person.id)
            .eager('pet');
        })
        .then(person => {
          expect(person).to.containSubset({
            name: 'person',
            pet: {
              name: 'pet'
            }
          });
        });
    });
  });
};
