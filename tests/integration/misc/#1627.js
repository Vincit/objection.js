const crypto = require('crypto');
const { expect } = require('chai');
const { Model, snakeCaseMappers } = require('../../../');

module.exports = session => {
  if (!session.isMySql()) {
    return;
  }

  describe('withGraphFetched and binary relation column #1627', () => {
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
              table.binary('id', 16).primary();
            })
            .createTable('roles', table => {
              table.binary('id', 16).primary();
              table
                .binary('user_id', 16)
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

        static get columnNameMappers() {
          return snakeCaseMappers();
        }
      };

      User = class User extends Model {
        static get tableName() {
          return 'users';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get relationMappings() {
          return {
            roles: {
              relation: Model.HasManyRelation,
              modelClass: Role,
              join: {
                from: 'users.id',
                to: 'roles.user_id'
              }
            }
          };
        }
      };

      User.knex(knex);
      Role.knex(knex);
    });

    it('test', async () => {
      const inserted = await User.query().insertGraph({
        id: crypto.randomBytes(16),

        roles: [{ id: crypto.randomBytes(16) }]
      });

      const result = await User.query()
        .findById(inserted.id)
        .withGraphFetched('roles');

      expect(result).to.eql(inserted);
    });
    it('should fetch multiple relations correctly', async () => {
      const ids = [
        Buffer.from('00000000000000000000000000007AAC', 'hex'),
        Buffer.from('00000000000000000000000000007AAD', 'hex'),
        Buffer.from('00000000000000000000000000007AAE', 'hex')
      ];
      const graph = ids.map(id => ({
        id,
        roles: [{ id: crypto.randomBytes(16) }]
      }));
      const inserted = await User.query().insertGraph(graph);
      const result = await User.query()
        .findByIds(ids)
        .withGraphFetched('roles');
      expect(result).to.eql(inserted);
    });
  });
};
