const Knex = require('knex');
const { expect } = require('chai');
const { Model, knexSnakeCaseMappers } = require('../../../');
const { resetWarnings } = require('../../../lib/utils/warnings');

module.exports = (session) => {
  describe('warn when fetched related models are missing join properties #2258', () => {
    let knex;
    let warnings;
    let originalWarn;

    class Registration extends Model {
      static get tableName() {
        return 'issue_2258_registration';
      }
    }

    class Role extends Model {
      static get tableName() {
        return 'issue_2258_role';
      }
    }

    // Only keeps the known columns, which also removes the owner join column
    // selected from the join table.
    class StrictRole extends Role {
      $parseDatabaseJson(json) {
        const { id, name } = super.$parseDatabaseJson(json);
        return { id, name };
      }
    }

    const rolesRelation = (modelClass) => ({
      relation: Model.ManyToManyRelation,
      modelClass,
      join: {
        from: 'issue_2258_user.id',
        through: {
          from: 'issue_2258_user_role.userId',
          to: 'issue_2258_user_role.roleId',
        },
        to: 'issue_2258_role.id',
      },
    });

    class User extends Model {
      static get tableName() {
        return 'issue_2258_user';
      }

      static get relationMappings() {
        return {
          // snake_case join columns don't match the camelCase properties
          // produced by `knexSnakeCaseMappers`.
          snakeRegistrations: {
            relation: Model.HasManyRelation,
            modelClass: Registration,
            join: {
              from: 'issue_2258_user.id',
              to: 'issue_2258_registration.user_id',
            },
          },

          camelRegistrations: {
            relation: Model.HasManyRelation,
            modelClass: Registration,
            join: {
              from: 'issue_2258_user.id',
              to: 'issue_2258_registration.userId',
            },
          },

          roles: rolesRelation(Role),
          strictRoles: rolesRelation(StrictRole),
        };
      }
    }

    before(async () => {
      knex = Knex({ ...session.opt.knexConfig, ...knexSnakeCaseMappers() });

      await session.knex.schema
        .dropTableIfExists('issue_2258_user_role')
        .dropTableIfExists('issue_2258_role')
        .dropTableIfExists('issue_2258_registration')
        .dropTableIfExists('issue_2258_user')
        .createTable('issue_2258_user', (t) => {
          t.integer('id').primary();
        })
        .createTable('issue_2258_registration', (t) => {
          t.integer('id').primary();
          t.integer('user_id');
        })
        .createTable('issue_2258_role', (t) => {
          t.integer('id').primary();
          t.string('name');
        })
        .createTable('issue_2258_user_role', (t) => {
          t.integer('user_id');
          t.integer('role_id');
        });

      await session.knex('issue_2258_user').insert({ id: 1 });
      await session.knex('issue_2258_registration').insert({ id: 1, user_id: 1 });
      await session.knex('issue_2258_role').insert({ id: 1, name: 'admin' });
      await session.knex('issue_2258_user_role').insert({ user_id: 1, role_id: 1 });
    });

    after(async () => {
      await session.knex.schema
        .dropTableIfExists('issue_2258_user_role')
        .dropTableIfExists('issue_2258_role')
        .dropTableIfExists('issue_2258_registration')
        .dropTableIfExists('issue_2258_user');

      await knex.destroy();
    });

    beforeEach(() => {
      resetWarnings();
      warnings = [];
      originalWarn = console.warn;
      console.warn = (message) => warnings.push(message);
    });

    afterEach(() => {
      console.warn = originalWarn;
      resetWarnings();
    });

    const expectedWarning =
      '[objection] Fetching relation "snakeRegistrations" of User: some related models are ' +
      'missing the join property "issue_2258_registration.user_id", so they are not assigned to ' +
      'any owner. Check that the relation mapping uses the property names of the models, ' +
      'e.g. camelCase names when using knexSnakeCaseMappers.';

    it('withGraphFetched() should warn if related models are missing the join property', async () => {
      const user = await User.query(knex).findById(1).withGraphFetched('snakeRegistrations');

      expect(user.snakeRegistrations).to.eql([]);
      expect(warnings).to.eql([expectedWarning]);
    });

    it('$fetchGraph() should warn if related models are missing the join property', async () => {
      const user = await User.query(knex).findById(1);
      await user.$fetchGraph('snakeRegistrations', { transaction: knex });

      expect(user.snakeRegistrations).to.eql([]);
      expect(warnings).to.eql([expectedWarning]);
    });

    it('should not warn if related models have the join property', async () => {
      const user = await User.query(knex).findById(1).withGraphFetched('camelRegistrations');

      expect(user.camelRegistrations.map((it) => it.id)).to.eql([1]);
      expect(warnings).to.eql([]);
    });

    const expectedManyToManyWarning =
      '[objection] Fetching relation "strictRoles" of User: some related models are missing the ' +
      'join table column "issue_2258_user_role.userId" selected as "objectiontmpjoin0", so they ' +
      'are not assigned to any owner. Check that $parseDatabaseJson() and the column name ' +
      'mappers of the related model keep it.';

    it('should warn if related models of a ManyToManyRelation are missing the owner join column', async () => {
      const user = await User.query(knex).findById(1).withGraphFetched('strictRoles');

      expect(user.strictRoles).to.eql([]);
      expect(warnings).to.eql([expectedManyToManyWarning]);
    });

    it('should not warn if related models of a ManyToManyRelation have the owner join column', async () => {
      const user = await User.query(knex).findById(1).withGraphFetched('roles');

      expect(user.roles.map((it) => it.toJSON())).to.eql([{ id: 1, name: 'admin' }]);
      expect(warnings).to.eql([]);
    });
  });
};
