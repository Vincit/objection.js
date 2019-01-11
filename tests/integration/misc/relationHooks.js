const { expect } = require('chai');
const { Model, snakeCaseMappers } = require('../../../');

module.exports = session => {
  describe('relation hooks', () => {
    describe('beforeInsert', () => {
      class Model1 extends Model {
        static get tableName() {
          return 'Model1';
        }

        static get relationMappings() {
          return {
            model1Relation1: {
              relation: Model.BelongsToOneRelation,
              modelClass: Model1,
              join: {
                from: 'Model1.model1Id',
                to: 'Model1.id'
              },
              beforeInsert(model, ctx) {
                model.model1Prop2 = ctx.belongsToOneValue;
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
              modelClass: Model2,
              join: {
                from: 'Model1.id',
                to: 'model2.model1_id'
              },
              beforeInsert(model, ctx) {
                model.model2Prop2 = ctx.hasManyValue;
              }
            },

            model1Relation3: {
              relation: Model.ManyToManyRelation,
              modelClass: Model2,
              join: {
                from: 'Model1.id',
                through: {
                  from: 'Model1Model2.model1Id',
                  to: 'Model1Model2.model2Id',
                  extra: ['extra1', 'extra2'],
                  beforeInsert(model, ctx) {
                    model.extra2 = ctx.manyToManyJoinValue;
                  }
                },
                to: 'model2.id_col'
              },
              beforeInsert(model, ctx) {
                model.model2Prop2 = ctx.manyToManyValue;
              }
            }
          };
        }
      }

      class Model2 extends Model {
        static get tableName() {
          return 'model2';
        }

        static get idColumn() {
          return 'id_col';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get relationMappings() {
          return {
            model2Relation1: {
              relation: Model.ManyToManyRelation,
              modelClass: Model1,
              join: {
                from: 'model2.id_col',
                through: {
                  from: 'Model1Model2.model2Id',
                  to: 'Model1Model2.model1Id',
                  extra: { aliasedExtra: 'extra3' }
                },
                to: 'Model1.id'
              }
            },

            model2Relation2: {
              relation: Model.HasOneThroughRelation,
              modelClass: Model1,
              join: {
                from: 'model2.id_col',
                through: {
                  from: 'Model1Model2One.model2Id',
                  to: 'Model1Model2One.model1Id'
                },
                to: 'Model1.id'
              }
            }
          };
        }
      }

      before(() => {
        Model1.knex(session.knex);
        Model2.knex(session.knex);
      });

      beforeEach(() => {
        return session.populate([
          {
            model1Prop1: 'root'
          }
        ]);
      });

      describe('$relatedQuery', () => {
        let root;

        beforeEach(() => {
          return Model1.query()
            .findOne({ model1Prop1: 'root' })
            .then(model => {
              root = model;
            });
        });

        it('belongs to one relation', () => {
          return root
            .$relatedQuery('model1Relation1')
            .insert({ model1Prop1: 'new' })
            .mergeContext({ belongsToOneValue: 42 })
            .then(model => {
              return session
                .knex(Model1.getTableName())
                .where({ model1Prop1: 'new' })
                .first();
            })
            .then(row => {
              expect(row.model1Prop2).to.equal(42);
            });
        });

        it('has many relation', () => {
          return root
            .$relatedQuery('model1Relation2')
            .insert({ model2Prop1: 'new' })
            .mergeContext({ hasManyValue: 100 })
            .then(model => {
              return session
                .knex(Model2.getTableName())
                .where({ model2_prop1: 'new' })
                .first();
            })
            .then(row => {
              expect(row.model2_prop2).to.equal(100);
            });
        });

        it('many to many relation (insert)', () => {
          return root
            .$relatedQuery('model1Relation3')
            .insert({ model2Prop1: 'new' })
            .mergeContext({
              manyToManyValue: 7,
              manyToManyJoinValue: 'Hello'
            })
            .then(model => {
              return session
                .knex(Model2.getTableName())
                .where({ model2_prop1: 'new' })
                .first();
            })
            .then(row => {
              expect(row.model2_prop2).to.equal(7);
              return session.knex('Model1Model2');
            })
            .then(rows => {
              expect(rows.length).to.equal(1);
              expect(rows[0].extra2).to.equal('Hello');
            });
        });

        it('many to many relation (relate)', () => {
          return Model2.query()
            .insert({ model2Prop1: 'rel' })
            .then(model => {
              return root
                .$relatedQuery('model1Relation3')
                .relate(model.idCol)
                .mergeContext({
                  manyToManyJoinValue: 'Extra'
                });
            })
            .then(() => {
              return session.knex('Model1Model2');
            })
            .then(rows => {
              expect(rows.length).to.equal(1);
              expect(rows[0].extra2).to.equal('Extra');
            });
        });

        it('insertGraph', () => {
          return Model1.query()
            .mergeContext({
              belongsToOneValue: 1,
              hasManyValue: 2,
              manyToManyValue: 3,
              manyToManyJoinValue: 4
            })
            .insertGraph({
              model1Prop1: 'parent',

              model1Relation1: {
                model1Prop1: 'child1'
              },

              model1Relation2: [
                {
                  model2Prop1: 'child2'
                },
                {
                  model2Prop1: 'child3'
                }
              ],

              model1Relation3: [
                {
                  model2Prop1: 'child4'
                },
                {
                  model2Prop1: 'child5'
                }
              ]
            })
            .then(() => {
              return Model1.query()
                .findOne({ model1Prop1: 'parent' })
                .eager('[model1Relation1, model1Relation2, model1Relation3]')
                .then(model => {
                  expect(model).to.containSubset({
                    model1Prop1: 'parent',

                    model1Relation1: {
                      model1Prop1: 'child1',
                      model1Prop2: 1
                    },

                    model1Relation2: [
                      {
                        model2Prop1: 'child2',
                        model2Prop2: 2
                      },
                      {
                        model2Prop1: 'child3',
                        model2Prop2: 2
                      }
                    ],

                    model1Relation3: [
                      {
                        model2Prop1: 'child4',
                        model2Prop2: 3,
                        extra2: '4'
                      },
                      {
                        model2Prop1: 'child5',
                        model2Prop2: 3,
                        extra2: '4'
                      }
                    ]
                  });
                });
            });
        });

        it('upsertGraph', () => {
          return Model1.query()
            .insertGraph({
              model1Prop1: 'parent',

              model1Relation1: null,

              model1Relation2: [
                {
                  model2Prop1: 'child2'
                }
              ],

              model1Relation3: [
                {
                  model2Prop1: 'child5'
                }
              ]
            })
            .then(model => {
              return Model1.query()
                .mergeContext({
                  belongsToOneValue: 1,
                  hasManyValue: 2,
                  manyToManyValue: 3,
                  manyToManyJoinValue: 4
                })
                .upsertGraph({
                  id: model.id,
                  model1Prop1: 'parent',

                  model1Relation1: {
                    model1Prop1: 'child1'
                  },

                  model1Relation2: [
                    {
                      idCol: model.model1Relation2[0].idCol,
                      model2Prop1: 'child2'
                    },
                    {
                      model2Prop1: 'child3'
                    }
                  ],

                  model1Relation3: [
                    {
                      model2Prop1: 'child4'
                    },
                    {
                      idCol: model.model1Relation3[0].idCol,
                      model2Prop1: 'child5'
                    }
                  ]
                });
            })
            .then(() => {
              return Model1.query()
                .findOne({ model1Prop1: 'parent' })
                .eager('[model1Relation1, model1Relation2, model1Relation3]')
                .then(model => {
                  expect(model).to.containSubset({
                    model1Prop1: 'parent',

                    model1Relation1: {
                      model1Prop1: 'child1',
                      model1Prop2: 1
                    },

                    model1Relation2: [
                      {
                        model2Prop1: 'child2',
                        model2Prop2: null
                      },
                      {
                        model2Prop1: 'child3',
                        model2Prop2: 2
                      }
                    ],

                    model1Relation3: [
                      {
                        model2Prop1: 'child4',
                        model2Prop2: 3,
                        extra2: '4'
                      },
                      {
                        model2Prop1: 'child5',
                        model2Prop2: null,
                        extra2: null
                      }
                    ]
                  });
                });
            });
        });
      });
    });
  });
};
