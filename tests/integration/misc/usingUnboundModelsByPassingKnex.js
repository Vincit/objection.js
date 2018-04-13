const _ = require('lodash');
const expect = require('expect.js');
const Model = require('../../../').Model;
const Promise = require('bluebird');

module.exports = session => {
  describe('using unbound models by passing a knex to query', () => {
    let Model1 = session.unboundModels.Model1;
    let Model2 = session.unboundModels.Model2;

    beforeEach(() => {
      // This tests insertGraph.
      return session.populate([]).then(() => {
        return Model1.query(session.knex).insertGraph([
          {
            id: 1,
            model1Prop1: 'hello 1',

            model1Relation1: {
              id: 2,
              model1Prop1: 'hello 2',

              model1Relation1: {
                id: 3,
                model1Prop1: 'hello 3',

                model1Relation1: {
                  id: 4,
                  model1Prop1: 'hello 4',
                  model1Relation2: [
                    {
                      idCol: 4,
                      model2Prop1: 'hejsan 4'
                    }
                  ]
                }
              }
            },

            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'hejsan 1'
              },
              {
                idCol: 2,
                model2Prop1: 'hejsan 2',

                model2Relation1: [
                  {
                    id: 5,
                    model1Prop1: 'hello 5',
                    aliasedExtra: 'extra 5'
                  },
                  {
                    id: 6,
                    model1Prop1: 'hello 6',
                    aliasedExtra: 'extra 6',

                    model1Relation1: {
                      id: 7,
                      model1Prop1: 'hello 7'
                    },

                    model1Relation2: [
                      {
                        idCol: 3,
                        model2Prop1: 'hejsan 3'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('basic wheres', () => {
      const query = Model1.query()
        .orWhereNot('id', '>', 10)
        .whereIn('id', [1, 8, 11]);

      return query.knex(session.knex).then(models => {
        expect(models[0].model1Prop1).to.equal('hello 1');
      });
    });

    it('findById', () => {
      const query = Model1.query().findById(1);

      return query.knex(session.knex).then(model => {
        expect(model.model1Prop1).to.equal('hello 1');
      });
    });

    it('findById composite', () => {
      class TestModel extends Model1 {
        static get idColumn() {
          return ['id', 'model1Prop1'];
        }
      }

      const query = TestModel.query().findById([1, 'hello 1']);

      return query.knex(session.knex).then(model => {
        expect(model.model1Prop1).to.equal('hello 1');
      });
    });

    it('eager', () => {
      return Promise.all([
        // Give connection after building the query.
        Model1.query()
          .findById(1)
          .joinEager(
            '[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'
          )
          .knex(session.knex),

        Model1.query(session.knex)
          .findById(1)
          .eager(
            '[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'
          ),

        Model1.query(session.knex)
          .findById(1)
          .joinEager(
            '[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'
          )
      ]).then(results => {
        results.forEach(models => {
          expect(sortRelations(models)).to.eql({
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1,

            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterGetCalled: 1
            },

            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: []
              },
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [
                  {
                    id: 5,
                    model1Id: null,
                    model1Prop1: 'hello 5',
                    model1Prop2: null,
                    aliasedExtra: 'extra 5',
                    model1Relation1: null,
                    model1Relation2: [],
                    $afterGetCalled: 1
                  },
                  {
                    id: 6,
                    model1Id: 7,
                    model1Prop1: 'hello 6',
                    model1Prop2: null,
                    aliasedExtra: 'extra 6',
                    $afterGetCalled: 1,

                    model1Relation1: {
                      id: 7,
                      model1Id: null,
                      model1Prop1: 'hello 7',
                      model1Prop2: null,
                      $afterGetCalled: 1
                    },

                    model1Relation2: [
                      {
                        idCol: 3,
                        model1Id: 6,
                        model2Prop1: 'hejsan 3',
                        model2Prop2: null,
                        $afterGetCalled: 1
                      }
                    ]
                  }
                ]
              }
            ]
          });
        });
      });
    });

    describe('subqueries', () => {
      it('basic', () => {
        const query = Model1.query().whereIn(
          'id',
          Model1.query()
            .select('id')
            .where('id', 5)
        );

        return query.knex(session.knex).then(models => {
          expect(models[0].model1Prop1).to.equal('hello 5');
        });
      });

      it('joinRelation in subquery', () => {
        const query = Model1.query().whereIn(
          'id',
          Model1.query()
            .select('Model1.id')
            .joinRelation('model1Relation1')
            .where('model1Relation1.id', 4)
        );

        return query.knex(session.knex).then(models => {
          expect(models[0].id).to.equal(3);
        });
      });

      it('static relatedQuery', () => {
        const query = Model1.query()
          .findById(1)
          .select(
            'Model1.*',
            Model1.relatedQuery('model1Relation2')
              .count()
              .as('count')
          );

        return query.knex(session.knex).then(model => {
          expect(model.count).to.eql(2);
        });
      });
    });

    describe('$relatedQuery', () => {
      it('fetch', () => {
        return Promise.all([
          Model1.query(session.knex)
            .findById(1)
            .then(model => {
              return model.$relatedQuery('model1Relation1', session.knex);
            }),

          Model1.query(session.knex)
            .findById(2)
            .then(model => {
              return model.$relatedQuery('model1Relation1Inverse', session.knex);
            }),

          Model1.query(session.knex)
            .findById(1)
            .then(model => {
              return model.$relatedQuery('model1Relation2', session.knex);
            }),

          Model2.query(session.knex)
            .findById(2)
            .then(model => {
              return model.$relatedQuery('model2Relation1', session.knex);
            })
        ]).then(results => {
          expect(results[0]).to.eql({
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterGetCalled: 1
          });

          expect(results[1]).to.eql({
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          });

          expect(_.sortBy(results[2], 'idCol')).to.eql([
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterGetCalled: 1
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterGetCalled: 1
            }
          ]);

          expect(_.sortBy(results[3], 'id')).to.eql([
            {
              id: 5,
              model1Id: null,
              model1Prop1: 'hello 5',
              model1Prop2: null,
              aliasedExtra: 'extra 5',
              $afterGetCalled: 1
            },
            {
              id: 6,
              model1Id: 7,
              model1Prop1: 'hello 6',
              model1Prop2: null,
              aliasedExtra: 'extra 6',
              $afterGetCalled: 1
            }
          ]);
        });
      });
    });

    describe('$query', () => {
      it('fetch', () => {
        return Promise.all([
          Model1.query(session.knex)
            .findById(1)
            .then(model => {
              return model.$query(session.knex);
            })
        ]).then(model => {
          expect(model).to.eql([
            {
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              $afterGetCalled: 1
            }
          ]);
        });
      });

      it('insert', () => {
        return Model1.fromJson({ model1Prop1: 'foo', id: 100 })
          .$query(session.knex)
          .insert()
          .then(model => {
            expect(model).to.eql({
              id: 100,
              model1Prop1: 'foo',
              $afterInsertCalled: 1,
              $beforeInsertCalled: 1
            });
          });
      });

      it('insertAndFetch', () => {
        return Model1.fromJson({ model1Prop1: 'foo', id: 101 })
          .$query(session.knex)
          .insertAndFetch()
          .then(model => {
            expect(model).to.eql({
              id: 101,
              model1Id: null,
              model1Prop1: 'foo',
              model1Prop2: null,
              $afterInsertCalled: 1,
              $beforeInsertCalled: 1
            });
          });
      });
    });

    it('joinRelation (BelongsToOneRelation)', () => {
      return Model1.query(session.knex)
        .select('Model1.id as id', 'model1Relation1.id as relId')
        .innerJoinRelation('model1Relation1')
        .then(models => {
          expect(_.sortBy(models, 'id')).to.eql([
            { id: 1, relId: 2, $afterGetCalled: 1 },
            { id: 2, relId: 3, $afterGetCalled: 1 },
            { id: 3, relId: 4, $afterGetCalled: 1 },
            { id: 6, relId: 7, $afterGetCalled: 1 }
          ]);
        });
    });

    it('joinRelation (ManyToManyRelation)', () => {
      return Model1.query(session.knex)
        .select('Model1.id as id', 'model1Relation3.id_col as relId')
        .innerJoinRelation('model1Relation3')
        .then(models => {
          expect(_.sortBy(models, 'id')).to.eql([
            { id: 5, relId: 2, $afterGetCalled: 1 },
            { id: 6, relId: 2, $afterGetCalled: 1 }
          ]);
        });
    });

    it('should fail with a descriptive error message if knex is not provided', () => {
      return Promise.all([
        Promise.try(() => {
          return Model1.query()
            .findById(1)
            .eager(
              '[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'
            );
        }).reflect(),

        Promise.try(() => {
          return Model1.query()
            .findById(1)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .eager(
              '[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'
            );
        }).reflect(),

        Promise.try(() => {
          return Model1.query();
        }).reflect(),

        Promise.try(() => {
          return Model1.query().where('id', 1);
        }).reflect(),

        Promise.try(() => {
          return Model1.query().joinRelation('model1Relation1');
        }).reflect(),

        Model1.query(session.knex)
          .findById(1)
          .then(model => {
            return model.$relatedQuery('model1Relation1');
          })
          .reflect(),

        Model1.query(session.knex)
          .findById(2)
          .then(model => {
            return model.$relatedQuery('model1Relation1Inverse');
          })
          .reflect(),

        Model1.query(session.knex)
          .findById(1)
          .then(model => {
            return model.$relatedQuery('model1Relation2');
          })
          .reflect(),

        Model2.query(session.knex)
          .findById(2)
          .then(model => {
            return model.$relatedQuery('model2Relation1');
          })
          .reflect(),

        Model1.query(session.knex)
          .findById(1)
          .then(model => {
            return model.$query();
          })
          .reflect()
      ]).then(results => {
        results.forEach(result => {
          expect(result.isRejected()).to.equal(true);
          expect(result.reason().message).to.match(
            /no database connection available for a query. You need to bind the model class or the query to a knex instance./
          );
        });
      });
    });

    function sortRelations(models) {
      Model1.traverse(models, model => {
        if (model.model1Relation2) {
          model.model1Relation2 = _.sortBy(model.model1Relation2, 'idCol');
        }

        if (model.model2Relation1) {
          model.model2Relation1 = _.sortBy(model.model2Relation1, 'id');
        }
      });

      return models;
    }
  });
};
