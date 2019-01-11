const _ = require('lodash');
const expect = require('expect.js');
const { Model } = require('../../../');

module.exports = session => {
  describe('Eagerly loaded empty relations seem to short-circuit conversion to internal structure #292', () => {
    class A extends Model {
      static get tableName() {
        return 'a';
      }

      static get relationMappings() {
        return {
          Bs: {
            relation: Model.HasManyRelation,
            modelClass: B,
            join: {
              from: 'a.id',
              to: 'b.aId'
            }
          }
        };
      }
    }

    class B extends Model {
      static get tableName() {
        return 'b';
      }

      static get relationMappings() {
        return {
          Cs: {
            relation: Model.ManyToManyRelation,
            modelClass: C,
            join: {
              from: 'b.id',
              through: {
                from: 'b_c.bId',
                to: 'b_c.cId'
              },
              to: 'c.id'
            }
          },
          Ds: {
            relation: Model.ManyToManyRelation,
            modelClass: D,
            join: {
              from: 'b.id',
              through: {
                from: 'b_d.bId',
                to: 'b_d.dId'
              },
              to: 'd.id'
            }
          }
        };
      }
    }

    class C extends Model {
      static get tableName() {
        return 'c';
      }
    }

    class D extends Model {
      static get tableName() {
        return 'd';
      }
    }

    beforeEach(() => {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d')
        .createTable('a', table => {
          table.integer('id').primary();
        })
        .createTable('b', table => {
          table.integer('id').primary();
          table.integer('aId').references('a.id');
        })
        .createTable('c', table => {
          table.integer('id').primary();
        })
        .createTable('d', table => {
          table.integer('id').primary();
        })
        .createTable('b_c', table => {
          table
            .integer('bId')
            .references('b.id')
            .onDelete('CASCADE');
          table
            .integer('cId')
            .references('c.id')
            .onDelete('CASCADE');
        })
        .createTable('b_d', table => {
          table
            .integer('bId')
            .references('b.id')
            .onDelete('CASCADE');
          table
            .integer('dId')
            .references('d.id')
            .onDelete('CASCADE');
        })
        .then(() => {
          return Promise.all([
            session.knex('a').insert({ id: 1 }),
            session.knex('d').insert({ id: 1 }),
            session.knex('d').insert({ id: 2 })
          ])
            .then(() => {
              return session.knex('b').insert({ id: 1, aId: 1 });
            })
            .then(() => {
              return Promise.all([
                session.knex('b_d').insert({ bId: 1, dId: 1 }),
                session.knex('b_d').insert({ bId: 1, dId: 2 })
              ]);
            });
        });
    });

    afterEach(() => {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d');
    });

    it('the test', () => {
      return A.query(session.knex)
        .eagerAlgorithm(Model.JoinEagerAlgorithm)
        .eager('Bs.[Cs, Ds]')
        .then(results => {
          results[0].Bs[0].Ds = _.sortBy(results[0].Bs[0].Ds, 'id');

          expect(results).to.eql([
            {
              id: 1,

              Bs: [
                {
                  id: 1,
                  aId: 1,
                  Cs: [],

                  Ds: [
                    {
                      id: 1
                    },
                    {
                      id: 2
                    }
                  ]
                }
              ]
            }
          ]);
        });
    });
  });
};
