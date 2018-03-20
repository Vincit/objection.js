const _ = require('lodash');
const utils = require('../../lib/utils/knexUtils');
const expect = require('expect.js');
const Promise = require('bluebird');
const mockKnexFactory = require('../../testUtils/mockKnex');

// This is another one of those features that need a separate test suite
// because they are so pervasive.
module.exports = session => {
  const queries = [];

  const knex = mockKnexFactory(session.knex, function(mock, oldImpl, args) {
    queries.push(this.toString());
    return oldImpl.apply(this, args);
  });

  const Model1 = session.unboundModels.Model1.bindKnex(knex);
  const Model2 = session.unboundModels.Model2.bindKnex(knex);

  describe('views and aliases', () => {
    let fullEager;
    let fullEagerResult;

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
              model2Prop1: 'hejsan 1',

              model2Relation2: {
                id: 8,
                model1Prop1: 'hello 8',

                model1Relation1: {
                  id: 9,
                  model1Prop1: 'hello 9'
                }
              }
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

    beforeEach(() => {
      queries.splice(0, queries.length);

      fullEager = `[
        model1Relation1,
        model1Relation2.model2Relation1.[
          model1Relation1,
          model1Relation2
        ]
      ]`;

      // The result we should get for `fullEager`.
      fullEagerResult = [
        {
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
        }
      ];
    });

    before(() => {
      // This makes sure the columnInfo cache is populated.
      return Model1.query()
        .findById(1)
        .eager('[model1Relation1, model1Relation2]')
        .eagerAlgorithm(Model1.JoinEagerAlgorithm);
    });

    describe('aliases', () => {
      it('should use alias in joinRelation', () => {
        return Model1.query()
          .findById(1)
          .table('Model1 as someAlias')
          .joinRelation('[model1Relation1, model1Relation2, model1Relation3]')
          .then(models => {
            if (utils.isPostgres(session.knex)) {
              expect(queries[0].replace(/\s/g, '')).to.equal(
                `
                select "someAlias".*
                from "Model1" as "someAlias"
                inner join "Model1" as "model1Relation1" on "model1Relation1"."id" = "someAlias"."model1Id"
                inner join "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "someAlias"."id"
                inner join "Model1Model2" as "model1Relation3_join" on "model1Relation3_join"."model1Id" = "someAlias"."id"
                inner join "model2" as "model1Relation3" on "model1Relation3_join"."model2Id" = "model1Relation3"."id_col"
                where "someAlias"."id" = 1
              `.replace(/\s/g, '')
              );
            }
          });
      });

      it('should use alias with an instance query', () => {
        return Model1.query()
          .findById(1)
          .then(model => {
            queries.splice(0, queries.length);
            return model
              .$query()
              .alias('foo')
              .joinRelation('model1Relation1.model1Relation1');
          })
          .then(model => {
            if (session.isPostgres()) {
              expect(queries).to.eql([
                'select "foo".* from "Model1" as "foo" inner join "Model1" as "model1Relation1" on "model1Relation1"."id" = "foo"."model1Id" inner join "Model1" as "model1Relation1:model1Relation1" on "model1Relation1:model1Relation1"."id" = "model1Relation1"."model1Id" where "foo"."id" = 1'
              ]);
            }
          });
      });

      it('should use alias for eager queries (WhereInEagerOperation)', () => {
        return Model1.query()
          .findById(1)
          .table('Model1 as someAlias')
          .eager(fullEager)
          .then(sortEager)
          .then(model => {
            if (utils.isPostgres(session.knex)) {
              queries.sort();

              const expectedQueries = [
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in \(1\)/,
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in (\(5, 6\)|\(6, 5\))/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" = 1/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" in \(2\)/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" in \(7\)/,
                /select "someAlias"\.\*, "Model1Model2"\."extra3" as "aliasedExtra", "Model1Model2"\."model2Id" as "objectiontmpjoin0" from "Model1" as "someAlias" inner join "Model1Model2" on "someAlias"\."id" = "Model1Model2"\."model1Id" where "Model1Model2"\."model2Id" in (\(1, 2\)|\(2, 1\))/
              ];

              expectedQueries.forEach((expectedQuery, i) => {
                expect(queries[i]).to.match(expectedQuery);
              });
            }

            expect(model).to.eql(fullEagerResult[0]);
          });
      });

      it('should use alias for eager queries (WhereInEagerOperation) (alias method)', () => {
        return Model1.query()
          .findById(1)
          .alias('someAlias')
          .eager(fullEager)
          .then(sortEager)
          .then(model => {
            if (utils.isPostgres(session.knex)) {
              queries.sort();

              const expectedQueries = [
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in \(1\)/,
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in (\(5, 6\)|\(6, 5\))/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" = 1/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" in \(2\)/,
                /select "someAlias"\.\* from "Model1" as "someAlias" where "someAlias"\."id" in \(7\)/,
                /select "someAlias"\.\*, "Model1Model2"\."extra3" as "aliasedExtra", "Model1Model2"\."model2Id" as "objectiontmpjoin0" from "Model1" as "someAlias" inner join "Model1Model2" on "someAlias"\."id" = "Model1Model2"\."model1Id" where "Model1Model2"\."model2Id" in (\(1, 2\)|\(2, 1\))/
              ];

              expectedQueries.forEach((expectedQuery, i) => {
                expect(queries[i]).to.match(expectedQuery);
              });
            }

            expect(model).to.eql(fullEagerResult[0]);
          });
      });

      it('should use alias for eager queries (JoinEagerAlgorithm)', () => {
        return Model1.query()
          .findById(1)
          .table('Model1 as someAlias')
          .eager(fullEager)
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(sortEager)
          .then(model => {
            if (utils.isPostgres(session.knex)) {
              expect(queries.length).to.equal(1);
              expect(queries[0].replace(/\s/g, '')).to.equal(
                `
                select
                  "someAlias"."id" as "id",
                  "someAlias"."model1Id" as "model1Id",
                  "someAlias"."model1Prop1" as "model1Prop1",
                  "someAlias"."model1Prop2" as "model1Prop2",
                  "model1Relation1"."id" as "model1Relation1:id",
                  "model1Relation1"."model1Id" as "model1Relation1:model1Id",
                  "model1Relation1"."model1Prop1" as "model1Relation1:model1Prop1",
                  "model1Relation1"."model1Prop2" as "model1Relation1:model1Prop2",
                  "model1Relation2"."id_col" as "model1Relation2:id_col",
                  "model1Relation2"."model1_id" as "model1Relation2:model1_id",
                  "model1Relation2"."model2_prop1" as "model1Relation2:model2_prop1",
                  "model1Relation2"."model2_prop2" as "model1Relation2:model2_prop2",
                  "model1Relation2:model2Relation1"."id" as "model1Relation2:model2Relation1:id",
                  "model1Relation2:model2Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Id",
                  "model1Relation2:model2Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Prop1",
                  "model1Relation2:model2Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Prop2",
                  "model1Relation2:model2Relation1_join"."extra3" as "model1Relation2:model2Relation1:aliasedExtra",
                  "model1Relation2:model2Relation1:model1Relation1"."id" as "model1Relation2:model2Relation1:model1Relation1:id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Relation1:model1Id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Relation1:model1Prop1",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Relation1:model1Prop2",
                  "model1Relation2:model2Relation1:model1Relation2"."id_col" as "model1Relation2:model2Relation1:model1Relation2:id_col",
                  "model1Relation2:model2Relation1:model1Relation2"."model1_id" as "model1Relation2:model2Relation1:model1Relation2:model1_id",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop1" as "model1Relation2:model2Relation1:model1Relation2:model2_prop1",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop2" as "model1Relation2:model2Relation1:model1Relation2:model2_prop2"
                from
                  "Model1" as "someAlias"
                left join
                  "Model1" as "model1Relation1" on "model1Relation1"."id" = "someAlias"."model1Id"
                left join
                  "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "someAlias"."id"
                left join
                  "Model1Model2" as "model1Relation2:model2Relation1_join" on "model1Relation2:model2Relation1_join"."model2Id" = "model1Relation2"."id_col"
                left join
                  "Model1" as "model1Relation2:model2Relation1" on "model1Relation2:model2Relation1_join"."model1Id" = "model1Relation2:model2Relation1"."id"
                left join
                  "Model1" as "model1Relation2:model2Relation1:model1Relation1" on "model1Relation2:model2Relation1:model1Relation1"."id" = "model1Relation2:model2Relation1"."model1Id"
                left join
                  "model2" as "model1Relation2:model2Relation1:model1Relation2" on "model1Relation2:model2Relation1:model1Relation2"."model1_id" = "model1Relation2:model2Relation1"."id"
                where
                  "someAlias"."id" = 1
              `.replace(/\s/g, '')
              );
            }

            expect(model).to.eql(fullEagerResult[0]);
          });
      });
    });

    if (utils.isPostgres(session.knex)) {
      describe('views', () => {
        before(() => {
          return session.knex.schema.raw(`
            create view "someView" as (select "Model1".*, "Model1"."model1Prop1" as "viewProp" from "Model1")
          `);
        });

        after(() => {
          return session.knex.schema.raw(`
            drop view "someView"
          `);
        });

        before(() => {
          // This makes sure the columnInfo cache is populated.
          return Model1.query()
            .findById(1)
            .table('someView')
            .eager('[model1Relation1, model1Relation2]')
            .eagerAlgorithm(Model1.JoinEagerAlgorithm);
        });

        it('swapping table into a view for a joinRelation query should work', () => {
          return Model1.query()
            .findById(1)
            .table('someView')
            .joinRelation('[model1Relation1, model1Relation2, model1Relation3]')
            .then(models => {
              if (utils.isPostgres(session.knex)) {
                expect(queries[0].replace(/\s/g, '')).to.equal(
                  `
                  select "someView".*
                  from "someView"
                  inner join "someView" as "model1Relation1" on "model1Relation1"."id" = "someView"."model1Id"
                  inner join "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "someView"."id"
                  inner join "Model1Model2" as "model1Relation3_join" on "model1Relation3_join"."model1Id" = "someView"."id"
                  inner join "model2" as "model1Relation3" on "model1Relation3_join"."model2Id" = "model1Relation3"."id_col"
                  where "someView"."id" = 1
                `.replace(/\s/g, '')
                );
              }
            });
        });

        it('swapping table into a view for an eager query should work (WhereInEagerOperation)', () => {
          return Model1.query()
            .where('someView.id', 1)
            .table('someView')
            .eager(fullEager)
            .then(sortEager)
            .then(model => {
              queries.sort();

              const expectedQueries = [
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in \(1\)/,
                /select "model2"\.\* from "model2" where "model2"\."model1_id" in (\(5, 6\)|\(6, 5\))/,
                /select "someView"\.\* from "someView" where "someView"\."id" = 1/,
                /select "someView"\.\* from "someView" where "someView"\."id" in \(2\)/,
                /select "someView"\.\* from "someView" where "someView"\."id" in \(7\)/,
                /select "someView"\.\*, "Model1Model2"\."extra3" as "aliasedExtra", "Model1Model2"\."model2Id" as "objectiontmpjoin0" from "someView" inner join "Model1Model2" on "someView"\."id" = "Model1Model2"\."model1Id" where "Model1Model2"\."model2Id" in (\(1, 2\)|\(2, 1\))/
              ];

              expectedQueries.forEach((expectedQuery, i) => {
                expect(queries[i]).to.match(expectedQuery);
              });

              expect(model).to.eql([
                {
                  id: 1,
                  model1Id: 2,
                  model1Prop1: 'hello 1',
                  model1Prop2: null,
                  viewProp: 'hello 1',
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 2,
                    model1Id: 3,
                    model1Prop1: 'hello 2',
                    model1Prop2: null,
                    viewProp: 'hello 2',
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
                          viewProp: 'hello 5',
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
                          viewProp: 'hello 6',
                          aliasedExtra: 'extra 6',
                          $afterGetCalled: 1,

                          model1Relation1: {
                            id: 7,
                            model1Id: null,
                            model1Prop1: 'hello 7',
                            model1Prop2: null,
                            viewProp: 'hello 7',
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
                }
              ]);
            });
        });

        it('swapping table into a view for an eager query should work (JoinEagerAlgorithm)', () => {
          return Model1.query()
            .where('someView.id', 1)
            .table('someView')
            .eager(fullEager)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .then(sortEager)
            .then(model => {
              expect(queries.length).to.equal(1);
              expect(queries[0].replace(/\s/g, '')).to.equal(
                `
                select
                  "someView"."id" as "id",
                  "someView"."model1Id" as "model1Id",
                  "someView"."model1Prop1" as "model1Prop1",
                  "someView"."model1Prop2" as "model1Prop2",
                  "someView"."viewProp" as "viewProp",
                  "model1Relation1"."id" as "model1Relation1:id",
                  "model1Relation1"."model1Id" as "model1Relation1:model1Id",
                  "model1Relation1"."model1Prop1" as "model1Relation1:model1Prop1",
                  "model1Relation1"."model1Prop2" as "model1Relation1:model1Prop2",
                  "model1Relation1"."viewProp" as "model1Relation1:viewProp",
                  "model1Relation2"."id_col" as "model1Relation2:id_col",
                  "model1Relation2"."model1_id" as "model1Relation2:model1_id",
                  "model1Relation2"."model2_prop1" as "model1Relation2:model2_prop1",
                  "model1Relation2"."model2_prop2" as "model1Relation2:model2_prop2",
                  "model1Relation2:model2Relation1"."id" as "model1Relation2:model2Relation1:id",
                  "model1Relation2:model2Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Id",
                  "model1Relation2:model2Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Prop1",
                  "model1Relation2:model2Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Prop2",
                  "model1Relation2:model2Relation1"."viewProp" as "model1Relation2:model2Relation1:viewProp",
                  "model1Relation2:model2Relation1_join"."extra3" as "model1Relation2:model2Relation1:aliasedExtra",
                  "model1Relation2:model2Relation1:model1Relation1"."id" as "model1Relation2:model2Relation1:model1Relation1:id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Relation1:model1Id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Relation1:model1Prop1",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Relation1:model1Prop2",
                  "model1Relation2:model2Relation1:model1Relation1"."viewProp" as "model1Relation2:model2Relation1:model1Relation1:viewProp",
                  "model1Relation2:model2Relation1:model1Relation2"."id_col" as "model1Relation2:model2Relation1:model1Relation2:id_col",
                  "model1Relation2:model2Relation1:model1Relation2"."model1_id" as "model1Relation2:model2Relation1:model1Relation2:model1_id",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop1" as "model1Relation2:model2Relation1:model1Relation2:model2_prop1",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop2" as "model1Relation2:model2Relation1:model1Relation2:model2_prop2"
                from
                  "someView"
                left join
                  "someView" as "model1Relation1" on "model1Relation1"."id" = "someView"."model1Id"
                left join
                  "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "someView"."id"
                left join
                  "Model1Model2" as "model1Relation2:model2Relation1_join" on "model1Relation2:model2Relation1_join"."model2Id" = "model1Relation2"."id_col"
                left join
                  "someView" as "model1Relation2:model2Relation1" on "model1Relation2:model2Relation1_join"."model1Id" = "model1Relation2:model2Relation1"."id"
                left join
                  "someView" as "model1Relation2:model2Relation1:model1Relation1" on "model1Relation2:model2Relation1:model1Relation1"."id" = "model1Relation2:model2Relation1"."model1Id"
                left join
                  "model2" as "model1Relation2:model2Relation1:model1Relation2" on "model1Relation2:model2Relation1:model1Relation2"."model1_id" = "model1Relation2:model2Relation1"."id"
                where
                  "someView"."id" = 1
                `.replace(/\s/g, '')
              );

              // This makes sure, `Model1` and `someView` have different metadata.
              expect(Array.from(Model1.$$dbMetadata.keys()).sort()).to.eql(['Model1', 'someView']);
              expect(model).to.eql([
                {
                  id: 1,
                  model1Id: 2,
                  model1Prop1: 'hello 1',
                  model1Prop2: null,
                  viewProp: 'hello 1',
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 2,
                    model1Id: 3,
                    model1Prop1: 'hello 2',
                    model1Prop2: null,
                    viewProp: 'hello 2',
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
                          viewProp: 'hello 5',
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
                          viewProp: 'hello 6',
                          aliasedExtra: 'extra 6',
                          $afterGetCalled: 1,

                          model1Relation1: {
                            id: 7,
                            model1Id: null,
                            model1Prop1: 'hello 7',
                            model1Prop2: null,
                            viewProp: 'hello 7',
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
                }
              ]);
            });
        });

        it('swapping table into a view for an eager query with filters should work (JoinEagerAlgorithm)', () => {
          return Model1.query()
            .where('someView.id', 1)
            .table('someView')
            .eager(fullEager)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .modifyEager('model1Relation1', builder => builder.select('someView.id'))
            .modifyEager('model1Relation2.model2Relation1', builder =>
              builder.select('someView.id')
            )
            .then(sortEager)
            .then(model => {
              expect(queries.length).to.equal(1);
              expect(queries[0].replace(/\s/g, '')).to.equal(
                `
                select
                  "someView"."id" as "id",
                  "someView"."model1Id" as "model1Id",
                  "someView"."model1Prop1" as "model1Prop1",
                  "someView"."model1Prop2" as "model1Prop2",
                  "someView"."viewProp" as "viewProp",
                  "model1Relation1"."id" as "model1Relation1:id",
                  "model1Relation2"."id_col" as "model1Relation2:id_col",
                  "model1Relation2"."model1_id" as "model1Relation2:model1_id",
                  "model1Relation2"."model2_prop1" as "model1Relation2:model2_prop1",
                  "model1Relation2"."model2_prop2" as "model1Relation2:model2_prop2",
                  "model1Relation2:model2Relation1"."id" as "model1Relation2:model2Relation1:id",
                  "model1Relation2:model2Relation1:model1Relation1"."id" as "model1Relation2:model2Relation1:model1Relation1:id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Relation1:model1Id",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Relation1:model1Prop1",
                  "model1Relation2:model2Relation1:model1Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Relation1:model1Prop2",
                  "model1Relation2:model2Relation1:model1Relation1"."viewProp" as "model1Relation2:model2Relation1:model1Relation1:viewProp",
                  "model1Relation2:model2Relation1:model1Relation2"."id_col" as "model1Relation2:model2Relation1:model1Relation2:id_col",
                  "model1Relation2:model2Relation1:model1Relation2"."model1_id" as "model1Relation2:model2Relation1:model1Relation2:model1_id",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop1" as "model1Relation2:model2Relation1:model1Relation2:model2_prop1",
                  "model1Relation2:model2Relation1:model1Relation2"."model2_prop2" as "model1Relation2:model2Relation1:model1Relation2:model2_prop2"
                from
                  "someView"
                left join
                  (select "someView"."id", "someView"."model1Id" from "someView") as "model1Relation1" on "model1Relation1"."id" = "someView"."model1Id"
                left join
                  "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "someView"."id"
                left join
                  "Model1Model2" as "model1Relation2:model2Relation1_join" on "model1Relation2:model2Relation1_join"."model2Id" = "model1Relation2"."id_col"
                left join
                  (select "someView"."id", "someView"."model1Id" from "someView") as "model1Relation2:model2Relation1" on "model1Relation2:model2Relation1_join"."model1Id" = "model1Relation2:model2Relation1"."id"
                left join
                  "someView" as "model1Relation2:model2Relation1:model1Relation1" on "model1Relation2:model2Relation1:model1Relation1"."id" = "model1Relation2:model2Relation1"."model1Id"
                left join
                  "model2" as "model1Relation2:model2Relation1:model1Relation2" on "model1Relation2:model2Relation1:model1Relation2"."model1_id" = "model1Relation2:model2Relation1"."id"
                where
                  "someView"."id" = 1
                `.replace(/\s/g, '')
              );
            });
        });
      });
    }
  });
};

function sortEager(models) {
  let mods = models;

  if (!Array.isArray(mods)) {
    mods = [mods];
  }

  mods.forEach(model => {
    if (model.model1Relation2) {
      model.model1Relation2 = _.sortBy(model.model1Relation2, 'idCol');
    }

    if (model.model1Relation2[1].model2Relation1) {
      model.model1Relation2[1].model2Relation1 = _.sortBy(
        model.model1Relation2[1].model2Relation1,
        'id'
      );
    }
  });

  return models;
}
