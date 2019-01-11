const { Model } = require('../../../');

module.exports = session => {
  describe('has one relation tree', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('has_one_relation_tree_test')
        .createTable('has_one_relation_tree_test', table => {
          table.increments('id');
          table.string('value');
          table.integer('previousId');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('has_one_relation_tree_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'has_one_relation_tree_test';
        }

        static get relationMappings() {
          return {
            previous: {
              relation: Model.BelongsToOneRelation,
              modelClass: this,
              join: {
                from: `${this.tableName}.previousId`,
                to: `${this.tableName}.id`
              }
            },

            next: {
              relation: Model.HasOneRelation,
              modelClass: this,
              join: {
                from: `${this.tableName}.id`,
                to: `${this.tableName}.previousId`
              }
            }
          };
        }
      };

      TestModel.knex(session.knex);
    });

    it('insertGraph should work', () => {
      return TestModel.query()
        .insertGraph({
          value: 'root',

          previous: {
            value: 'previous 1',

            previous: {
              value: 'previous 2'
            }
          }
        })
        .then(() => {
          return TestModel.query()
            .findOne({ value: 'root' })
            .eager('previous.^');
        })
        .then(result => {
          // console.dir(result, { depth: null });
        });
    });
  });
};
