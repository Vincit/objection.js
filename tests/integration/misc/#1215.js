const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = session => {
  describe(`joinRelation in filter in model relationMappings #1215`, () => {
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
            parent: {
              modelClass: Person,
              relation: Model.BelongsToOneRelation,
              join: {
                from: 'persons.parentId',
                to: 'persons.id'
              }
            },

            children: {
              modelClass: Person,
              relation: Model.HasManyRelation,
              modify(builder) {
                builder.leftJoinRelation('parent').select('persons.*', 'parent.name as parentName');
              },
              join: {
                from: 'persons.id',
                to: 'persons.parentId'
              }
            },

            cousins: {
              modelClass: Person,
              relation: Model.ManyToManyRelation,
              modify(builder) {
                builder.leftJoinRelation('parent').select('persons.*', 'parent.name as parentName');
              },
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
        name: 'Matti',

        parent: {
          name: 'Samuel'
        },

        children: [
          {
            name: 'Sami'
          },
          {
            name: 'Marika'
          }
        ],

        cousins: [
          {
            name: 'Torsti'
          },
          {
            name: 'Taina',

            parent: {
              name: 'Urpo'
            }
          }
        ]
      });
    });

    it('should be able to use joinRelation in relationMapping modifier', () => {
      return Person.query()
        .first()
        .where('name', 'Matti')
        .eager({
          children: true,
          cousins: true
        })
        .then(result => {
          expect(result).to.containSubset({
            name: 'Matti',

            children: [
              { name: 'Sami', parentName: 'Matti' },
              { name: 'Marika', parentName: 'Matti' }
            ],

            cousins: [{ name: 'Torsti', parentName: null }, { name: 'Taina', parentName: 'Urpo' }]
          });
        });
    });
  });
};
