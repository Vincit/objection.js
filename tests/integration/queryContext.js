const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('../../lib/utils/knexUtils');
const expect = require('expect.js');
const chai = require('chai');
const inheritModel = require('../../lib/model/inheritModel').inheritModel;
const knexMocker = require('../../testUtils/mockKnex');

module.exports = session => {
  let Model1;
  let Model2;
  let mockKnex;

  // This file tests only the query context feature. Query context feature is present in
  // so many places that it is better to test it separately rather than add tests in
  // multiple other test sets.

  describe('Query context', () => {
    before(() => {
      mockKnex = knexMocker(session.knex, function(mock, origImpl, args) {
        mock.executedQueries.push(this.toString());

        if (mock.results.length) {
          let result = mock.results.shift() || [];
          let promise = Promise.resolve(result);
          return promise.then.apply(promise, args);
        } else {
          return origImpl.apply(this, args);
        }
      });

      mockKnex.reset = () => {
        mockKnex.executedQueries = [];
        mockKnex.results = [];
      };

      Model1 = session.models.Model1.bindKnex(mockKnex);
      Model2 = session.models.Model2.bindKnex(mockKnex);

      mockKnex.reset();
    });

    beforeEach(() => {
      return session.populate([
        {
          id: 1,
          model1Prop1: 'hello 1',
          model1Relation1: {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation1: {
              id: 3,
              model1Prop1: 'hello 3'
            },
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: 30,
                model2Relation1: [
                  {
                    id: 4,
                    model1Prop1: 'hello 4'
                  }
                ]
              },
              {
                idCol: 2,
                model2Prop1: 'hejsan 2',
                model2Prop2: 20
              }
            ]
          }
        }
      ]);
    });

    beforeEach(() => {
      mockKnex.reset();
    });

    it('should get passed to the $afterGet method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$afterGet = queryContext => {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.query()
        .context(context)
        .where('id', 1)
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $beforeUpdate method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$beforeUpdate = function(opt, queryContext) {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.query()
        .context(context)
        .update({ model1Prop1: 'updated' })
        .where('id', 1)
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $afterUpdate method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$afterUpdate = function(opt, queryContext) {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.query()
        .context(context)
        .update({ model1Prop1: 'updated' })
        .where('id', 1)
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $beforeInsert method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$beforeInsert = queryContext => {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.query()
        .context(context)
        .insert({ model1Prop1: 'new' })
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $afterInsert method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$afterInsert = queryContext => {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.query()
        .context(context)
        .insert({ model1Prop1: 'new' })
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $beforeDelete method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$beforeDelete = queryContext => {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.fromJson({ id: 1 })
        .$query()
        .context(context)
        .delete()
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('should get passed to the $afterDelete method', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let called = false;

      Model.prototype.$afterDelete = queryContext => {
        expect(queryContext).to.eql(context);
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.fromJson({ id: 1 })
        .$query()
        .context(context)
        .delete()
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    it('mergeContex should merge values into the context', () => {
      let Model = inheritModel(Model1);
      let context = { a: 1, b: '2' };
      let merge1 = { c: [10, 11] };
      let merge2 = { d: false };
      let called = false;

      Model.prototype.$afterDelete = queryContext => {
        expect(queryContext).to.eql(_.assign({}, context, merge1, merge2));
        expect(context.transaction).to.equal(undefined);
        expect(queryContext.transaction).to.equal(mockKnex);
        expect(Object.keys(queryContext).indexOf('transaction')).to.equal(-1);
        called = true;
      };

      return Model.fromJson({ id: 1 })
        .$query()
        .context(context)
        .mergeContext(merge1)
        .delete()
        .mergeContext(merge2)
        .then(() => {
          expect(called).to.equal(true);
        });
    });

    if (utils.isPostgres(session.knex)) {
      // The following features work on all databases. We only test against postgres
      // so that we can use postgres specific SQL to make the tests simpler.

      it('both queries started by `insertAndFetch` should share the same context', () => {
        let queries = [];

        return (
          Model1.query()
            .insertAndFetch({ model1Prop1: 'new' })
            // withSchema uses the context to share the schema between all queries.
            .withSchema('public')
            .context({
              onBuild: builder => {
                builder.select('Model1.*').returning('*');
              },
              runBefore: (data, builder) => {
                if (builder.isExecutable()) {
                  queries.push(builder.toSql());
                }
              }
            })
            .then(model => {
              expect(mockKnex.executedQueries).to.eql(queries);
              expect(mockKnex.executedQueries).to.eql([
                'insert into "public"."Model1" ("model1Prop1") values (\'new\') returning *',
                'select "Model1".* from "public"."Model1" where "Model1"."id" in (5)'
              ]);

              expect(model.toJSON()).to.eql({
                model1Prop1: 'new',
                id: 5,
                model1Id: null,
                model1Prop2: null
              });
            })
        );
      });

      it('both queries started by `updateAndFetchById` should share the same context', () => {
        let queries = [];

        return (
          Model1.query()
            .updateAndFetchById(1, { model1Prop1: 'updated' })
            // withSchema uses the context to share the schema between all queries.
            .withSchema('public')
            .context({
              onBuild: builder => {
                builder.select('Model1.*').returning('*');
              },
              runBefore: function() {
                if (this.isExecutable()) {
                  queries.push(this.toSql());
                }
              }
            })
            .then(model => {
              expect(mockKnex.executedQueries).to.eql(queries);
              expect(mockKnex.executedQueries).to.eql([
                'update "public"."Model1" set "model1Prop1" = \'updated\' where "Model1"."id" = 1 returning *',
                'select "Model1".* from "public"."Model1" where "Model1"."id" = 1'
              ]);

              expect(model.toJSON()).to.eql({
                model1Prop1: 'updated',
                id: 1,
                model1Id: 2,
                model1Prop2: null
              });
            })
        );
      });

      it('all queries created by insertWithRelated should share the same context', () => {
        let queries = [];

        // We create a query with `insertWithRelated` method that causes multiple queries to be executed.
        // We install hooks using for the context object and check that the modifications made in those
        // hooks are present in the result. This way we can be sure that the hooks were called for all
        // queries.
        return (
          Model1.query()
            // withSchema uses the context to share the schema between all queries.
            .withSchema('public')
            .context({
              onBuild: [
                builder => {
                  if (builder.modelClass() === Model1) {
                    // Add a property that is created by the database engine to make sure that the result
                    // actually comes from the database.
                    builder.returning([
                      'id',
                      Model1.raw('"model1Prop1" || \' computed1\' as computed')
                    ]);
                  }
                },
                builder => {
                  if (builder.modelClass() == Model2) {
                    // Add a property that is created by the database engine to make sure that the result
                    // actually comes from the database.
                    builder.returning([
                      'id_col',
                      Model1.raw('"model2_prop1" || \' computed2\' as computed')
                    ]);
                  }
                }
              ],
              runBefore: [
                function() {
                  if (this.isExecutable()) {
                    queries.push(this.toSql());
                  }
                }
              ],
              runAfter: [
                models => {
                  // Append text to the end of our computed property to make sure this function is called.
                  _.each(_.flatten([models]), model => {
                    model.computed += ' after';
                  });
                  return models;
                }
              ]
            })
            .insertWithRelated({
              model1Prop1: 'new 1',
              model1Relation1: {
                model1Prop1: 'new 2',
                model1Relation2: [
                  {
                    model2Prop1: 'new 3',
                    model2Relation1: [
                      {
                        model1Prop1: 'new 4'
                      }
                    ]
                  }
                ]
              }
            })
            .then(model => {
              expect(mockKnex.executedQueries.length).to.equal(4);
              expect(mockKnex.executedQueries.length).to.equal(queries.length);

              chai.expect(mockKnex.executedQueries).to.containSubset(queries);
              chai
                .expect(mockKnex.executedQueries)
                .to.containSubset([
                  'insert into "public"."Model1" ("model1Prop1") values (\'new 2\'), (\'new 4\') returning "id", "model1Prop1" || \' computed1\' as computed',
                  'insert into "public"."Model1" ("model1Id", "model1Prop1") values (5, \'new 1\') returning "id", "model1Prop1" || \' computed1\' as computed',
                  'insert into "public"."model2" ("model1_id", "model2_prop1") values (5, \'new 3\') returning "id_col", "model2_prop1" || \' computed2\' as computed',
                  'insert into "public"."Model1Model2" ("model1Id", "model2Id") values (6, 3) returning "model1Id"'
                ]);

              expect(model.$toJson()).to.eql({
                id: 7,
                model1Id: 5,
                model1Prop1: 'new 1',
                // TODO: why is after twice here?
                computed: 'new 1 computed1 after after',

                model1Relation1: {
                  id: 5,
                  model1Prop1: 'new 2',
                  computed: 'new 2 computed1 after',

                  model1Relation2: [
                    {
                      idCol: 3,
                      model1Id: 5,
                      model2Prop1: 'new 3',
                      computed: 'new 3 computed2 after',

                      model2Relation1: [
                        {
                          model1Prop1: 'new 4',
                          id: 6,
                          computed: 'new 4 computed1 after'
                        }
                      ]
                    }
                  ]
                }
              });
            })
        );
      });

      it('all queries created by a eager query should share the same context', () => {
        let queries = [];

        // We create a query with `eager` method that causes multiple queries to be executed.
        // We install hooks using for the context object and check that the modifications made in those
        // hooks are present in the result. This way we can be sure that the hooks were called for all
        // queries.
        return (
          Model1.query()
            // withSchema uses the context to share the schema between all queries.
            .withSchema('public')
            .context({
              onBuild: builder => {
                // Add a property that is created by the database engine to make sure that the result
                // actually comes from the database.
                if (builder.modelClass() === Model1) {
                  builder.select(
                    'Model1.*',
                    Model1.raw('"model1Prop1" || \' computed1\' as computed')
                  );
                } else {
                  builder.select(
                    'model2.*',
                    Model1.raw('"model2_prop1" || \' computed2\' as computed')
                  );
                }
              },
              runBefore: function() {
                if (this.isExecutable()) {
                  queries.push(this.toSql());
                }
              },
              runAfter: models => {
                _.each(_.flatten([models]), model => {
                  model.computed += ' after';
                });
                return models;
              }
            })
            .where('id', 1)
            .eager('[model1Relation1.[model1Relation1, model1Relation2.model2Relation1]]')
            .modifyEager('model1Relation1.model1Relation2', builder => {
              builder.orderBy('id_col');
            })
            .then(models => {
              expect(queries).to.eql([
                'select "Model1".*, "model1Prop1" || \' computed1\' as computed from "public"."Model1" where "id" = 1',
                'select "Model1".*, "model1Prop1" || \' computed1\' as computed from "public"."Model1" where "Model1"."id" in (2)',
                'select "Model1".*, "model1Prop1" || \' computed1\' as computed from "public"."Model1" where "Model1"."id" in (3)',
                'select "model2".*, "model2_prop1" || \' computed2\' as computed from "public"."model2" where "model2"."model1_id" in (2) order by "id_col" asc',
                'select "Model1Model2"."model2Id" as "objectiontmpjoin0", "Model1".*, "model1Prop1" || \' computed1\' as computed from "public"."Model1" inner join "public"."Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2)'
              ]);

              expect(models).to.eql([
                {
                  id: 1,
                  model1Id: 2,
                  model1Prop1: 'hello 1',
                  model1Prop2: null,
                  computed: 'hello 1 computed1 after',
                  $afterGetCalled: 1,
                  model1Relation1: {
                    id: 2,
                    model1Id: 3,
                    model1Prop1: 'hello 2',
                    model1Prop2: null,
                    computed: 'hello 2 computed1 after',
                    $afterGetCalled: 1,
                    model1Relation1: {
                      id: 3,
                      model1Id: null,
                      model1Prop1: 'hello 3',
                      model1Prop2: null,
                      computed: 'hello 3 computed1 after',
                      $afterGetCalled: 1
                    },
                    model1Relation2: [
                      {
                        idCol: 1,
                        model1Id: 2,
                        model2Prop1: 'hejsan 1',
                        model2Prop2: 30,
                        computed: 'hejsan 1 computed2 after',
                        $afterGetCalled: 1,
                        model2Relation1: [
                          {
                            id: 4,
                            model1Id: null,
                            model1Prop1: 'hello 4',
                            model1Prop2: null,
                            computed: 'hello 4 computed1 after',
                            $afterGetCalled: 1
                          }
                        ]
                      },
                      {
                        idCol: 2,
                        model1Id: 2,
                        model2Prop1: 'hejsan 2',
                        model2Prop2: 20,
                        computed: 'hejsan 2 computed2 after',
                        model2Relation1: [],
                        $afterGetCalled: 1
                      }
                    ]
                  }
                }
              ]);
            })
        );
      });

      it('subquery should be able to override the context (1)', () => {
        // Disable the actual database query because we use a schema that doesn't exists.
        mockKnex.results.push([]);
        let queries = [];

        return Model1.query()
          .withSchema('public')
          .select(
            Model2.query()
              .withSchema('someSchema')
              .avg('model2Prop1')
              .as('avg')
          )
          .context({
            runAfter: (res, builder) => {
              if (builder.isExecutable()) {
                queries.push(builder.toSql());
              }
            }
          })
          .then(() => {
            expect(queries).to.eql(mockKnex.executedQueries);
            expect(queries).to.eql([
              'select (select avg("model2Prop1") from "someSchema"."model2") as "avg" from "public"."Model1"'
            ]);
          });
      });

      it('subquery should be able to override the context (2)', () => {
        // Disable the actual database query because we use a schema that doesn't exists.
        mockKnex.results.push([]);
        let queries = [];

        return Model1.query()
          .select(
            Model2.query()
              .withSchema('someSchema')
              .avg('model2Prop1')
              .as('avg')
          )
          .withSchema('public')
          .context({
            runAfter: (res, builder) => {
              if (builder.isExecutable()) {
                queries.push(builder.toSql());
              }
            }
          })
          .then(() => {
            expect(queries).to.eql(mockKnex.executedQueries);
            expect(queries).to.eql([
              'select (select avg("model2Prop1") from "someSchema"."model2") as "avg" from "public"."Model1"'
            ]);
          });
      });

      it('subquery should be able to override the context (3)', () => {
        // Disable the actual database query because we use a schema that doesn't exists.
        mockKnex.results.push([]);
        let queries = [];

        return Model1.query()
          .withSchema('public')
          .select(builder => {
            builder
              .avg('model2Prop1')
              .from('model2')
              .withSchema('someSchema')
              .as('avg');
          })
          .context({
            runAfter: (res, builder) => {
              if (builder.isExecutable()) {
                queries.push(builder.toSql());
              }
            }
          })
          .then(() => {
            expect(queries).to.eql(mockKnex.executedQueries);
            expect(queries).to.eql([
              'select (select avg("model2Prop1") from "someSchema"."model2") as "avg" from "public"."Model1"'
            ]);
          });
      });

      it('subquery should be able to override the context (4)', () => {
        // Disable the actual database query because we use a schema that doesn't exists.
        mockKnex.results.push([]);
        let queries = [];

        return Model1.query()
          .select(builder => {
            builder
              .avg('model2Prop1')
              .from('model2')
              .withSchema('someSchema')
              .as('avg');
          })
          .withSchema('public')
          .context({
            runAfter: (res, builder) => {
              if (builder.isExecutable()) {
                queries.push(builder.toSql());
              }
            }
          })
          .then(() => {
            expect(queries).to.eql(mockKnex.executedQueries);
            expect(queries).to.eql([
              'select (select avg("model2Prop1") from "someSchema"."model2") as "avg" from "public"."Model1"'
            ]);
          });
      });

      describe('$relatedQuery', () => {
        describe('belongs to one relation', () => {
          let model2;
          let model4;

          beforeEach(() => {
            return Model1.query()
              .whereIn('id', [2, 4])
              .then(mod => {
                model2 = _.find(mod, { id: 2 });
                model4 = _.find(mod, { id: 4 });
                mockKnex.reset();
              });
          });

          it('both queries created by an `insert` should share the same context', () => {
            let queries = [];

            return (
              model4
                .$relatedQuery('model1Relation1')
                .insert({ model1Prop1: 'new' })
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    // Add a property that is created by the database engine to make sure that the result
                    // actually comes from the database.
                    if (builder.modelClass() === Model1) {
                      builder.returning([
                        'id',
                        Model1.raw('"model1Prop1" || \' computed1\' as computed')
                      ]);
                    } else if (builder.modelClass() === Model2) {
                      builder.returning([
                        'id_col',
                        Model1.raw('"model2_prop1" || \' computed2\' as computed')
                      ]);
                    }
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(model => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'insert into "public"."Model1" ("model1Prop1") values (\'new\') returning "id", "model1Prop1" || \' computed1\' as computed',
                    'update "public"."Model1" set "model1Id" = 5 where "Model1"."id" = 4 returning "id", "model1Prop1" || \' computed1\' as computed'
                  ]);

                  expect(model.toJSON()).to.eql({
                    model1Prop1: 'new',
                    id: 5,
                    computed: 'new computed1'
                  });
                })
            );
          });

          it('the query created by `relate` should share the same context', () => {
            let queries = [];

            return (
              model4
                .$relatedQuery('model1Relation1')
                .relate(1)
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    builder.returning('*');
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'update "public"."Model1" set "model1Id" = 1 where "Model1"."id" = 4 returning *'
                  ]);

                  return session.knex('Model1').where('id', 4);
                })
                .then(rows => {
                  expect(rows[0].model1Id).to.eql(1);
                })
            );
          });

          it('the query created by `unrelate` should share the same context', () => {
            let queries = [];

            return (
              model2
                .$relatedQuery('model1Relation1')
                .unrelate()
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    builder.returning('*');
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'update "public"."Model1" set "model1Id" = NULL where "Model1"."id" = 2 returning *'
                  ]);

                  return session.knex('Model1').where('id', 2);
                })
                .then(rows => {
                  expect(rows[0].model1Id).to.eql(null);
                })
            );
          });
        });

        describe('has many relation', () => {
          let model;
          let newModel;

          beforeEach(() => {
            return Model1.query()
              .where('id', 2)
              .first()
              .then(mod => {
                model = mod;
                return Model2.query().insert({ model2Prop1: 'new' });
              })
              .then(newMod => {
                newModel = newMod;
                mockKnex.reset();
              });
          });

          it('the query created by `relate` should share the same context', () => {
            let queries = [];

            return (
              model
                .$relatedQuery('model1Relation2')
                .relate(newModel.idCol)
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    builder.returning('*');
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'update "public"."model2" set "model1_id" = 2 where "model2"."id_col" in (3) returning *'
                  ]);

                  return session.knex('model2').where('id_col', newModel.idCol);
                })
                .then(rows => {
                  expect(rows[0].model1_id).to.eql(2);
                })
            );
          });

          it('the query created by `unrelate` should share the same context', () => {
            let queries = [];

            return (
              model
                .$relatedQuery('model1Relation2')
                .unrelate()
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    builder.returning('*');
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'update "public"."model2" set "model1_id" = NULL where "model2"."model1_id" = 2 returning *'
                  ]);

                  return session.knex('model2');
                })
                .then(rows => {
                  _.each(rows, row => {
                    expect(row.model1_id).to.equal(null);
                  });
                })
            );
          });
        });

        describe('many to many relation', () => {
          let model;

          beforeEach(() => {
            return Model2.query()
              .where('id_col', 1)
              .first()
              .then(mod => {
                model = mod;
                mockKnex.reset();
              });
          });

          it('both queries created by an insert should share the same context', () => {
            let queries = [];

            return (
              model
                .$relatedQuery('model2Relation1')
                .insert({ model1Prop1: 'new' })
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    // Add a property that is created by the database engine to make sure that the result
                    // actually comes from the database.
                    if (builder.modelClass() === Model1) {
                      builder.returning([
                        'id',
                        Model1.raw('"model1Prop1" || \' computed1\' as computed')
                      ]);
                    }
                  },
                  runBefore: function() {
                    queries.push(this.toSql());
                  }
                })
                .then(model => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'insert into "public"."Model1" ("model1Prop1") values (\'new\') returning "id", "model1Prop1" || \' computed1\' as computed',
                    'insert into "public"."Model1Model2" ("model1Id", "model2Id") values (5, 1) returning "model1Id"'
                  ]);

                  expect(model.toJSON()).to.eql({
                    model1Prop1: 'new',
                    id: 5,
                    computed: 'new computed1'
                  });
                })
            );
          });

          it('the query created by `relate` should share the same context', () => {
            let queries = [];

            return (
              model
                .$relatedQuery('model2Relation1')
                .relate(1)
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  onBuild: builder => {
                    builder.returning('*');
                  },
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    'insert into "public"."Model1Model2" ("model1Id", "model2Id") values (1, 1) returning *'
                  ]);

                  return session.knex('Model1Model2');
                })
                .then(rows => {
                  expect(_.filter(rows, { model1Id: 1, model2Id: 1 }).length).to.equal(1);
                })
            );
          });

          it('the query created by `unrelate` should share the same context', () => {
            let queries = [];

            return (
              model
                .$relatedQuery('model2Relation1')
                .unrelate()
                .where('Model1.id', 4)
                // withSchema uses the context to share the schema between all queries.
                .withSchema('public')
                .context({
                  runBefore: function() {
                    if (this.isExecutable()) {
                      queries.push(this.toSql());
                    }
                  }
                })
                .then(() => {
                  expect(mockKnex.executedQueries).to.eql(queries);
                  expect(mockKnex.executedQueries).to.eql([
                    `delete from \"public\".\"Model1Model2\" where \"Model1Model2\".\"model1Id\" in (select \"Model1\".\"id\" from \"public\".\"Model1\" inner join \"public\".\"Model1Model2\" on \"Model1\".\"id\" = \"Model1Model2\".\"model1Id\" where \"Model1Model2\".\"model2Id\" in (1) and \"Model1\".\"id\" = 4) and \"Model1Model2\".\"model2Id\" = 1`
                  ]);

                  return session.knex('Model1Model2');
                })
                .then(rows => {
                  expect(rows).to.have.length(0);
                })
            );
          });
        });
      });
    }
  });
};
