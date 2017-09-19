'use strict';

const raw = require('../../').raw;
const expect = require('expect.js');
const Promise = require('bluebird');
const transaction = require('../../').transaction;
const ValidationError = require('../../').ValidationError;
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = (session) => {
  const Model1 = session.unboundModels.Model1;
  const Model2 = session.unboundModels.Model2;
  const NONEXISTENT_ID = 1000;

  describe('upsertGraph', () => {
    let population;

    beforeEach(() => {
      population = [{
        id: 1,
        model1Id: null,
        model1Prop1: 'root 1',

        model1Relation1: null,
        model1Relation2: []
      }, {
        id: 2,
        model1Id: 3,
        model1Prop1: 'root 2',

        // This is a BelongsToOneRelation
        model1Relation1: {
          id: 3,
          model1Id: null,
          model1Prop1: 'belongsToOne'
        },

        // This is a HasManyRelation
        model1Relation2: [{
          idCol: 1,
          model1Id: 2,
          model2Prop1: 'hasMany 1',

          // This is a ManyToManyRelation
          model2Relation1: [{
            id: 4,
            model1Id: null,
            model1Prop1: 'manyToMany 1'
          }, {
            id: 5,
            model1Id: null,
            model1Prop1: 'manyToMany 2'
          }]
        }, {
          idCol: 2,
          model1Id: 2,
          model2Prop1: 'hasMany 2',

          // This is a ManyToManyRelation
          model2Relation1: [{
            id: 6,
            model1Id: null,
            model1Prop1: 'manyToMany 3'
          }, {
            id: 7,
            model1Id: null,
            model1Prop1: 'manyToMany 4'
          }]
        }]
      }];

      return session.populate(population);
    });

    it('by default, should insert new, update existing and delete missing', () => {
      const upsert = {
        // Nothing is done for the root since it only has an ids.
        id: 2,
        model1Id: 3,

        // update
        model1Relation1: {
          id: 3,
          model1Prop1: 'updated belongsToOne'
        },

        // update idCol=1
        // delete idCol=2
        // and insert one new
        model1Relation2: [{
          idCol: 1,
          model2Prop1: 'updated hasMany 1',

          // update id=4
          // delete id=5
          // and insert one new
          model2Relation1: [{
            id: 4,
            model1Prop1: 'updated manyToMany 1'
          }, {
            // This is the new row.
            model1Prop1: 'inserted manyToMany'
          }]
        }, {
          // This is the new row.
          model2Prop1: 'inserted hasMany',
        }]
      };

      return transaction(session.knex, trx => {
        const sql = [];

        // Wrap the transaction to catch the executed sql.
        trx = mockKnexFactory(trx, function (mock, oldImpl, args) {
          sql.push(this.toString());
          return oldImpl.apply(this, args);
        });

        return Model1
          .query(trx)
          .upsertGraph(upsert)
          // Sort all result by id to make the SQL we test below consistent.
          .mergeContext({
            onBuild(builder) {
              if (!builder.isFindQuery()) {
                return;
              }

              if (builder.modelClass().tableName === 'Model1') {
                builder.orderBy('Model1.id');
              } else if (builder.modelClass().tableName === 'model_2') {
                builder.orderBy('model_2.id_col');
              }
            }
          })
          .then(result => {
            if (session.isPostgres()) {
              expect(sql).to.eql([
                'select "Model1"."model1Id", "Model1"."id" from "Model1" where "Model1"."id" in (2) order by "Model1"."id" asc',
                'select "Model1"."id" from "Model1" where "Model1"."id" in (3) order by "Model1"."id" asc',
                'select "model_2"."model_1_id", "model_2"."id_col" from "model_2" where "model_2"."model_1_id" in (2) order by "model_2"."id_col" asc',
                'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2) order by "Model1"."id" asc',

                'delete from "model_2" where "model_2"."id_col" in (2) and "model_2"."model_1_id" in (2)',
                'delete from "Model1" where "Model1"."id" in (5) and "Model1"."id" in (select "Model1Model2"."model1Id" from "Model1Model2" where "Model1Model2"."model2Id" = 1)',

                'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                'insert into "model_2" ("model_1_id", "model_2_prop_1") values (2, \'inserted hasMany\') returning "id_col"',
                'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1) returning "model1Id"',

                'update "Model1" set "id" = 3, "model1Prop1" = \'updated belongsToOne\' where "Model1"."id" = 3 and "Model1"."id" in (3)',
                'update "model_2" set "id_col" = 1, "model_1_id" = 2, "model_2_prop_1" = \'updated hasMany 1\' where "model_2"."id_col" = 1 and "model_2"."model_1_id" in (2)',
                'update "Model1" set "id" = 4, "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" = 4 and "Model1"."id" in (select "Model1Model2"."model1Id" from "Model1Model2" where "Model1Model2"."model2Id" = 1)'
              ]);
            }

            expect(result.$beforeUpdateCalled).to.equal(undefined);
            expect(result.$afterUpdateCalled).to.equal(undefined);

            expect(result.model1Relation1.$beforeUpdateCalled).to.equal(1);
            expect(result.model1Relation1.$afterUpdateCalled).to.equal(1);

            expect(result.model1Relation2[0].$beforeUpdateCalled).to.equal(1);
            expect(result.model1Relation2[0].$afterUpdateCalled).to.equal(1);

            expect(result.model1Relation2[1].$beforeUpdateCalled).to.equal(undefined);
            expect(result.model1Relation2[1].$afterUpdateCalled).to.equal(undefined);

            expect(result.model1Relation2[1].$beforeInsertCalled).to.equal(1);
            expect(result.model1Relation2[1].$afterInsertCalled).to.equal(1);

            expect(result.model1Relation2[0].model2Relation1[0].$beforeUpdateCalled).to.equal(1);
            expect(result.model1Relation2[0].model2Relation1[0].$afterUpdateCalled).to.equal(1);

            expect(result.model1Relation2[0].model2Relation1[1].$beforeInsertCalled).to.equal(1);
            expect(result.model1Relation2[0].model2Relation1[1].$afterInsertCalled).to.equal(1);

            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(2)
              .eager('[model1Relation1, model1Relation2.model2Relation1]')
              .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
              .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              id: 2,
              model1Id: 3,
              model1Prop1: "root 2",

              model1Relation1: {
                id: 3,
                model1Id: null,
                model1Prop1: "updated belongsToOne",
              },

              model1Relation2: [{
                idCol: 1,
                model1Id: 2,
                model2Prop1: "updated hasMany 1",

                model2Relation1: [{
                  id: 4,
                  model1Id: null,
                  model1Prop1: "updated manyToMany 1",
                }, {
                  id: 8,
                  model1Id: null,
                  model1Prop1: "inserted manyToMany",
                }]
              }, {
                idCol: 3,
                model1Id: 2,
                model2Prop1: "inserted hasMany",
                model2Relation1: []
              }]
            });

            return Promise.all([
              trx('Model1'),
              trx('model_2')
            ])
            .spread((model1Rows, model2Rows) => {
              // Row 5 should be deleted.
              expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
              // Row 6 should NOT be deleted even thought its parent is.
              expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
              // Row 7 should NOT be deleted  even thought its parent is.
              expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
              // Row 2 should be deleted.
              expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
            });
          });
      });
    });

    it('should work like insertGraph if root is an insert', () => {
      const upsert = {
        model1Prop1: 'new',

        model1Relation1: {
          model1Prop1: 'new belongsToOne'
        }
      };

      return transaction(session.knex, trx => {
        return Model1
          .query(trx)
          .upsertGraph(upsert)
          .then(result => {
            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(result.id)
              .eager('model1Relation1')
              .select('model1Prop1')
              .modifyEager('model1Relation1', qb => qb.select('model1Prop1'));
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              model1Prop1: 'new',
              model1Relation1: {
                model1Prop1: 'new belongsToOne'
              }
            });
          });
      });
    });

    it('should insert new, update existing relate unrelated adn unrelate missing if `unrelate` and `relate` options are true', () => {
      const upsert = {
        // the root gets updated because it has an id
        id: 2,
        model1Prop1: 'updated root 2',

        // unrelate
        model1Relation1: null,

        // update idCol=1
        // unrelate idCol=2
        // and insert one new
        model1Relation2: [{
          idCol: 1,
          model2Prop1: 'updated hasMany 1',

          // update id=4
          // unrelate id=5
          // relate id=6
          // and insert one new
          model2Relation1: [{
            id: 4,
            model1Prop1: 'updated manyToMany 1'
          }, {
            // This is the new row.
            model1Prop1: 'inserted manyToMany'
          }, {
            // This will get related because it has an id
            // that doesn't currently exist in the relation.
            id: 6
          }]
        }, {
          // This is the new row.
          model2Prop1: 'inserted hasMany',
        }]
      };

      return transaction(session.knex, trx => {
        return Model1
          .query(trx)
          .upsertGraph(upsert, {unrelate: true, relate: true})
          .then(result => {
            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(2)
              .eager('[model1Relation1, model1Relation2.model2Relation1]')
              .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
              .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              id: 2,
              model1Id: null,
              model1Prop1: "updated root 2",

              model1Relation1: null,

              model1Relation2: [{
                idCol: 1,
                model1Id: 2,
                model2Prop1: "updated hasMany 1",

                model2Relation1: [{
                  id: 4,
                  model1Id: null,
                  model1Prop1: "updated manyToMany 1",
                }, {
                  id: 6,
                  model1Id: null,
                  model1Prop1: "manyToMany 3",
                }, {
                  id: 8,
                  model1Id: null,
                  model1Prop1: "inserted manyToMany",
                }]
              }, {
                idCol: 3,
                model1Id: 2,
                model2Prop1: "inserted hasMany",
                model2Relation1: []
              }]
            });

            return Promise.all([
              trx('Model1'),
              trx('model_2')
            ])
            .spread((model1Rows, model2Rows) => {
              // Row 3 should NOT be deleted.
              expect(model1Rows.find(it => it.id == 3)).to.eql({
                id: 3,
                model1Id: null,
                model1Prop1: 'belongsToOne',
                model1Prop2: null
              });

              // Row 5 should NOT be deleted.
              expect(model1Rows.find(it => it.id == 5)).to.eql({
                id: 5,
                model1Id: null,
                model1Prop1: 'manyToMany 2',
                model1Prop2: null
              });

              // Row 2 should NOT be deleted.
              expect(model2Rows.find(it => it.id_col == 2)).to.eql({
                id_col: 2,
                model_1_id: null,
                model_2_prop_1: 'hasMany 2',
                model_2_prop_2: null
              });
            });
          });
      });
    });

    it('should delete and insert belongsToOneRelation', () => {
      const upsert = {
        // the root gets updated because it has an id
        id: 2,
        model1Prop1: 'updated root 2',

        // The model with id 3 should get deleted and this new one inserted.
        model1Relation1: {
          model1Prop1: 'inserted belongsToOne'
        }
      };

      return transaction(session.knex, trx => {
        return Model1
          .query(trx)
          .upsertGraph(upsert)
          .then(result => {
            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(2)
              .eager('model1Relation1')
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              id: 2,
              model1Id: 8,
              model1Prop1: "updated root 2",

              model1Relation1: {
                id: 8,
                model1Id: null,
                model1Prop1: "inserted belongsToOne"
              }
            });

            return Promise.all([
              trx('Model1'),
              trx('model_2')
            ])
            .spread((model1Rows, model2Rows) => {
              // Row 3 should be deleted.
              expect(model1Rows.find(it => it.id == 3)).to.equal(undefined);
            });
          });
      });
    });

    it('should insert with an id instead of throwing an error if `insertMissing` option is true', () => {
      const upsert = {
        id: 2,

        // update idCol=1
        // delete idCol=2
        // and insert one new
        model1Relation2: [{
          idCol: 1,
          model2Prop1: 'updated hasMany 1',

          // update id=4
          // delete id=5
          // and insert one new
          model2Relation1: [{
            id: 4,
            model1Prop1: 'updated manyToMany 1'
          }, {
            // This is the new row with an id.
            id: 1000,
            model1Prop1: 'inserted manyToMany'
          }]
        }, {
          // This is the new row with an id.
          idCol: 1000,
          model2Prop1: 'inserted hasMany',
        }]
      };

      return transaction(session.knex, trx => {
        return Model1.query(trx).upsertGraph(upsert, {insertMissing: true});
      }).then(result => {
        // Fetch the graph from the database.
        return Model1
          .query(session.knex)
          .findById(2)
          .eager('model1Relation2.model2Relation1')
          .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
          .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
      }).then(omitIrrelevantProps).then(result => {
        expect(result).to.eql({
          id: 2,
          model1Id: 3,
          model1Prop1: "root 2",

          model1Relation2: [{
            idCol: 1,
            model1Id: 2,
            model2Prop1: "updated hasMany 1",

            model2Relation1: [{
              id: 4,
              model1Id: null,
              model1Prop1: "updated manyToMany 1",
            }, {
              id: 1000,
              model1Id: null,
              model1Prop1: "inserted manyToMany",
            }]
          }, {
            idCol: 1000,
            model1Id: 2,
            model2Prop1: "inserted hasMany",
            model2Relation1: []
          }]
        });
      });
    });

    it('should fail if given nonexistent id in root', done => {
      const upsert = {
        // This doesn't exist.
        id: NONEXISTENT_ID,
        model1Prop1: 'updated root 2',

        model1Relation1: {
          model1Prop1: 'inserted belongsToOne'
        }
      };

      transaction(session.knex, trx => {
        return Model1.query(trx).upsertGraph(upsert)
      }).then(() => {
        next(new Error('should not get here'));
      }).catch(err => {
        expect(err.message).to.equal('one or more of the root models (ids=[1000]) were not found');
        return session.knex('Model1').whereIn('model1Prop1', ['updated root 2', 'inserted belongsToOne']);
      }).then(rows => {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);
    });

    it('should fail if given nonexistent id in a relation (without relate=true option)', done => {
      const upsert = {
        id: 2,
        model1Prop1: 'updated root 2',

        // id 1000 is not related to id 2. This will thrown an error.
        model1Relation1: {
          id: NONEXISTENT_ID,
          model1Prop1: 'inserted belongsToOne'
        }
      };

      transaction(session.knex, trx => {
        return Model1.query(trx).upsertGraph(upsert)
      }).then(() => {
        next(new Error('should not get here'));
      }).catch(err => {
        expect(err.message).to.equal('model (id=1000) is not a child of model (id=2). If you want to relate it, use the relate: true option. If you want to insert it with an id, use the insertMissing: true option');
        return session.knex('Model1').whereIn('model1Prop1', ['updated root 2', 'inserted belongsToOne']);
      }).then(rows => {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);
    });

    it('allowUpsert should limit the relations that can be upserted', () => {
      const errors = [];

      const upsert = {
        // the root gets updated because it has an id
        id: 2,
        model1Prop1: 'updated root 2',

        // unrelate
        model1Relation1: null,

        // update idCol=1
        // unrelate idCol=2
        // and insert one new
        model1Relation2: [{
          idCol: 1,
          model2Prop1: 'updated hasMany 1',

          // update id=4
          // unrelate id=5
          // relate id=6
          // and insert one new
          model2Relation1: [{
            id: 4,
            model1Prop1: 'updated manyToMany 1'
          }, {
            // This is the new row.
            model1Prop1: 'inserted manyToMany'
          }, {
            // This will get related because it has an id
            // that doesn't currently exist in the relation.
            id: 6
          }]
        }, {
          // This is the new row.
          model2Prop1: 'inserted hasMany',
        }]
      };

      // This should fail.
      return Model1
        .query(session.knex)
        .upsertGraph(upsert, {unrelate: true, relate: true})
        .allowUpsert('[model1Relation1, model1Relation2]')
        .catch(err => {
          errors.push(err);

          // This should also fail.
          return Model1
            .query(session.knex)
            .upsertGraph(upsert, {unrelate: true, relate: true})
            .allowUpsert('[model1Relation2.model2Relation1]')
        })
        .catch(err => {
          errors.push(err);

          // This should succeed.
          return Model1
            .query(session.knex)
            .upsertGraph(upsert, {unrelate: true, relate: true})
            .allowUpsert('[model1Relation1, model1Relation2.model2Relation1]')
        })
        .then(result => {
          // Fetch the graph from the database.
          return Model1
            .query(session.knex)
            .findById(2)
            .eager('[model1Relation1, model1Relation2.model2Relation1]')
            .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
            .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
        })
        .then(omitIrrelevantProps)
        .then(result => {
          expect(errors.length).to.equal(2);

          errors.forEach(error => {
            expect(error).to.be.a(ValidationError);
            expect(error.data.allowedRelations).to.equal('trying to upsert an unallowed relation');
          });

          expect(result).to.eql({
            id: 2,
            model1Id: null,
            model1Prop1: "updated root 2",

            model1Relation1: null,

            model1Relation2: [{
              idCol: 1,
              model1Id: 2,
              model2Prop1: "updated hasMany 1",

              model2Relation1: [{
                id: 4,
                model1Id: null,
                model1Prop1: "updated manyToMany 1",
              }, {
                id: 6,
                model1Id: null,
                model1Prop1: "manyToMany 3",
              }, {
                id: 8,
                model1Id: null,
                model1Prop1: "inserted manyToMany",
              }]
            }, {
              idCol: 3,
              model1Id: 2,
              model2Prop1: "inserted hasMany",
              model2Relation1: []
            }]
          });

          return Promise.all([
            session.knex('Model1'),
            session.knex('model_2')
          ])
          .spread((model1Rows, model2Rows) => {
            // Row 3 should NOT be deleted.
            expect(model1Rows.find(it => it.id == 3)).to.eql({
              id: 3,
              model1Id: null,
              model1Prop1: 'belongsToOne',
              model1Prop2: null
            });

            // Row 5 should NOT be deleted.
            expect(model1Rows.find(it => it.id == 5)).to.eql({
              id: 5,
              model1Id: null,
              model1Prop1: 'manyToMany 2',
              model1Prop2: null
            });

            // Row 2 should NOT be deleted.
            expect(model2Rows.find(it => it.id_col == 2)).to.eql({
              id_col: 2,
              model_1_id: null,
              model_2_prop_1: 'hasMany 2',
              model_2_prop_2: null
            });
          });
        });
    });

    it('raw sql and subqueries should work', () => {
      const upsert = {
        // the root gets updated because it has an id
        id: 2,
        model1Prop1: raw("10 + 20"),

        // update
        model1Relation1: {
          id: 3,
          model1Prop1: Model2.query(session.knex).min('id_col')
        },

        // update idCol=1
        // delete idCol=2
        // and insert one new
        model1Relation2: [{
          idCol: 1,
          model2Prop1: session.knex.raw("50 * 100"),

          // update id=4
          // delete id=5
          // and insert one new
          model2Relation1: [{
            id: 4,
            model1Prop1: session.knex.raw("30 * 100"),
          }, {
            // This is the new row.
            model1Prop1: Model2.query(session.knex).min('id_col')
          }]
        }, {
          // This is the new row.
          model2Prop1: session.knex('Model1').min('id').where('id', '>', 1),
        }]
      };

      return transaction(session.knex, trx => {
        return Model1
          .query(trx)
          .upsertGraph(upsert)
          .then(result => {
            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(2)
              .eager('[model1Relation1, model1Relation2.model2Relation1]')
              .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
              .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              id: 2,
              model1Id: 3,
              model1Prop1: "30",

              model1Relation1: {
                id: 3,
                model1Id: null,
                model1Prop1: "1",
              },

              model1Relation2: [{
                idCol: 1,
                model1Id: 2,
                model2Prop1: "5000",

                model2Relation1: [{
                  id: 4,
                  model1Id: null,
                  model1Prop1: "3000",
                }, {
                  id: 8,
                  model1Id: null,
                  model1Prop1: "1",
                }]
              }, {
                idCol: 3,
                model1Id: 2,
                model2Prop1: "2",
                model2Relation1: []
              }]
            });

            return Promise.all([
              trx('Model1'),
              trx('model_2')
            ])
            .spread((model1Rows, model2Rows) => {
              // Row 5 should be deleted.
              expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
              // Row 6 should NOT be deleted even thought its parent is.
              expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
              // Row 7 should NOT be deleted  even thought its parent is.
              expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
              // Row 2 should be deleted.
              expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
            });
          });
      });
    });

    describe('validation and transactions', () => {

      before(() => {
        Model1.$$jsonSchema = {
          type: 'object',
          required: ['model1Prop1', 'model1Prop2'],

          properties: {
            model1Prop1: {type: ['string', 'null']},
            model1Prop2: {type: ['integer', 'null']}
          }
        };
      });

      after(() => {
        delete Model1.$$jsonSchema;
      });

      it('should validate (also tests transactions)', () => {
        const fails = [{
          id: 2,
          // This fails because of invalid type.
          model1Prop1: 100,

          model1Relation1: {
            id: 3,
            model1Prop1: 'updated belongsToOne'
          },

          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'updated hasMany 1',

            model2Relation1: [{
              id: 4,
              model1Prop1: 'updated manyToMany 1'
            }, {
              model1Prop1: 'inserted manyToMany',
              model1Prop2: 10
            }]
          }, {
            model2Prop1: 'inserted hasMany'
          }]
        }, {
          id: 2,
          model1Prop1: 'updated root 2',

          model1Relation1: {
            id: 3,
            // This fails because of invalid type.
            model1Prop1: 100,
          },

          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'updated hasMany 1',

            model2Relation1: [{
              id: 4,
              model1Prop1: 'updated manyToMany 1'
            }, {
              model1Prop1: 'inserted manyToMany',
              model1Prop2: 10
            }]
          }, {
            model2Prop1: 'inserted hasMany'
          }]
        }, {
          id: 2,
          model1Prop1: 'updated root 2',

          model1Relation1: {
            id: 3,
            model1Prop1: 'updated belongsToOne'
          },

          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'updated hasMany 1',

            model2Relation1: [{
              id: 4,
              model1Prop1: 'updated manyToMany 1'
            }, {
              // This is the new row that fails because of invalid type.
              model1Prop1: 100,
              model1Prop2: 10
            }]
          }, {
            model2Prop1: 'inserted hasMany'
          }]
        }];

        const success = {
          // the root gets updated because it has an id
          id: 2,
          model1Prop1: 'updated root 2',

          // update
          model1Relation1: {
            id: 3,
            model1Prop1: 'updated belongsToOne'
          },

          // update idCol=1
          // delete idCol=2
          // and insert one new
          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'updated hasMany 1',

            // update id=4
            // delete id=5
            // and insert one new
            model2Relation1: [{
              id: 4,
              model1Prop1: 'updated manyToMany 1'
            }, {
              // This is the new row.
              model1Prop1: 'inserted manyToMany',
              model1Prop2: 10
            }]
          }, {
            // This is the new row.
            model2Prop1: 'inserted hasMany',
          }]
        };

        return Promise.map(fails, fail => {
          return transaction(session.knex, trx => Model1.query(trx).upsertGraph(fail)).reflect();
        }).then(results => {
          // Check that all transactions have failed because of a validation error.
          results.forEach(res => {
            expect(res.isRejected()).to.equal(true);
            expect(res.reason().data.model1Prop1[0].message).to.equal('should be string,null')
          });

          return Model1
            .query(session.knex)
            .orderBy('id')
            .whereIn('id', [1, 2])
            .eager('[model1Relation1, model1Relation2.model2Relation1]')
            .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
            .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'));

        }).then(db => {
          // Check that the transactions worked and the database was in no way modified.
          expect(omitIrrelevantProps(db)).to.eql(population);

          return transaction(session.knex, trx => {
            return Model1
              .query(trx)
              .upsertGraph(success)
              .then(result => {
                // Fetch the graph from the database.
                return Model1
                  .query(trx)
                  .findById(2)
                  .eager('[model1Relation1, model1Relation2.model2Relation1]')
                  .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
                  .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
              })
              .then(omitIrrelevantProps)
              .then(omitIds)
              .then(result => {
                expect(result).to.eql({
                  model1Id: 3,
                  model1Prop1: "updated root 2",

                  model1Relation1: {
                    model1Id: null,
                    model1Prop1: "updated belongsToOne",
                  },

                  model1Relation2: [{
                    model1Id: 2,
                    model2Prop1: "updated hasMany 1",

                    model2Relation1: [{
                      model1Id: null,
                      model1Prop1: "updated manyToMany 1",
                    }, {
                      model1Id: null,
                      model1Prop1: "inserted manyToMany",
                    }]
                  }, {
                    model1Id: 2,
                    model2Prop1: "inserted hasMany",
                    model2Relation1: []
                  }]
                });

                return Promise.all([
                  trx('Model1'),
                  trx('model_2')
                ])
                .spread((model1Rows, model2Rows) => {
                  // Row 5 should be deleted.
                  expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
                  // Row 6 should NOT be deleted even thought its parent is.
                  expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
                  // Row 7 should NOT be deleted  even thought its parent is.
                  expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
                  // Row 2 should be deleted.
                  expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
                });
              });
          });
        });
      });

    });

    // tests TODO:
    //
    // * composite keys

  });

  function omitIrrelevantProps(model) {
    const delProps = ['model1Prop2', 'model2Prop2', 'aliasedExtra', '$afterGetCalled'];

    Model1.traverse(model, (model) => {
      delProps.forEach(prop => delete model[prop])
    });

    return model;
  }

  function omitIds(model) {
    const delProps = ['id', 'idCol'];

    Model1.traverse(model, (model) => {
      delProps.forEach(prop => delete model[prop])
    });

    return model;
  }

};