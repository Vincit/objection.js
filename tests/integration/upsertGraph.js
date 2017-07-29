'use strict';

const expect = require('expect.js');
const Promise = require('bluebird');
const transaction = require('../../').transaction;
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = (session) => {
  const Model1 = session.unboundModels.Model1;
  const NONEXISTENT_ID = 1000;

  describe('upsertGraph', () => {

    beforeEach(() => {
      return session.populate([{
        id: 1,
        model1Prop1: 'root 1'
      }, {
        id: 2,
        model1Prop1: 'root 2',
        
        // This is a BelongsToOneRelation
        model1Relation1: {
          id: 3,
          model1Prop1: 'belongsToOne'
        },

        // This is a HasManyRelation
        model1Relation2: [{
          idCol: 1,
          model2Prop1: 'hasMany 1',

          // This is a ManyToManyRelation
          model2Relation1: [{
            id: 4,
            model1Prop1: 'manyToMany 1'
          }, {
            id: 5,
            model1Prop1: 'manyToMany 2'
          }]
        }, {
          idCol: 2,
          model2Prop1: 'hasMany 2',

          // This is a ManyToManyRelation
          model2Relation1: [{
            id: 6,
            model1Prop1: 'manyToMany 3'
          }, {
            id: 7,
            model1Prop1: 'manyToMany 4'
          }]
        }]
      }]);
    });

    it('by default, should insert new, update existing and delete missing', () => {
      const upsert = {
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
          .then(result => {
            if (session.isPostgres()) {
              expect(sql).to.eql([ 
                'select "Model1"."model1Id", "Model1"."id" from "Model1" where "Model1"."id" in (2)',
                'select "Model1"."id" from "Model1" where "Model1"."id" in (3)',
                'select "model_2"."model_1_id", "model_2"."id_col" from "model_2" where "model_2"."model_1_id" in (2)',
                'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1Model2"."model1Id" = "Model1"."id" where "Model1Model2"."model2Id" in (2, 1)',

                'delete from "model_2" where "model_2"."id_col" in (2) and "model_2"."model_1_id" in (2)',
                'delete from "Model1" where "Model1"."id" in (5) and "Model1"."id" in (select "Model1Model2"."model1Id" from "Model1Model2" where "Model1Model2"."model2Id" = 1)',

                'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                'insert into "model_2" ("model_1_id", "model_2_prop_1") values (2, \'inserted hasMany\') returning "id_col"',
                'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1) returning "model1Id"',

                'update "Model1" set "id" = 2, "model1Id" = 3, "model1Prop1" = \'updated root 2\' where "Model1"."id" = 2',
                'update "Model1" set "id" = 3, "model1Prop1" = \'updated belongsToOne\' where "Model1"."id" = 3 and "Model1"."id" in (3)',
                'update "model_2" set "id_col" = 1, "model_1_id" = 2, "model_2_prop_1" = \'updated hasMany 1\' where "model_2"."id_col" = 1 and "model_2"."model_1_id" in (2)',
                'update "Model1" set "id" = 4, "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" = 4 and "Model1"."id" in (select "Model1Model2"."model1Id" from "Model1Model2" where "Model1Model2"."model2Id" = 1)' 
              ]);
            }

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
              model1Prop1: "updated root 2",

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
              // Row 2 should be deleted.
              expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
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
        expect(err.message).to.equal('model (id=1000) is not a child of model (id=2). If you want to relate it, use the relate: true option');
        return session.knex('Model1').whereIn('model1Prop1', ['updated root 2', 'inserted belongsToOne']);
      }).then(rows => {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);
    });

    // tests TODO:
    // 
    // * validations for updates and inserts
    // * hooks
    // * transaction
    // * composite keys
    // * with and without foreign keys in the input graph
    // * ids in relations that don't belong there
    // * works if id is generated in beforeInsert
    // * raw and subqueries

  });

  function omitIrrelevantProps(model) {
    const delProps = ['model1Prop2', 'model2Prop2', 'aliasedExtra', '$afterGetCalled'];
    // Remove a bunch of useless columns so that they don't uglify the following assert.
    Model1.traverse(model, (model) => delProps.forEach(prop => delete model[prop]));
    
    return model;
  }

};