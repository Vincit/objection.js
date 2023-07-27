const _ = require('lodash');
const chai = require('chai');
const expect = require('expect.js');
const Promise = require('bluebird');
const { ValidationError, raw } = require('../..');
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = (session) => {
  const Model1 = session.models.Model1;
  const Model2 = session.models.Model2;

  describe('Model withGraph queries', () => {
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
                    model2Prop1: 'hejsan 4',
                  },
                ],
              },
            },
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
                  model1Prop1: 'hello 9',
                },
              },
            },
            {
              idCol: 2,
              model2Prop1: 'hejsan 2',

              model2Relation1: [
                {
                  id: 5,
                  model1Prop1: 'hello 5',
                  aliasedExtra: 'extra 5',
                },
                {
                  id: 6,
                  model1Prop1: 'hello 6',
                  aliasedExtra: 'extra 6',

                  model1Relation1: {
                    id: 7,
                    model1Prop1: 'hello 7',
                  },

                  model1Relation2: [
                    {
                      idCol: 3,
                      model2Prop1: 'hejsan 3',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    test('model1Relation1', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test({ model1Relation1: true }, (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test('model1Relation1(select:model1Prop1)', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            model1Prop1: 'hello 2',
            $afterFindCalled: 1,
          },
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test(
      {
        model1Relation1: {
          $modify: ['select:model1Prop1'],
        },
      },
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              model1Prop1: 'hello 2',
              $afterFindCalled: 1,
            },
          },
        ]);

        expect(models[0]).to.be.a(Model1);
        expect(models[0].model1Relation1).to.be.a(Model1);
      },
    );

    test('model1Relation1.model1Relation1', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterFindCalled: 1,
            },
          },
        },
      ]);
    });

    test({ model1Relation1: { model1Relation1: {} } }, (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterFindCalled: 1,
            },
          },
        },
      ]);
    });

    test('model1Relation1.model1Relation1Inverse', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1Inverse: {
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              $afterFindCalled: 1,
            },
          },
        },
      ]);
    });

    test(
      'model1Relation1.^',
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                model1Prop2: null,
                $afterFindCalled: 1,
                model1Relation1: {
                  id: 4,
                  model1Id: null,
                  model1Prop1: 'hello 4',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                  model1Relation1: null,
                },
              },
            },
          },
        ]);
      },
      { disableJoin: true },
    );

    test('model1Relation1.^2', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterFindCalled: 1,
            },
          },
        },
      ]);
    });

    test(
      {
        aliased1: {
          $relation: 'model1Relation1',
          $recursive: 2,
        },
      },
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,

            aliased1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
              aliased1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                model1Prop2: null,
                $afterFindCalled: 1,
              },
            },
          },
        ]);
      },
    );

    test(
      'model1Relation1(selectId).^',
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              $afterFindCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                $afterFindCalled: 1,
                model1Relation1: {
                  id: 4,
                  $afterFindCalled: 1,
                  model1Id: null,
                  model1Relation1: null,
                },
              },
            },
          },
        ]);
      },
      {
        filters: {
          selectId: (builder) => {
            builder.select('id', 'model1Id');
          },
        },
        disableJoin: true,
      },
    );

    test(
      'model1Relation1(selectId).^4',
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              model1Prop1: 'hello 2',
              $afterFindCalled: 1,
              model1Relation1: {
                model1Prop1: 'hello 3',
                $afterFindCalled: 1,
                model1Relation1: {
                  model1Prop1: 'hello 4',
                  $afterFindCalled: 1,
                  model1Relation1: null,
                },
              },
            },
          },
        ]);
      },
      {
        filters: {
          selectId: (builder) => {
            builder.select('model1Prop1');
          },
        },
        disableWhereIn: true,
        eagerOptions: { minimize: true },
      },
    );

    test('model1Relation2.model2Relation2', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,

              model2Relation2: {
                id: 8,
                model1Id: 9,
                model1Prop1: 'hello 8',
                model1Prop2: null,
                $afterFindCalled: 1,
              },
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,
              model2Relation2: null,
            },
          ],
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2).to.be.a(Model1);
    });

    test('model1Relation2.model2Relation2.model1Relation1', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,

              model2Relation2: {
                id: 8,
                model1Id: 9,
                model1Prop1: 'hello 8',
                model1Prop2: null,
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 9,
                  model1Id: null,
                  model1Prop1: 'hello 9',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },
              },
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,
              model2Relation2: null,
            },
          ],
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2.model1Relation1).to.be.a(Model1);
    });

    test('[model1Relation1, model1Relation2]', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,
            },
          ],
        },
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
    });

    test(
      '[model1Relation1, model1Relation2(orderByDesc, selectProps)]',
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,

            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
            },

            model1Relation2: [
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                $afterFindCalled: 1,
              },
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                $afterFindCalled: 1,
              },
            ],
          },
        ]);
      },
      {
        filters: {
          selectProps: (builder) => {
            builder.select('id_col', 'model1_id', 'model2_prop1');
          },
          orderByDesc: (builder) => {
            builder.orderBy('model2_prop1', 'desc');
          },
        },
        disableJoin: true,
        disableSort: true,
      },
    );

    test('[model1Relation1, model1Relation2.model2Relation1]', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,
              model2Relation1: [],
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,

              model2Relation1: [
                {
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  $afterFindCalled: 1,
                },
                {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterFindCalled: 1,
                },
              ],
            },
          ],
        },
      ]);
    });

    test('[model1Relation2.model2Relation1, model1Relation1]', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,
              model2Relation1: [],
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,

              model2Relation1: [
                {
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  $afterFindCalled: 1,
                },
                {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterFindCalled: 1,
                },
              ],
            },
          ],
        },
      ]);
    });

    test('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]', (models) => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,

          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
          },

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterFindCalled: 1,
              model2Relation1: [],
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterFindCalled: 1,

              model2Relation1: [
                {
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: [],
                  $afterFindCalled: 1,
                },
                {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterFindCalled: 1,

                  model1Relation1: {
                    id: 7,
                    model1Id: null,
                    model1Prop1: 'hello 7',
                    model1Prop2: null,
                    $afterFindCalled: 1,
                  },

                  model1Relation2: [
                    {
                      idCol: 3,
                      model1Id: 6,
                      model2Prop1: 'hejsan 3',
                      model2Prop2: null,
                      $afterFindCalled: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    // This tests the Model.modifiers feature.
    test(
      `[
      model1Relation1(select:id, localModifier),
      model1Relation2.[
        model2Relation1(select:model1Prop1).[
          model1Relation1(select:id, select:model1Prop1, select:model1Prop1Aliased),
          model1Relation2
        ]
      ]
    ]`,
      (models) => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,

            model1Relation1: {
              id: 2,
              model1Prop2: null,
              $afterFindCalled: 1,
            },

            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterFindCalled: 1,
                model2Relation1: [],
              },
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterFindCalled: 1,

                model2Relation1: [
                  {
                    model1Prop1: 'hello 5',
                    $afterFindCalled: 1,

                    model1Relation1: null,
                    model1Relation2: [],
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterFindCalled: 1,

                    model1Relation1: {
                      id: 7,
                      model1Prop1: 'hello 7',
                      aliasedInFilter: 'hello 7',
                      $afterFindCalled: 1,
                    },

                    model1Relation2: [
                      {
                        idCol: 3,
                        model1Id: 6,
                        model2Prop1: 'hejsan 3',
                        model2Prop2: null,
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]);
      },
      {
        filters: {
          localModifier: (builder) => builder.select('model1Prop2'),
        },
      },
    );

    it('should fail fast on incorrect table name', function (done) {
      Model1.query()
        .findById(1)
        .withGraphJoined('model1Relation111')
        .then(_.noop)
        .catch((err) => {
          expect(err.message).to.equal(
            'unknown relation "model1Relation111" in a relation expression',
          );
          done();
        });
    });

    it('setting maxBatchSize option to 1 should cause relations to be fetched naively to each parent separately', () => {
      return Model1.query()
        .withGraphFetched('model1Relation2', { maxBatchSize: 1 })
        .whereExists(Model1.relatedQuery('model1Relation2'))
        .modifyGraph('model1Relation2', (query) => {
          // This works only because we set `maxBatchSize` to 1.
          query.limit(1).orderBy('id_col');
        })
        .orderBy('id')
        .then((result) => {
          expect(result).to.eql([
            {
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 1,
                  model2Prop1: 'hejsan 1',
                  model2Prop2: null,
                  $afterFindCalled: 1,
                },
              ],
              $afterFindCalled: 1,
            },
            {
              id: 4,
              model1Id: null,
              model1Prop1: 'hello 4',
              model1Prop2: null,
              model1Relation2: [
                {
                  idCol: 4,
                  model1Id: 4,
                  model2Prop1: 'hejsan 4',
                  model2Prop2: null,
                  $afterFindCalled: 1,
                },
              ],
              $afterFindCalled: 1,
            },
            {
              id: 6,
              model1Id: 7,
              model1Prop1: 'hello 6',
              model1Prop2: null,
              model1Relation2: [
                {
                  idCol: 3,
                  model1Id: 6,
                  model2Prop1: 'hejsan 3',
                  model2Prop2: null,
                  $afterFindCalled: 1,
                },
              ],
              $afterFindCalled: 1,
            },
          ]);
        });
    });

    it('should work with zero id', () => {
      return Promise.map(
        ['withGraphFetched', 'withGraphJoined'],
        (method) => {
          return session
            .populate([
              {
                id: 0,
                model1Prop1: 'hello 0',

                model1Relation1: {
                  id: 1,
                  model1Prop1: 'hello 1',
                },

                model1Relation2: [
                  {
                    idCol: 0,
                    model2Prop1: 'hejsan 1',

                    model2Relation1: [
                      {
                        id: 2,
                        model1Prop1: 'hello 2',
                      },
                    ],
                  },
                ],
              },
            ])
            .then(() => {
              return Model1.query()
                .where('Model1.id', 0)
                [method]('[model1Relation1, model1Relation2.model2Relation1]');
            })
            .then((models) => {
              expect(models).to.eql([
                {
                  id: 0,
                  model1Prop1: 'hello 0',
                  model1Prop2: null,
                  model1Id: 1,
                  $afterFindCalled: 1,

                  model1Relation1: {
                    id: 1,
                    model1Prop1: 'hello 1',
                    model1Prop2: null,
                    model1Id: null,
                    $afterFindCalled: 1,
                  },

                  model1Relation2: [
                    {
                      idCol: 0,
                      model2Prop1: 'hejsan 1',
                      model2Prop2: null,
                      model1Id: 0,
                      $afterFindCalled: 1,

                      model2Relation1: [
                        {
                          id: 2,
                          model1Prop1: 'hello 2',
                          model1Prop2: null,
                          aliasedExtra: null,
                          model1Id: null,
                          $afterFindCalled: 1,
                        },
                      ],
                    },
                  ],
                },
              ]);
            });
        },
        { concurrency: 1 },
      );
    });

    it('keepImplicitJoinProps', () => {
      return Model1.query()
        .select('id')
        .findById(1)
        .withGraphFetched('[model1Relation1, model1Relation2.model2Relation1]')
        .internalOptions({ keepImplicitJoinProps: true })
        .modifyGraph('model1Relation1', (qb) => qb.select('Model1.id'))
        .modifyGraph('model1Relation2', (qb) => qb.select('model2.id_col').orderBy('model2.id_col'))
        .modifyGraph('model1Relation2.model2Relation1', (qb) =>
          qb.select('Model1.id').orderBy('Model1.id'),
        )
        .then((res) => {
          expect(res).to.eql({
            id: 1,
            model1Id: 2,
            $afterFindCalled: 1,

            model1Relation1: {
              id: 2,
              $afterFindCalled: 1,
            },

            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                $afterFindCalled: 1,

                model2Relation1: [],
              },
              {
                idCol: 2,
                model1Id: 1,
                $afterFindCalled: 1,

                model2Relation1: [
                  {
                    id: 5,
                    $afterFindCalled: 1,
                    objectiontmpjoin0: 2,
                  },
                  {
                    id: 6,
                    $afterFindCalled: 1,
                    objectiontmpjoin0: 2,
                  },
                ],
              },
            ],
          });
        });
    });

    it('range should work', () => {
      return Model1.query()
        .where('id', 1)
        .withGraphFetched('[model1Relation1, model1Relation2]')
        .range(0, 0)
        .then((res) => {
          expect(res.results[0].model1Relation1.id).to.equal(2);
          expect(res.results[0].model1Relation2).to.have.length(2);
        });
    });

    it('range should work with joinEager', () => {
      return Model1.query()
        .where('Model1.id', 1)
        .withGraphJoined('model1Relation1')
        .range(0, 0)
        .then((res) => {
          expect(res.results[0].model1Relation1.id).to.equal(2);
        });
    });

    it('eager should not blow up');

    it('should be able to call eager from runBefore hook', () => {
      return Model1.query()
        .runBefore((_, builder) => {
          builder.withGraphFetched('model1Relation1');
        })
        .findOne({ model1Prop1: 'hello 1' })
        .then((result) => {
          chai.expect(result).to.containSubset({
            model1Prop1: 'hello 1',

            model1Relation1: {
              model1Prop1: 'hello 2',
            },
          });
        });
    });

    it('should be able to call joinEager from runBefore hook', () => {
      return Model1.query()
        .runBefore((_, builder) => {
          builder.withGraphJoined('model1Relation1');
        })
        .where('Model1.model1Prop1', 'hello 1')
        .first()
        .then((result) => {
          chai.expect(result).to.containSubset({
            model1Prop1: 'hello 1',

            model1Relation1: {
              model1Prop1: 'hello 2',
            },
          });
        });
    });

    it('eager should not blow up with an empty eager operation', () => {
      return Model1.query()
        .modifyGraph('foo', () => {})
        .findOne({ model1Prop1: 'hello 1' })
        .then((result) => {
          expect(result.model1Prop1).to.equal('hello 1');
        });
    });

    it('should be able to order by ambiguous column (issue #1287 regression)', () => {
      return Model1.query()
        .findOne('Model1.model1Prop1', 'hello 1')
        .withGraphJoined('model1Relation1')
        .orderBy('id')
        .execute();
    });

    if (session.isPostgres()) {
      it('should be able to use a distinctOn trick to fetch one of each related item', async () => {
        await session.populate({
          id: 1,
          model1Prop1: 'root',
          model1Relation2: [
            {
              idCol: 1,
              model2Prop1: '1',
              model2Relation1: [
                {
                  id: 2,
                  model1Prop1: '11',
                },
                {
                  id: 3,
                  model1Prop1: '12',
                },
              ],
            },
            {
              idCol: 2,

              model2Prop1: '2',
              model2Relation1: [
                {
                  id: 4,
                  model1Prop1: '21',
                },
                {
                  id: 5,
                  model1Prop1: '22',
                },
              ],
            },
            {
              idCol: 3,

              model2Prop1: '3',
              model2Relation1: [
                {
                  id: 6,
                  model1Prop1: '31',
                },
                {
                  id: 7,
                  model1Prop1: '32',
                },
              ],
            },
          ],
        });

        const result = await Model2.query()
          .withGraphFetched('model2Relation1(onlyFirst)')
          .orderBy('id_col')
          .modifiers({
            onlyFirst(query) {
              query
                .orderBy(['model2Id', { column: 'model1Prop1', order: 'desc' }])
                .distinctOn('model2Id');
            },
          });

        expect(result).to.eql([
          {
            idCol: 1,
            model1Id: 1,
            model2Prop1: '1',
            model2Prop2: null,
            model2Relation1: [
              {
                id: 3,
                model1Id: null,
                model1Prop1: '12',
                model1Prop2: null,
                aliasedExtra: null,
                $afterFindCalled: 1,
              },
            ],
            $afterFindCalled: 1,
          },
          {
            idCol: 2,
            model1Id: 1,
            model2Prop1: '2',
            model2Prop2: null,
            model2Relation1: [
              {
                id: 5,
                model1Id: null,
                model1Prop1: '22',
                model1Prop2: null,
                aliasedExtra: null,
                $afterFindCalled: 1,
              },
            ],
            $afterFindCalled: 1,
          },
          {
            idCol: 3,
            model1Id: 1,
            model2Prop1: '3',
            model2Prop2: null,
            model2Relation1: [
              {
                id: 7,
                model1Id: null,
                model1Prop1: '32',
                model1Prop2: null,
                aliasedExtra: null,
                $afterFindCalled: 1,
              },
            ],
            $afterFindCalled: 1,
          },
        ]);
      });
    }

    // TODO: enable for v2.0.
    it.skip('should fail with a clear error when a duplicate relation is detected', () => {
      expect(() => {
        Model1.query().withGraphFetched('[model1Relation1, model1Relation1.model1Relation2]');
      }).to.throwException((err) => {
        expect(err.message).to.equal(
          `Duplicate relation name "model1Relation1" in relation expression "[model1Relation1, model1Relation1.model1Relation2]". Use "a.[b, c]" instead of "[a.b, a.c]".`,
        );
      });
    });

    describe('skipFetched option', () => {
      let TestModel;
      let queries;

      beforeEach(() => {
        queries = [];

        // Create a dummy mock so that we can bind Model1 to it.
        TestModel = Model1.bindKnex(
          mockKnexFactory(session.knex, function (mock, oldImpl, args) {
            queries.push(this.toSQL());
            return oldImpl.apply(this, args);
          }),
        );
      });

      it('should not fetch an existing relation when `skipFetched` option is true', async () => {
        const models = await TestModel.query().withGraphFetched('model1Relation1');

        queries = [];
        const result = await TestModel.fetchGraph(models, 'model1Relation1', { skipFetched: true });

        expect(queries).to.have.length(0);
        expect(models).to.eql(result);
      });

      it('should not fetch an existing nested relation when `skipFetched` option is true', async () => {
        let result = await TestModel.query()
          .withGraphFetched('model1Relation1')
          .whereIn('id', [1, 2, 3]);

        queries = [];
        result = await TestModel.fetchGraph(result, 'model1Relation1.model1Relation1', {
          skipFetched: true,
        });

        expect(queries).to.have.length(1);
      });

      it('should fetch an existing relation when `skipFetched` option is true if not all needed relation props exist', async () => {
        const model = await TestModel.query().withGraphFetched('model1Relation1').findById(1);

        // Deleting this will cause `fetchGraph` to reload model.model1Relation1
        // because it needs it to have the `model1Id` present for the next level
        // of fetching.
        delete model.model1Relation1.model1Id;

        queries = [];
        await model.$fetchGraph('model1Relation1.model1Relation1', { skipFetched: true });

        expect(queries).to.have.length(2);
        expect(model).to.eql({
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterFindCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              $afterFindCalled: 1,
              model1Prop2: null,
            },
          },
        });
      });

      it('should fetch an existing relation when `skipFetched` option is true if not all needed relation props exist (2)', async () => {
        const model = await TestModel.query().withGraphFetched('model1Relation1').findById(1);

        // Deleting this will cause `fetchGraph` to reload model.model1Relation1
        // because it needs it to have the `id` present for the next level
        // of fetching.
        delete model.model1Relation1.id;

        queries = [];
        await model.$fetchGraph('model1Relation1.model1Relation2', { skipFetched: true });

        expect(queries).to.have.length(2);
      });

      it('should fetch other relations when `skipFetched` option is true', async () => {
        const models = await TestModel.query().withGraphFetched('model1Relation1').where('id', 1);

        queries = [];
        const result = await TestModel.fetchGraph(
          models,
          '[model1Relation1.model1Relation1, model1Relation2(orderById)]',
          { skipFetched: true },
        );

        expect(queries).to.have.length(2);
        expect(result).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                $afterFindCalled: 1,
                model1Prop2: null,
              },
            },
            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
            ],
          },
        ]);
      });

      it('should work with nested relations', async () => {
        const models = await TestModel.query()
          .withGraphFetched('model1Relation1.model1Relation1')
          .where('id', 1);

        queries = [];
        const result = await TestModel.fetchGraph(
          models,
          '[model1Relation1.model1Relation1, model1Relation2(orderById)]',
          { skipFetched: true },
        );

        expect(queries).to.have.length(1);
        expect(result).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                $afterFindCalled: 1,
                model1Prop2: null,
              },
            },
            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
            ],
          },
        ]);
      });

      it('should work with nested and parallel relations', async () => {
        const models = await TestModel.query()
          .withGraphFetched('[model1Relation1.model1Relation1, model1Relation2(orderById)]')
          .where('id', 1);

        queries = [];
        const result = await TestModel.fetchGraph(
          models,
          '[model1Relation1.model1Relation1, model1Relation2]',
          { skipFetched: true },
        );

        expect(queries).to.have.length(0);
        expect(result).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterFindCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterFindCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                $afterFindCalled: 1,
                model1Prop2: null,
              },
            },
            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
              {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                $afterFindCalled: 1,
                model2Prop2: null,
              },
            ],
          },
        ]);
      });
    });

    describe('QueryBuilder.withGraphJoined', () => {
      it('select should work', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2:model2Relation1.id', 6)
          .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]')
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      // Disabled for sqlite because it doesn't have `concat` function :)
      if (!session.isSqlite()) {
        it('select * + raw should work', () => {
          return Model1.query()
            .select(
              'Model1.*',
              raw(`concat(??, ' - ', ??) as "rawThingy"`, 'Model1.model1Prop1', 'Model1.id'),
            )
            .where('Model1.id', 1)
            .where('model1Relation2.id_col', 2)
            .where('model1Relation2:model2Relation1.id', 6)
            .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]')
            .then((models) => {
              expect(models).to.eql([
                {
                  id: 1,
                  model1Prop1: 'hello 1',
                  model1Prop2: null,
                  model1Id: 2,
                  rawThingy: 'hello 1 - 1',
                  $afterFindCalled: 1,

                  model1Relation1: {
                    id: 2,
                    model1Id: 3,
                    model1Prop1: 'hello 2',
                    model1Prop2: null,
                    $afterFindCalled: 1,
                  },

                  model1Relation2: [
                    {
                      idCol: 2,
                      model1Id: 1,
                      model2Prop1: 'hejsan 2',
                      model2Prop2: null,
                      $afterFindCalled: 1,

                      model2Relation1: [
                        {
                          id: 6,
                          model1Id: 7,
                          model1Prop1: 'hello 6',
                          model1Prop2: null,
                          aliasedExtra: 'extra 6',
                          $afterFindCalled: 1,
                        },
                      ],
                    },
                  ],
                },
              ]);
            });
        });

        it('raw select should work in modifier', () => {
          return Model1.query()
            .select('Model1.id')
            .where('Model1.id', 1)
            .where('model1Relation2.id_col', 2)
            .where('model1Relation2:model2Relation1.id', 6)
            .withGraphJoined('[model1Relation1(rawStuff), model1Relation2.model2Relation1]')
            .modifiers({
              rawStuff(builder) {
                builder.select(
                  raw(`concat(??, ' - ', ?? * 2)`, 'model1Prop1', 'id').as('rawThingy'),
                );
              },
            })
            .then((models) => {
              expect(models).to.eql([
                {
                  id: 1,
                  $afterFindCalled: 1,

                  model1Relation1: {
                    rawThingy: 'hello 2 - 4',
                    $afterFindCalled: 1,
                  },

                  model1Relation2: [
                    {
                      idCol: 2,
                      model1Id: 1,
                      model2Prop1: 'hejsan 2',
                      model2Prop2: null,
                      $afterFindCalled: 1,

                      model2Relation1: [
                        {
                          id: 6,
                          model1Id: 7,
                          model1Prop1: 'hello 6',
                          model1Prop2: null,
                          aliasedExtra: 'extra 6',
                          $afterFindCalled: 1,
                        },
                      ],
                    },
                  ],
                },
              ]);
            });
        });
      }

      it('select should work with alias', () => {
        return Model1.query()
          .select('Model1.id as theId', 'Model1.model1Prop1 as leProp')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2:model2Relation1.id', 6)
          .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]')
          .then((models) => {
            expect(models).to.eql([
              {
                theId: 1,
                leProp: 'hello 1',
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      it('should be able to change the join type', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .withGraphJoined('model1Relation2', { joinOperation: 'innerJoin' })
          .orderBy(['Model1.id', 'model1Relation2.id_col'])
          .then((models) => {
            // With innerJoin we should only get `Model1` instances that have one
            // or more `model2Relation2` relations.
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
                $afterFindCalled: 1,
                model1Relation2: [
                  {
                    idCol: 1,
                    model1Id: 1,
                    model2Prop1: 'hejsan 1',
                    model2Prop2: null,
                    $afterFindCalled: 1,
                  },
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,
                  },
                ],
              },
              {
                id: 4,
                model1Prop1: 'hello 4',
                $afterFindCalled: 1,
                model1Relation2: [
                  {
                    idCol: 4,
                    model1Id: 4,
                    model2Prop1: 'hejsan 4',
                    model2Prop2: null,
                    $afterFindCalled: 1,
                  },
                ],
              },
              {
                id: 6,
                model1Prop1: 'hello 6',
                $afterFindCalled: 1,
                model1Relation2: [
                  {
                    idCol: 3,
                    model1Id: 6,
                    model2Prop1: 'hejsan 3',
                    model2Prop2: null,
                    $afterFindCalled: 1,
                  },
                ],
              },
            ]);
          });
      });

      it('should be able to change the separator', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2->model2Relation1.id', 6)
          .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]', {
            separator: '->',
          })
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      it('should be able to refer to joined relations with syntax Table:rel1:rel2.col', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]')
          .orderBy(['Model1.id', 'model1Relation2:model2Relation1.id'])
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null,
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        id: 5,
                        model1Id: null,
                        model1Prop1: 'hello 5',
                        model1Prop2: null,
                        aliasedExtra: 'extra 5',
                        $afterFindCalled: 1,
                      },
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      it('should be able to give aliases for relations', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .where('mr2.id_col', 2)
          .withGraphJoined('[model1Relation1, model1Relation2.model2Relation1]', {
            aliases: {
              model1Relation2: 'mr2',
            },
          })
          .orderBy(['Model1.id', 'mr2:model2Relation1.id'])
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null,
                $afterFindCalled: 1,

                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                },

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        id: 5,
                        model1Id: null,
                        model1Prop1: 'hello 5',
                        model1Prop2: null,
                        aliasedExtra: 'extra 5',
                        $afterFindCalled: 1,
                      },
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterFindCalled: 1,
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      it('relation references longer that 63 chars should throw an exception', (done) => {
        Model1.query()
          .where('Model1.id', 1)
          .withGraphJoined('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]')
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.modelClass).to.equal(Model1);
            expect(err.message).to.equal(
              'identifier model1Relation1:model1Relation1:model1Relation1:model1Relation1:id is over 63 characters long and would be truncated by the database engine.',
            );
            done();
          })
          .catch(done);
      });

      it('relation references longer that 63 chars should NOT throw an exception if minimize: true option is given', (done) => {
        Model1.query()
          .where('Model1.id', 1)
          .withGraphJoined('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]', {
            minimize: true,
          })
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null,
                $afterFindCalled: 1,
                model1Relation1: {
                  id: 2,
                  model1Id: 3,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterFindCalled: 1,
                  model1Relation1: {
                    id: 3,
                    model1Id: 4,
                    model1Prop1: 'hello 3',
                    model1Prop2: null,
                    $afterFindCalled: 1,
                    model1Relation1: {
                      id: 4,
                      model1Id: null,
                      model1Prop1: 'hello 4',
                      model1Prop2: null,
                      $afterFindCalled: 1,
                      model1Relation1: null,
                    },
                  },
                },
              },
            ]);

            done();
          })
          .catch(done);
      });

      it('infinitely recursive expressions should fail', (done) => {
        Model1.query()
          .where('Model1.id', 1)
          .withGraphJoined('model1Relation1.^')
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'recursion depth of eager expression model1Relation1.^ too big for JoinEagerAlgorithm',
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given missing filter', (done) => {
        Model1.query()
          .where('id', 1)
          .withGraphFetched('model1Relation2(missingFilter)')
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'could not find modifier "missingFilter" for relation "model1Relation2"',
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given missing relation', (done) => {
        Model1.query()
          .where('id', 1)
          .withGraphFetched('invalidRelation')
          .then(() => {
            throw new Error('should not get here');
          })
          .catch((err) => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'unknown relation "invalidRelation" in an eager expression',
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given invalid relation expression', (done) => {
        Model1.query()
          .where('id', 1)
          .withGraphFetched('invalidRelation')
          .then(() => {
            throw new Error('should not get here');
          })
          .catch((err) => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'unknown relation "invalidRelation" in an eager expression',
            );
            done();
          })
          .catch(done);
      });
    });

    describe('QueryBuilder.modifyGraph', () => {
      it('should filter the eager query using relation expressions as paths', () => {
        return Promise.all(
          ['withGraphFetched', 'withGraphJoined'].map((method) => {
            return Model1.query()
              .where('Model1.id', 1)
              .modifyGraph('model1Relation2.model2Relation1', (builder) => {
                builder.where('Model1.id', 6);
              })
              [method]('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
              .modifyGraph('model1Relation2', (builder) => {
                builder.where('model2_prop1', 'hejsan 2');
              })
              .then((models) => {
                expect(models[0].model1Relation2).to.have.length(1);
                expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 2');

                expect(models[0].model1Relation2[0].model2Relation1).to.have.length(1);
                expect(models[0].model1Relation2[0].model2Relation1[0].id).to.equal(6);
              });
          }),
        );
      });

      it('should accept a modifier name', () => {
        return Promise.all(
          ['withGraphFetched', 'withGraphJoined'].map((method) => {
            return Model1.query()
              .where('Model1.id', 1)
              [method]('model1Relation2.model2Relation1')
              .modifyGraph('model1Relation2.model2Relation1', 'select:model1Prop1')
              .then((models) => {
                const model2 = models[0].model1Relation2.find((it) => it.idCol === 2);
                expect(Object.keys(model2.model2Relation1[0])).to.eql([
                  'model1Prop1',
                  '$afterFindCalled',
                ]);
              });
          }),
        );
      });

      it('should accept a list of modifier names', () => {
        return Promise.all(
          ['withGraphFetched', 'withGraphJoined'].map((method) => {
            return Model1.query()
              .where('Model1.id', 1)
              [method]('model1Relation1')
              .modifyGraph('model1Relation1', ['select:id', 'select:model1Prop1'])
              .then((models) => {
                expect(Object.keys(models[0].model1Relation1)).to.eql([
                  'id',
                  'model1Prop1',
                  '$afterFindCalled',
                ]);
              });
          }),
        );
      });

      it('should implicitly add selects for join columns if they are omitted in modifyGraph', () => {
        return Promise.all(
          ['withGraphFetched', 'withGraphJoined'].map((method) => {
            return Model1.query()
              .where('Model1.id', 1)
              .column('Model1.model1Prop1')
              [method]('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
              .modifyGraph('model1Relation2', (builder) => {
                builder.select('model2_prop1');
              })
              .modifyGraph('model1Relation2.model2Relation1', (builder) => {
                builder.distinct('model1Prop1');
              })
              .modifyGraph('model1Relation2.model2Relation1.model1Relation1', (builder) => {
                builder.select('model1Prop1');
              })
              .modifyGraph('model1Relation2.model2Relation1.model1Relation2', (builder) => {
                builder.select('model2_prop1');
              })
              .then((models) => {
                models[0].model1Relation2 = _.sortBy(models[0].model1Relation2, 'model2Prop1');
                models[0].model1Relation2[1].model2Relation1 = _.sortBy(
                  models[0].model1Relation2[1].model2Relation1,
                  'model1Prop1',
                );

                expect(models).to.eql([
                  {
                    model1Prop1: 'hello 1',
                    $afterFindCalled: 1,

                    model1Relation2: [
                      {
                        model2Prop1: 'hejsan 1',
                        $afterFindCalled: 1,

                        model2Relation1: [],
                      },
                      {
                        model2Prop1: 'hejsan 2',
                        $afterFindCalled: 1,

                        model2Relation1: [
                          {
                            model1Prop1: 'hello 5',
                            $afterFindCalled: 1,

                            model1Relation1: null,
                            model1Relation2: [],
                          },
                          {
                            model1Prop1: 'hello 6',
                            $afterFindCalled: 1,

                            model1Relation1: {
                              model1Prop1: 'hello 7',
                              $afterFindCalled: 1,
                            },

                            model1Relation2: [
                              {
                                model2Prop1: 'hejsan 3',
                                $afterFindCalled: 1,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ]);
              });
          }),
        );
      });

      it('should implicitly add selects for join columns if they are aliased in modifyGraph', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .column('Model1.model1Prop1')
          .withGraphFetched('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .modifyGraph('model1Relation2', (builder) => {
            builder.select('model2_prop1', 'id_col as x1', 'model1_id as x2');
          })
          .modifyGraph('model1Relation2.model2Relation1', (builder) => {
            builder.select('model1Prop1', 'Model1.id as y1', 'Model1.model1Id as y2');
          })
          .modifyGraph('model1Relation2.model2Relation1.model1Relation1', (builder) => {
            builder.select('model1Prop1', 'Model1.id as y1', 'Model1.model1Id as y2');
          })
          .modifyGraph('model1Relation2.model2Relation1.model1Relation2', (builder) => {
            builder.select('model2_prop1', 'id_col as x1', 'model1_id as x2');
          })
          .then((models) => {
            models[0].model1Relation2 = _.sortBy(models[0].model1Relation2, 'model2Prop1');
            models[0].model1Relation2[1].model2Relation1 = _.sortBy(
              models[0].model1Relation2[1].model2Relation1,
              'model1Prop1',
            );

            expect(models).to.eql([
              {
                model1Prop1: 'hello 1',
                $afterFindCalled: 1,

                model1Relation2: [
                  {
                    model2Prop1: 'hejsan 1',
                    $afterFindCalled: 1,
                    x1: 1,
                    x2: 1,

                    model2Relation1: [],
                  },
                  {
                    model2Prop1: 'hejsan 2',
                    $afterFindCalled: 1,
                    x1: 2,
                    x2: 1,

                    model2Relation1: [
                      {
                        model1Prop1: 'hello 5',
                        $afterFindCalled: 1,
                        y1: 5,
                        y2: null,

                        model1Relation1: null,
                        model1Relation2: [],
                      },
                      {
                        model1Prop1: 'hello 6',
                        $afterFindCalled: 1,
                        y1: 6,
                        y2: 7,

                        model1Relation1: {
                          model1Prop1: 'hello 7',
                          $afterFindCalled: 1,
                          y1: 7,
                          y2: null,
                        },

                        model1Relation2: [
                          {
                            model2Prop1: 'hejsan 3',
                            $afterFindCalled: 1,
                            x1: 3,
                            x2: 6,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });

      it('should filter the eager query using relation expressions as paths (withGraphJoined)', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .modifyGraph('model1Relation2.model2Relation1', (builder) => {
            builder.where('id', 6);
          })
          .withGraphJoined('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .modifyGraph('model1Relation2', (builder) => {
            builder.where('model2_prop1', 'hejsan 2');
          })
          .modifyGraph('model1Relation2.model2Relation1', (builder) => {
            builder.select('model1Prop1');
          })
          .then((models) => {
            expect(models).to.eql([
              {
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null,
                $afterFindCalled: 1,

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterFindCalled: 1,

                    model2Relation1: [
                      {
                        model1Prop1: 'hello 6',
                        $afterFindCalled: 1,

                        model1Relation1: {
                          id: 7,
                          model1Id: null,
                          model1Prop1: 'hello 7',
                          model1Prop2: null,
                          $afterFindCalled: 1,
                        },

                        model1Relation2: [
                          {
                            idCol: 3,
                            model1Id: 6,
                            model2Prop1: 'hejsan 3',
                            model2Prop2: null,
                            $afterFindCalled: 1,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ]);
          });
      });
    });

    it('should merge eager expressions', () => {
      return Model1.query()
        .where('id', 1)
        .withGraphFetched('model1Relation2')
        .withGraphFetched('model1Relation2.model2Relation1.model1Relation1')
        .withGraphFetched('model1Relation2.model2Relation1.model1Relation2')
        .first()
        .modifyGraph('model1Relation2', (builder) => {
          builder.orderBy('id_col');
        })
        .modifyGraph('model1Relation2.model2Relation1', (builder) => {
          builder.orderBy('id');
        })
        .then((model) => {
          chai.expect(model.toJSON()).to.containSubset({
            id: 1,
            model1Relation2: [
              {
                idCol: 1,
                model2Relation1: [],
              },
              {
                idCol: 2,
                model2Relation1: [
                  {
                    id: 5,
                    aliasedExtra: 'extra 5',
                    model1Relation1: null,
                    model1Relation2: [],
                  },
                  {
                    id: 6,
                    aliasedExtra: 'extra 6',
                    model1Relation1: {
                      id: 7,
                    },
                    model1Relation2: [
                      {
                        idCol: 3,
                      },
                    ],
                  },
                ],
              },
            ],
          });
        });
    });

    it('should merge eager expressions and modifiers', () => {
      return Model1.query()
        .where('id', 1)
        .withGraphFetched('model1Relation2')
        .withGraphFetched('model1Relation2(f1).model2Relation1.model1Relation1')
        .modifiers({
          f1: (builder) => {
            builder.orderBy('id_col');
          },
        })
        .withGraphFetched('model1Relation2.model2Relation1(f2).model1Relation2')
        .modifiers({
          f2: (builder) => {
            builder.orderBy('id');
          },
        })
        .first()
        .then((model) => {
          chai.expect(model.toJSON()).to.containSubset({
            id: 1,
            model1Relation2: [
              {
                idCol: 1,
                model2Relation1: [],
              },
              {
                idCol: 2,
                model2Relation1: [
                  {
                    id: 5,
                    aliasedExtra: 'extra 5',
                    model1Relation1: null,
                    model1Relation2: [],
                  },
                  {
                    id: 6,
                    aliasedExtra: 'extra 6',
                    model1Relation1: {
                      id: 7,
                    },
                    model1Relation2: [
                      {
                        idCol: 3,
                      },
                    ],
                  },
                ],
              },
            ],
          });
        });
    });

    describe('QueryBuilder.orderBy', () => {
      it('orderBy should work for the root query', () => {
        return Promise.map(['withGraphFetched', 'withGraphJoined'], (method) => {
          return Model1.query()
            .select('Model1.model1Prop1')
            .modifyGraph('model1Relation1', (builder) => {
              builder.select('model1Prop1');
            })
            [method]('model1Relation1')
            .orderBy('Model1.model1Prop1', 'DESC')
            .whereNotNull('Model1.model1Id')
            .then((models) => {
              expect(models).to.eql([
                {
                  model1Prop1: 'hello 8',
                  model1Relation1: { model1Prop1: 'hello 9', $afterFindCalled: 1 },
                  $afterFindCalled: 1,
                },
                {
                  model1Prop1: 'hello 6',
                  model1Relation1: { model1Prop1: 'hello 7', $afterFindCalled: 1 },
                  $afterFindCalled: 1,
                },
                {
                  model1Prop1: 'hello 3',
                  model1Relation1: { model1Prop1: 'hello 4', $afterFindCalled: 1 },
                  $afterFindCalled: 1,
                },
                {
                  model1Prop1: 'hello 2',
                  model1Relation1: { model1Prop1: 'hello 3', $afterFindCalled: 1 },
                  $afterFindCalled: 1,
                },
                {
                  model1Prop1: 'hello 1',
                  model1Relation1: { model1Prop1: 'hello 2', $afterFindCalled: 1 },
                  $afterFindCalled: 1,
                },
              ]);
            });
        });
      });
    });

    describe('Multiple parents + ManyToManyRelation', () => {
      beforeEach(() => {
        return Model2.query().insertGraph([
          {
            idCol: 100,
            model2Prop1: 'hejsan 1',

            model2Relation1: [
              {
                id: 500,
                model1Prop1: 'hello 5',
              },
              {
                id: 600,
                model1Prop1: 'hello 6',
              },
            ],
          },
          {
            idCol: 200,
            model2Prop1: 'hejsan 2',

            model2Relation1: [
              {
                id: 700,
                model1Prop1: 'hello 7',
              },
              {
                id: 800,
                model1Prop1: 'hello 8',
              },
            ],
          },
        ]);
      });

      it('should work with withGraphFetched', () => {
        return Model2.query()
          .whereIn('id_col', [100, 200])
          .orderBy('id_col')
          .withGraphFetched('model2Relation1(select, orderById)')
          .modifiers({
            select: (b) => b.select('model1Prop1'),
          })
          .then((models) => {
            expect(models).to.eql([
              {
                idCol: 100,
                model1Id: null,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterFindCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 5',
                    $afterFindCalled: 1,
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterFindCalled: 1,
                  },
                ],
              },
              {
                idCol: 200,
                model1Id: null,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterFindCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 7',
                    $afterFindCalled: 1,
                  },
                  {
                    model1Prop1: 'hello 8',
                    $afterFindCalled: 1,
                  },
                ],
              },
            ]);
          });
      });

      it('should work with withGraphJoined', () => {
        return Model2.query()
          .whereIn('id_col', [100, 200])
          .orderBy(['id_col', 'model2Relation1.model1Prop1'])
          .modifiers({
            select: (b) => b.select('model1Prop1'),
          })
          .withGraphJoined('model2Relation1(select)')
          .then((models) => {
            expect(models).to.eql([
              {
                idCol: 100,
                model1Id: null,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterFindCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 5',
                    $afterFindCalled: 1,
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterFindCalled: 1,
                  },
                ],
              },
              {
                idCol: 200,
                model1Id: null,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterFindCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 7',
                    $afterFindCalled: 1,
                  },
                  {
                    model1Prop1: 'hello 8',
                    $afterFindCalled: 1,
                  },
                ],
              },
            ]);
          });
      });
    });

    describe('Same ManyToMany child for multiple parents + extras', () => {
      beforeEach(() => {
        return Model2.query().insertGraph(
          [
            {
              idCol: 100,
              model2Prop1: 'hejsan 1',

              model2Relation1: [
                {
                  id: 500,
                  model1Prop1: 'hello 5',
                },
                {
                  '#id': 'shared',
                  id: 600,
                  model1Prop1: 'hello 6',
                  aliasedExtra: 'lol1',
                },
              ],
            },
            {
              idCol: 200,
              model2Prop1: 'hejsan 2',

              model2Relation1: [
                {
                  '#ref': 'shared',
                  aliasedExtra: 'lol2',
                },
                {
                  id: 700,
                  model1Prop1: 'hello 7',
                },
              ],
            },
          ],
          { allowRefs: true },
        );
      });

      it('test', () => {
        return Model2.query()
          .whereIn('id_col', [100, 200])
          .orderBy('id_col')
          .withGraphFetched('model2Relation1(orderById)')
          .then((result) => {
            chai.expect(result).to.containSubset([
              {
                idCol: 100,

                model2Relation1: [
                  {
                    id: 500,
                    aliasedExtra: null,
                  },
                  {
                    id: 600,
                    aliasedExtra: 'lol1',
                  },
                ],
              },
              {
                idCol: 200,

                model2Relation1: [
                  {
                    id: 600,
                    aliasedExtra: 'lol2',
                  },
                  {
                    id: 700,
                    aliasedExtra: null,
                  },
                ],
              },
            ]);
          });
      });
    });

    describe('aliases', () => {
      it('aliases in eager expressions should work', () => {
        return Promise.map(
          ['withGraphFetched', 'withGraphJoined'],
          (method) => {
            return Model1.query()
              .where('Model1.id', 1)
              .select('Model1.id')
              [method](
                `[
              model1Relation1(f1) as a,
              model1Relation2(f2) as b .[
                model2Relation1(f1) as c,
                model2Relation1(f1) as d
              ]
            ]`,
              )
              .modifiers({
                f1: (builder) => builder.select('Model1.id'),
                f2: (builder) => builder.select('model2.id_col'),
              })
              .first()
              .then((model) => {
                model.b = _.sortBy(model.b, 'idCol');
                model.b[1].c = _.sortBy(model.b[1].c, 'id');
                model.b[1].d = _.sortBy(model.b[1].d, 'id');

                expect(model).to.eql({
                  id: 1,
                  $afterFindCalled: 1,

                  a: {
                    id: 2,
                    $afterFindCalled: 1,
                  },

                  b: [
                    {
                      idCol: 1,
                      $afterFindCalled: 1,

                      c: [],
                      d: [],
                    },
                    {
                      idCol: 2,
                      $afterFindCalled: 1,

                      c: [
                        {
                          id: 5,
                          $afterFindCalled: 1,
                        },
                        {
                          id: 6,
                          $afterFindCalled: 1,
                        },
                      ],

                      d: [
                        {
                          id: 5,
                          $afterFindCalled: 1,
                        },
                        {
                          id: 6,
                          $afterFindCalled: 1,
                        },
                      ],
                    },
                  ],
                });
              });
          },
          { concurrency: 1 },
        );
      });

      it('aliases should alias the joined tables when using withGraphJoined', () => {
        return Model1.query()
          .findById(1)
          .select('Model1.id')
          .withGraphJoined(
            `[
            model1Relation1(f1) as a,
            model1Relation2(f2) as b .[
              model2Relation1(f1) as c,
              model2Relation1(f1) as d
            ]
          ]`,
          )
          .modifiers({
            f1: (builder) => builder.select('Model1.id'),
            f2: (builder) => builder.select('model2.id_col'),
          })
          .where('b:d.id', 6)
          .then((model) => {
            model.b = _.sortBy(model.b, 'idCol');
            model.b[0].c = _.sortBy(model.b[0].c, 'id');
            model.b[0].d = _.sortBy(model.b[0].d, 'id');

            expect(model).to.eql({
              id: 1,
              $afterFindCalled: 1,

              a: {
                id: 2,
                $afterFindCalled: 1,
              },

              b: [
                {
                  idCol: 2,
                  $afterFindCalled: 1,

                  c: [
                    {
                      id: 5,
                      $afterFindCalled: 1,
                    },
                    {
                      id: 6,
                      $afterFindCalled: 1,
                    },
                  ],

                  d: [
                    {
                      id: 6,
                      $afterFindCalled: 1,
                    },
                  ],
                },
              ],
            });
          });
      });

      it('alias method should work', () => {
        return Promise.map(
          ['withGraphFetched', 'withGraphJoined'],
          (method) => {
            return Model1.query()
              .alias('m1')
              .select('m1.id')
              [method](`[model1Relation1(f1) as a]`)
              .modifiers({
                f1: (builder) => builder.select('id'),
              })
              .findOne({ 'm1.id': 1 })
              .then((model) => {
                expect(model).to.eql({
                  id: 1,
                  $afterFindCalled: 1,

                  a: {
                    id: 2,
                    $afterFindCalled: 1,
                  },
                });
              });
          },
          { concurrency: 1 },
        );
      });
    });

    if (session.isPostgres()) {
      describe('generated sql', () => {
        let sql = [];
        let mockKnex = null;

        before(() => {
          mockKnex = mockKnexFactory(session.knex, function (mock, then, args) {
            sql.push(this.toString());
            return then.apply(this, args);
          });
        });

        beforeEach(() => {
          sql = [];
        });

        it('check withGraphFetched generated SQL', () => {
          return Model1.bindKnex(mockKnex)
            .query()
            .withGraphFetched(
              '[model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]',
            )
            .context({
              onBuild(builder) {
                if (builder.modelClass().name === 'Model2') {
                  builder.orderBy('id_col');
                } else {
                  builder.orderBy('id');
                }
              },
            })
            .then(() => {
              expect(sql).to.eql([
                'select "Model1".* from "Model1" order by "id" asc',
                'select "Model1".* from "Model1" where "Model1"."id" in (2, 3, 4, 7, 9) order by "id" asc',
                'select "Model1".* from "Model1" where "Model1"."model1Id" in (1, 2, 3, 4, 5, 6, 7, 8, 9) order by "id" asc',
                'select "model2".* from "model2" where "model2"."model1_id" in (1, 2, 3, 4, 5, 6, 7, 8, 9) order by "id_col" asc',
                'select "model2".*, "Model1Model2"."extra1" as "extra1", "Model1Model2"."extra2" as "extra2", "Model1Model2"."model1Id" as "objectiontmpjoin0" from "model2" inner join "Model1Model2" on "model2"."id_col" = "Model1Model2"."model2Id" where "Model1Model2"."model1Id" in (1, 2, 3, 4, 5, 6, 7, 8, 9) order by "id_col" asc',
                'select "Model1".*, "Model1Model2"."extra3" as "aliasedExtra", "Model1Model2"."model2Id" as "objectiontmpjoin0" from "Model1" inner join "Model1Model2" on "Model1"."id" = "Model1Model2"."model1Id" where "Model1Model2"."model2Id" in (1, 2, 3, 4) order by "id" asc',
                'select "Model1".*, "Model1Model2One"."model2Id" as "objectiontmpjoin0" from "Model1" inner join "Model1Model2One" on "Model1"."id" = "Model1Model2One"."model1Id" where "Model1Model2One"."model2Id" in (1, 2, 3, 4) order by "id" asc',
              ]);
            });
        });

        it('should not execute queries when an empty relation set is encoutered', () => {
          return Model1.bindKnex(mockKnex)
            .query()
            .findById(4)
            .withGraphFetched('model1Relation1')
            .then((res) => {
              expect(sql).to.have.length(1);
              expect(res.id).to.equal(4);
            });
        });

        it('check withGraphJoined generated SQL', () => {
          return Model1.bindKnex(mockKnex)
            .query()
            .withGraphJoined(
              '[model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]',
            )
            .then(() => {
              expect(_.last(sql).replace(/\s/g, '')).to.equal(
                `
                select
                  "Model1"."id" as "id",
                  "Model1"."model1Id" as "model1Id",
                  "Model1"."model1Prop1" as "model1Prop1",
                  "Model1"."model1Prop2" as "model1Prop2",
                  "model1Relation1"."id" as "model1Relation1:id",
                  "model1Relation1"."model1Id" as "model1Relation1:model1Id",
                  "model1Relation1"."model1Prop1" as "model1Relation1:model1Prop1",
                  "model1Relation1"."model1Prop2" as "model1Relation1:model1Prop2",
                  "model1Relation1Inverse"."id" as "model1Relation1Inverse:id",
                  "model1Relation1Inverse"."model1Id" as "model1Relation1Inverse:model1Id",
                  "model1Relation1Inverse"."model1Prop1" as "model1Relation1Inverse:model1Prop1",
                  "model1Relation1Inverse"."model1Prop2" as "model1Relation1Inverse:model1Prop2",
                  "model1Relation2"."id_col" as "model1Relation2:id_col",
                  "model1Relation2"."model1_id" as "model1Relation2:model1_id",
                  "model1Relation2"."model2_prop1" as "model1Relation2:model2_prop1",
                  "model1Relation2"."model2_prop2" as "model1Relation2:model2_prop2",
                  "model1Relation2:model2Relation1"."id" as "model1Relation2:model2Relation1:id",
                  "model1Relation2:model2Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Id",
                  "model1Relation2:model2Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Prop1",
                  "model1Relation2:model2Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Prop2",
                  "model1Relation2:model2Relation1_join"."extra3" as "model1Relation2:model2Relation1:aliasedExtra",
                  "model1Relation2:model2Relation2"."id" as "model1Relation2:model2Relation2:id",
                  "model1Relation2:model2Relation2"."model1Id" as "model1Relation2:model2Relation2:model1Id",
                  "model1Relation2:model2Relation2"."model1Prop1" as "model1Relation2:model2Relation2:model1Prop1",
                  "model1Relation2:model2Relation2"."model1Prop2" as "model1Relation2:model2Relation2:model1Prop2",
                  "model1Relation3"."id_col" as "model1Relation3:id_col",
                  "model1Relation3"."model1_id" as "model1Relation3:model1_id",
                  "model1Relation3"."model2_prop1" as "model1Relation3:model2_prop1",
                  "model1Relation3"."model2_prop2" as "model1Relation3:model2_prop2",
                  "model1Relation3_join"."extra1" as "model1Relation3:extra1",
                  "model1Relation3_join"."extra2" as "model1Relation3:extra2"
                from
                  "Model1"
                left join
                  "Model1" as "model1Relation1" on "model1Relation1"."id" = "Model1"."model1Id"
                left join
                  "Model1" as "model1Relation1Inverse" on "model1Relation1Inverse"."model1Id" = "Model1"."id"
                left join
                  "model2" as "model1Relation2" on "model1Relation2"."model1_id" = "Model1"."id"
                left join
                  "Model1Model2" as "model1Relation2:model2Relation1_join" on "model1Relation2:model2Relation1_join"."model2Id" = "model1Relation2"."id_col"
                left join
                  "Model1" as "model1Relation2:model2Relation1" on "model1Relation2:model2Relation1_join"."model1Id" = "model1Relation2:model2Relation1"."id"
                left join
                  "Model1Model2One" as "model1Relation2:model2Relation2_join" on "model1Relation2:model2Relation2_join"."model2Id" = "model1Relation2"."id_col"
                left join
                  "Model1" as "model1Relation2:model2Relation2" on "model1Relation2:model2Relation2_join"."model1Id" = "model1Relation2:model2Relation2"."id"
                left join
                  "Model1Model2" as "model1Relation3_join" on "model1Relation3_join"."model1Id" = "Model1"."id"
                left join
                  "model2" as "model1Relation3" on "model1Relation3_join"."model2Id" = "model1Relation3"."id_col"
              `.replace(/\s/g, ''),
              );
            });
        });
      });
    }

    if (session.isPostgres())
      describe.skip('big data', () => {
        let graph = null;

        before(function () {
          this.timeout(30000);
          let n = 0;

          graph = _.range(100).map(() => {
            return {
              model1Prop1: 'hello ' + n++,

              model1Relation1: {
                model1Prop1: 'hi ' + n++,

                model1Relation1: {
                  model1Prop1: 'howdy ' + n++,
                },
              },

              model1Relation1Inverse: {
                model1Prop1: 'quux ' + n++,
              },

              model1Relation2: _.range(10).map(() => {
                return {
                  model2Prop1: 'foo ' + n++,

                  model2Relation1: _.range(10).map(() => {
                    return {
                      model1Prop1: 'bar ' + n++,
                    };
                  }),

                  model2Relation2: {
                    model1Prop1: 'baz ' + n++,
                  },
                };
              }),

              model1Relation3: _.range(10).map(() => {
                return {
                  model2Prop1: 'spam ' + n++,
                };
              }),
            };
          });

          return session
            .populate([])
            .then(() => {
              return Model1.query().insertGraph(graph);
            })
            .then((inserted) => {
              graph = inserted;
            });
        });

        it('should work with a lot of data', function () {
          this.timeout(30000);

          return Promise.map(
            ['withGraphFecthed', 'withGraphJoined'],
            (method) => {
              let t1 = Date.now();
              return Model1.query()
                .where('Model1.model1Prop1', 'like', 'hello%')
                [method](
                  '[model1Relation1.model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]',
                )
                .then((res) => {
                  console.log('query time', Date.now() - t1);

                  graph = _.sortBy(graph, 'id');
                  res = _.sortBy(res, 'id');

                  Model1.traverse(graph, traverser);
                  Model1.traverse(res, traverser);

                  let expected = _.invokeMap(graph, 'toJSON');
                  let got = _.invokeMap(res, 'toJSON');

                  expect(got).to.eql(expected);
                });
            },
            { concurrency: 1 },
          );
        });

        function traverser(model) {
          ['extra1', 'extra2', 'aliasedExtra', 'model1Id', 'model1Prop2', 'model2Prop2'].forEach(
            (key) => {
              delete model[key];
            },
          );

          ['model1Relation2', 'model1Relation3'].map((rel) => {
            if (model[rel]) {
              model[rel] = _.sortBy(model[rel], 'idCol');
            }
          });

          ['model2Relation1'].map((rel) => {
            if (model[rel]) {
              model[rel] = _.sortBy(model[rel], 'id');
            }
          });
        }
      });
  });

  // Tests all ways to fetch eagerly.
  function test(expr, tester, opt) {
    let testName;

    if (typeof expr === 'object') {
      testName = JSON.stringify(expr);
    } else {
      testName = expr.replace(/\s/g, '');
    }

    opt = _.defaults(opt || {}, {
      Model: Model1,
      filters: {},
      id: 1,
    });

    let idCol = opt.Model.query().fullIdColumnFor(opt.Model);
    let testFn = opt.only ? it.only.bind(it) : it;

    if (!opt.disableWhereIn) {
      testFn(testName + ' (QueryBuilder.withGraphFetched)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .withGraphFetched(expr)
          .modifiers(opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });

      testFn(testName + ' (Model.$fetchGraph)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .then((models) => {
            return models[0].$fetchGraph(expr).modifiers(opt.filters);
          })
          .then(sortRelations(opt.disableSort))
          .then((result) => {
            tester([result]);
          });
      });
    }

    if (!opt.disableJoin) {
      testFn(testName + ' (QueryBuilder.withGraphJoined)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .withGraphJoined(expr, opt.eagerOptions)
          .modifiers(opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });
    }
  }

  function sortRelations(disable) {
    if (disable) {
      return (models) => {
        return models;
      };
    }

    return (models) => {
      Model1.traverse(models, (model) => {
        if (model.model1Relation2) {
          model.model1Relation2 = _.sortBy(model.model1Relation2, ['idCol', 'model2Prop1']);
        }

        if (model.model2Relation1) {
          model.model2Relation1 = _.sortBy(model.model2Relation1, ['id', 'model1Prop1']);
        }
      });

      return models;
    };
  }
};
