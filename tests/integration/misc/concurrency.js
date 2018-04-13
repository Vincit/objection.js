const expect = require('expect.js');
const mockKnexFactory = require('../../../testUtils/mockKnex');
const { Model, snakeCaseMappers } = require('../../../');

module.exports = session => {
  describe('Model.concurrency', () => {
    let knex;
    let models = {};
    let runningQueries = [];

    beforeEach(() => {
      models.Model1 = class Model1 extends Model {
        static get tableName() {
          return 'Model1';
        }

        static get concurrency() {
          return 1;
        }

        static get relationMappings() {
          return {
            model1Relation1: {
              relation: Model.BelongsToOneRelation,
              modelClass: Model1,
              join: {
                from: 'Model1.model1Id',
                to: 'Model1.id'
              }
            },

            model1Relation1Inverse: {
              relation: Model.HasOneRelation,
              modelClass: Model1,
              join: {
                from: 'Model1.id',
                to: 'Model1.model1Id'
              }
            },

            model1Relation2: {
              relation: Model.HasManyRelation,
              modelClass: models.Model2,
              join: {
                from: 'Model1.id',
                to: 'model2.model1_id'
              }
            },

            model1Relation3: {
              relation: Model.ManyToManyRelation,
              modelClass: models.Model2,
              join: {
                from: 'Model1.id',
                through: {
                  from: 'Model1Model2.model1Id',
                  to: 'Model1Model2.model2Id',
                  extra: ['extra1', 'extra2']
                },
                to: 'model2.id_col'
              }
            }
          };
        }
      };

      models.Model2 = class Model2 extends Model {
        // Function instead of getter on purpose.
        static tableName() {
          return 'model2';
        }

        static get idColumn() {
          return 'id_col';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get concurrency() {
          return 1;
        }
      };

      knex = mockKnexFactory(session.knex, function(mock, oldImpl, args) {
        const runningQuery = {
          sql: this.toString()
        };

        runningQueries.push(runningQuery);
        expect(runningQueries).to.have.length(1);

        return oldImpl.apply(this, args).then(res => {
          runningQueries = runningQueries.filter(it => it !== runningQuery);
          return res;
        });
      });

      Object.keys(models)
        .map(it => models[it])
        .forEach(model => model.knex(knex));
    });

    it('insertGraph', () => {
      const { Model1 } = models;

      return Model1.query().insertGraph({
        model1Prop1: '1',

        model1Relation1: {
          model1Prop1: '2'
        },

        model1Relation2: [
          {
            model2Prop1: '3'
          },
          {
            model2Prop1: '4'
          }
        ],

        model1Relation3: [
          {
            model2Prop1: '5'
          },
          {
            model2Prop1: '6'
          }
        ]
      });
    });
  });
};
