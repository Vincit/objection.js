const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe('model relatedQueries fail when they lack a proper target', () => {
    let knex = session.knex;

    class Post extends Model {
      static get tableName() {
        return 'posts';
      }
    }

    class User extends Model {
      static get tableName() {
        return 'users';
      }
      static get relationMappings() {
        return {
          posts: {
            modelClass: Post,
            relation: Model.HasManyRelation,
            join: {
              from: 'users.id',
              to: 'posts.user_id',
            },
          },
        };
      }
    }

    before(async () => {
      const knex = session.knex;

      await knex.schema.dropTableIfExists('posts');
      await knex.schema.dropTableIfExists('users');

      await knex.schema
        .createTable('users', (table) => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('posts', (table) => {
          table.increments('id').primary();
          table.integer('user_id').unsigned().references('id').inTable('users');
          table.string('content');
        });
    });

    after(async () => {
      await knex.schema.dropTableIfExists('posts');
      await knex.schema.dropTableIfExists('users');
    });

    it('relatedQuery insert does not silently fail when ommiting `for` a target', async () => {
      try {
        await User.relatedQuery('posts', knex).insert({ content: 'my post content' });
      } catch (e) {
        expect(e.message).to.equal(
          'query method `for` ommitted outside a subquery, can not figure out relation target',
        );
      }
    });
    it('relatedQuery where fails when `for` is ommited and is not a subquery', async () => {
      try {
        await User.relatedQuery('posts', knex).where({ content: 'my post content' });
      } catch (e) {
        expect(e.message).to.equal(
          'query method `for` ommitted outside a subquery, can not figure out relation target',
        );
      }
    });
  });
};
