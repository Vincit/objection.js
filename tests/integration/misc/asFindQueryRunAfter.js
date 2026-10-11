const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe('asFindQuery() in static hooks ignores runAfter() of the original query #2093', () => {
    const { knex } = session;
    let Person;
    let hookResults;

    before(async () => {
      await knex.schema.dropTableIfExists('as_find_query_person');
      await session.createTable('as_find_query_person', (table, { increments }) => {
        increments('id');
        table.string('name');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('as_find_query_person');
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'as_find_query_person';
        }

        static async beforeUpdate({ asFindQuery }) {
          hookResults.push(await asFindQuery().select('id'));
        }

        static async beforeDelete({ asFindQuery }) {
          try {
            hookResults.push(await asFindQuery().select('id'));
          } catch (err) {
            hookResults.push(err);
          }
        }
      };

      Person.knex(knex);
    });

    beforeEach(async () => {
      await knex('as_find_query_person').delete();
      await knex('as_find_query_person').insert([
        { id: 1, name: 'Jennifer' },
        { id: 2, name: 'Brad' },
      ]);
      hookResults = [];
    });

    it('should not run runAfter() callbacks of the original query', async () => {
      let calls = 0;

      const result = await Person.query()
        .patch({ name: 'Updated' })
        .where('id', 1)
        .runAfter((result) => {
          calls++;
          return result;
        });

      expect(result).to.equal(1);
      expect(calls).to.equal(1);
      expect(hookResults).to.have.length(1);
      expect(hookResults[0].map((it) => it.id)).to.eql([1]);
    });

    it('should not throw because of throwIfNotFound() on the original query', async () => {
      let error;

      try {
        await Person.query().deleteById(1000).throwIfNotFound();
      } catch (err) {
        error = err;
      }

      // The delete itself throws, but the hook's find query just returns no rows.
      expect(error).to.be.an.instanceOf(Person.NotFoundError);
      expect(hookResults).to.eql([[]]);
    });

    it('should return an empty array for a findById() query that finds nothing', async () => {
      const result = await Person.query().deleteById(1000);

      expect(result).to.equal(0);
      expect(hookResults).to.eql([[]]);
    });

    it('should not traverse the results of the find query', async function () {
      if (session.isMySql()) {
        // MySQL doesn't support `returning()`, so there are no models to traverse.
        return this.skip();
      }

      const traversed = [];

      await Person.query()
        .patch({ name: 'Updated' })
        .where('id', 2)
        .returning('*')
        .traverse((model) => traversed.push(model.id));

      // Only the patched rows are traversed, not the rows of the hook's find query.
      expect(traversed).to.eql([2]);
      expect(hookResults[0].map((it) => it.id)).to.eql([2]);
    });

    it('should still run runAfter() callbacks added to the find query itself', async () => {
      const { beforeUpdate } = Person;

      Person.beforeUpdate = async ({ asFindQuery }) => {
        hookResults.push(await asFindQuery().runAfter((rows) => rows.map((it) => it.name)));
      };

      try {
        await Person.query().patch({ name: 'Updated' }).where('id', 1);
      } finally {
        Person.beforeUpdate = beforeUpdate;
      }

      expect(hookResults).to.eql([['Jennifer']]);
    });
  });
};
