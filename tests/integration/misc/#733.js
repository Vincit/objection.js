const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe(`select in modifier + joinEager #733`, () => {
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

        static get modifiers() {
          return {
            aliasedProps: builder => {
              builder.select(['id as aliasedId', 'name as aliasedName']);
            },

            aliasedPropsAndSelectAll: builder => {
              builder.select(['Person.*', 'id as aliasedId', 'name as aliasedName']);
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

    it('aliased properties', () => {
      return Person.query()
        .where('Person.id', 1)
        .joinEager('children(aliasedProps)')
        .then(result => {
          expect(result).to.containSubset([
            {
              id: 1,
              name: 'parent',
              parentId: null,
              children: [
                { aliasedId: 2, aliasedName: 'child 1' },
                { aliasedId: 3, aliasedName: 'child 2' }
              ]
            }
          ]);
        });
    });

    it('aliased properties + select all', () => {
      return Person.query()
        .where('Person.id', 1)
        .joinEager('children(aliasedPropsAndSelectAll)')
        .then(result => {
          expect(result).to.containSubset([
            {
              id: 1,
              name: 'parent',
              parentId: null,
              children: [
                { id: 2, name: 'child 1', parentId: 1, aliasedId: 2, aliasedName: 'child 1' },
                { id: 3, name: 'child 2', parentId: 1, aliasedId: 3, aliasedName: 'child 2' }
              ]
            }
          ]);
        });
    });
  });
};
