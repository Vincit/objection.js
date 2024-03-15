const _ = require('lodash');
const expect = require('expect.js');
const { Model, snakeCaseMappers } = require('../../../');

module.exports = (session) => {
  describe("Objection shouldn't touch JSON fields using columnNameMappers and FieldExpressions (#1089)", () => {
    class A extends Model {
      static get tableName() {
        return 'a';
      }

      static get columnNameMappers() {
        return snakeCaseMappers();
      }
    }

    beforeEach(() => {
      return session.knex.schema
        .dropTableIfExists('a')
        .createTable('a', (table) => {
          table.integer('id').primary();
          table.jsonb('my_json').nullable().defaultTo(null);
        })
        .then(() => {
          return Promise.all([
            session.knex('a').insert({
              id: 1,
              my_json: JSON.stringify([{ innerKey: 2 }]),
            }),
          ]);
        });
    });

    afterEach(() => {
      return session.knex.schema.dropTableIfExists('a');
    });

    it("json field keys aren't modified with columnNameMappers with FieldExpressions", () => {
      if (!session.isPostgres()) {
        // Note(cesumilo): Only working on postgresql.
        return expect(true).to.eql(true);
      }

      return A.query(session.knex)
        .patch({
          'myJson:[0][innerKey]': 1,
        })
        .then((result) => {
          expect(result).to.eql(1);
          return A.query(session.knex);
        })
        .then((results) => {
          expect(results[0].id).to.eql(1);
          expect(results[0].myJson[0].innerKey).to.eql(1);
        });
    });
  });
};
