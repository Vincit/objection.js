'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var ValidationError = require('../../').ValidationError;

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
          model2Prop1: 'hejsan 1'
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

    describe.skip('balls', function () {

      before(function () {
        var _n = 0;

        function n() {
          return ++_n;
        }

        return session.populate(_.times(100, function (i) {
          return {
            model1Prop2: i,

            model1Relation1: {
              model1Prop1: 'hello ' + n(),

              model1Relation1: {
                model1Prop1: 'hello ' + n(),

                model1Relation1: {
                  model1Prop1: 'hello ' + n(),

                  model1Relation2: _.times(3, function () {
                    return {
                      model2Prop1: 'hejsan ' + n()
                    }
                  })
                }
              }
            },

            model1Relation2: _.times(3, function () {
              return {
                model2Prop1: 'hejsan ' + n(),

                model2Relation1: _.times(2, function () {
                  return {
                    model1Prop1: 'hello ' + n(),
                    aliasedExtra: 'extra ' + n(),

                    model1Relation1: {
                      model1Prop1: 'hello ' + n()
                    },

                    model1Relation2: [{
                      model2Prop1: 'hejsan ' + n()
                    }]
                  };
                })
              };
            })
          }
        }));
      });

      it('yeahhh', function () {
        return Promise.all(_.range(100).map(function () {
          return Model1
            .query()
            .where('Model1.model1Prop2', '<', 100)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            //.eager('model1Relation2')
            .eager('[model1Relation1, model1Relation2.model2Relation1]')
            /*
             .modifyEager('model1Relation1', builder => {
             builder.select('id');
             })
             .modifyEager('model1Relation1.model1Relation1', builder => {
             builder.select('id');
             })
             .modifyEager('model1Relation1.model1Relation1.model1Relation1', builder => {
             builder.select('id');
             })
             .modifyEager('model1Relation2', builder => {
             builder.select('id_col');
             })
             .modifyEager('model1Relation2.model2Relation1', builder => {
             builder.select('id');
             })
             .modifyEager('model1Relation2.model2Relation1.model1Relation1', builder => {
             builder.select('id');
             })
             .modifyEager('model1Relation2.model2Relation1.model1Relation2', builder => {
             builder.select('id_col');
             })
             */
            //.debug()
            .then(function (res) {
              //console.log('==================================================================')
              //console.dir(res, {depth: 100})
            });
        }));
      });
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

    it('should be able to refer to joined relations with syntax Table:rel1:rel2.col (JoinEagerAlgorithm)', function () {
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

    it('should be able to give aliases for relations (JoinEagerAlgorithm)', function () {
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

    describe('Model.defaultEagerOptions and Model.defaultEagerAlgorithm should be used if defined', function () {
      var origAlgo;
      var origOptions;

      before(function () {
        origAlgo = Model1.defaultEagerAlgorithm;
        origOptions = Model1.defaultEagerOptions;

        Model1.defaultEagerAlgorithm = Model1.JoinEagerAlgorithm;
        Model1.defaultEagerOptions = {
          aliases: {
            model1Relation2: 'mr2'
          }
        };
      });

      after(function () {
        Model1.defaultEagerAlgorithm = origAlgo;
        Model1.defaultEagerOptions = origOptions;
      });

      it('options for JoinEagerAlgorithm', function () {
        return Model1
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

    it('relation references longer that 63 chars should throw an exception (JoinEagerAlgorithm)', function (done) {
      return Model1
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

    it('relation references longer that 63 chars should NOT throw an exception if minimize: true option is given (JoinEagerAlgorithm)', function (done) {
      return Model1
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

    it('infinitely recursive expressions should fail gracefully with JoinEagerAlgorithm', function (done) {
      expect(function () {
        Model1
          .query()
          .where('Model1.id', 1)
          .eager('model1Relation1.^')
          .eagerAlgorithm(Model1.JoinEagerAlgorithm)
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(done);
      }).to.throwException(function (err) {
        expect(err.data.eager).to.equal('recursion depth of eager expression model1Relation1.^ too big for JoinEagerAlgorithm');
        done();
      })
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


