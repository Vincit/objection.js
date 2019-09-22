const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = session => {
  const { knex } = session;

  describe('#ref attack', () => {
    class Role extends Model {
      static get tableName() {
        return 'roles';
      }
    }

    class User extends Model {
      static get tableName() {
        return 'users';
      }

      static get relationMappings() {
        return {
          roles: {
            relation: Model.HasManyRelation,
            modelClass: Role,
            join: {
              from: 'users.id',
              to: 'roles.userId'
            }
          }
        };
      }
    }

    before(() => {
      return knex.schema
        .dropTableIfExists('users')
        .dropTableIfExists('roles')
        .createTable('users', table => {
          table.increments('id').primary();
          table.string('firstName');
          table.string('lastName');
          table.string('passwordHash');
        })
        .createTable('roles', table => {
          table.increments('id').primary();
          table.string('name');
          table.integer('userId');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('users').dropTableIfExists('roles');
    });

    beforeEach(async () => {
      await User.query(knex).delete();
      await User.query(knex).insertGraph([
        {
          id: 1,
          firstName: 'dork 1',
          passwordHash: 'secret'
        },
        {
          id: 2,
          firstName: 'dork 2'
        }
      ]);
    });

    it('#ref{} should not be able to dig out secrets from db', async () => {
      const attackGraph = [
        {
          id: 1,
          firstName: 'updated dork',
          '#id': 'id'
        },
        {
          id: 2,
          firstName: '#ref{id.passwordHash}',
          lastName: 'something to trigger an update',

          roles: [
            {
              name: '#ref{id.passwordHash}'
            }
          ]
        },
        // This gets inserted.
        {
          id: 3,
          firstName: '#ref{id.passwordHash}',

          roles: [
            {
              name: '#ref{id.passwordHash}'
            }
          ]
        }
      ];

      await User.query(knex)
        .returning('*')
        .upsertGraph(attackGraph, {
          allowRefs: true,
          insertMissing: true
        });

      const user2 = await User.query(knex)
        .findById(2)
        .withGraphFetched('roles');

      const user3 = await User.query(knex)
        .findById(3)
        .withGraphFetched('roles');

      expect(user2.firstName).to.equal('dork 2');
      expect(user2.roles[0].name).to.equal(null);
      expect(user3.firstName).to.equal(null);
      expect(user3.roles[0].name).to.equal(null);
    });
  });
};
