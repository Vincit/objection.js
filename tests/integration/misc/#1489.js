const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe('relation $beforeInsert not called when insertGraph is used #1627', () => {
    let knex = session.knex;
    let User;
    let Role;

    before(() => {
      const { knex } = session;

      return Promise.resolve()
        .then(() => knex.schema.dropTableIfExists('users'))
        .then(() => knex.schema.dropTableIfExists('roles'))
        .then(() => {
          return knex.schema
            .createTable('users', table => {
              table.increments('id');
              table.string('username');
            })
            .createTable('roles', table => {
              table.increments('id');
              table.string('role');
              table
                .integer('userId')
                .unsigned()
                .references('users.id')
                .notNullable()
                .index();
            });
        });
    });

    after(async () => {
      await knex.schema.dropTableIfExists('roles');
      await knex.schema.dropTableIfExists('users');
    });

    beforeEach(() => {
      Role = class Role extends Model {
        static get tableName() {
          return 'roles';
        }
      };

      User = class User extends Model {
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
              },
              beforeInsert(model) {
                model.$relationBeforeInsertCalled = (model.$relationBeforeInsertCalled || 0) + 1;
              }
            }
          };
        }
      };

      User.knex(knex);
      Role.knex(knex);
    });

    it('test', async () => {
      const user = await User.query().insert({
        username: 'user1'
      });

      const role = await user.$relatedQuery('roles').insertGraph({
        role: 'admin'
      });

      expect(role.$relationBeforeInsertCalled).to.equal(1);
    });
  });
};
