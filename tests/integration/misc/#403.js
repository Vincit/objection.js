const expect = require('expect.js');
const utils = require('../../../lib/utils/knexUtils');
const { Model, ref } = require('../../../');

module.exports = session => {
  if (utils.isPostgres(session.knex)) {
    describe('Eagered grandparents disappear when selecting the pkey as an alias on eagered parents #403', () => {
      let knex = session.knex;
      let Page;

      before(() => {
        return knex.schema
          .dropTableIfExists('page_relationship')
          .dropTableIfExists('page')
          .createTable('page', table => {
            table.integer('page_id').primary();
            table.jsonb('object_data');
          })
          .createTable('page_relationship', table => {
            table
              .integer('parent_id')
              .references('page.page_id')
              .index()
              .onDelete('CASCADE');
            table
              .integer('child_id')
              .references('page.page_id')
              .index()
              .onDelete('CASCADE');
          });
      });

      after(() => {
        return knex.schema.dropTableIfExists('page_relationship').dropTableIfExists('page');
      });

      before(() => {
        Page = class Page extends Model {
          static get tableName() {
            return 'page';
          }

          static get idColumn() {
            return 'page_id';
          }

          static get jsonAttributes() {
            return ['object_data'];
          }

          static get relationMappings() {
            return {
              parents: {
                relation: Model.ManyToManyRelation,
                modelClass: Page,
                join: {
                  from: 'page.page_id',
                  through: {
                    from: 'page_relationship.child_id',
                    to: 'page_relationship.parent_id'
                  },
                  to: 'page.page_id'
                }
              },

              children: {
                relation: Model.ManyToManyRelation,
                modelClass: Page,
                join: {
                  from: 'page.page_id',
                  through: {
                    from: 'page_relationship.parent_id',
                    to: 'page_relationship.child_id'
                  },
                  to: 'page.page_id'
                }
              }
            };
          }
        };

        Page.knex(knex);
      });

      before(() => {
        return Page.query().insertGraph({
          page_id: 1,
          object_data: { name: '1' },

          parents: [
            {
              page_id: 2,
              object_data: { name: '1_1' },

              parents: [
                {
                  page_id: 4,
                  object_data: { name: '1_1_1' }
                },
                {
                  page_id: 5,
                  object_data: { name: '1_1_2' }
                }
              ]
            },
            {
              page_id: 3,
              object_data: { name: '1_2' },

              parents: [
                {
                  page_id: 6,
                  object_data: { name: '1_2_1' }
                },
                {
                  page_id: 7,
                  object_data: { name: '1_2_2' }
                }
              ]
            }
          ]
        });
      });

      it('test 1', () => {
        return Page.query()
          .findById(1)
          .eager('parents.parents')
          .modifyEager('parents', builder => {
            builder.select('page_id as id', ref('object_data:name').as('name')).orderBy('page_id');
          })
          .modifyEager('parents.parents', builder => {
            builder.select('page_id as id', ref('object_data:name').as('name')).orderBy('page_id');
          })
          .select('page_id as id', ref('object_data:name').as('name'))
          .then(pages => {
            expect(pages).to.eql({
              id: 1,
              name: '1',

              parents: [
                {
                  id: 2,
                  name: '1_1',

                  parents: [
                    {
                      id: 4,
                      name: '1_1_1'
                    },
                    {
                      id: 5,
                      name: '1_1_2'
                    }
                  ]
                },
                {
                  id: 3,
                  name: '1_2',

                  parents: [
                    {
                      id: 6,
                      name: '1_2_1'
                    },
                    {
                      id: 7,
                      name: '1_2_2'
                    }
                  ]
                }
              ]
            });
          });
      });

      it('test 2', () => {
        return Page.query()
          .joinRelation('parents.parents')
          .select(
            'parents:parents.page_id as id',
            ref('object_data:name')
              .from('parents:parents')
              .as('name')
          )
          .orderBy('parents:parents.page_id')
          .then(models => {
            expect(models).to.eql([
              { id: 4, name: '1_1_1' },
              { id: 5, name: '1_1_2' },
              { id: 6, name: '1_2_1' },
              { id: 7, name: '1_2_2' }
            ]);
          });
      });
    });
  }
};
