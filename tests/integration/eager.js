const _ = require('lodash');
const expect = require('expect.js');
const Promise = require('bluebird');
const ValidationError = require('../../').ValidationError;
const mockKnexFactory = require('../../testUtils/mockKnex');
const isPostgres = require('../../lib/utils/knexUtils').isPostgres;

module.exports = session => {
  const Model1 = session.models.Model1;
  const Model2 = session.models.Model2;

  describe('Model eager queries', () => {
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

    test('model1Relation1', models => {
      expect(models).to.eql([
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
          }
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test({ model1Relation1: true }, models => {
      expect(models).to.eql([
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
          }
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test('model1Relation1(select:model1Prop1)', models => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterGetCalled: 1,
          model1Relation1: {
            model1Prop1: 'hello 2',
            $afterGetCalled: 1
          }
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test(
      {
        model1Relation1: {
          $modify: ['select:model1Prop1']
        }
      },
      models => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1,
            model1Relation1: {
              model1Prop1: 'hello 2',
              $afterGetCalled: 1
            }
          }
        ]);

        expect(models[0]).to.be.a(Model1);
        expect(models[0].model1Relation1).to.be.a(Model1);
      }
    );

    test('model1Relation1.model1Relation1', models => {
      expect(models).to.eql([
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
            $afterGetCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterGetCalled: 1
            }
          }
        }
      ]);
    });

    test({ model1Relation1: { model1Relation1: {} } }, models => {
      expect(models).to.eql([
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
            $afterGetCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterGetCalled: 1
            }
          }
        }
      ]);
    });

    test('model1Relation1.model1Relation1Inverse', models => {
      expect(models).to.eql([
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
            $afterGetCalled: 1,
            model1Relation1Inverse: {
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              $afterGetCalled: 1
            }
          }
        }
      ]);
    });

    test(
      'model1Relation1.^',
      models => {
        expect(models).to.eql([
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
              $afterGetCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                model1Prop1: 'hello 3',
                model1Prop2: null,
                $afterGetCalled: 1,
                model1Relation1: {
                  id: 4,
                  model1Id: null,
                  model1Prop1: 'hello 4',
                  model1Prop2: null,
                  $afterGetCalled: 1,
                  model1Relation1: null
                }
              }
            }
          }
        ]);
      },
      { disableJoin: true }
    );

    test('model1Relation1.^2', models => {
      expect(models).to.eql([
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
            $afterGetCalled: 1,
            model1Relation1: {
              id: 3,
              model1Id: 4,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              $afterGetCalled: 1
            }
          }
        }
      ]);
    });

    test(
      'model1Relation1(selectId).^',
      models => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1,
            model1Relation1: {
              id: 2,
              model1Id: 3,
              $afterGetCalled: 1,
              model1Relation1: {
                id: 3,
                model1Id: 4,
                $afterGetCalled: 1,
                model1Relation1: {
                  id: 4,
                  $afterGetCalled: 1,
                  model1Id: null,
                  model1Relation1: null
                }
              }
            }
          }
        ]);
      },
      {
        filters: {
          selectId: builder => {
            builder.select('id', 'model1Id');
          }
        },
        disableJoin: true
      }
    );

    test(
      'model1Relation1(selectId).^4',
      models => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1,
            model1Relation1: {
              model1Prop1: 'hello 2',
              $afterGetCalled: 1,
              model1Relation1: {
                model1Prop1: 'hello 3',
                $afterGetCalled: 1,
                model1Relation1: {
                  model1Prop1: 'hello 4',
                  $afterGetCalled: 1,
                  model1Relation1: null
                }
              }
            }
          }
        ]);
      },
      {
        filters: {
          selectId: builder => {
            builder.select('model1Prop1');
          }
        },
        disableWhereIn: true,
        eagerOptions: { minimize: true }
      }
    );

    test('model1Relation2.model2Relation2', models => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterGetCalled: 1,

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterGetCalled: 1,

              model2Relation2: {
                id: 8,
                model1Id: 9,
                model1Prop1: 'hello 8',
                model1Prop2: null,
                $afterGetCalled: 1
              }
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterGetCalled: 1,
              model2Relation2: null
            }
          ]
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2).to.be.a(Model1);
    });

    test('model1Relation2.model2Relation2.model1Relation1', models => {
      expect(models).to.eql([
        {
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterGetCalled: 1,

          model1Relation2: [
            {
              idCol: 1,
              model1Id: 1,
              model2Prop1: 'hejsan 1',
              model2Prop2: null,
              $afterGetCalled: 1,

              model2Relation2: {
                id: 8,
                model1Id: 9,
                model1Prop1: 'hello 8',
                model1Prop2: null,
                $afterGetCalled: 1,

                model1Relation1: {
                  id: 9,
                  model1Id: null,
                  model1Prop1: 'hello 9',
                  model1Prop2: null,
                  $afterGetCalled: 1
                }
              }
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterGetCalled: 1,
              model2Relation2: null
            }
          ]
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2.model1Relation1).to.be.a(Model1);
    });

    test('[model1Relation1, model1Relation2]', models => {
      expect(models).to.eql([
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
              $afterGetCalled: 1
            },
            {
              idCol: 2,
              model1Id: 1,
              model2Prop1: 'hejsan 2',
              model2Prop2: null,
              $afterGetCalled: 1
            }
          ]
        }
      ]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
    });

    test(
      '[model1Relation1, model1Relation2(orderByDesc, selectProps)]',
      models => {
        expect(models).to.eql([
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
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                $afterGetCalled: 1
              },
              {
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                $afterGetCalled: 1
              }
            ]
          }
        ]);
      },
      {
        filters: {
          selectProps: builder => {
            builder.select('id_col', 'model1_id', 'model2_prop1');
          },
          orderByDesc: builder => {
            builder.orderBy('model2_prop1', 'desc');
          }
        },
        disableJoin: true,
        disableSort: true
      }
    );

    test('[model1Relation1, model1Relation2.model2Relation1]', models => {
      expect(models).to.eql([
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
              ]
            }
          ]
        }
      ]);
    });

    test('[model1Relation2.model2Relation1, model1Relation1]', models => {
      expect(models).to.eql([
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
              ]
            }
          ]
        }
      ]);
    });

    test('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]', models => {
      expect(models).to.eql([
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
      ]);
    });

    // This tests the Model.namedFilters feature.
    test(
      `[
      model1Relation1(select:id, localNamedFilter),
      model1Relation2.[
        model2Relation1(select:model1Prop1).[
          model1Relation1(select:id, select:model1Prop1, select:model1Prop1Aliased),
          model1Relation2
        ]
      ]
    ]`,
      models => {
        expect(models).to.eql([
          {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1,

            model1Relation1: {
              id: 2,
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
                    model1Prop1: 'hello 5',
                    $afterGetCalled: 1,

                    model1Relation1: null,
                    model1Relation2: []
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterGetCalled: 1,

                    model1Relation1: {
                      id: 7,
                      model1Prop1: 'hello 7',
                      aliasedInFilter: 'hello 7',
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
      },
      {
        filters: {
          localNamedFilter: builder => builder.select('model1Prop2')
        }
      }
    );

    it('joinEager shorthand', () => {
      return Model1.query()
        .findById(1)
        .joinEager('model1Relation1')
        .modify(builder => {
          expect(builder.eagerOperationFactory()).to.equal(Model1.JoinEagerAlgorithm);
        })
        .then(model => {
          expect(model).to.eql({
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
            }
          });
        });
    });

    it('mergeJoinEager shorthand', () => {
      return Model1.query()
        .findById(1)
        .mergeJoinEager('model1Relation1')
        .modify(builder => {
          expect(builder.eagerOperationFactory()).to.equal(Model1.JoinEagerAlgorithm);
        })
        .then(model => {
          expect(model).to.eql({
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
            }
          });
        });
    });

    it('naiveEager shorthand', () => {
      return Model1.query()
        .findById(1)
        .naiveEager('model1Relation1')
        .modify(builder => {
          expect(builder.eagerOperationFactory()).to.equal(Model1.NaiveEagerAlgorithm);
        })
        .then(model => {
          expect(model).to.eql({
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
            }
          });
        });
    });

    it('mergeNaiveEager shorthand', () => {
      return Model1.query()
        .findById(1)
        .mergeNaiveEager('model1Relation1')
        .modify(builder => {
          expect(builder.eagerOperationFactory()).to.equal(Model1.NaiveEagerAlgorithm);
        })
        .then(model => {
          expect(model).to.eql({
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
            }
          });
        });
    });

    it('should work with zero id', () => {
      return Promise.map(
        [Model1.JoinEagerAlgorithm, Model1.NaiveEagerAlgorithm, Model1.WhereInEagerAlgorithm],
        algo => {
          return session
            .populate([
              {
                id: 0,
                model1Prop1: 'hello 0',

                model1Relation1: {
                  id: 1,
                  model1Prop1: 'hello 1'
                },

                model1Relation2: [
                  {
                    idCol: 0,
                    model2Prop1: 'hejsan 1',

                    model2Relation1: [
                      {
                        id: 2,
                        model1Prop1: 'hello 2'
                      }
                    ]
                  }
                ]
              }
            ])
            .then(() => {
              return Model1.query()
                .where('Model1.id', 0)
                .eager('[model1Relation1, model1Relation2.model2Relation1]')
                .eagerAlgorithm(algo);
            })
            .then(models => {
              expect(models).to.eql([
                {
                  id: 0,
                  model1Prop1: 'hello 0',
                  model1Prop2: null,
                  model1Id: 1,
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 1,
                    model1Prop1: 'hello 1',
                    model1Prop2: null,
                    model1Id: null,
                    $afterGetCalled: 1
                  },

                  model1Relation2: [
                    {
                      idCol: 0,
                      model2Prop1: 'hejsan 1',
                      model2Prop2: null,
                      model1Id: 0,
                      $afterGetCalled: 1,

                      model2Relation1: [
                        {
                          id: 2,
                          model1Prop1: 'hello 2',
                          model1Prop2: null,
                          aliasedExtra: null,
                          model1Id: null,
                          $afterGetCalled: 1
                        }
                      ]
                    }
                  ]
                }
              ]);
            });
        },
        { concurrency: 1 }
      );
    });

    it('keepImplicitJoinProps', () => {
      return Model1.query()
        .select('id')
        .findById(1)
        .eager('[model1Relation1, model1Relation2.model2Relation1]')
        .internalOptions({ keepImplicitJoinProps: true })
        .modifyEager('model1Relation1', qb => qb.select('Model1.id'))
        .modifyEager('model1Relation2', qb => qb.select('model2.id_col').orderBy('model2.id_col'))
        .modifyEager('model1Relation2.model2Relation1', qb =>
          qb.select('Model1.id').orderBy('Model1.id')
        )
        .then(res => {
          expect(res).to.eql({
            id: 1,
            model1Id: 2,
            $afterGetCalled: 1,

            model1Relation1: {
              id: 2,
              $afterGetCalled: 1
            },

            model1Relation2: [
              {
                idCol: 1,
                model1Id: 1,
                $afterGetCalled: 1,

                model2Relation1: []
              },
              {
                idCol: 2,
                model1Id: 1,
                $afterGetCalled: 1,

                model2Relation1: [
                  {
                    id: 5,
                    $afterGetCalled: 1,
                    objectiontmpjoin0: 2
                  },
                  {
                    id: 6,
                    $afterGetCalled: 1,
                    objectiontmpjoin0: 2
                  }
                ]
              }
            ]
          });
        });
    });

    it('range should work', () => {
      return Model1.query()
        .where('id', 1)
        .eager('[model1Relation1, model1Relation2]')
        .range(0, 0)
        .then(res => {
          expect(res.results[0].model1Relation1.id).to.equal(2);
          expect(res.results[0].model1Relation2).to.have.length(2);
        });
    });

    it('range should work with joinEager', () => {
      return Model1.query()
        .where('Model1.id', 1)
        .joinEager('model1Relation1')
        .range(0, 0)
        .then(res => {
          expect(res.results[0].model1Relation1.id).to.equal(2);
        });
    });

    describe('JoinEagerAlgorithm', () => {
      it('select should work', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2:model2Relation1.id', 6)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(models => {
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
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
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterGetCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterGetCalled: 1
                      }
                    ]
                  }
                ]
              }
            ]);
          });
      });

      it('select should work with alias', () => {
        return Model1.query()
          .select('Model1.id as theId', 'Model1.model1Prop1 as leProp')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2:model2Relation1.id', 6)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(models => {
            expect(models).to.eql([
              {
                theId: 1,
                leProp: 'hello 1',
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
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterGetCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterGetCalled: 1
                      }
                    ]
                  }
                ]
              }
            ]);
          });
      });

      it('should be able to change the join type', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .joinEager('model1Relation2')
          .eagerOptions({ joinOperation: 'innerJoin' })
          .orderBy(['Model1.id', 'model1Relation2.id_col'])
          .then(models => {
            // With innerJoin we should only get `Model1` instances that have one
            // or more `model2Relation2` relations.
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
                $afterGetCalled: 1,
                model1Relation2: [
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
                ]
              },
              {
                id: 4,
                model1Prop1: 'hello 4',
                $afterGetCalled: 1,
                model1Relation2: [
                  {
                    idCol: 4,
                    model1Id: 4,
                    model2Prop1: 'hejsan 4',
                    model2Prop2: null,
                    $afterGetCalled: 1
                  }
                ]
              },
              {
                id: 6,
                model1Prop1: 'hello 6',
                $afterGetCalled: 1,
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
            ]);
          });
      });

      it('should be able to change the separator', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .where('model1Relation2->model2Relation1.id', 6)
          .joinEager('[model1Relation1, model1Relation2.model2Relation1]')
          .eagerOptions({ separator: '->' })
          .then(models => {
            expect(models).to.eql([
              {
                id: 1,
                model1Prop1: 'hello 1',
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
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterGetCalled: 1,

                    model2Relation1: [
                      {
                        id: 6,
                        model1Id: 7,
                        model1Prop1: 'hello 6',
                        model1Prop2: null,
                        aliasedExtra: 'extra 6',
                        $afterGetCalled: 1
                      }
                    ]
                  }
                ]
              }
            ]);
          });
      });

      it('should be able to refer to joined relations with syntax Table:rel1:rel2.col', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .orderBy(['Model1.id', 'model1Relation2:model2Relation1.id'])
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(models => {
            expect(models).to.eql([
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
                    ]
                  }
                ]
              }
            ]);
          });
      });

      it('should be able to give aliases for relations', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .where('mr2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .orderBy(['Model1.id', 'mr2:model2Relation1.id'])
          .eagerAlgorithm(Model1.JoinEagerAlgorithm, {
            aliases: {
              model1Relation2: 'mr2'
            }
          })
          .then(models => {
            expect(models).to.eql([
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
                    ]
                  }
                ]
              }
            ]);
          });
      });

      it('relation references longer that 63 chars should throw an exception', done => {
        Model1.query()
          .where('Model1.id', 1)
          .eager('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'identifier model1Relation1:model1Relation1:model1Relation1:model1Relation1:id is over 63 characters long and would be truncated by the database engine.'
            );
            done();
          })
          .catch(done);
      });

      it('relation references longer that 63 chars should NOT throw an exception if minimize: true option is given', done => {
        Model1.query()
          .where('Model1.id', 1)
          .eager('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .eagerOptions({ minimize: false })
          .runBefore((result, builder) => {
            // Call in runBefore to test the EeagerOperation.clone method.
            // This doesn't need to be called in a runBefore.
            builder.eagerOptions({ minimize: true });
          })
          .then(models => {
            expect(models).to.eql([
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
                  $afterGetCalled: 1,
                  model1Relation1: {
                    id: 3,
                    model1Id: 4,
                    model1Prop1: 'hello 3',
                    model1Prop2: null,
                    $afterGetCalled: 1,
                    model1Relation1: {
                      id: 4,
                      model1Id: null,
                      model1Prop1: 'hello 4',
                      model1Prop2: null,
                      $afterGetCalled: 1,
                      model1Relation1: null
                    }
                  }
                }
              }
            ]);

            done();
          })
          .catch(done);
      });

      it('infinitely recursive expressions should fail', done => {
        Model1.query()
          .where('Model1.id', 1)
          .eager('model1Relation1.^')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'recursion depth of eager expression model1Relation1.^ too big for JoinEagerAlgorithm'
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given missing filter', done => {
        Model1.query()
          .where('id', 1)
          .eager('model1Relation2(missingFilter)')
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'could not find filter "missingFilter" for relation "model1Relation2"'
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given missing relation', done => {
        Model1.query()
          .where('id', 1)
          .eager('invalidRelation')
          .then(() => {
            throw new Error('should not get here');
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'unknown relation "invalidRelation" in an eager expression'
            );
            done();
          })
          .catch(done);
      });

      it('should fail if given invalid relation expression', done => {
        Model1.query()
          .where('id', 1)
          .eager('invalidRelation')
          .then(() => {
            throw new Error('should not get here');
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('RelationExpression');
            expect(err.message).to.equal(
              'unknown relation "invalidRelation" in an eager expression'
            );
            done();
          })
          .catch(done);
      });
    });

    describe('Model.defaultEagerOptions and Model.defaultEagerAlgorithm should be used if defined', () => {
      let TestModel;

      before(() => {
        // Create a dummy mock so that we can bind Model1 to it.
        TestModel = Model1.bindKnex(
          mockKnexFactory(session.knex, function(mock, oldImpl, args) {
            return oldImpl.apply(this, args);
          })
        );

        TestModel.defaultEagerAlgorithm = TestModel.JoinEagerAlgorithm;
        TestModel.defaultEagerOptions = {
          aliases: {
            model1Relation2: 'mr2'
          }
        };
      });

      it('options for JoinEagerAlgorithm', () => {
        return TestModel.query()
          .where('Model1.id', 1)
          .where('mr2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .orderBy(['Model1.id', 'mr2:model2Relation1.id'])
          .then(models => {
            expect(models).to.eql([
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
                    ]
                  }
                ]
              }
            ]);
          });
      });
    });

    describe('QueryBuilder.modifyEager', () => {
      it('should filter the eager query using relation expressions as paths', () => {
        return Promise.all(
          [Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm].map(eagerAlgo => {
            return Model1.query()
              .eagerAlgorithm(eagerAlgo)
              .where('Model1.id', 1)
              .modifyEager('model1Relation2.model2Relation1', builder => {
                builder.where('Model1.id', 6);
              })
              .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
              .filterEager('model1Relation2', builder => {
                builder.where('model2_prop1', 'hejsan 2');
              })
              .then(models => {
                expect(models[0].model1Relation2).to.have.length(1);
                expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 2');

                expect(models[0].model1Relation2[0].model2Relation1).to.have.length(1);
                expect(models[0].model1Relation2[0].model2Relation1[0].id).to.equal(6);
              });
          })
        );
      });

      it('should implicitly add selects for join columns if they are omitted in filterEager/modifyEager', () => {
        return Promise.all(
          [Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm].map(eagerAlgo => {
            return Model1.query()
              .where('Model1.id', 1)
              .column('Model1.model1Prop1')
              .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
              .eagerAlgorithm(eagerAlgo)
              .filterEager('model1Relation2', builder => {
                builder.select('model2_prop1');
              })
              .filterEager('model1Relation2.model2Relation1', builder => {
                builder.distinct('model1Prop1');
              })
              .filterEager('model1Relation2.model2Relation1.model1Relation1', builder => {
                builder.select('model1Prop1');
              })
              .filterEager('model1Relation2.model2Relation1.model1Relation2', builder => {
                builder.select('model2_prop1');
              })
              .then(models => {
                models[0].model1Relation2 = _.sortBy(models[0].model1Relation2, 'model2Prop1');
                models[0].model1Relation2[1].model2Relation1 = _.sortBy(
                  models[0].model1Relation2[1].model2Relation1,
                  'model1Prop1'
                );

                expect(models).to.eql([
                  {
                    model1Prop1: 'hello 1',
                    $afterGetCalled: 1,

                    model1Relation2: [
                      {
                        model2Prop1: 'hejsan 1',
                        $afterGetCalled: 1,

                        model2Relation1: []
                      },
                      {
                        model2Prop1: 'hejsan 2',
                        $afterGetCalled: 1,

                        model2Relation1: [
                          {
                            model1Prop1: 'hello 5',
                            $afterGetCalled: 1,

                            model1Relation1: null,
                            model1Relation2: []
                          },
                          {
                            model1Prop1: 'hello 6',
                            $afterGetCalled: 1,

                            model1Relation1: {
                              model1Prop1: 'hello 7',
                              $afterGetCalled: 1
                            },

                            model1Relation2: [
                              {
                                model2Prop1: 'hejsan 3',
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
          })
        );
      });

      it('should implicitly add selects for join columns if they are aliased in filterEager/modifyEager', () => {
        // Does not yet work for JoinEagerAlgorithm.

        return Model1.query()
          .where('Model1.id', 1)
          .column('Model1.model1Prop1')
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .filterEager('model1Relation2', builder => {
            builder.select('model2_prop1', 'id_col as x1', 'model1_id as x2');
          })
          .filterEager('model1Relation2.model2Relation1', builder => {
            builder.select('model1Prop1', 'Model1.id as y1', 'Model1.model1Id as y2');
          })
          .filterEager('model1Relation2.model2Relation1.model1Relation1', builder => {
            builder.select('model1Prop1', 'Model1.id as y1', 'Model1.model1Id as y2');
          })
          .filterEager('model1Relation2.model2Relation1.model1Relation2', builder => {
            builder.select('model2_prop1', 'id_col as x1', 'model1_id as x2');
          })
          .then(models => {
            models[0].model1Relation2 = _.sortBy(models[0].model1Relation2, 'model2Prop1');
            models[0].model1Relation2[1].model2Relation1 = _.sortBy(
              models[0].model1Relation2[1].model2Relation1,
              'model1Prop1'
            );

            expect(models).to.eql([
              {
                model1Prop1: 'hello 1',
                $afterGetCalled: 1,

                model1Relation2: [
                  {
                    model2Prop1: 'hejsan 1',
                    $afterGetCalled: 1,
                    x1: 1,
                    x2: 1,

                    model2Relation1: []
                  },
                  {
                    model2Prop1: 'hejsan 2',
                    $afterGetCalled: 1,
                    x1: 2,
                    x2: 1,

                    model2Relation1: [
                      {
                        model1Prop1: 'hello 5',
                        $afterGetCalled: 1,
                        y1: 5,
                        y2: null,

                        model1Relation1: null,
                        model1Relation2: []
                      },
                      {
                        model1Prop1: 'hello 6',
                        $afterGetCalled: 1,
                        y1: 6,
                        y2: 7,

                        model1Relation1: {
                          model1Prop1: 'hello 7',
                          $afterGetCalled: 1,
                          y1: 7,
                          y2: null
                        },

                        model1Relation2: [
                          {
                            model2Prop1: 'hejsan 3',
                            $afterGetCalled: 1,
                            x1: 3,
                            x2: 6
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

      it('should filter the eager query using relation expressions as paths (JoinEagerAlgorithm)', () => {
        return Model1.query()
          .where('Model1.id', 1)
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.where('id', 6);
          })
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .modifyEager('model1Relation2', builder => {
            builder.where('model2_prop1', 'hejsan 2');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.select('model1Prop1');
          })
          .then(models => {
            expect(models).to.eql([
              {
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null,
                $afterGetCalled: 1,

                model1Relation2: [
                  {
                    idCol: 2,
                    model1Id: 1,
                    model2Prop1: 'hejsan 2',
                    model2Prop2: null,
                    $afterGetCalled: 1,

                    model2Relation1: [
                      {
                        model1Prop1: 'hello 6',
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
            ]);
          });
      });
    });

    describe('QueryBuilder.pick', () => {
      it('pick(properties) should pick properties recursively', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .pick(['id', 'idCol', 'model1Relation1', 'model1Relation2', 'model2Relation1'])
          .filterEager('model1Relation2', builder => {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.orderBy('id');
          })
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
                        }
                      ]
                    }
                  ]
                }
              ]
            });
          });
      });

      it('pick(modelClass, properties) should pick properties recursively based on model class', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .pick(Model1, ['id', 'model1Relation1', 'model1Relation2'])
          .pick(Model2, ['idCol', 'model2Relation1'])
          .filterEager('model1Relation2', builder => {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.orderBy('id');
          })
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
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

    describe('QueryBuilder.omit', () => {
      it('omit(properties) should omit properties recursively', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', builder => {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.orderBy('id');
          })
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      aliasedExtra: 'extra 5',
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      aliasedExtra: 'extra 6',
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
                        }
                      ]
                    }
                  ]
                }
              ]
            });
          });
      });

      it('omit(modelClass, properties) should omit properties recursively based on model class', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .omit(Model1, ['model1Id', 'model1Prop1', 'model1Prop2'])
          .omit(Model2, ['model1Id', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', builder => {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.orderBy('id');
          })
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      aliasedExtra: 'extra 5',
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      aliasedExtra: 'extra 6',
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
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

    describe('QueryBuilder.mergeEager', () => {
      it('mergeEager should merge eager expressions', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2')
          .mergeEager('model1Relation2.model2Relation1.model1Relation1')
          .mergeEager('model1Relation2.model2Relation1.model1Relation2')
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', builder => {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', builder => {
            builder.orderBy('id');
          })
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      aliasedExtra: 'extra 5',
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      aliasedExtra: 'extra 6',
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
                        }
                      ]
                    }
                  ]
                }
              ]
            });
          });
      });

      it('mergeEager should merge eager expressions and filters', () => {
        return Model1.query()
          .where('id', 1)
          .eager('model1Relation2')
          .mergeEager('model1Relation2(f1).model2Relation1.model1Relation1', {
            f1: builder => {
              builder.orderBy('id_col');
            }
          })
          .mergeEager('model1Relation2.model2Relation1(f2).model1Relation2', {
            f2: builder => {
              builder.orderBy('id');
            }
          })
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [
                {
                  idCol: 1,
                  model2Relation1: []
                },
                {
                  idCol: 2,
                  model2Relation1: [
                    {
                      id: 5,
                      aliasedExtra: 'extra 5',
                      model1Relation1: null,
                      model1Relation2: []
                    },
                    {
                      id: 6,
                      aliasedExtra: 'extra 6',
                      model1Relation1: {
                        id: 7
                      },
                      model1Relation2: [
                        {
                          idCol: 3
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

    describe('QueryBuilder.orderBy', () => {
      it('orderBy should work for the root query', () => {
        return Promise.map(
          [Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm],
          eagerAlgorithm => {
            return Model1.query()
              .select('Model1.model1Prop1')
              .modifyEager('model1Relation1', builder => {
                builder.select('model1Prop1');
              })
              .eager('model1Relation1')
              .eagerAlgorithm(eagerAlgorithm)
              .orderBy('Model1.model1Prop1', 'DESC')
              .whereNotNull('Model1.model1Id')
              .then(models => {
                expect(models).to.eql([
                  {
                    model1Prop1: 'hello 8',
                    model1Relation1: { model1Prop1: 'hello 9', $afterGetCalled: 1 },
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 6',
                    model1Relation1: { model1Prop1: 'hello 7', $afterGetCalled: 1 },
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 3',
                    model1Relation1: { model1Prop1: 'hello 4', $afterGetCalled: 1 },
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 2',
                    model1Relation1: { model1Prop1: 'hello 3', $afterGetCalled: 1 },
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 1',
                    model1Relation1: { model1Prop1: 'hello 2', $afterGetCalled: 1 },
                    $afterGetCalled: 1
                  }
                ]);
              });
          }
        );
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
                model1Prop1: 'hello 5'
              },
              {
                id: 600,
                model1Prop1: 'hello 6'
              }
            ]
          },
          {
            idCol: 200,
            model2Prop1: 'hejsan 2',

            model2Relation1: [
              {
                id: 700,
                model1Prop1: 'hello 7'
              },
              {
                id: 800,
                model1Prop1: 'hello 8'
              }
            ]
          }
        ]);
      });

      it('should work with WhereInEagerAlgorithm', () => {
        return Model2.query()
          .whereIn('id_col', [100, 200])
          .eagerAlgorithm(Model2.WhereInEagerAlgorithm)
          .eager('model2Relation1(select)', {
            select: b => b.select('model1Prop1')
          })
          .map(model => {
            model.model2Relation1 = _.sortBy(model.model2Relation1, 'model1Prop1');
            return model;
          })
          .then(models => {
            expect(models).to.eql([
              {
                idCol: 100,
                model1Id: null,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 5',
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterGetCalled: 1
                  }
                ]
              },
              {
                idCol: 200,
                model1Id: null,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 7',
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 8',
                    $afterGetCalled: 1
                  }
                ]
              }
            ]);
          });
      });

      it('should work with JoinEagerAlgorithm', () => {
        return Model2.query()
          .whereIn('id_col', [100, 200])
          .eagerAlgorithm(Model2.JoinEagerAlgorithm)
          .eager('model2Relation1(select)', {
            select: b => b.select('model1Prop1')
          })
          .map(model => {
            model.model2Relation1 = _.sortBy(model.model2Relation1, 'model1Prop1');
            return model;
          })
          .then(models => {
            expect(models).to.eql([
              {
                idCol: 100,
                model1Id: null,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 5',
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 6',
                    $afterGetCalled: 1
                  }
                ]
              },
              {
                idCol: 200,
                model1Id: null,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: [
                  {
                    model1Prop1: 'hello 7',
                    $afterGetCalled: 1
                  },
                  {
                    model1Prop1: 'hello 8',
                    $afterGetCalled: 1
                  }
                ]
              }
            ]);
          });
      });
    });

    describe('aliases', () => {
      it('aliases in eager expressions should work', () => {
        return Promise.map(
          [Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm],
          eagerAlgo => {
            return Model1.query()
              .where('Model1.id', 1)
              .select('Model1.id')
              .eagerAlgorithm(eagerAlgo)
              .eager(
                `[
              model1Relation1(f1) as a,
              model1Relation2(f2) as b .[
                model2Relation1(f1) as c,
                model2Relation1(f1) as d
              ]
            ]`,
                {
                  f1: builder => builder.select('Model1.id'),
                  f2: builder => builder.select('model2.id_col')
                }
              )
              .first()
              .then(model => {
                model.b = _.sortBy(model.b, 'idCol');
                model.b[1].c = _.sortBy(model.b[1].c, 'id');
                model.b[1].d = _.sortBy(model.b[1].d, 'id');

                expect(model).to.eql({
                  id: 1,
                  $afterGetCalled: 1,

                  a: {
                    id: 2,
                    $afterGetCalled: 1
                  },

                  b: [
                    {
                      idCol: 1,
                      $afterGetCalled: 1,

                      c: [],
                      d: []
                    },
                    {
                      idCol: 2,
                      $afterGetCalled: 1,

                      c: [
                        {
                          id: 5,
                          $afterGetCalled: 1
                        },
                        {
                          id: 6,
                          $afterGetCalled: 1
                        }
                      ],

                      d: [
                        {
                          id: 5,
                          $afterGetCalled: 1
                        },
                        {
                          id: 6,
                          $afterGetCalled: 1
                        }
                      ]
                    }
                  ]
                });
              });
          },
          { concurrency: 1 }
        );
      });

      it('aliases should alias the joined tables when using joinEager', () => {
        return Model1.query()
          .findById(1)
          .select('Model1.id')
          .joinEager(
            `[
            model1Relation1(f1) as a,
            model1Relation2(f2) as b .[
              model2Relation1(f1) as c,
              model2Relation1(f1) as d
            ]
          ]`,
            {
              f1: builder => builder.select('Model1.id'),
              f2: builder => builder.select('model2.id_col')
            }
          )
          .where('b:d.id', 6)
          .then(model => {
            model.b = _.sortBy(model.b, 'idCol');
            model.b[0].c = _.sortBy(model.b[0].c, 'id');
            model.b[0].d = _.sortBy(model.b[0].d, 'id');

            expect(model).to.eql({
              id: 1,
              $afterGetCalled: 1,

              a: {
                id: 2,
                $afterGetCalled: 1
              },

              b: [
                {
                  idCol: 2,
                  $afterGetCalled: 1,

                  c: [
                    {
                      id: 5,
                      $afterGetCalled: 1
                    },
                    {
                      id: 6,
                      $afterGetCalled: 1
                    }
                  ],

                  d: [
                    {
                      id: 6,
                      $afterGetCalled: 1
                    }
                  ]
                }
              ]
            });
          });
      });

      it('alias method should work', () => {
        return Promise.map(
          [Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm],
          eagerAlgo => {
            return Model1.query()
              .alias('m1')
              .select('m1.id')
              .eagerAlgorithm(eagerAlgo)
              .eager(`[model1Relation1(f1) as a]`, {
                f1: builder => builder.select('id')
              })
              .findOne({ 'm1.id': 1 })
              .then(model => {
                expect(model).to.eql({
                  id: 1,
                  $afterGetCalled: 1,

                  a: {
                    id: 2,
                    $afterGetCalled: 1
                  }
                });
              });
          },
          { concurrency: 1 }
        );
      });
    });

    if (session.isPostgres()) {
      it('check JoinEagerAlgorithm generated SQL', () => {
        let queries = [];

        let mockKnex = mockKnexFactory(session.knex, function(mock, then, args) {
          queries.push(this.toString());
          return then.apply(this, args);
        });

        return Model1.bindKnex(mockKnex)
          .query()
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .eager(
            '[model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]'
          )
          .then(() => {
            expect(_.last(queries).replace(/\s/g, '')).to.equal(
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
            `.replace(/\s/g, '')
            );
          });
      });
    }

    if (session.isPostgres())
      describe.skip('big data', () => {
        let graph = null;

        before(function() {
          this.timeout(30000);
          let n = 0;

          graph = _.range(100).map(() => {
            return {
              model1Prop1: 'hello ' + n++,

              model1Relation1: {
                model1Prop1: 'hi ' + n++,

                model1Relation1: {
                  model1Prop1: 'howdy ' + n++
                }
              },

              model1Relation1Inverse: {
                model1Prop1: 'quux ' + n++
              },

              model1Relation2: _.range(10).map(() => {
                return {
                  model2Prop1: 'foo ' + n++,

                  model2Relation1: _.range(10).map(() => {
                    return {
                      model1Prop1: 'bar ' + n++
                    };
                  }),

                  model2Relation2: {
                    model1Prop1: 'baz ' + n++
                  }
                };
              }),

              model1Relation3: _.range(10).map(() => {
                return {
                  model2Prop1: 'spam ' + n++
                };
              })
            };
          });

          return session
            .populate([])
            .then(() => {
              return Model1.query().insertGraph(graph);
            })
            .then(inserted => {
              graph = inserted;
            });
        });

        it('should work with a lot of data', function() {
          this.timeout(30000);

          return Promise.map(
            [/*Model1.WhereInEagerAlgorithm*/ Model1.JoinEagerAlgorithm],
            eagerAlgorithm => {
              let t1 = Date.now();
              return Model1.query()
                .where('Model1.model1Prop1', 'like', 'hello%')
                .eager(
                  '[model1Relation1.model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]'
                )
                .eagerAlgorithm(eagerAlgorithm)
                .then(res => {
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
            { concurrency: 1 }
          );
        });

        function traverser(model) {
          ['extra1', 'extra2', 'aliasedExtra', 'model1Id', 'model1Prop2', 'model2Prop2'].forEach(
            key => {
              delete model[key];
            }
          );

          ['model1Relation2', 'model1Relation3'].map(rel => {
            if (model[rel]) {
              model[rel] = _.sortBy(model[rel], 'idCol');
            }
          });

          ['model2Relation1'].map(rel => {
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
      id: 1
    });

    let idCol = opt.Model.query().fullIdColumnFor(opt.Model);
    let testFn = opt.only ? it.only.bind(it) : it;

    if (!opt.disableWhereIn) {
      testFn(testName + ' (QueryBuilder.eager)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .eager(expr, opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });

      testFn(testName + ' (Model.loadRelated)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .then(models => {
            return opt.Model.loadRelated(models, expr, opt.filters);
          })
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });

      testFn(testName + ' (Model.$loadRelated)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .then(models => {
            return models[0].$loadRelated(expr, opt.filters);
          })
          .then(sortRelations(opt.disableSort))
          .then(result => {
            tester([result]);
          });
      });

      testFn(testName + ' (NaiveEagerAlgorithm)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .eagerAlgorithm(Model1.NaiveEagerAlgorithm)
          .eager(expr, opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });
    }

    if (!opt.disableJoin) {
      testFn(testName + ' (JoinEagerAlgorithm)', () => {
        return opt.Model.query()
          .where(idCol, opt.id)
          .eagerAlgorithm(Model1.JoinEagerAlgorithm, opt.eagerOptions)
          .eager(expr, opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });
    }
  }

  function sortRelations(disable) {
    if (disable) {
      return models => {
        return models;
      };
    }

    return models => {
      Model1.traverse(models, model => {
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
