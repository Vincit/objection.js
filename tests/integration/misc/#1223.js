const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = session => {
  describe(`Recursive eagering with an alias doesn't work with 1-m or m-m relations #1223`, () => {
    let knex = session.knex;
    let Person;

    before(() => {
      return knex.schema
        .dropTableIfExists('cousins')
        .dropTableIfExists('persons')
        .createTable('persons', table => {
          table.increments('id').primary();
          table.integer('parentId');
          table.string('name');
        })
        .createTable('cousins', table => {
          table.integer('id1');
          table.integer('id2');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('cousins').dropTableIfExists('persons');
    });

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'persons';
        }

        static get relationMappings() {
          return {
            children: {
              modelClass: Person,
              relation: Model.HasManyRelation,
              join: {
                from: 'persons.id',
                to: 'persons.parentId'
              }
            },

            cousins: {
              modelClass: Person,
              relation: Model.ManyToManyRelation,
              join: {
                from: 'persons.id',
                through: {
                  from: 'cousins.id1',
                  to: 'cousins.id2'
                },
                to: 'persons.id'
              }
            }
          };
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => Person.query().delete());

    beforeEach(() => {
      return Person.query().insertGraph({
        name: 'Root',

        children: [
          {
            name: 'Child 1',

            children: [
              {
                name: 'Child 2'
              },
              {
                name: 'Child 3'
              }
            ]
          },
          {
            name: 'Child 4',

            children: [
              {
                name: 'Child 5'
              },
              {
                name: 'Child 6'
              }
            ]
          }
        ],

        cousins: [
          {
            name: 'Cousin 1',

            cousins: [
              {
                name: 'Cousin 2'
              },
              {
                name: 'Cousin 3'
              }
            ]
          },
          {
            name: 'Cousin 4',

            cousins: [
              {
                name: 'Cousin 5'
              },
              {
                name: 'Cousin 6'
              }
            ]
          }
        ]
      });
    });

    it('should allow recursive eagering with aliases for 1-m and m-m relations', () => {
      return Person.query()
        .findOne({ 'persons.name': 'Root' })
        .eager({
          alias1: {
            $relation: 'children',
            $recursive: 10
          },

          alias2: {
            $relation: 'cousins',
            $recursive: 10
          }
        })
        .then(result => {
          expect(result).to.containSubset({
            parentId: null,
            name: 'Root',
            alias1: [
              {
                name: 'Child 1',
                alias1: [
                  {
                    name: 'Child 2',
                    alias1: []
                  },
                  {
                    name: 'Child 3',
                    alias1: []
                  }
                ]
              },
              {
                name: 'Child 4',
                alias1: [
                  {
                    name: 'Child 5',
                    alias1: []
                  },
                  {
                    name: 'Child 6',
                    alias1: []
                  }
                ]
              }
            ],
            alias2: [
              {
                name: 'Cousin 1',
                alias2: [
                  {
                    name: 'Cousin 2',
                    alias2: []
                  },
                  {
                    name: 'Cousin 3',
                    alias2: []
                  }
                ]
              },
              {
                name: 'Cousin 4',
                alias2: [
                  {
                    name: 'Cousin 5',
                    alias2: []
                  },
                  {
                    name: 'Cousin 6',
                    alias2: []
                  }
                ]
              }
            ]
          });
        });
    });
  });
};
