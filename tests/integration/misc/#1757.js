const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe('skipFetched not working for nested relation #1757', () => {
    let knex = session.knex;

    class Person extends Model {
      static get tableName() {
        return 'Person';
      }

      static get relationMappings() {
        return {
          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'Person.id',
              to: 'Animal.ownerId'
            }
          },

          children: {
            relation: Model.HasManyRelation,
            modelClass: Person,
            join: {
              from: 'Person.id',
              to: 'Person.parentId'
            }
          },

          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'Person.parentId',
              to: 'Person.id'
            }
          }
        };
      }
    }

    class Animal extends Model {
      static get tableName() {
        return 'Animal';
      }

      static get relationMappings() {
        return {
          owner: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'Animal.ownerId',
              to: 'Person.id'
            }
          }
        };
      }
    }

    before(async () => {
      const { knex } = session;

      await knex.schema.dropTableIfExists('Animal');
      await knex.schema.dropTableIfExists('Person');

      await knex.schema
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
        });
    });

    after(async () => {
      await knex.schema.dropTableIfExists('Animal');
      await knex.schema.dropTableIfExists('Person');
    });

    it('test', async () => {
      await Person.query(knex).insertGraph({
        firstName: 'JL',
        lastName: 'Mom',
        children: [
          {
            firstName: 'Jennifer',
            lastName: 'Lawrence',

            pets: [
              {
                name: 'Doggo',
                species: 'dog'
              }
            ]
          }
        ]
      });

      let doggo = await Animal.query(knex).findOne({ name: 'Doggo' });

      await doggo.$fetchGraph('owner', { transaction: knex });
      await doggo.$fetchGraph('owner.parent', { transaction: knex });

      expect(doggo.owner.parent.firstName).to.equal('JL');

      // Reload doggo
      doggo = await Animal.query(knex).findOne({ name: 'Doggo' });

      await doggo.$fetchGraph('owner', { skipFetched: true, transaction: knex });
      await doggo.$fetchGraph('owner.parent', { skipFetched: true, transaction: knex });

      expect(doggo.owner.parent.firstName).to.equal('JL');
    });
  });
};
