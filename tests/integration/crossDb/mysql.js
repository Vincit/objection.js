const _ = require('lodash');
const Knex = require('knex');
const { Model } = require('../../../');
const expect = require('expect.js');

module.exports = session => {
  describe('mysql', () => {
    let db2Knex;
    let T1;
    let T2;

    before(async function() {
      await session.knex.raw('CREATE DATABASE IF NOT EXISTS objection_test_2');

      const db2Config = _.cloneDeep(session.opt.knexConfig);
      db2Config.connection.database = 'objection_test_2';
      db2Knex = Knex(db2Config);

      await db2Knex.schema.dropTableIfExists('t2');
      await db2Knex.schema.dropTableIfExists('t1');

      await db2Knex.schema.createTable('t1', table => {
        table.integer('id').primary();
        table.integer('foo');
      });

      await db2Knex.schema.createTable('t2', table => {
        table.integer('id').primary();
        table.integer('t1_id').references('t1.id');
        table.integer('bar');
      });
    });

    after(async function() {
      await db2Knex.schema.dropTableIfExists('t2');
      await db2Knex.schema.dropTableIfExists('t1');
      await db2Knex.destroy();
      await session.knex.raw('DROP DATABASE IF EXISTS objection_test_2');
    });

    beforeEach(() => {
      class T1Model extends Model {
        static get tableName() {
          return 'objection_test_2.t1';
        }
        static get relationMappings() {
          return {
            manyT2: {
              relation: Model.HasManyRelation,
              modelClass: T2Model,
              join: {
                from: 'objection_test_2.t1.id',
                to: 'objection_test_2.t2.t1_id'
              }
            }
          };
        }
      }

      class T2Model extends Model {
        static get tableName() {
          return 'objection_test_2.t2';
        }
        static get relationMappings() {
          return {
            oneT1: {
              relation: Model.BelongsToOneRelation,
              modelClass: T1Model,
              join: {
                from: 'objection_test_2.t1.id',
                to: 'objection_test_2.t2.t1_id'
              }
            }
          };
        }
      }

      T1 = T1Model.bindKnex(session.knex);
      T2 = T2Model.bindKnex(session.knex);
    });

    beforeEach(async function() {
      await db2Knex('t2').delete();
      await db2Knex('t1').delete();
    });

    it('should be able to insert to another database', () => {
      return T1.query()
        .insert({ id: 1, foo: 1 })
        .then(() => {
          return db2Knex('t1');
        })
        .then(rows => {
          expect(rows).to.eql([{ id: 1, foo: 1 }]);
        });
    });

    it('should be able to insert a graph to another database', () => {
      return T1.query()
        .insertGraph({
          id: 1,
          foo: 1,
          manyT2: [
            {
              id: 1,
              bar: 2
            }
          ]
        })
        .then(() => {
          return Promise.all([db2Knex('t1'), db2Knex('t2')]);
        })
        .then(res => {
          expect(res).to.eql([[{ id: 1, foo: 1 }], [{ id: 1, bar: 2, t1_id: 1 }]]);
        });
    });

    it('select should work with a normal query', () => {
      return T1.query()
        .insert({ id: 1, foo: 1 })
        .then(() => {
          return T1.query().select('objection_test_2.t1.*');
        })
        .then(models => {
          expect(models).to.eql([{ id: 1, foo: 1 }]);
        })
        .then(() => {
          return T1.query().select('objection_test_2.t1.id');
        })
        .then(models => {
          expect(models).to.eql([{ id: 1 }]);
        });
    });

    it('select should work with an eager query', () => {
      return T1.query()
        .insertGraph({
          id: 1,
          foo: 1,
          manyT2: [
            {
              id: 1,
              bar: 2
            }
          ]
        })
        .then(() => {
          return T1.query()
            .eager('manyT2')
            .select('objection_test_2.t1.*');
        })
        .then(models => {
          expect(models).to.eql([
            {
              id: 1,
              foo: 1,
              manyT2: [
                {
                  id: 1,
                  t1_id: 1,
                  bar: 2
                }
              ]
            }
          ]);
        })
        .then(() => {
          return T1.query()
            .eager('manyT2')
            .select('objection_test_2.t1.foo')
            .modifyEager('manyT2', builder => {
              builder.select('bar');
            });
        })
        .then(models => {
          expect(models).to.eql([
            {
              foo: 1,
              manyT2: [
                {
                  bar: 2
                }
              ]
            }
          ]);
        });
    });
  });
};
