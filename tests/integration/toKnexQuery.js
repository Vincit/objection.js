const expectJs = require('expect.js');

const { expect } = require('chai');
const { Model, val, raw, initialize } = require('../../');

module.exports = session => {
  describe(`toKnexQuery`, () => {
    const { knex } = session;
    let Person;

    before(() => {
      return knex.schema.dropTableIfExists('persons').createTable('persons', table => {
        table.increments('id').primary();
        table.string('name');
        table.integer('parentId');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('persons');
    });

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'persons';
        }

        static get relationMappings() {
          return {
            children: {
              relation: Model.HasManyRelation,
              modelClass: Person,
              join: {
                from: 'persons.id',
                to: 'persons.parentId'
              }
            }
          };
        }
      };
    });

    beforeEach(async () => {
      await Person.query(knex).delete();
      await Person.query(knex).insertGraph({
        id: 1,
        name: 'parent',
        children: [
          {
            id: 2,
            name: 'child 1'
          },
          {
            id: 3,
            name: 'child 2'
          }
        ]
      });
    });

    describe('should compile a query into a knex query', () => {
      it("where('name', 'child 1')", () => {
        testSql({
          query: Person.query(knex).where('name', 'child 1'),
          sql: 'select "persons".* from "persons" where "name" = ?',
          bindings: ['child 1']
        });
      });

      it("select('id', 'name')", () => {
        testSql({
          query: Person.query(knex).select('id', 'name'),
          sql: 'select "id", "name" from "persons"',
          bindings: []
        });
      });

      it("where(raw('?', raw('?', val(1))), Person.relatedQuery('children').select('id').limit(1))", () => {
        testSql({
          query: Person.query(knex).where(
            raw('?', raw('?', val(1))),
            Person.relatedQuery('children')
              .select('id')
              .limit(1)
          ),
          sql:
            'select "persons".* from "persons" where ? = (select "id" from "persons" as "children" where "children"."parentId" = "persons"."id" limit ?)',
          bindings: [1, 1]
        });
      });

      it('should fail with an informational error when wighGraphJoined is used before warm up', () => {
        expectJs(() => {
          Person.query(knex)
            .withGraphJoined('children')
            .toKnexQuery();
        }).to.throwException(err => {
          expect(err.message).to.equal(
            'table metadata has not been fetched. Are you trying to call toKnexQuery() for a withGraphJoined query? To make sure the table metadata is fetched see the objection.initialize function.'
          );
        });
      });

      it('should fail with a informational error when wighGraphJoined is used before warm up', async () => {
        await initialize(knex, [Person]);

        testSql({
          query: Person.query(knex).withGraphJoined('children'),
          sql:
            'select "persons"."id" as "id", "persons"."name" as "name", "persons"."parentId" as "parentId", "children"."id" as "children:id", "children"."name" as "children:name", "children"."parentId" as "children:parentId" from "persons" left join "persons" as "children" on "children"."parentId" = "persons"."id"',
          bindings: []
        });
      });

      it('should fail with a informational error when wighGraphJoined is used before warm up (2)', async () => {
        Person.knex(knex);
        await initialize([Person]);

        testSql({
          query: Person.query(knex).withGraphJoined('children'),
          sql:
            'select "persons"."id" as "id", "persons"."name" as "name", "persons"."parentId" as "parentId", "children"."id" as "children:id", "children"."name" as "children:name", "children"."parentId" as "children:parentId" from "persons" left join "persons" as "children" on "children"."parentId" = "persons"."id"',
          bindings: []
        });
      });
    });
  });
};

function testSql({ query, sql, bindings }) {
  const result = query.toKnexQuery().toSQL();

  expect(normalizeSql(result.sql)).to.equal(sql);
  expect(result.bindings).to.eql(bindings);
}

function normalizeSql(sql) {
  return sql.replace(/`/g, '"');
}
