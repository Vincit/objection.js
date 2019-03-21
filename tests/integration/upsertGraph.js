const expect = require('expect.js');
const chai = require('chai');
const Promise = require('bluebird');
const { raw, transaction, ValidationError } = require('../../');
const { FetchStrategy } = require('../../lib/queryBuilder/graph/GraphOptions');
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = session => {
  const Model1 = session.unboundModels.Model1;
  const Model2 = session.unboundModels.Model2;
  const NONEXISTENT_ID = 1000;

  for (const fetchStrategy of Object.keys(FetchStrategy)) {
    describe(`upsertGraph (fetchStrategy: ${fetchStrategy})`, () => {
      let population;

      beforeEach(() => {
        population = [
          {
            id: 1,
            model1Id: null,
            model1Prop1: 'root 1',

            model1Relation1: null,
            model1Relation2: []
          },
          {
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
            model1Relation2: [
              {
                idCol: 1,
                model1Id: 2,
                model2Prop1: 'hasMany 1',

                // This is a ManyToManyRelation
                model2Relation1: [
                  {
                    id: 4,
                    model1Id: null,
                    model1Prop1: 'manyToMany 1'
                  },
                  {
                    id: 5,
                    model1Id: null,
                    model1Prop1: 'manyToMany 2'
                  }
                ]
              },
              {
                idCol: 2,
                model1Id: 2,
                model2Prop1: 'hasMany 2',

                // This is a ManyToManyRelation
                model2Relation1: [
                  {
                    id: 6,
                    model1Id: null,
                    model1Prop1: 'manyToMany 3'
                  },
                  {
                    id: 7,
                    model1Id: null,
                    model1Prop1: 'manyToMany 4'
                  }
                ]
              }
            ]
          }
        ];

        return session.populate(population);
      });

      it('should do nothing if an empty array is given', () => {
        return Promise.all([
          Model1.query(session.knex).upsertGraph([]),
          Model1.query(session.knex).upsertGraphAndFetch([])
        ]);
      });

      for (const passthroughMethodCall of [null, 'forUpdate', 'forShare']) {
        const passthroughMethodCallSql = {
          null: '',
          forUpdate: ' for update',
          forShare: ' for share'
        };

        it(
          'by default, should insert new, update existing and delete missing' +
            (passthroughMethodCall ? ` (${passthroughMethodCall})` : ''),
          () => {
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
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'updated hasMany 1',

                  // update id=4
                  // delete id=5
                  // and insert one new
                  model2Relation1: [
                    {
                      // This is a string instead of a number on purpose to test
                      // that no id update is generated even if they only match
                      // non-strictly.
                      id: '4',
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      // This is the new row.
                      model1Prop1: 'inserted manyToMany'
                    }
                  ]
                },
                {
                  // This is the new row.
                  model2Prop1: 'inserted hasMany'
                }
              ]
            };

            return transaction(session.knex, trx => {
              const sql = [];

              // Wrap the transaction to catch the executed sql.
              trx = mockKnexFactory(trx, function(mock, oldImpl, args) {
                sql.push(this.toString());
                return oldImpl.apply(this, args);
              });

              return (
                Model1.query(trx)
                  .upsertGraph(upsert, { fetchStrategy })
                  .modify(builder => {
                    if (passthroughMethodCall) {
                      builder[passthroughMethodCall]();
                    }
                  })
                  // Sort all result by id to make the SQL we test below consistent.
                  .mergeContext({
                    onBuild(builder) {
                      if (!builder.isFind()) {
                        return;
                      }

                      if (builder.modelClass().getTableName() === 'Model1') {
                        builder.orderBy('Model1.id');
                      } else if (builder.modelClass().getTableName() === 'model2') {
                        builder.orderBy('model2.id_col');
                      }
                    }
                  })
                  .then(result => {
                    expect(sql.length).to.equal(12);

                    if (session.isPostgres()) {
                      if (fetchStrategy === FetchStrategy.OnlyIdentifiers) {
                        chai
                          .expect(sql)
                          .to.containSubset([
                            'select "Model1"."id", "Model1"."model1Id" from "Model1" where "Model1"."id" in (2) order by "Model1"."id" asc' +
                              passthroughMethodCallSql[passthroughMethodCall],
                            'select "Model1"."id" from "Model1" where "Model1"."id" in (3) order by "Model1"."id" asc',
                            'select "model2"."model1_id", "model2"."id_col" from "model2" where "model2"."model1_id" in (2) order by "model2"."id_col" asc',
                            'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2) order by "Model1"."id" asc',

                            'delete from "model2" where "model2"."id_col" in (2) and "model2"."model1_id" in (2)',
                            'delete from "Model1" where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" in (5) order by "Model1"."id" asc)',

                            'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                            'insert into "model2" ("model1_id", "model2_prop1") values (2, \'inserted hasMany\') returning "id_col"',
                            'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1) returning "model1Id"',

                            'update "Model1" set "model1Prop1" = \'updated belongsToOne\' where "Model1"."id" = 3 and "Model1"."id" in (3)',
                            'update "Model1" set "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" = \'4\' order by "Model1"."id" asc)',
                            'update "model2" set "model2_prop1" = \'updated hasMany 1\' where "model2"."id_col" = 1'
                          ]);
                      } else if (fetchStrategy === FetchStrategy.Everything) {
                        chai
                          .expect(sql)
                          .to.containSubset([
                            'select "Model1".* from "Model1" where "Model1"."id" in (2) order by "Model1"."id" asc' +
                              passthroughMethodCallSql[passthroughMethodCall],
                            'select "Model1".* from "Model1" where "Model1"."id" in (3) order by "Model1"."id" asc',
                            'select "model2".* from "model2" where "model2"."model1_id" in (2) order by "model2"."id_col" asc',
                            'select "Model1".*, "Model1Model2"."extra3" as "aliasedExtra", "Model1Model2"."model2Id" as "objectiontmpjoin0" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2) order by "Model1"."id" asc',

                            'delete from "model2" where "model2"."id_col" in (2) and "model2"."model1_id" in (2)',
                            'delete from "Model1" where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" in (5) order by "Model1"."id" asc)',

                            'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                            'insert into "model2" ("model1_id", "model2_prop1") values (2, \'inserted hasMany\') returning "id_col"',
                            'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1) returning "model1Id"',

                            'update "Model1" set "model1Prop1" = \'updated belongsToOne\' where "Model1"."id" = 3 and "Model1"."id" in (3)',
                            'update "Model1" set "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" = \'4\' order by "Model1"."id" asc)',
                            'update "model2" set "model2_prop1" = \'updated hasMany 1\' where "model2"."id_col" = 1'
                          ]);
                      } else if (fetchStrategy === FetchStrategy.OnlyNeeded) {
                        chai
                          .expect(sql)
                          .to.containSubset([
                            'select "Model1"."id", "Model1"."model1Id" from "Model1" where "Model1"."id" in (2) order by "Model1"."id" asc' +
                              passthroughMethodCallSql[passthroughMethodCall],
                            'select "Model1"."id", "Model1"."model1Prop1" from "Model1" where "Model1"."id" in (3) order by "Model1"."id" asc',
                            'select "model2"."model1_id", "model2"."id_col", "model2"."model2_prop1" from "model2" where "model2"."model1_id" in (2) order by "model2"."id_col" asc',
                            'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1"."id", "Model1"."model1Prop1" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2) order by "Model1"."id" asc',

                            'delete from "model2" where "model2"."id_col" in (2) and "model2"."model1_id" in (2)',
                            'delete from "Model1" where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" in (5) order by "Model1"."id" asc)',

                            'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                            'insert into "model2" ("model1_id", "model2_prop1") values (2, \'inserted hasMany\') returning "id_col"',
                            'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1) returning "model1Id"',

                            'update "Model1" set "model1Prop1" = \'updated belongsToOne\' where "Model1"."id" = 3 and "Model1"."id" in (3)',
                            'update "Model1" set "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" = \'4\' order by "Model1"."id" asc)',
                            'update "model2" set "model2_prop1" = \'updated hasMany 1\' where "model2"."id_col" = 1'
                          ]);
                      }
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

                    expect(
                      result.model1Relation2[0].model2Relation1[0].$beforeUpdateCalled
                    ).to.equal(1);
                    expect(
                      result.model1Relation2[0].model2Relation1[0].$afterUpdateCalled
                    ).to.equal(1);

                    expect(
                      result.model1Relation2[0].model2Relation1[1].$beforeInsertCalled
                    ).to.equal(1);
                    expect(
                      result.model1Relation2[0].model2Relation1[1].$afterInsertCalled
                    ).to.equal(1);

                    // Fetch the graph from the database.
                    return Model1.query(trx)
                      .findById(2)
                      .eager(
                        '[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]'
                      );
                  })
                  .then(omitIrrelevantProps)
                  .then(result => {
                    expect(result).to.eql({
                      id: 2,
                      model1Id: 3,
                      model1Prop1: 'root 2',

                      model1Relation1: {
                        id: 3,
                        model1Id: null,
                        model1Prop1: 'updated belongsToOne'
                      },

                      model1Relation2: [
                        {
                          idCol: 1,
                          model1Id: 2,
                          model2Prop1: 'updated hasMany 1',

                          model2Relation1: [
                            {
                              id: 4,
                              model1Id: null,
                              model1Prop1: 'updated manyToMany 1'
                            },
                            {
                              id: 8,
                              model1Id: null,
                              model1Prop1: 'inserted manyToMany'
                            }
                          ]
                        },
                        {
                          idCol: 3,
                          model1Id: 2,
                          model2Prop1: 'inserted hasMany',
                          model2Relation1: []
                        }
                      ]
                    });

                    return Promise.all([trx('Model1'), trx('model2')]).spread(
                      (model1Rows, model2Rows) => {
                        // Row 5 should be deleted.
                        expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
                        // Row 6 should NOT be deleted even thought its parent is.
                        expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
                        // Row 7 should NOT be deleted  even thought its parent is.
                        expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
                        // Row 2 should be deleted.
                        expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
                      }
                    );
                  })
              );
            });
          }
        );
      }

      it('should respect noDelete, noInsert and noUpdate flags', () => {
        const upsert = {
          // Nothing is done for the root since it only has an ids.
          id: 2,
          model1Id: 3,

          // don't update because of `noUpdate`
          model1Relation1: {
            id: 3,
            model1Prop1: 'updated belongsToOne'
          },

          // update idCol=1
          // don't delete idCol=2 because of `noDelete`
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // delete id=5
              // don't insert new row because `noInsert`
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, {
              fetchStrategy,
              noUpdate: ['model1Relation1'],
              noDelete: ['model1Relation2'],
              noInsert: ['model1Relation2.model2Relation1']
            })
            .then(() => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 3,
                model1Prop1: 'root 2',

                model1Relation1: {
                  // Not updated.
                  id: 3,
                  model1Id: null,
                  model1Prop1: 'belongsToOne'
                },

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'updated hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: 'updated manyToMany 1'
                      }
                    ]
                  },
                  {
                    // Not deleted.
                    idCol: 2,
                    model1Id: 2,
                    model2Prop1: 'hasMany 2',

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: null,
                        model1Prop1: 'manyToMany 3'
                      },
                      {
                        id: 7,
                        model1Id: null,
                        model1Prop1: 'manyToMany 4'
                      }
                    ]
                  },
                  {
                    idCol: 3,
                    model1Id: 2,
                    model2Prop1: 'inserted hasMany',
                    model2Relation1: []
                  }
                ]
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
                  // Row 5 should be deleted.
                  expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
                  // Row 6 should NOT be deleted even thought its parent is.
                  expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
                  // Row 7 should NOT be deleted  even thought its parent is.
                  expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
                  // Row 2 should NOT be deleted because of `noDelete`.
                  expect(model2Rows.find(it => it.id_col == 2)).to.be.an(Object);
                }
              );
            });
        });
      });

      it('should update model if belongsToOne relation changes', () => {
        const upsert = {
          id: 1,
          // This causes the parent model's model1Id to change
          // which in turn should cause the parent to get updated.
          model1Relation1: { id: 3 }
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { relate: true, fetchStrategy })
            .then(result => {
              expect(result.$beforeUpdateCalled).to.equal(1);
              expect(result.$afterUpdateCalled).to.equal(1);

              expect(result.model1Relation1.$beforeUpdateCalled).to.equal(undefined);
              expect(result.model1Relation1.$afterUpdateCalled).to.equal(undefined);
            });
        })
          .then(() => {
            return Model1.query(session.knex).findById(1);
          })
          .then(model => {
            expect(model.model1Id).to.equal(3);
          });
      });

      it('should work with an empty object in belongsToOne relation', () => {
        const upsert = {
          model1Relation1: {}
        };

        return transaction(session.knex, trx =>
          Model1.query(trx).upsertGraph(upsert, { fetchStrategy })
        )
          .then(inserted =>
            Model1.query(session.knex)
              .findById(inserted.id)
              .eager('model1Relation1')
          )
          .then(model => {
            chai.expect(model).to.containSubset({
              model1Prop1: null,
              model1Prop2: null,
              model1Relation1: {
                model1Prop1: null,
                model1Prop2: null
              }
            });
          });
      });

      it('should work with an empty object in hasOne relation', () => {
        const upsert = {
          model1Relation1Inverse: {}
        };

        return transaction(session.knex, trx =>
          Model1.query(trx).upsertGraph(upsert, { fetchStrategy })
        )
          .then(inserted =>
            Model1.query(session.knex)
              .findById(inserted.id)
              .eager('model1Relation1Inverse')
          )
          .then(model => {
            chai.expect(model).to.containSubset({
              model1Prop1: null,
              model1Prop2: null,
              model1Relation1Inverse: {
                model1Prop1: null,
                model1Prop2: null
              }
            });
          });
      });

      it('should update model if the model changes and a belongsToOne relation changes', () => {
        const upsert = {
          id: 1,
          model1Prop1: 'updated',
          // This causes the parent model's model1Id to change
          // which in turn should cause the parent to get updated.
          model1Relation1: { id: 3 }
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { relate: true, fetchStrategy })
            .then(result => {
              expect(result.$beforeUpdateCalled).to.equal(1);
              expect(result.$afterUpdateCalled).to.equal(1);

              expect(result.model1Relation1.$beforeUpdateCalled).to.equal(undefined);
              expect(result.model1Relation1.$afterUpdateCalled).to.equal(undefined);
            });
        })
          .then(() => {
            return Model1.query(session.knex).findById(1);
          })
          .then(model => {
            expect(model.model1Id).to.equal(3);
            expect(model.model1Prop1).to.equal('updated');
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
          return Model1.query(trx)
            .upsertGraph(upsert, { fetchStrategy })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
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

      it('should upsert a model with relations and fetch the upserted graph', () => {
        const upsert = {
          id: 2,
          model1Id: 3,
          model1Relation1: {
            id: 3,
            model1Prop1: 'updated belongsToOne'
          },
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  model1Prop1: 'inserted manyToMany'
                }
              ]
            },
            {
              model2Prop1: 'inserted hasMany'
            }
          ]
        };
        return transaction(session.knex, trx => {
          return Model1.query(trx).upsertGraphAndFetch(upsert, { fetchStrategy });
        }).then(upserted => {
          return Model1.query(session.knex)
            .eager('[model1Relation1, model1Relation2.model2Relation1]')
            .findById(upserted.id)
            .then(fetched => {
              expect(upserted.$toJson()).to.eql(fetched.$toJson());
            });
        });
      });

      it('should insert new, update existing relate unrelated and unrelate missing if `unrelate` and `relate` options are true', () => {
        const upsert = {
          // the root gets updated because it has an id
          id: 2,
          model1Prop1: 'updated root 2',

          // unrelate
          model1Relation1: null,

          // update idCol=1
          // unrelate idCol=2
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // unrelate id=5
              // relate id=6
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                },
                {
                  // This will get related because it has an id
                  // that doesn't currently exist in the relation.
                  id: 6
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          const sql = [];

          // Wrap the transaction to catch the executed sql.
          trx = mockKnexFactory(trx, function(mock, oldImpl, args) {
            sql.push(this.toString());
            return oldImpl.apply(this, args);
          });

          return (
            Model1.query(trx)
              .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
              // Sort all result by id to make the SQL we test below consistent.
              .mergeContext({
                onBuild(builder) {
                  if (!builder.isFind()) {
                    return;
                  }

                  if (builder.modelClass().getTableName() === 'Model1') {
                    builder.orderBy('Model1.id');
                  } else if (builder.modelClass().getTableName() === 'model2') {
                    builder.orderBy('model2.id_col');
                  }
                }
              })
              .then(result => {
                expect(result.model1Relation2[0].model2Relation1[2].$beforeUpdateCalled).to.equal(
                  undefined
                );

                if (session.isPostgres()) {
                  expect(sql.length).to.equal(12);

                  if (fetchStrategy === FetchStrategy.OnlyIdentifiers) {
                    chai
                      .expect(sql)
                      .to.containSubset([
                        'select "Model1"."id", "Model1"."model1Id" from "Model1" where "Model1"."id" in (2) order by "Model1"."id" asc',
                        'select "Model1"."id" from "Model1" where "Model1"."id" in (3) order by "Model1"."id" asc',
                        'select "model2"."model1_id", "model2"."id_col" from "model2" where "model2"."model1_id" in (2) order by "model2"."id_col" asc',
                        'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2) order by "Model1"."id" asc',

                        'delete from "Model1Model2" where "Model1Model2"."model1Id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" in (5) order by "Model1"."id" asc) and "Model1Model2"."model2Id" = 1',
                        'update "model2" set "model1_id" = NULL where "model2"."id_col" in (2) and "model2"."model1_id" = 2',

                        'insert into "Model1" ("model1Prop1") values (\'inserted manyToMany\') returning "id"',
                        'insert into "model2" ("model1_id", "model2_prop1") values (2, \'inserted hasMany\') returning "id_col"',
                        'insert into "Model1Model2" ("model1Id", "model2Id") values (8, 1), (6, 1) returning "model1Id"',

                        'update "Model1" set "model1Prop1" = \'updated root 2\', "model1Id" = NULL where "Model1"."id" = 2',
                        'update "Model1" set "model1Prop1" = \'updated manyToMany 1\' where "Model1"."id" in (select "Model1"."id" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1) and "Model1"."id" = 4 order by "Model1"."id" asc)',
                        'update "model2" set "model2_prop1" = \'updated hasMany 1\' where "model2"."id_col" = 1'
                      ]);
                  }
                }

                // Fetch the graph from the database.
                return Model1.query(trx)
                  .findById(2)
                  .eager(
                    '[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]'
                  );
              })
              .then(omitIrrelevantProps)
              .then(result => {
                expect(result).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'updated root 2',

                  model1Relation1: null,

                  model1Relation2: [
                    {
                      idCol: 1,
                      model1Id: 2,
                      model2Prop1: 'updated hasMany 1',

                      model2Relation1: [
                        {
                          id: 4,
                          model1Id: null,
                          model1Prop1: 'updated manyToMany 1'
                        },
                        {
                          id: 6,
                          model1Id: null,
                          model1Prop1: 'manyToMany 3'
                        },
                        {
                          id: 8,
                          model1Id: null,
                          model1Prop1: 'inserted manyToMany'
                        }
                      ]
                    },
                    {
                      idCol: 3,
                      model1Id: 2,
                      model2Prop1: 'inserted hasMany',
                      model2Relation1: []
                    }
                  ]
                });

                return Promise.all([trx('Model1'), trx('model2')]).spread(
                  (model1Rows, model2Rows) => {
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
                      model1_id: null,
                      model2_prop1: 'hasMany 2',
                      model2_prop2: null
                    });
                  }
                );
              })
          );
        });
      });

      it('should relate a HasManyRelation if `relate` option is true', () => {
        const BoundModel1 = Model1.bindKnex(session.knex);

        const upsert = {
          id: 1,

          // relate 1, 2
          // insert 'new'
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'also update'
            },
            {
              idCol: 2
            },
            {
              model2Prop1: 'new'
            }
          ]
        };

        return BoundModel1.query()
          .upsertGraph(upsert, { relate: true, fetchStrategy })
          .then(() => {
            return BoundModel1.query()
              .findById(1)
              .eager('model1Relation2');
          })
          .then(result => {
            expect(result.model1Relation2).to.have.length(3);

            chai.expect(result).to.containSubset({
              id: 1,
              model1Id: null,
              model1Prop1: 'root 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 1,
                  model2Prop1: 'also update'
                },
                {
                  idCol: 2,
                  model1Id: 1,
                  model2Prop1: 'hasMany 2'
                },
                {
                  model1Id: 1,
                  model2Prop1: 'new'
                }
              ]
            });
          });
      });

      it('should relate a HasManyRelation if #dbRef is used', () => {
        const BoundModel1 = Model1.bindKnex(session.knex);

        const upsert = {
          id: 1,

          // relate 1, 2
          // insert 'new'
          model1Relation2: [
            {
              '#dbRef': 1,
              model2Prop1: 'also update'
            },
            {
              '#dbRef': 2
            },
            {
              model2Prop1: 'new'
            }
          ]
        };

        return BoundModel1.query()
          .upsertGraph(upsert, { fetchStrategy })
          .then(() => {
            return BoundModel1.query()
              .findById(1)
              .eager('model1Relation2');
          })
          .then(result => {
            expect(result.model1Relation2).to.have.length(3);

            chai.expect(result).to.containSubset({
              id: 1,
              model1Id: null,
              model1Prop1: 'root 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 1,
                  model2Prop1: 'also update'
                },
                {
                  idCol: 2,
                  model1Id: 1,
                  model2Prop1: 'hasMany 2'
                },
                {
                  model1Id: 1,
                  model2Prop1: 'new'
                }
              ]
            });
          });
      });

      it('should also update if relate model has other properties than id', () => {
        const upsert = {
          id: 2,

          // unrelate idCol=2
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,

              // update id=4
              // unrelate id=5
              // relate id=6
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                },
                {
                  // This will get related because it has an id
                  // that doesn't currently exist in the relation.
                  // This should also get updated.
                  id: 6,
                  model1Prop1: 'related and updated manyToMany'
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
            .then(result => {
              expect(result.model1Relation2[0].model2Relation1[2].$beforeUpdateCalled).to.equal(1);

              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 3,
                model1Prop1: 'root 2',

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: 'updated manyToMany 1'
                      },
                      {
                        id: 6,
                        model1Id: null,
                        model1Prop1: 'related and updated manyToMany'
                      },
                      {
                        id: 8,
                        model1Id: null,
                        model1Prop1: 'inserted manyToMany'
                      }
                    ]
                  },
                  {
                    idCol: 3,
                    model1Id: 2,
                    model2Prop1: 'inserted hasMany',
                    model2Relation1: []
                  }
                ]
              });
            });
        });
      });

      it('should be able to modify previously set properties to be null', () => {
        const upsert = {
          id: 2,
          model1Prop1: null,
          model1Relation2: [
            {
              idCol: 1,
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: null
                }
              ]
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 3,
                model1Prop1: null,

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: null
                      }
                    ]
                  }
                ]
              });
            });
        });
      });

      it('should be able to automatically convert children that are plain JS objects into model instances', () => {
        const parent = Model1.fromJson({
          id: 2,
          model1Prop1: null
        });

        parent.model1Relation2 = [
          {
            idCol: 1,
            model2Relation1: [
              {
                id: 4,
                model1Prop1: null
              }
            ]
          }
        ];

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(parent, { unrelate: true, relate: true, fetchStrategy })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 3,
                model1Prop1: null,

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: null
                      }
                    ]
                  }
                ]
              });
            });
        });
      });

      it('should respect noRelate and noUnrelate flags', () => {
        const upsert = {
          // the root gets updated because it has an id
          id: 2,
          model1Prop1: 'updated root 2',

          // unrelate
          model1Relation1: null,

          // update idCol=1
          // don't unrelate idCol=2 because of `noUnrelate`
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // unrelate id=5
              // don't relate id=6 because of `noRelate`
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                },
                {
                  id: 6
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, {
              fetchStrategy,
              unrelate: true,
              relate: true,
              noUnrelate: ['model1Relation2'],
              noRelate: ['model1Relation2.model2Relation1']
            })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: null,
                model1Prop1: 'updated root 2',

                model1Relation1: null,

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'updated hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: 'updated manyToMany 1'
                      },
                      {
                        id: 8,
                        model1Id: null,
                        model1Prop1: 'inserted manyToMany'
                      }
                    ]
                  },
                  {
                    idCol: 2,
                    model1Id: 2,
                    model2Prop1: 'hasMany 2',

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: null,
                        model1Prop1: 'manyToMany 3'
                      },
                      {
                        id: 7,
                        model1Id: null,
                        model1Prop1: 'manyToMany 4'
                      }
                    ]
                  },
                  {
                    idCol: 3,
                    model1Id: 2,
                    model2Prop1: 'inserted hasMany',
                    model2Relation1: []
                  }
                ]
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
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
                    model1_id: 2,
                    model2_prop1: 'hasMany 2',
                    model2_prop2: null
                  });
                }
              );
            });
        });
      });

      it('should relate and unrelate some models if `unrelate` and `relate` are arrays of relation paths', () => {
        const upsert = {
          // the root gets updated because it has an id
          id: 2,
          model1Prop1: 'updated root 2',

          // unrelate
          model1Relation1: null,

          // update idCol=1
          // delete idCol=2
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // unrelate id=5
              // relate id=6
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                },
                {
                  // This will get related because it has an id
                  // that doesn't currently exist in the relation.
                  id: 6
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, {
              fetchStrategy,
              unrelate: ['model1Relation1', 'model1Relation2.model2Relation1'],
              relate: ['model1Relation2.model2Relation1']
            })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: null,
                model1Prop1: 'updated root 2',

                model1Relation1: null,

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: 'updated hasMany 1',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: 'updated manyToMany 1'
                      },
                      {
                        id: 6,
                        model1Id: null,
                        model1Prop1: 'manyToMany 3'
                      },
                      {
                        id: 8,
                        model1Id: null,
                        model1Prop1: 'inserted manyToMany'
                      }
                    ]
                  },
                  {
                    idCol: 3,
                    model1Id: 2,
                    model2Prop1: 'inserted hasMany',
                    model2Relation1: []
                  }
                ]
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
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

                  // Row 2 should be deleted.
                  expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
                }
              );
            });
        });
      });

      it('should update parent if a `BelongsToOne` relation changes (because the relation propery is in the parent)', () => {
        const upsert = {
          id: 1,
          // This is a BelongsToOneRelation
          model1Relation1: { id: 3 }
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { relate: true, unrelate: true, fetchStrategy })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(result.id)
                .eager('model1Relation1')
                .select('id')
                .modifyEager('model1Relation1', qb => qb.select('id'));
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 1,
                model1Relation1: {
                  id: 3
                }
              });
            });
        });
      });

      it('should update parent if a new `BelongsToOne` relation is inserted (because the relation propery is in the parent)', () => {
        const model1Prop1 = 'new';
        const upsert = {
          id: 1,
          // This is a BelongsToOneRelation
          model1Relation1: { model1Prop1 }
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { relate: true, unrelate: true, fetchStrategy })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(result.id)
                .eager('model1Relation1')
                .select('id')
                .modifyEager('model1Relation1', qb => qb.select('model1Prop1'));
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 1,
                model1Relation1: {
                  model1Prop1
                }
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
          return Model1.query(trx)
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('model1Relation1');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 8,
                model1Prop1: 'updated root 2',

                model1Relation1: {
                  id: 8,
                  model1Id: null,
                  model1Prop1: 'inserted belongsToOne'
                }
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(model1Rows => {
                // Row 3 should be deleted.
                expect(model1Rows.find(it => it.id == 3)).to.equal(undefined);
              });
            });
        });
      });

      it("should insert belongsToOneRelation if it's an array", () => {
        const upsert = {
          id: 2,

          // The model with id 3 should get deleted and this new one inserted.
          model1Relation1: [
            {
              model1Prop1: 'inserted belongsToOne'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('model1Relation1');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              chai.expect(result).to.containSubset({
                id: 2,

                model1Relation1: {
                  model1Prop1: 'inserted belongsToOne'
                }
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
                  // Row 3 should be deleted.
                  expect(model1Rows.find(it => it.id == 3)).to.equal(undefined);
                }
              );
            });
        });
      });

      it("should insert hasManyRelation if it's not an array", () => {
        const upsert = {
          id: 2,

          // Should delete idCol = 2
          // Should update idCol = 1
          model1Relation2: {
            idCol: 1,
            model2Prop1: 'updated'
          }
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('model1Relation2');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              chai.expect(result).to.containSubset({
                id: 2,

                model1Relation2: [
                  {
                    idCol: 1,
                    model2Prop1: 'updated'
                  }
                ]
              });

              return trx('model2').then(model2Rows => {
                // Row 2 should be deleted.
                expect(model2Rows.find(it => it.idCol == 2)).to.equal(undefined);
              });
            });
        });
      });

      it('should unrelate and relate belongsToOneRelation', () => {
        const upsert = {
          id: 2,

          // The model with id 3 should get unrelated and this new one related.
          model1Relation1: {
            id: 4
          }
        };

        const options = {
          fetchStrategy,
          unrelate: true,
          relate: true
        };

        return transaction(session.knex, trx => {
          const sql = [];

          // Wrap the transaction to catch the executed sql.
          trx = mockKnexFactory(trx, function(mock, oldImpl, args) {
            sql.push(this.toString());
            return oldImpl.apply(this, args);
          });

          return Model1.query(trx)
            .upsertGraph(upsert, options)
            .then(() => {
              if (fetchStrategy === FetchStrategy.OnlyIdentifiers) {
                expect(sql.length).to.equal(3);
              }

              if (session.isPostgres()) {
                if (fetchStrategy === FetchStrategy.OnlyIdentifiers) {
                  chai.expect(sql).to.containSubset([
                    'select "Model1"."id", "Model1"."model1Id" from "Model1" where "Model1"."id" in (2)',
                    'select "Model1"."id" from "Model1" where "Model1"."id" in (3)',
                    // There should only be one `model1Id` update here. If you see two, something is broken.
                    'update "Model1" set "model1Id" = 4 where "Model1"."id" = 2'
                  ]);
                }
              }

              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('model1Relation1');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 4,
                model1Prop1: 'root 2',

                model1Relation1: {
                  id: 4,
                  model1Id: null,
                  model1Prop1: 'manyToMany 1'
                }
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
                  // Row 3 should not be deleted.
                  expect(model1Rows.find(it => it.id == 3)).to.not.equal(undefined);
                }
              );
            });
        });
      });

      it('should not update other than the relation properties when belongsToOneRelation is inserted but the parent has noUpdate: true', () => {
        const upsert = {
          id: 2,

          model1Relation1: {
            id: 3,
            model1Prop1: 'this should not be written to db',

            // This should cause the id=3 to be updated with the new
            // model1Id property.
            model1Relation1: {
              model1Prop1: 'inserted'
            }
          }
        };

        return Model1.query(session.knex)
          .upsertGraph(upsert, {
            fetchStrategy,
            noUpdate: ['model1Relation1']
          })
          .then(() => {
            // Fetch the graph from the database.
            return Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation1.model1Relation1');
          })
          .then(result => {
            chai.expect(result).to.containSubset({
              id: 2,

              model1Relation1: {
                id: 3,
                model1Prop1: 'belongsToOne',

                model1Relation1: {
                  model1Prop1: 'inserted'
                }
              }
            });
          });
      });

      it('should not update other than the relation properties when belongsToOneRelation is related but the parent has noUpdate: true', () => {
        const upsert = {
          id: 2,

          model1Relation1: {
            id: 3,
            model1Prop1: 'this should not be written to db',

            // This should cause the id=3 to be updated with the new
            // model1Id property.
            model1Relation1: {
              id: 1
            }
          }
        };

        return Model1.query(session.knex)
          .upsertGraph(upsert, {
            fetchStrategy,
            noUpdate: ['model1Relation1'],
            relate: ['model1Relation1.model1Relation1']
          })
          .then(() => {
            // Fetch the graph from the database.
            return Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation1.model1Relation1');
          })
          .then(result => {
            chai.expect(result).to.containSubset({
              id: 2,

              model1Relation1: {
                id: 3,
                model1Prop1: 'belongsToOne',

                model1Relation1: {
                  id: 1,
                  model1Prop1: 'root 1'
                }
              }
            });
          });
      });

      it('should not update other than the relation properties when belongsToOneRelation is unrelated but the parent has noUpdate: true', () => {
        const upsert1 = {
          id: 2,

          model1Relation1: {
            id: 3,

            model1Relation1: {
              id: 1
            }
          }
        };

        const upsert2 = {
          id: 2,

          model1Relation1: {
            id: 3,
            model1Prop1: 'this should not be written to db',

            model1Relation1: null
          }
        };

        return Model1.query(session.knex)
          .upsertGraph(upsert1, {
            fetchStrategy,
            noUpdate: ['model1Relation1'],
            relate: ['model1Relation1.model1Relation1']
          })
          .then(() => {
            return Model1.query(session.knex).upsertGraph(upsert2, {
              fetchStrategy,
              noUpdate: ['model1Relation1'],
              unrelate: ['model1Relation1.model1Relation1']
            });
          })
          .then(() => {
            // Fetch the graph from the database.
            return Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation1.model1Relation1');
          })
          .then(result => {
            chai.expect(result).to.containSubset({
              id: 2,

              model1Relation1: {
                id: 3,
                model1Prop1: 'belongsToOne',

                model1Id: null,
                model1Relation1: null
              }
            });
          });
      });

      it('should insert with an id instead of throwing an error if `insertMissing` option is true', () => {
        const upsert = {
          id: 2,

          // update idCol=1
          // delete idCol=2
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // delete id=5
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row with an id.
                  id: 1000,
                  model1Prop1: 'inserted manyToMany'
                }
              ]
            },
            {
              // This is the new row with an id.
              idCol: 1000,
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx).upsertGraph(upsert, { insertMissing: true, fetchStrategy });
        })
          .then(() => {
            // Fetch the graph from the database.
            return Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation2(orderById).model2Relation1(orderById)');
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(result).to.eql({
              id: 2,
              model1Id: 3,
              model1Prop1: 'root 2',

              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 2,
                  model2Prop1: 'updated hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Id: null,
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      id: 1000,
                      model1Id: null,
                      model1Prop1: 'inserted manyToMany'
                    }
                  ]
                },
                {
                  idCol: 1000,
                  model1Id: 2,
                  model2Prop1: 'inserted hasMany',
                  model2Relation1: []
                }
              ]
            });
          });
      });

      it('should insert root model with an id instead of throwing an error if `insertMissing` option is true', () => {
        let upsert = {
          // This doesn't exist.
          id: NONEXISTENT_ID,
          model1Prop1: `updated root ${NONEXISTENT_ID}`,

          model1Relation1: {
            model1Prop1: 'inserted belongsToOne'
          }
        };

        const upsertAndCompare = () => {
          return transaction(session.knex, trx => {
            return Model1.query(trx).upsertGraph(upsert, { insertMissing: true, fetchStrategy });
          })
            .then(result => {
              // Fetch the graph from the database.
              return Model1.query(session.knex)
                .findById(NONEXISTENT_ID)
                .eager('model1Relation1');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: NONEXISTENT_ID,
                model1Prop1: `updated root ${NONEXISTENT_ID}`,
                model1Id: 8,
                model1Relation1: {
                  id: 8,
                  model1Id: null,
                  model1Prop1: 'inserted belongsToOne'
                }
              });
              // Change upsert to the result, for the 2nd upsertAndCompare()
              upsert = result;
            });
        };

        // Execute upsertAndCompare() twice, first to insert, then to update
        return upsertAndCompare().then(() => upsertAndCompare());
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
          return Model1.query(trx).upsertGraph(upsert, { fetchStrategy });
        })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err instanceof Model1.NotFoundError).to.equal(true);
            expect(err.message).to.equal(
              'root model (id=1000) does not exist. If you want to insert it with an id, use the insertMissing option'
            );
            expect(err.data.dataPath).to.eql([]);
            return session
              .knex('Model1')
              .whereIn('model1Prop1', ['updated root 2', 'inserted belongsToOne']);
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            done();
          })
          .catch(done);
      });

      it('should fail if given nonexistent id in a relation (without relate: true option)', done => {
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
          return Model1.query(trx).upsertGraph(upsert, { fetchStrategy });
        })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err instanceof Model1.NotFoundError).to.equal(true);
            expect(err.message).to.equal(
              'model (id=1000) is not a child of model (id=2). If you want to relate it, use the relate option. If you want to insert it with an id, use the insertMissing option'
            );
            expect(err.data.dataPath).to.eql(['model1Relation1']);
            return session
              .knex('Model1')
              .whereIn('model1Prop1', ['updated root 2', 'inserted belongsToOne']);
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            done();
          })
          .catch(done);
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
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: 'updated hasMany 1',

              // update id=4
              // unrelate id=5
              // relate id=6
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: 'updated manyToMany 1'
                },
                {
                  // This is the new row.
                  model1Prop1: 'inserted manyToMany'
                },
                {
                  // This will get related because it has an id
                  // that doesn't currently exist in the relation.
                  id: 6
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: 'inserted hasMany'
            }
          ]
        };

        // This should fail.
        return Model1.query(session.knex)
          .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
          .allowUpsert('[model1Relation1, model1Relation2]')
          .catch(err => {
            errors.push(err);

            // This should also fail.
            return Model1.query(session.knex)
              .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
              .allowUpsert('[model1Relation2.model2Relation1]');
          })
          .catch(err => {
            errors.push(err);

            // This should succeed.
            return Model1.query(session.knex)
              .upsertGraph(upsert, { unrelate: true, relate: true, fetchStrategy })
              .allowUpsert('[model1Relation1, model1Relation2.model2Relation1]');
          })
          .then(() => {
            // Fetch the graph from the database.
            return Model1.query(session.knex)
              .findById(2)
              .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
          })
          .then(omitIrrelevantProps)
          .then(result => {
            expect(errors.length).to.equal(2);

            errors.forEach(error => {
              expect(error).to.be.a(ValidationError);
              expect(error.type).to.equal('UnallowedRelation');
              expect(error.message).to.equal('trying to upsert an unallowed relation');
            });

            expect(result).to.eql({
              id: 2,
              model1Id: null,
              model1Prop1: 'updated root 2',

              model1Relation1: null,

              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 2,
                  model2Prop1: 'updated hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Id: null,
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      id: 6,
                      model1Id: null,
                      model1Prop1: 'manyToMany 3'
                    },
                    {
                      id: 8,
                      model1Id: null,
                      model1Prop1: 'inserted manyToMany'
                    }
                  ]
                },
                {
                  idCol: 3,
                  model1Id: 2,
                  model2Prop1: 'inserted hasMany',
                  model2Relation1: []
                }
              ]
            });

            return Promise.all([session.knex('Model1'), session.knex('model2')]).spread(
              (model1Rows, model2Rows) => {
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
                  model1_id: null,
                  model2_prop1: 'hasMany 2',
                  model2_prop2: null
                });
              }
            );
          });
      });

      it('raw sql and subqueries should work', () => {
        const upsert = {
          // the root gets updated because it has an id
          id: 2,
          model1Prop1: raw('10 + 20'),

          // update
          model1Relation1: {
            id: 3,
            model1Prop1: Model2.query(session.knex).min('id_col')
          },

          // update idCol=1
          // delete idCol=2
          // and insert one new
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: session.knex.raw('50 * 100'),

              // update id=4
              // delete id=5
              // and insert one new
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: session.knex.raw('30 * 100')
                },
                {
                  // This is the new row.
                  model1Prop1: Model2.query(session.knex).min('id_col')
                }
              ]
            },
            {
              // This is the new row.
              model2Prop1: session
                .knex('Model1')
                .min('id')
                .where('id', '>', 1)
            }
          ]
        };

        return transaction(session.knex, trx => {
          return Model1.query(trx)
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              // Fetch the graph from the database.
              return Model1.query(trx)
                .findById(2)
                .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(omitIrrelevantProps)
            .then(result => {
              expect(result).to.eql({
                id: 2,
                model1Id: 3,
                model1Prop1: '30',

                model1Relation1: {
                  id: 3,
                  model1Id: null,
                  model1Prop1: '1'
                },

                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 2,
                    model2Prop1: '5000',

                    model2Relation1: [
                      {
                        id: 4,
                        model1Id: null,
                        model1Prop1: '3000'
                      },
                      {
                        id: 8,
                        model1Id: null,
                        model1Prop1: '1'
                      }
                    ]
                  },
                  {
                    idCol: 3,
                    model1Id: 2,
                    model2Prop1: '2',
                    model2Relation1: []
                  }
                ]
              });

              return Promise.all([trx('Model1'), trx('model2')]).spread(
                (model1Rows, model2Rows) => {
                  // Row 5 should be deleted.
                  expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
                  // Row 6 should NOT be deleted even thought its parent is.
                  expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
                  // Row 7 should NOT be deleted  even thought its parent is.
                  expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
                  // Row 2 should be deleted.
                  expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
                }
              );
            });
        });
      });

      it('should delete belongsToOne relation and succesfully update parent after that', () => {
        // This tests that the parent update doesn't try to set
        // the foreign key back.
        const upsert = {
          id: 2,
          model1Prop1: 'update',
          model1Relation1: null
        };

        return Model1.query(session.knex)
          .upsertGraph(upsert, { fetchStrategy })
          .then(() => {
            return Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation1');
          })
          .then(result => {
            expect(result.model1Relation1).to.equal(null);
            return Model1.query(session.knex).findById(3);
          })
          .then(result => {
            expect(result).to.equal(undefined);
          });
      });

      it('The internal select queries should return true from `isInternal`', () => {
        const upsert = Model1.fromJson({
          id: 2,
          model1Prop1: 'update',
          model1Relation1: null
        });

        let findQueryCount = 0;

        return Model1.query(session.knex)
          .upsertGraph(upsert, { fetchStrategy })
          .context({
            runBefore(_, builder) {
              if (builder.isFind() && builder.isExecutable()) {
                findQueryCount++;
                expect(builder.isInternal()).to.equal(true);
              }
            }
          })
          .then(() => {
            const fetchQuery = Model1.query(session.knex)
              .findById(2)
              .eager('model1Relation1');

            expect(findQueryCount).to.equal(2);
            expect(fetchQuery.isInternal()).to.equal(false);
            return fetchQuery;
          });
      });

      it('should throw a sensible error if a non-object is passed in as the root', done => {
        Model1.bindKnex(session.knex)
          .query()
          .upsertGraph('not a model')
          .then(() => {
            throw new Error('should not get here');
          })
          .catch(err => {
            expect(err.type).to.equal('InvalidGraph');
            expect(err.message).to.equal(
              'expected value "not a model" to be an instance of Model1'
            );
            done();
          })
          .catch(done);
      });

      it('should throw a sensible error if a non-object is passed in a belongs to one relation', done => {
        Model1.bindKnex(session.knex)
          .query()
          .upsertGraph(
            {
              id: 1,
              model1Relation1: 'not an object'
            },
            {
              fetchStrategy
            }
          )
          .then(() => {
            throw new Error('should not get here');
          })
          .catch(err => {
            expect(err.type).to.equal('InvalidGraph');
            expect(err.message).to.equal(
              'expected value "not an object" to be an instance of Model1'
            );
            done();
          })
          .catch(done);
      });

      it('should throw a sensible error if a non-object is passed in a has many relation', done => {
        Model1.bindKnex(session.knex)
          .query()
          .upsertGraph(
            {
              id: 1,
              model1Relation2: ['not an object']
            },
            {
              fetchStrategy
            }
          )
          .then(() => {
            throw new Error('should not get here');
          })
          .catch(err => {
            expect(err.type).to.equal('InvalidGraph');
            expect(err.message).to.equal(
              'expected value "not an object" to be an instance of Model2'
            );
            done();
          })
          .catch(done);
      });

      if (fetchStrategy !== FetchStrategy.OnlyIdentifiers) {
        describe('fetchStrategy != OnlyIdentifiers', () => {
          it('should fetch all properties and avoid useless update operations if fetchStrategy != OnlyIdentifiers', () => {
            // This is exactly the current graph, except for the couple of commented changes.
            const graph = {
              id: 2,
              model1Id: 3,
              model1Prop1: 'root 2',

              model1Relation1: {
                id: 3,
                model1Id: null,
                model1Prop1: 'belongsToOne'
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 2,
                  model2Prop1: 'hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Id: null,
                      model1Prop1: 'manyToMany 1'
                    },
                    {
                      id: 5,
                      model1Id: null,
                      model1Prop1: 'manyToMany 2',
                      aliasedExtra: null
                    }
                  ],

                  // This should get inserted.
                  model2Relation3: [
                    {
                      model3Prop1: 'hello',
                      model3JsonProp: {
                        foo: 'heps',
                        bar: [
                          {
                            spam: true
                          },
                          {
                            spam: false
                          }
                        ]
                      }
                    }
                  ]
                },
                {
                  idCol: 2,
                  model1Id: 2,
                  model2Prop1: 'hasMany 2',

                  model2Relation1: [
                    // This should get updated.
                    {
                      id: 6,
                      model1Id: null,
                      model1Prop1: 'manyToMany 33'
                    },
                    {
                      id: 7,
                      model1Id: null,
                      model1Prop1: 'manyToMany 4'
                    }
                  ]
                }
              ]
            };

            return transaction(session.knex, trx => {
              let sql = [];

              // Wrap the transaction to catch the executed sql.
              trx = mockKnexFactory(trx, function(mock, oldImpl, args) {
                sql.push(this.toString());
                return oldImpl.apply(this, args);
              });

              return Model1.query(trx)
                .upsertGraph(graph, {
                  fetchStrategy
                })
                .then(() => {
                  // There should only be the selects, one update and a m2m insert.
                  // 5 selects, 1 update, 2 inserts (row and pivot row).
                  expect(sql.length).to.equal(8);

                  return Model1.query(trx)
                    .findById(2)
                    .eager({
                      model1Relation1: true,
                      model1Relation2: {
                        model2Relation1: true,
                        model2Relation3: true
                      }
                    });
                })
                .then(fetchedGraph => {
                  sql = [];
                  return Model1.query(trx).upsertGraph(fetchedGraph, { fetchStrategy });
                })
                .then(() => {
                  // There should only be the selects since we patched using
                  // the current state.
                  expect(sql.length).to.equal(5);

                  return Model1.query(trx)
                    .findById(2)
                    .eager({
                      model1Relation1: true,
                      model1Relation2: {
                        model2Relation1: true,
                        model2Relation3: true
                      }
                    })
                    .then(fetchedGraph => {
                      sql = [];
                      const model2 = fetchedGraph.model1Relation2.find(
                        it => it.model2Relation3.length > 0
                      );
                      const model3 = model2.model2Relation3[0];
                      model3.model3JsonProp.bar[1].spam = true;
                      return Model1.query(trx).upsertGraph(fetchedGraph, { fetchStrategy });
                    })
                    .then(() => {
                      // There should only be the selects and the json field update.
                      expect(sql.length).to.equal(6);
                    });
                });
            });
          });
        });
      }

      describe('relate with children => upsertGraph recursively called', () => {
        beforeEach(() => {
          population = [
            {
              id: 1,
              model1Prop1: 'root 1',
              model1Relation3: [
                {
                  idCol: 1,
                  model2Prop1: 'manyToMany 1',

                  // This is a ManyToManyRelation
                  model2Relation3: [
                    {
                      id: 1,
                      model3Prop1: 'model3Prop1 1'
                    },
                    {
                      id: 3,
                      model3Prop1: 'model3Prop1 3'
                    }
                  ],

                  model2Relation2: {
                    id: 3,
                    model1Prop1: 'hasOne 3'
                  }
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'root 2',

              // This is a ManyToManyRelation
              model1Relation3: [
                {
                  idCol: 2,
                  model2Prop1: 'manyToMany 2',

                  // This is a ManyToManyRelation
                  model2Relation3: [
                    {
                      id: 2,
                      model3Prop1: 'model3Prop1 2'
                    },
                    {
                      id: 4,
                      model3Prop1: 'model3Prop1 4'
                    }
                  ],
                  model2Relation2: {
                    id: 4,
                    model1Prop1: 'hasOne 4'
                  }
                }
              ]
            },
            {
              id: 5,
              model1Prop1: 'root 5'
            },
            {
              id: 6,
              model1Prop1: 'root 6'
            },
            {
              id: 7,
              model1Prop1: 'root 7'
            }
          ];

          return session.populate(population);
        });

        it('should relate BelongsToOne relation and nested children as expected', () => {
          const upsert = {
            id: 2,
            model1Prop1: 'updated root 2',

            // Relate new BelongsToOne relation
            model1Relation1: {
              id: 6,
              model1Prop1: 'belongs to one 6',

              // Relate new and update ManyToMany relation
              model1Relation3: [
                {
                  idCol: 2,

                  // Relate new and update ManyToMany relation
                  model2Relation3: [{ id: 1 }]
                }
              ]
            }
          };

          return transaction(session.knex, trx => {
            return Model1.query(trx)
              .upsertGraph(upsert, { relate: true, unrelate: true, fetchStrategy })
              .then(() => {
                return Model1.query(trx)
                  .findById(2)
                  .eager(
                    '[model1Relation1.[model1Relation3(orderById).model2Relation3(orderById)]]'
                  );
              })
              .then(omitIrrelevantProps)
              .then(result => {
                expect(result).to.eql({
                  id: 2,
                  model1Id: 6,

                  model1Relation1: {
                    id: 6,
                    model1Prop1: 'belongs to one 6',
                    model1Id: null,

                    model1Relation3: [
                      {
                        extra1: null,
                        extra2: null,
                        idCol: 2,
                        model1Id: null,
                        model2Prop1: 'manyToMany 2',
                        model2Relation3: [
                          { id: 1, model3Prop1: 'model3Prop1 1', model3JsonProp: null }
                        ]
                      }
                    ]
                  },

                  model1Prop1: 'updated root 2'
                });
              });
          });
        });

        it('should relate ManyToMany relations and children as expected', () => {
          const upsert = {
            id: 2,
            model1Prop1: 'updated root 2',

            // Relate new and update ManyToMany relation
            model1Relation3: [
              {
                idCol: 1,
                model2Prop1: 'updated model2Prop1',

                // Relate new and update Has Many relation
                model2Relation2: {
                  id: 5,
                  model1Prop1: 'updated root 5',

                  // Update BelongsToOne
                  model1Relation1: {
                    id: 1
                  }
                }
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model1.query(trx)
              .upsertGraph(upsert, { relate: true, unrelate: true, fetchStrategy })
              .then(() => {
                return Model1.query(trx)
                  .findById(2)
                  .eager(
                    '[model1Relation3(orderById).[model2Relation2(orderById).model1Relation1]]'
                  );
              })
              .then(omitIrrelevantProps)
              .then(result => {
                expect(result).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'updated root 2',

                  model1Relation3: [
                    {
                      extra1: null,
                      extra2: null,
                      idCol: 1,
                      model1Id: null,
                      model2Prop1: 'updated model2Prop1',

                      model2Relation2: {
                        id: 5,
                        model1Id: 1,
                        model1Prop1: 'updated root 5',

                        model1Relation1: {
                          id: 1,
                          model1Id: null,
                          model1Prop1: 'root 1'
                        }
                      }
                    }
                  ]
                });
              });
          });
        });

        it('should relate HasMany relations and children as expected', () => {
          const upsert = {
            id: 2,
            model1Prop1: 'updated root 2',

            // Relate new and update ManyToMany relation
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'updated model2Prop1',

                // Relate new and update Has Many relation
                model2Relation2: {
                  id: 5,
                  model1Prop1: 'updated root 5',

                  // Update BelongsToOne
                  model1Relation1: {
                    id: 1
                  }
                }
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model1.query(trx)
              .upsertGraph(upsert, { relate: true, unrelate: true, fetchStrategy })
              .then(() => {
                return Model1.query(trx)
                  .findById(2)
                  .eager(
                    '[model1Relation2(orderById).[model2Relation2(orderById).model1Relation1]]'
                  );
              })
              .then(omitIrrelevantProps)
              .then(result => {
                expect(result).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'updated root 2',

                  model1Relation2: [
                    {
                      idCol: 1,
                      model1Id: 2,
                      model2Prop1: 'updated model2Prop1',

                      model2Relation2: {
                        id: 5,
                        model1Id: 1,
                        model1Prop1: 'updated root 5',

                        model1Relation1: {
                          id: 1,
                          model1Id: null,
                          model1Prop1: 'root 1'
                        }
                      }
                    }
                  ]
                });
              });
          });
        });

        it('should upsert recursively and respect options', () => {
          const upsert = {
            id: 2,
            model1Prop1: 'updated root 2',

            // Relate new and update ManyToMany relation
            model1Relation3: [
              {
                idCol: 1,
                model2Prop1: 'updated model2Prop1',

                // Relate new and update ManyToMany relation
                model2Relation3: [{ id: 2 }]
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model1.query(trx)
              .upsertGraph(upsert, {
                fetchStrategy,
                relate: ['model1Relation3', 'model1Relation3.model2Relation3'],
                noUnrelate: ['model1Relation3.model2Relation3'],
                noDelete: ['model1Relation3.model2Relation3']
              })
              .then(() => {
                return Model1.query(trx)
                  .findById(2)
                  .eager('model1Relation3(orderById).model2Relation3(orderById)');
              })
              .then(omitIrrelevantProps)
              .then(result => {
                expect(result).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'updated root 2',

                  model1Relation3: [
                    {
                      extra1: null,
                      extra2: null,
                      idCol: 1,
                      model1Id: null,
                      model2Prop1: 'updated model2Prop1',

                      model2Relation3: [
                        // Existing, but not removed
                        {
                          id: 1,
                          model3Prop1: 'model3Prop1 1',
                          model3JsonProp: null
                        },
                        // Related
                        {
                          id: 2,
                          model3Prop1: 'model3Prop1 2',
                          model3JsonProp: null
                        },
                        // Existing, but not removed
                        {
                          id: 3,
                          model3Prop1: 'model3Prop1 3',
                          model3JsonProp: null
                        }
                      ]
                    }
                  ]
                });
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
              model1Prop1: { type: ['string', 'null'] },
              model1Prop2: { type: ['integer', 'null'] }
            }
          };

          Model2.$$jsonSchema = {
            type: 'object',
            required: ['model2Prop1'],

            properties: {
              model2Prop1: { type: ['string', 'null'] }
            }
          };
        });

        after(() => {
          delete Model1.$$jsonSchema;
          delete Model1.$$validator;

          delete Model2.$$jsonSchema;
          delete Model2.$$validator;
        });

        it('should validate (also tests transactions)', () => {
          const fails = [
            {
              id: 2,
              // This fails because of invalid type.
              model1Prop1: 100,

              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne'
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'updated hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      model1Prop1: 'inserted manyToMany',
                      model1Prop2: 10
                    }
                  ]
                },
                {
                  model2Prop1: 'inserted hasMany'
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'updated root 2',

              model1Relation1: {
                id: 3,
                // This fails because of invalid type.
                model1Prop1: 100
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'updated hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      model1Prop1: 'inserted manyToMany',
                      model1Prop2: 10
                    }
                  ]
                },
                {
                  model2Prop1: 'inserted hasMany'
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'updated root 2',

              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne'
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'updated hasMany 1',

                  model2Relation1: [
                    {
                      id: 4,
                      model1Prop1: 'updated manyToMany 1'
                    },
                    {
                      // This is the new row that fails because of invalid type.
                      model1Prop1: 100,
                      model1Prop2: 10
                    }
                  ]
                },
                {
                  model2Prop1: 'inserted hasMany'
                }
              ]
            }
          ];

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
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'updated hasMany 1',

                // update id=4
                // delete id=5
                // and insert one new
                model2Relation1: [
                  {
                    id: 4,
                    model1Prop1: 'updated manyToMany 1'
                  },
                  {
                    // This is the new row.
                    model1Prop1: 'inserted manyToMany',
                    model1Prop2: 10
                  }
                ]
              },
              {
                // This is the new row.
                model2Prop1: 'inserted hasMany'
              }
            ]
          };

          const errorKeys = [
            'model1Prop1',
            'model1Relation1.model1Prop1',
            'model1Relation2[0].model2Relation1[1].model1Prop1'
          ];

          return Promise.map(fails, fail => {
            return transaction(session.knex, trx =>
              Model1.query(trx).upsertGraph(fail, { fetchStrategy })
            ).reflect();
          })
            .then(results => {
              // Check that all transactions have failed because of a validation error.
              results.forEach((res, index) => {
                expect(res.isRejected()).to.equal(true);
                expect(res.reason().data[errorKeys[index]][0].message).to.equal(
                  'should be string,null'
                );
              });

              return Model1.query(session.knex)
                .orderBy('id')
                .whereIn('id', [1, 2])
                .eager('[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]');
            })
            .then(db => {
              // Check that the transactions worked and the database was in no way modified.
              expect(omitIrrelevantProps(db)).to.eql(population);

              return transaction(session.knex, trx => {
                return Model1.query(trx)
                  .upsertGraph(success, { fetchStrategy })
                  .then(() => {
                    // Fetch the graph from the database.
                    return Model1.query(trx)
                      .findById(2)
                      .eager(
                        '[model1Relation1, model1Relation2(orderById).model2Relation1(orderById)]'
                      );
                  })
                  .then(omitIrrelevantProps)
                  .then(omitIds)
                  .then(result => {
                    expect(result).to.eql({
                      model1Id: 3,
                      model1Prop1: 'updated root 2',

                      model1Relation1: {
                        model1Id: null,
                        model1Prop1: 'updated belongsToOne'
                      },

                      model1Relation2: [
                        {
                          model1Id: 2,
                          model2Prop1: 'updated hasMany 1',

                          model2Relation1: [
                            {
                              model1Id: null,
                              model1Prop1: 'updated manyToMany 1'
                            },
                            {
                              model1Id: null,
                              model1Prop1: 'inserted manyToMany'
                            }
                          ]
                        },
                        {
                          model1Id: 2,
                          model2Prop1: 'inserted hasMany',
                          model2Relation1: []
                        }
                      ]
                    });

                    return Promise.all([trx('Model1'), trx('model2')]).spread(
                      (model1Rows, model2Rows) => {
                        // Row 5 should be deleted.
                        expect(model1Rows.find(it => it.id == 5)).to.equal(undefined);
                        // Row 6 should NOT be deleted even thought its parent is.
                        expect(model1Rows.find(it => it.id == 6)).to.be.an(Object);
                        // Row 7 should NOT be deleted  even thought its parent is.
                        expect(model1Rows.find(it => it.id == 7)).to.be.an(Object);
                        // Row 2 should be deleted.
                        expect(model2Rows.find(it => it.id_col == 2)).to.equal(undefined);
                      }
                    );
                  });
              });
            });
        });

        it('should always patch-validate #dbRef reference objects (ignore required)', () => {
          const upsert = [
            {
              id: 1000,
              model1Prop1: 'foo',
              model1Prop2: 1,

              model1Relation2: [
                {
                  '#dbRef': 1
                }
              ]
            },
            {
              id: 1001,
              model1Prop1: 'bar',
              model1Prop2: 2,

              model1Relation1: {
                '#dbRef': 2
              },

              model1Relation3: [
                {
                  '#dbRef': 2
                }
              ]
            }
          ];

          const options = {
            // Insert missing from the root.
            insertMissing: [''],
            fetchStrategy
          };

          return Model1.query(session.knex)
            .upsertGraph(upsert, options)
            .then(() => {
              return Model1.query(session.knex)
                .findByIds([1000, 1001])
                .eager('[model1Relation1, model1Relation2(orderById), model1Relation3(orderById)]');
            })
            .then(result => {
              chai.expect(result).to.containSubset([
                {
                  id: 1000,
                  model1Relation2: [
                    {
                      idCol: 1,
                      model2Prop1: 'hasMany 1'
                    }
                  ]
                },
                {
                  id: 1001,

                  model1Relation1: {
                    id: 2,
                    model1Prop1: 'root 2'
                  },

                  model1Relation3: [
                    {
                      idCol: 2,
                      model2Prop1: 'hasMany 2'
                    }
                  ]
                }
              ]);
            });
        });

        it('should always patch-validate #dbRef reference objects (does update)', () => {
          const upsert = [
            {
              id: 1000,
              model1Prop1: 'foo',
              model1Prop2: 1,

              model1Relation2: [
                {
                  '#dbRef': 1,
                  model2Prop1: 'updated 1'
                }
              ]
            },
            {
              id: 1001,
              model1Prop1: 'bar',
              model1Prop2: 2,

              model1Relation1: {
                '#dbRef': 2,
                model1Prop1: 'updated 2'
              },

              model1Relation3: [
                {
                  '#dbRef': 2,
                  model2Prop1: 'updated 3'
                }
              ]
            }
          ];

          const options = {
            // Insert missing from the root.
            insertMissing: [''],
            fetchStrategy
          };

          return Model1.query(session.knex)
            .upsertGraph(upsert, options)
            .then(() => {
              return Model1.query(session.knex)
                .findByIds([1000, 1001])
                .eager('[model1Relation1, model1Relation2(orderById), model1Relation3(orderById)]');
            })
            .then(result => {
              chai.expect(result).to.containSubset([
                {
                  id: 1000,
                  model1Relation2: [
                    {
                      idCol: 1,
                      model2Prop1: 'updated 1'
                    }
                  ]
                },
                {
                  id: 1001,

                  model1Relation1: {
                    id: 2,
                    model1Prop1: 'updated 2'
                  },

                  model1Relation3: [
                    {
                      idCol: 2,
                      model2Prop1: 'updated 3'
                    }
                  ]
                }
              ]);
            });
        });

        it('should always patch-validate #dbRef reference objects (does validate)', done => {
          const upsert = [
            {
              id: 1000,
              model1Prop1: 'foo',
              model1Prop2: 1,

              model1Relation2: [
                {
                  '#dbRef': 1,
                  model2Prop1: 1
                }
              ]
            },
            {
              id: 1001,
              model1Prop1: 'bar',
              model1Prop2: 2,

              model1Relation1: {
                '#dbRef': 2,
                model2Prop1: 'updated 2'
              },

              model1Relation3: [
                {
                  '#dbRef': 2,
                  model2Prop1: 'updated 3'
                }
              ]
            }
          ];

          const options = {
            // Insert missing from the root.
            insertMissing: [''],
            fetchStrategy
          };

          Model1.query(session.knex)
            .upsertGraph(upsert, options)
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err.data['model1Relation2[0].model2Prop1'][0].message).to.equal(
                'should be string,null'
              );
              done();
            })
            .catch(done);
        });
      });

      describe('upserts with update: true option', () => {
        before(() => {
          Model1.$$jsonSchema = {
            type: 'object',
            required: ['model1Prop1', 'model1Prop2'],

            properties: {
              model1Prop1: { type: 'string' },
              model1Prop2: { type: 'integer' }
            }
          };
        });

        after(() => {
          delete Model1.$$jsonSchema;
          delete Model1.$$validator;
        });

        it('should fail to do an incomplete upsert', () => {
          const fails = [
            {
              id: 2,
              model1Prop1: 'updated root 2',
              // This fails because of missing property.
              // model1Prop2: 10,

              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne',
                model1Prop2: 100
              }
            },
            {
              id: 2,
              model1Prop1: 'updated root 2',
              model1Prop2: 10,

              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne'
                // This fails because of missing property.
                // model2Prop2: 100
              }
            }
          ];

          const success = [
            {
              id: 2,
              model1Prop1: 'updated root 2',
              model1Prop2: 10,

              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne',
                model1Prop2: 100
              }
            }
          ];

          const errorKeys = ['model1Prop2', 'model1Relation1.model1Prop2'];

          return Promise.map(fails, fail => {
            return transaction(session.knex, trx =>
              Model1.query(trx).upsertGraph(fail, { update: true, fetchStrategy })
            ).reflect();
          })
            .then(results => {
              // Check that all transactions have failed because of a validation error.
              results.forEach((res, index) => {
                expect(res.isRejected()).to.equal(true);
                expect(res.reason().data[errorKeys[index]][0].message).to.equal(
                  'is a required property'
                );
              });
            })
            .then(() => {
              return transaction(session.knex, trx => {
                return Model1.query(trx)
                  .upsertGraph(success, { update: true, fetchStrategy })
                  .then(result => {
                    // Fetch the graph from the database.
                    return Model1.query(trx)
                      .findById(2)
                      .eager('model1Relation1');
                  })
                  .then(omitIrrelevantProps)
                  .then(omitIds)
                  .then(result => {
                    expect(result).to.eql({
                      model1Id: 3,
                      model1Prop1: 'updated root 2',

                      model1Relation1: {
                        model1Id: null,
                        model1Prop1: 'updated belongsToOne'
                      }
                    });
                  });
              });
            });
        });
      });

      describe('cyclic references', () => {
        it('should detect cycles in the graph', done => {
          const upsert = {
            id: 1,

            model1Relation1: {
              '#id': 'root',

              model1Relation1: {
                '#ref': 'root'
              }
            }
          };

          Model1.bindKnex(session.knex)
            .query()
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err.message).to.equal('the object graph contains cyclic references');
              done();
            })
            .catch(done);
        });

        it('cycle detection should consider already inserted nodes', () => {
          // There are no cycles in this graph because `id=2` has already
          // been inserted.
          const upsert = {
            id: 2,

            model1Relation1: {
              id: 3,
              model1Prop1: 'also updated',

              model1Relation1: {
                '#ref': '@1'
              }
            },

            model1Relation1Inverse: {
              '#id': '@1',
              model1Prop1: 'hello'
            }
          };

          return Model1.bindKnex(session.knex)
            .query()
            .upsertGraph(upsert, { fetchStrategy })
            .then(() => {
              return Model1.query(session.knex)
                .findById(2)
                .eager({
                  model1Relation1: {
                    model1Relation1: true
                  },
                  model1Relation1Inverse: true
                });
            })
            .then(result => {
              const id = result.model1Relation1.model1Relation1.id;
              chai.expect(result).containSubset({
                id: 2,
                model1Relation1: {
                  id: 3,
                  model1Relation1: {
                    id
                  }
                },
                model1Relation1Inverse: {
                  id
                }
              });
            });
        });
      });

      describe('manytoManyRelation extra properties', () => {
        it('insert', () => {
          const upsert = {
            idCol: 2,

            model2Relation1: [
              // Do nothing.
              {
                id: 6
              },
              // Do nothing.
              {
                id: 7
              },
              // Insert.
              {
                aliasedExtra: 'foo'
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model2.query(trx)
              .upsertGraph(upsert, { fetchStrategy })
              .then(result => {
                expect(result.model2Relation1[2].aliasedExtra).to.equal('foo');
              });
          })
            .then(() => {
              return Model2.query(session.knex)
                .findById(2)
                .eager('model2Relation1(orderById)');
            })
            .then(model => {
              expect(model.model2Relation1[2].aliasedExtra).to.equal('foo');
            });
        });

        it('relate', () => {
          const upsert = {
            idCol: 2,

            // delete 6
            model2Relation1: [
              // relate
              {
                id: 5,
                aliasedExtra: 'foo'
              },
              // do nothing.
              {
                id: 7
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model2.query(trx)
              .upsertGraph(upsert, { relate: true, fetchStrategy })
              .then(result => {
                expect(result.model2Relation1[0].id).to.equal(5);
                expect(result.model2Relation1[0].aliasedExtra).to.equal('foo');
              });
          })
            .then(() => {
              return Model2.query(session.knex)
                .findById(2)
                .eager('model2Relation1(orderById)');
            })
            .then(model => {
              expect(model.model2Relation1[0].id).to.equal(5);
              expect(model.model2Relation1[0].aliasedExtra).to.equal('foo');
            });
        });

        it('update', () => {
          const upsert = {
            idCol: 2,

            model2Relation1: [
              {
                id: 6,
                aliasedExtra: 'hello extra 1'
              },
              {
                id: 7,
                aliasedExtra: 'hello extra 2'
              }
            ]
          };

          return transaction(session.knex, trx => {
            return Model2.query(trx)
              .upsertGraph(upsert, { fetchStrategy })
              .then(result => {
                expect(result.model2Relation1[0].aliasedExtra).to.equal('hello extra 1');
                expect(result.model2Relation1[1].aliasedExtra).to.equal('hello extra 2');
              });
          })
            .then(() => {
              return Model2.query(session.knex)
                .findById(2)
                .eager('model2Relation1(orderById)');
            })
            .then(model => {
              expect(model.model2Relation1[0].aliasedExtra).to.equal('hello extra 1');
              expect(model.model2Relation1[1].aliasedExtra).to.equal('hello extra 2');
            });
        });
      });

      if (session.isPostgres()) {
        describe('returning', () => {
          it('should propagate returning(*) to all update an insert operations', () => {
            const upsert = {
              // Nothing is done for the root since it only has an ids.
              id: 2,
              model1Id: 3,

              // This should get updated.
              model1Relation1: {
                id: 3,
                model1Prop1: 'updated belongsToOne'
              },

              // update idCol=1
              // delete idCol=2
              // and insert one new
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'updated hasMany 1',

                  // update id=4
                  // delete id=5
                  // insert new row
                  model2Relation1: [
                    {
                      id: 4,
                      model1Prop1: 'updated manyToMany 1',

                      // relate id=1
                      model1Relation1: {
                        id: 1
                      }
                    },
                    {
                      // This is the new row.
                      model1Prop1: 'inserted manyToMany'
                    }
                  ]
                },
                {
                  // This is the new row.
                  model2Prop1: 'inserted hasMany'
                }
              ]
            };

            return Model1.query(session.knex)
              .upsertGraph(upsert, {
                fetchStrategy,
                relate: ['model1Relation2.model2Relation1.model1Relation1']
              })
              .returning('*')
              .then(result => {
                chai.expect(result).to.containSubset({
                  id: 2,
                  model1Id: 3,
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 3,
                    model1Prop1: 'updated belongsToOne',
                    $beforeUpdateCalled: 1,
                    $beforeUpdateOptions: { patch: true },
                    $afterUpdateCalled: 1,
                    $afterUpdateOptions: { patch: true },
                    model1Id: null,
                    model1Prop2: null
                  },

                  model1Relation2: [
                    {
                      idCol: 1,
                      model2Prop1: 'updated hasMany 1',

                      model2Relation1: [
                        {
                          id: 4,
                          model1Prop1: 'updated manyToMany 1',
                          model1Relation1: { id: 1 },
                          model1Id: 1,
                          $beforeUpdateCalled: 1,
                          $beforeUpdateOptions: { patch: true },
                          $afterUpdateCalled: 1,
                          $afterUpdateOptions: { patch: true },
                          model1Prop2: null
                        },

                        {
                          model1Prop1: 'inserted manyToMany',
                          $beforeInsertCalled: 1,
                          id: 8,
                          model1Id: null,
                          model1Prop2: null,
                          $afterInsertCalled: 1
                        }
                      ],

                      model1Id: 2,
                      $beforeUpdateCalled: 1,
                      $beforeUpdateOptions: { patch: true },
                      $afterUpdateCalled: 1,
                      $afterUpdateOptions: { patch: true },
                      model2Prop2: null
                    },

                    {
                      model2Prop1: 'inserted hasMany',
                      model1Id: 2,
                      $beforeInsertCalled: 1,
                      idCol: 3,
                      model2Prop2: null,
                      $afterInsertCalled: 1
                    }
                  ]
                });
              });
          });
        });
      }
    });
  }

  function omitIrrelevantProps(model) {
    const delProps = ['model1Prop2', 'model2Prop2', 'aliasedExtra', '$afterGetCalled'];

    Model1.traverse(model, model => {
      delProps.forEach(prop => delete model[prop]);
    });

    return model;
  }

  function omitIds(model) {
    const delProps = ['id', 'idCol'];

    Model1.traverse(model, model => {
      delProps.forEach(prop => delete model[prop]);
    });

    return model;
  }
};
