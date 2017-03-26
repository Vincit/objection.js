'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var ValidationError = require('../../').ValidationError;
var mockKnexFactory = require('../../testUtils/mockKnex');
var isPostgres = require('../../lib/utils/knexUtils').isPostgres;

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('Model eager queries', function () {

    before(function () {
      return session.populate([{
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
              model1Relation2: [{
                idCol: 4,
                model2Prop1: 'hejsan 4'
              }]
            }
          }
        },

        model1Relation2: [{
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
        }, {
          idCol: 2,
          model2Prop1: 'hejsan 2',

          model2Relation1: [{
            id: 5,
            model1Prop1: 'hello 5',
            aliasedExtra: 'extra 5'
          }, {
            id: 6,
            model1Prop1: 'hello 6',
            aliasedExtra: 'extra 6',

            model1Relation1: {
              id: 7,
              model1Prop1: 'hello 7'
            },

            model1Relation2: [{
              idCol: 3,
              model2Prop1: 'hejsan 3'
            }]
          }]
        }]
      }]);
    });

    test('model1Relation1', function (models) {
      expect(models).to.eql([{
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
      }]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation1).to.be.a(Model1);
    });

    test('model1Relation1.model1Relation1', function (models) {
      expect(models).to.eql([{
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
          $afterGetCalled : 1,
          model1Relation1: {
            id: 3,
            model1Id: 4,
            model1Prop1: 'hello 3',
            model1Prop2: null,
            $afterGetCalled : 1
          }
        },
      }]);
    });

    test('model1Relation1.model1Relation1Inverse', function (models) {
      expect(models).to.eql([{
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
          },
        },
      }]);
    });

    test('model1Relation1.^', function (models) {
      expect(models).to.eql([{
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
              model1Relation1: null,
            },
          },
        }
      }]);
    }, {disableJoin: true});

    test('model1Relation1.^2', function (models) {
      expect(models).to.eql([{
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
          },
        }
      }]);
    });

    test('model1Relation1(selectId).^', function (models) {
      expect(models).to.eql([{
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
            },
          },
        }
      }]);
    }, {
      filters: {
        selectId: function (builder) {
          builder.select('id', 'model1Id');
        }
      },
      disableJoin: true
    });

    test('model1Relation1(selectId).^4', function (models) {
      expect(models).to.eql([{
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
              model1Relation1: null,
            },
          },
        }
      }]);
    }, {
      filters: {
        selectId: function (builder) {
          builder.select('model1Prop1');
        }
      },
      disableWhereIn: true,
      eagerOptions: {minimize: true}
    });

    test('model1Relation2.model2Relation2', function (models) {
      expect(models).to.eql([{
        id: 1,
        model1Id: 2,
        model1Prop1: 'hello 1',
        model1Prop2: null,
        $afterGetCalled: 1,

        model1Relation2: [{
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
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,
          model2Relation2: null
        }],
      }]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2).to.be.a(Model1);
    });

    test('model1Relation2.model2Relation2.model1Relation1', function (models) {
      expect(models).to.eql([{
        id: 1,
        model1Id: 2,
        model1Prop1: 'hello 1',
        model1Prop2: null,
        $afterGetCalled: 1,

        model1Relation2: [{
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
              $afterGetCalled: 1,
            }
          }
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,
          model2Relation2: null
        }],
      }]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0].model2Relation2.model1Relation1).to.be.a(Model1);
    });

    test('[model1Relation1, model1Relation2]', function (models) {
      expect(models).to.eql([{
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
        },

        model1Relation2: [{
          idCol: 1,
          model1Id: 1,
          model2Prop1: 'hejsan 1',
          model2Prop2: null,
          $afterGetCalled: 1,
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,
        }],
      }]);

      expect(models[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
    });

    test('[model1Relation1, model1Relation2(orderByDesc, selectProps)]', function (models) {
      expect(models).to.eql([{
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
        },

        model1Relation2: [{
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          $afterGetCalled: 1,
        }, {
          idCol: 1,
          model1Id: 1,
          model2Prop1: 'hejsan 1',
          $afterGetCalled: 1,
        }]
      }]);
    }, {
      filters: {
        selectProps: function (builder) {
          builder.select('id_col', 'model_1_id', 'model_2_prop_1');
        },
        orderByDesc: function (builder) {
          builder.orderBy('model_2_prop_1', 'desc');
        }
      },
      disableJoin: true,
      disableSort: true
    });

    test('[model1Relation1, model1Relation2.model2Relation1]', function (models) {
      expect(models).to.eql([{
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

        model1Relation2: [{
          idCol: 1,
          model1Id: 1,
          model2Prop1: 'hejsan 1',
          model2Prop2: null,
          $afterGetCalled: 1,
          model2Relation1: []
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,

          model2Relation1: [{
            id: 5,
            model1Id: null,
            model1Prop1: 'hello 5',
            model1Prop2: null,
            aliasedExtra: 'extra 5',
            $afterGetCalled: 1
          }, {
            id: 6,
            model1Id: 7,
            model1Prop1: 'hello 6',
            model1Prop2: null,
            aliasedExtra: 'extra 6',
            $afterGetCalled: 1
          }],
        }],
      }]);
    });

    test('[model1Relation2.model2Relation1, model1Relation1]', function (models) {
      expect(models).to.eql([{
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

        model1Relation2: [{
          idCol: 1,
          model1Id: 1,
          model2Prop1: 'hejsan 1',
          model2Prop2: null,
          $afterGetCalled: 1,
          model2Relation1: []
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,

          model2Relation1: [{
            id: 5,
            model1Id: null,
            model1Prop1: 'hello 5',
            model1Prop2: null,
            aliasedExtra: 'extra 5',
            $afterGetCalled: 1
          }, {
            id: 6,
            model1Id: 7,
            model1Prop1: 'hello 6',
            model1Prop2: null,
            aliasedExtra: 'extra 6',
            $afterGetCalled: 1
          }],
        }],
      }]);
    });

    test('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]', function (models) {
      expect(models).to.eql([{
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

        model1Relation2: [{
          idCol: 1,
          model1Id: 1,
          model2Prop1: 'hejsan 1',
          model2Prop2: null,
          $afterGetCalled: 1,
          model2Relation1: []
        }, {
          idCol: 2,
          model1Id: 1,
          model2Prop1: 'hejsan 2',
          model2Prop2: null,
          $afterGetCalled: 1,

          model2Relation1: [{
            id: 5,
            model1Id: null,
            model1Prop1: 'hello 5',
            model1Prop2: null,
            aliasedExtra: 'extra 5',
            model1Relation1: null,
            model1Relation2: [],
            $afterGetCalled: 1
          }, {
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
              $afterGetCalled: 1,
            },

            model1Relation2: [{
              idCol: 3,
              model1Id: 6,
              model2Prop1: 'hejsan 3',
              model2Prop2: null,
              $afterGetCalled: 1,
            }]
          }],
        }],
      }]);
    });

    describe('JoinEagerAlgorithm', function () {

      it('should be able to refer to joined relations with syntax Table:rel1:rel2.col', function () {
        return Model1
          .query()
          .where('Model1.id', 1)
          .where('model1Relation2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(function (models) {
            expect(models).to.eql([{
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

              model1Relation2: [{
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [{
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  $afterGetCalled: 1
                }, {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1
                }],
              }],
            }]);
          });
      });

      it('should be able to give aliases for relations', function () {
        return Model1
          .query()
          .where('Model1.id', 1)
          .where('mr2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm, {
            aliases: {
              model1Relation2: 'mr2'
            }
          })
          .then(function (models) {
            expect(models).to.eql([{
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

              model1Relation2: [{
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [{
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  $afterGetCalled: 1
                }, {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1
                }],
              }],
            }]);
          });
      });

      it('relation references longer that 63 chars should throw an exception', function (done) {
        Model1
          .query()
          .where('Model1.id', 1)
          .eager('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (err) {
            expect(err.data.eager).to.equal("identifier model1Relation1:model1Relation1:model1Relation1:model1Relation1:id is over 63 characters long and would be truncated by the database engine.");
            done();
          })
          .catch(done);
      });

      it('relation references longer that 63 chars should NOT throw an exception if minimize: true option is given', function (done) {
        Model1
          .query()
          .where('Model1.id', 1)
          .eager('[model1Relation1.model1Relation1.model1Relation1.model1Relation1]')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .eagerOptions({minimize: true})
          .then(function (models) {
            expect(models).to.eql([{
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
                    model1Relation1: null,
                  },
                },
              }
            }]);

            done();
          })
          .catch(done);
      });

      it('infinitely recursive expressions should fail', function (done) {
        Model1
          .query()
          .where('Model1.id', 1)
          .eager('model1Relation1.^')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (err) {
            expect(err.data.eager).to.equal('recursion depth of eager expression model1Relation1.^ too big for JoinEagerAlgorithm');
            done();
          });
      });

      it('should fail if given missing filter', function (done) {
        Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2(missingFilter)')
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (error) {
            expect(error).to.be.a(ValidationError);
            expect(error.data).to.have.property('eager');
            done();
          })
          .catch(done);
      });

      it('should fail if given missing relation', function (done) {
        Model1
          .query()
          .where('id', 1)
          .eager('invalidRelation')
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (error) {
            expect(error).to.be.a(ValidationError);
            expect(error.data).to.have.property('eager');
            done();
          })
          .catch(done);
      });

    });

    describe('Model.defaultEagerOptions and Model.defaultEagerAlgorithm should be used if defined', function () {
      var TestModel;

      before(function () {
        // Create a dummy mock so that we can bind Model1 to it.
        TestModel = Model1.bindKnex(mockKnexFactory(session.knex, function (mock, oldImpl, args) {
          return oldImpl.apply(this, args);
        }));

        TestModel.defaultEagerAlgorithm = TestModel.JoinEagerAlgorithm;
        TestModel.defaultEagerOptions = {
          aliases: {
            model1Relation2: 'mr2'
          }
        };
      });

      it('options for JoinEagerAlgorithm', function () {
        return TestModel
          .query()
          .where('Model1.id', 1)
          .where('mr2.id_col', 2)
          .eager('[model1Relation1, model1Relation2.model2Relation1]')
          .then(function (models) {
            expect(models).to.eql([{
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

              model1Relation2: [{
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [{
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  $afterGetCalled: 1
                }, {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1
                }],
              }],
            }]);
          });
      });

    });

    describe('QueryBuilder.modifyEager', function () {

      it('should filter the eager query using relation expressions as paths', function () {
        return Model1
          .query()
          .where('id', 1)
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.where('Model1.id', 6);
          })
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .filterEager('model1Relation2', function (builder) {
            builder.where('model_2_prop_1', 'hejsan 2');
          })
          .then(function (models) {
            expect(models[0].model1Relation2).to.have.length(1);
            expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 2');

            expect(models[0].model1Relation2[0].model2Relation1).to.have.length(1);
            expect(models[0].model1Relation2[0].model2Relation1[0].id).to.equal(6);
          });
      });

      it('should implicitly add selects for join columns if they are omitted in filterEager/modifyEager', function () {
        return Promise.all([Model1.WhereInEagerAlgorithm, Model1.JoinEagerAlgorithm].map(function (eagerAlgo) {
          return Model1
            .query()
            .where('Model1.id', 1)
            .column('Model1.model1Prop1')
            .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
            .eagerAlgorithm(eagerAlgo)
            .filterEager('model1Relation2', function (builder) {
              builder.select('model_2_prop_1');
            })
            .filterEager('model1Relation2.model2Relation1', function (builder) {
              builder.distinct('model1Prop1');
            })
            .filterEager('model1Relation2.model2Relation1.model1Relation1', function (builder) {
              builder.select('model1Prop1');
            })
            .filterEager('model1Relation2.model2Relation1.model1Relation2', function (builder) {
              builder.select('model_2_prop_1');
            })
            .then(function (models) {
              models[0].model1Relation2 = _.sortBy(models[0].model1Relation2, 'model2Prop1');
              models[0].model1Relation2[1].model2Relation1 = _.sortBy(models[0].model1Relation2[1].model2Relation1 , 'model1Prop1');

              expect(models).to.eql([{
                model1Prop1: 'hello 1',
                $afterGetCalled: 1,

                model1Relation2: [{
                  model2Prop1: 'hejsan 1',
                  $afterGetCalled: 1,

                  model2Relation1: []
                }, {
                  model2Prop1: 'hejsan 2',
                  $afterGetCalled: 1,

                  model2Relation1: [{
                    model1Prop1: 'hello 5',
                    $afterGetCalled: 1,

                    model1Relation1: null,
                    model1Relation2: []
                  }, {
                    model1Prop1: 'hello 6',
                    $afterGetCalled: 1,

                    model1Relation1: {
                      model1Prop1: 'hello 7',
                      $afterGetCalled: 1
                    },

                    model1Relation2: [{
                      model2Prop1: 'hejsan 3',
                      $afterGetCalled: 1
                    }]
                  }]
                }],
              }]);
            });
        }));
      });

      it('should filter the eager query using relation expressions as paths (JoinEagerAlgorithm)', function () {
        return Model1
          .query()
          .where('Model1.id', 1)
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.where('id', 6);
          })
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .modifyEager('model1Relation2', function (builder) {
            builder.where('model_2_prop_1', 'hejsan 2');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.select('model1Prop1');
          })
          .then(function (models) {
            expect(models).to.eql([{
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              $afterGetCalled: 1,

              model1Relation2: [{
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [{
                  model1Prop1: 'hello 6',
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 7,
                    model1Id: null,
                    model1Prop1: 'hello 7',
                    model1Prop2: null,
                    $afterGetCalled: 1,
                  },

                  model1Relation2: [{
                    idCol: 3,
                    model1Id: 6,
                    model2Prop1: 'hejsan 3',
                    model2Prop2: null,
                    $afterGetCalled: 1,
                  }]
                }],
              }],
            }]);
          });
      });

    });

    describe('QueryBuilder.pick', function () {

      it('pick(properties) should pick properties recursively', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .pick(['id', 'idCol', 'model1Relation1', 'model1Relation2', 'model2Relation1'])
          .filterEager('model1Relation2', function (builder) {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.orderBy('id');
          })
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

      it('pick(modelClass, properties) should pick properties recursively based on model class', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .pick(Model1, ['id', 'model1Relation1', 'model1Relation2'])
          .pick(Model2, ['idCol', 'model2Relation1'])
          .filterEager('model1Relation2', function (builder) {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.orderBy('id');
          })
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

    });

    describe('QueryBuilder.omit', function () {

      it('omit(properties) should omit properties recursively', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', function (builder) {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.orderBy('id');
          })
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  aliasedExtra: 'extra 6',
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

      it('omit(modelClass, properties) should omit properties recursively based on model class', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .omit(Model1, ['model1Id', 'model1Prop1', 'model1Prop2'])
          .omit(Model2, ['model1Id', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', function (builder) {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.orderBy('id');
          })
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  aliasedExtra: 'extra 6',
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

    });

    describe('QueryBuilder.mergeEager', function () {

      it('mergeEager should merge eager expressions', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2')
          .mergeEager('model1Relation2.model2Relation1.model1Relation1')
          .mergeEager('model1Relation2.model2Relation1.model1Relation2')
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .filterEager('model1Relation2', function (builder) {
            builder.orderBy('id_col');
          })
          .modifyEager('model1Relation2.model2Relation1', function (builder) {
            builder.orderBy('id');
          })
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  aliasedExtra: 'extra 6',
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

      it('mergeEager should merge eager expressions and filters', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2')
          .mergeEager('model1Relation2(f1).model2Relation1.model1Relation1', {
            f1: function (builder) {
              builder.orderBy('id_col');
            }
          })
          .mergeEager('model1Relation2.model2Relation1(f2).model1Relation2', {
            f2: function (builder) {
              builder.orderBy('id');
            }
          })
          .first()
          .omit(['model1Id', 'model1Prop1', 'model1Prop2', 'model2Prop1', 'model2Prop2'])
          .then(function (model) {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  aliasedExtra: 'extra 6',
                  model1Relation1: {
                    id: 7
                  },
                  model1Relation2: [{
                    idCol: 3
                  }]
                }]
              }]
            });
          });
      });

    });

    if (isPostgres(session.knex)) {
      it('check JoinEagerAlgorithm generated SQL', function () {
        var queries = [];

        var mockKnex = mockKnexFactory(session.knex, function (mock, then, args) {
          queries.push(this.toString());
          return then.apply(this, args);
        });

        return Model1
          .bindKnex(mockKnex)
          .query()
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .eager('[model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]')
          .then(function () {
            expect(_.last(queries))/**/.to.equal('select "Model1"."id" as "id", "Model1"."model1Id" as "model1Id", "Model1"."model1Prop1" as "model1Prop1", "Model1"."model1Prop2" as "model1Prop2", "model1Relation1"."id" as "model1Relation1:id", "model1Relation1"."model1Id" as "model1Relation1:model1Id", "model1Relation1"."model1Prop1" as "model1Relation1:model1Prop1", "model1Relation1"."model1Prop2" as "model1Relation1:model1Prop2", "model1Relation1Inverse"."id" as "model1Relation1Inverse:id", "model1Relation1Inverse"."model1Id" as "model1Relation1Inverse:model1Id", "model1Relation1Inverse"."model1Prop1" as "model1Relation1Inverse:model1Prop1", "model1Relation1Inverse"."model1Prop2" as "model1Relation1Inverse:model1Prop2", "model1Relation2"."id_col" as "model1Relation2:id_col", "model1Relation2"."model_1_id" as "model1Relation2:model_1_id", "model1Relation2"."model_2_prop_1" as "model1Relation2:model_2_prop_1", "model1Relation2"."model_2_prop_2" as "model1Relation2:model_2_prop_2", "model1Relation2:model2Relation1"."id" as "model1Relation2:model2Relation1:id", "model1Relation2:model2Relation1"."model1Id" as "model1Relation2:model2Relation1:model1Id", "model1Relation2:model2Relation1"."model1Prop1" as "model1Relation2:model2Relation1:model1Prop1", "model1Relation2:model2Relation1"."model1Prop2" as "model1Relation2:model2Relation1:model1Prop2", "model1Relation2:model2Relation1_join"."extra3" as "model1Relation2:model2Relation1:aliasedExtra", "model1Relation2:model2Relation2"."id" as "model1Relation2:model2Relation2:id", "model1Relation2:model2Relation2"."model1Id" as "model1Relation2:model2Relation2:model1Id", "model1Relation2:model2Relation2"."model1Prop1" as "model1Relation2:model2Relation2:model1Prop1", "model1Relation2:model2Relation2"."model1Prop2" as "model1Relation2:model2Relation2:model1Prop2", "model1Relation3"."id_col" as "model1Relation3:id_col", "model1Relation3"."model_1_id" as "model1Relation3:model_1_id", "model1Relation3"."model_2_prop_1" as "model1Relation3:model_2_prop_1", "model1Relation3"."model_2_prop_2" as "model1Relation3:model_2_prop_2", "model1Relation3_join"."extra1" as "model1Relation3:extra1", "model1Relation3_join"."extra2" as "model1Relation3:extra2" from "Model1" as "Model1" left join "Model1" as "model1Relation1" on "model1Relation1"."id" = "Model1"."model1Id" left join "Model1" as "model1Relation1Inverse" on "model1Relation1Inverse"."model1Id" = "Model1"."id" left join "model_2" as "model1Relation2" on "model1Relation2"."model_1_id" = "Model1"."id" left join "Model1Model2" as "model1Relation2:model2Relation1_join" on "model1Relation2:model2Relation1_join"."model2Id" = "model1Relation2"."id_col" left join "Model1" as "model1Relation2:model2Relation1" on "model1Relation2:model2Relation1_join"."model1Id" = "model1Relation2:model2Relation1"."id" left join "Model1Model2One" as "model1Relation2:model2Relation2_join" on "model1Relation2:model2Relation2_join"."model2Id" = "model1Relation2"."id_col" left join "Model1" as "model1Relation2:model2Relation2" on "model1Relation2:model2Relation2_join"."model1Id" = "model1Relation2:model2Relation2"."id" left join "Model1Model2" as "model1Relation3_join" on "model1Relation3_join"."model1Id" = "Model1"."id" left join "model_2" as "model1Relation3" on "model1Relation3_join"."model2Id" = "model1Relation3"."id_col"');
          });
      });
    }

    describe.skip('big data', function () {
      var graph = null;

      beforeEach(function () {
        this.timeout(30000);
        var n = 0;

        graph = _.range(100).map(function () {
          return {
            model1Prop1: 'hello ' + n++,

            model1Relation1: {
              model1Prop1: 'hi ' + n++,

              model1Relation1: {
                model1Prop1: 'howdy ' + n++
              }
            },

            model1Relation1Inverse: {
              model1Prop1: 'quux ' + n++,
            },

            model1Relation2: _.range(10).map(function () {
              return {
                model2Prop1: 'foo ' + n++,

                model2Relation1: _.range(10).map(function () {
                  return {
                    model1Prop1: 'bar ' + n++
                  };
                }),

                model2Relation2: {
                  model1Prop1: 'baz ' + n++
                }
              };
            }),

            model1Relation3: _.range(10).map(function () {
              return {
                model2Prop1: 'spam ' + n++,
              };
            })
          };
        });

        var t0 = Date.now();
        return session.populate([]).then(function () {
          return Model1.query().insertGraph(graph);
        }).then(function (inserted) {
          graph = inserted;
          console.log(Date.now() - t0);
        });
      });

      it('should work with a lot of data', function () {
        this.timeout(30000);

        return Promise.map([/*Model1.WhereInEagerAlgorithm*/ Model1.JoinEagerAlgorithm], function (eagerAlgorithm) {
          return Model1
            .query()
            .where('Model1.model1Prop1', 'like', 'hello%')
            .eager('[model1Relation1.model1Relation1, model1Relation1Inverse, model1Relation2.[model2Relation1, model2Relation2], model1Relation3]')
            .eagerAlgorithm(eagerAlgorithm)
            .then(function (res) {
              graph = _.sortBy(graph, 'id');
              res = _.sortBy(res, 'id');

              Model1.traverse(graph, traverser);
              Model1.traverse(res, traverser);

              var expected = _.invokeMap(graph, 'toJSON');
              var got = _.invokeMap(res, 'toJSON');

              expect(got).to.eql(expected);
            });
        });
      });

      function traverser(model) {
        ['extra1', 'extra2', 'aliasedExtra', 'model1Id', 'model1Prop2', 'model2Prop2'].forEach(function (key) {
          delete model[key];
        });

        ['model1Relation2', 'model1Relation3'].map(function (rel) {
          if (model[rel]) {
            model[rel] = _.sortBy(model[rel], 'idCol');
          }
        });

        ['model2Relation1'].map(function (rel) {
          if (model[rel]) {
            model[rel] = _.sortBy(model[rel], 'id');
          }
        })
      }
    });

  });

  // Tests all ways to fetch eagerly.
  function test(expr, tester, opt) {
    opt = _.defaults(opt || {}, {
      Model: Model1,
      filters: {},
      id: 1
    });

    var idCol = opt.Model.getFullIdColumn();
    var testFn = opt.only ? it.only.bind(it) : it;

    if (!opt.disableWhereIn) {
      testFn(expr + ' (QueryBuilder.eager)', function () {
        return opt.Model
          .query()
          .where(idCol, opt.id)
          .eager(expr, opt.filters)
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });

      testFn(expr + ' (Model.loadRelated)', function () {
        return opt.Model
          .query()
          .where(idCol, opt.id)
          .then(function (models) {
            return opt.Model.loadRelated(models, expr, opt.filters);
          })
          .then(sortRelations(opt.disableSort))
          .then(tester);
      });

      testFn(expr + ' (Model.$loadRelated)', function () {
        return opt.Model
          .query()
          .where(idCol, opt.id)
          .then(function (models) {
            return models[0].$loadRelated(expr, opt.filters);
          })
          .then(sortRelations(opt.disableSort))
          .then(function (result) {
            tester([result]);
          });
      });
    }

    if (!opt.disableJoin) {
      testFn(expr + ' (JoinEagerAlgorithm)', function () {
        return opt.Model
          .query()
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
      return function (models) {
        return models;
      };
    }

    return function (models) {
      Model1.traverse(models, function (model) {
        if (model.model1Relation2) {
          model.model1Relation2 = _.sortBy(model.model1Relation2, 'idCol');
        }

        if (model.model2Relation1) {
          model.model2Relation1 = _.sortBy(model.model2Relation1, 'id');
        }
      });

      return models;
    };
  }
};


