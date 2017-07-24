'use strict';

const expect = require('expect.js');
const Promise = require('bluebird');
const transaction = require('../../').transaction;

const UpsertGraph = require('../../lib/queryBuilder/graphUpserter/UpsertGraph');

module.exports = (session) => {
  const Model1 = session.models.Model1;

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
          .then(result => {
            const delProps = ['model1Prop2', 'model2Prop2', 'aliasedExtra', '$afterGetCalled'];
            // Remove a bunch of useless columns so that they don't uglify the following assert.
            Model1.traverse(result, (model) => delProps.forEach(prop => delete model[prop]));

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
              // Row 5 should be deleted.
              expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
              // Row 2 should be deleted.
              expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
            });
          });
      });
    });

    it('should insert new, update existing and unrelate missing if `unrelate` option is true', () => {
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
          .upsertGraph(upsert, {unrelate: true})
          .then(result => {
            // Fetch the graph from the database.
            return Model1
              .query(trx)
              .findById(2)
              .eager('[model1Relation1, model1Relation2.model2Relation1]')
              .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
              .modifyEager('model1Relation2.model2Relation1', qb => qb.orderBy('id'))
          })
          .then(result => {
            const delProps = ['model1Prop2', 'model2Prop2', 'aliasedExtra', '$afterGetCalled'];
            // Remove a bunch of useless columns so that they don't uglify the following assert.
            Model1.traverse(result, (model) => delProps.forEach(prop => delete model[prop]));

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

    // tests TODO:
    // 
    // * validations for updates and inserts
    // * hooks
    // * transaction
    // * composite keys
    // * with and without foreign keys in the input graph
    // * ids in relations that don't belong there
    // * works if id is generated in beforeInsert

  });

};