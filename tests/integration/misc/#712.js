const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe(`namedFilters that have no where or select statements don't work with joinRelation #712`, () => {
    let knex = session.knex;
    let Person;

    before(() => {
      return knex.schema.dropTableIfExists('Person').createTable('Person', table => {
        table.increments('id').primary();
        table.string('name');
        table.integer('parentId');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('Person');
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static get namedFilters() {
          return {
            notFirstChild: builder => {
              builder.from(subQuery => {
                subQuery
                  .select('Person.*')
                  .from('Person')
                  .where('name', '!=', 'child 1')
                  .as('Person');
              });
            }
          };
        }

        static get relationMappings() {
          return {
            children: {
              relation: Model.HasManyRelation,
              modelClass: Person,
              join: {
                from: 'Person.id',
                to: 'Person.parentId'
              }
            }
          };
        }
      };

      Person.knex(knex);
    });

    before(() => {
      return Person.query().insertGraph({
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

    it('test', () => {
      return Person.query()
        .where('Person.id', 1)
        .select('Person.*', 'children.name as childName')
        .joinRelation('children(notFirstChild)')
        .orderBy('childName')
        .then(people => {
          expect(people).to.have.length(1);
          expect(people[0].childName).to.equal('child 2');
        });
    });
  });
};
