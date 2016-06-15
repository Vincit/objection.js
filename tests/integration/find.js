'use strict';

var _ = require('lodash');
var utils = require('../../lib/utils/dbUtils');
var expect = require('expect.js');
var Promise = require('bluebird');
var QueryBuilderBase = require('../../').QueryBuilderBase;

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('Model find queries', function () {

    describe('.query()', function () {

      before(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1',
          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'hejsan 1',
            model2Prop2: 30
          }, {
            idCol: 2,
            model2Prop1: 'hejsan 2',
            model2Prop2: 20
          }, {
            idCol: 3,
            model2Prop1: 'hejsan 3',
            model2Prop2: 10
          }]
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should return all rows when no knex methods are chained', function () {
        return Model1
          .query()
          .then(function (models) {
            expect(models[0]).to.be.a(Model1);
            expect(models[1]).to.be.a(Model1);
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            expect(_.map(models, 'id').sort()).to.eql([1, 2]);
            return Model2.query();
          })
          .then(function (models) {
            expect(models[0]).to.be.a(Model2);
            expect(models[1]).to.be.a(Model2);
            expect(models[2]).to.be.a(Model2);
            expect(_.map(models, 'model2Prop1').sort()).to.eql(['hejsan 1', 'hejsan 2', 'hejsan 3']);
            expect(_.map(models, 'model2Prop2').sort()).to.eql([10, 20, 30]);
            expect(_.map(models, 'idCol').sort()).to.eql([1, 2, 3]);
          });
      });

      it('should return the given range and total count when range() is called', function () {
        return Model2
          .query()
          .range(1, 2)
          .orderBy('model_2_prop_2', 'desc')
          .then(function (result) {
            expect(result.results[0]).to.be.a(Model2);
            expect(result.results[1]).to.be.a(Model2);
            expect(result.total === 3).to.equal(true);
            expect(_.map(result.results, 'model2Prop2')).to.eql([20, 10]);
          });
      });

      it('should return the given page and total count when page() is called', function () {
        return Model2
          .query()
          .page(1, 2)
          .orderBy('model_2_prop_2', 'desc')
          .then(function (result) {
            expect(result.results[0]).to.be.a(Model2);
            expect(result.total === 3).to.equal(true);
            expect(_.map(result.results, 'model2Prop2')).to.eql([10]);
          });
      });

      describe('knex methods', function () {

        it('.select()', function () {
          return Model2
            .query()
            .select('model_2.id_col', 'model_2_prop_2')
            .then(function (models) {
              expect(models[0]).to.be.a(Model2);
              // Test that only the selected columns (and stuff set by the $afterGet hook)  were returned.
              expect(_.uniq(_.flattenDeep(_.map(models, _.keys))).sort()).to.eql(['$afterGetCalled', 'idCol', 'model2Prop2']);
              expect(_.map(models, 'idCol').sort()).to.eql([1, 2, 3]);
              expect(_.map(models, 'model2Prop2').sort()).to.eql([10, 20, 30]);
              expect(_.map(models, '$afterGetCalled').sort()).to.eql([1, 1, 1]);
            });
        });

        it('.where()', function () {
          return Model2
            .query()
            .where('model_2_prop_2', '>', 15)
            .then(function (models) {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20, 30]);
            });
        });

        it('.orderBy()', function () {
          return Model2
            .query()
            .where('model_2_prop_2', '>', 15)
            .orderBy('model_2_prop_2')
            .then(function (models) {
              expect(_.map(models, 'model2Prop2')).to.eql([20, 30]);
            });
        });

        it('.pluck()', function () {
          return Model2
            .query()
            .where('model_2_prop_2', '>', 15)
            .orderBy('model_2_prop_2')
            .pluck('model2Prop2')
            .then(function (values) {
              expect(values).to.eql([20, 30]);
            });
        });

        it('.join()', function () {
          return Model2
            .query()
            .select('model_2.*', 'Model1.model1Prop1')
            .where('model_2_prop_2', '>', 15)
            .join('Model1', 'model_2.model_1_id', 'Model1.id')
            .then(function (models) {
              expect(_.map(models, 'model2Prop1').sort()).to.eql(['hejsan 1', 'hejsan 2']);
              expect(_.map(models, 'model1Prop1')).to.eql(['hello 1', 'hello 1']);
            });
        });

        it('complex nested subquery', function () {
          return Model2
            .query()
            .from(function (builder) {
              this
                .from('model_2')
                .select('*', function (builder) {
                  var raw;

                  if (utils.isMySql(session.knex)) {
                    raw = Model2.raw('concat(model_2_prop_1, model_2_prop_2)');
                  } else {
                    raw = Model2.raw('model_2_prop_1 || model_2_prop_2');
                  }

                  builder.select(raw).as('concatProp');
                }).as('t')
            })
            .where('t.concatProp', 'hejsan 310')
            .then(function (models) {
              expect(models).to.have.length(1);
              expect(models[0]).to.eql({
                idCol: 3,
                model1Id: 1,
                model2Prop1: 'hejsan 3',
                model2Prop2: 10,
                concatProp: 'hejsan 310',
                $afterGetCalled: 1
              });
            });
        });

        it('subquery builder in select', function () {
          return Model1
            .query()
            .select('Model1.*', Model2
              .query()
              .sum('model_2_prop_2')
              .whereRef('Model1.id', 'model_2.model_1_id')
              .as('sum'))
            .orderBy('id')
            .then(function (models) {
              expect(_.map(models, 'id')).to.eql([1, 2]);
              expect(_.map(models, 'sum')).to.eql([60, null]);
            });
        });

        it('.modify()', function () {
          var builder = Model2.query();

          return builder
            .modify(function (modifyBuilder, arg1, arg2, arg3) {
              expect(modifyBuilder).to.equal(builder);
              expect(arg1).to.equal('foo');
              expect(arg2).to.equal(undefined);
              expect(arg3).to.equal(10);
              builder.where('model_2_prop_1', '>=', 'hejsan 2')
            }, 'foo', undefined, 10)
            .then(function (models) {
              expect(_.map(models, 'model2Prop1').sort()).to.eql(['hejsan 2', 'hejsan 3'])
            });
        });

      });

    });

    describe('joinRelation()', function () {

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

            model2Relation1: [{
              id: 5,
              model1Prop1: 'hello 5'
            }]
          }, {
            idCol: 2,
            model2Prop1: 'hejsan 2',

            model2Relation1: [{
              id: 6,
              model1Prop1: 'hello 6'
            }, {
              id: 7,
              model1Prop1: 'hello 7',

              model1Relation1: {
                id: 8,
                model1Prop1: 'hello 8'
              },

              model1Relation2: [{
                idCol: 3,
                model2Prop1: 'hejsan 3'
              }]
            }]
          }]
        }]);
      });

      it('should join a belongs to one relation', function () {
        return Model1
          .query()
          .select('Model1.*', 'model1Relation1.model1Prop1 as rel_model1Prop1')
          .joinRelation('model1Relation1')
          .orderBy('Model1.id')
          .then(function (models) {
            expect(_.map(models, 'id')).to.eql([1, 2, 3, 7]);
            expect(_.map(models, 'rel_model1Prop1')).to.eql(['hello 2', 'hello 3', 'hello 4', 'hello 8']);
          });
      });

      it('should join a has many relation (1)', function () {
        return Model1
          .query()
          .joinRelation('model1Relation2')
          .then(function (models) {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 4, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 4, 3]);
          });
      });

      it('should join a has many relation (2)', function () {
        return Model1
          .query()
          .joinRelation('model1Relation2')
          .where('model1Relation2.id_col', '<', 4)
          .then(function (models) {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should join a many to many relation (1)', function () {
        return Model2
          .query()
          .joinRelation('model2Relation1')
          .then(function (models) {
            models = _.sortBy(models, ['idCol', 'id']);
            expect(_.map(models, 'idCol')).to.eql([1, 2, 2]);
            expect(_.map(models, 'id')).to.eql([5, 6, 7]);
          });
      });

      it('should join a many to many relation (2)', function () {
        return Model2
          .query()
          .joinRelation('model2Relation1')
          .whereBetween('model2Relation1.id', [5, 6])
          .then(function (models) {
            models = _.sortBy(models, ['idCol', 'id']);
            expect(_.map(models, 'idCol')).to.eql([1, 2]);
            expect(_.map(models, 'id')).to.eql([5, 6]);
          });
      });

      it('should disable alias with option alias = false', function () {
        return Model1
          .query()
          .joinRelation('model1Relation2', {alias: false})
          .where('model_2.id_col', '<', 4)
          .then(function (models) {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should use relation name as alias with option alias = true', function () {
        return Model1
          .query()
          .joinRelation('model1Relation2', {alias: true})
          .where('model1Relation2.id_col', '<', 4)
          .then(function (models) {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should use custom alias with option alias = string', function () {
        return Model1
          .query()
          .joinRelation('model1Relation2', {alias: 'fooBarBaz'})
          .where('fooBarBaz.id_col', '<', 4)
          .then(function (models) {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

    });

    describe('.$query()', function () {

      before(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1',
          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'hejsan 1',
            model2Prop2: 30
          }, {
            idCol: 2,
            model2Prop1: 'hejsan 2',
            model2Prop2: 20
          }, {
            idCol: 3,
            model2Prop1: 'hejsan 3',
            model2Prop2: 10
          }]
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should find the model itself', function () {
        return Model1
          .query()
          .then(function (models) {
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            models[0].model1Prop1 = 'blaa';
            return models[0].$query();
          })
          .then(function (model) {
            expect(model).to.be.a(Model1);
            expect(model.model1Prop1).to.equal('hello 1');
          });
      });

    });

    describe('.$relatedQuery()', function () {

      describe('belongs to one relation', function () {
        var parent1;
        var parent2;

        before(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation1: {
              id: 2,
              model1Prop1: 'hello 2'
            }
          }, {
            id: 3,
            model1Prop1: 'hello 3',
            model1Relation1: {
              id: 4,
              model1Prop1: 'hello 4'
            }
          }]);
        });

        beforeEach(function () {
          return Model1
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 3});
            });
        });

        it('should return all related rows when no knex methods are chained', function () {
          return parent1
            .$relatedQuery('model1Relation1')
            .then(function (related) {
              expect(related.length).to.equal(1);
              expect(related[0]).to.be.a(Model1);
              expect(parent1.model1Relation1).to.eql(related[0]);
              expect(related[0]).to.eql({
                id: 2,
                model1Id: null,
                model1Prop1: 'hello 2',
                model1Prop2: null,
                $afterGetCalled: 1
              });
            });
        });

        // This doesn't belong here, but there is no better place at the moment.
        it('should join the related rows', function () {
          return Model1
            .getRelation('model1Relation1')
            .join(Model1.query())
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 2', 'hello 4']);
            });
        });

        describe('knex methods', function () {

          it('.select()', function () {
            return parent1
              .$relatedQuery('model1Relation1')
              .select('id')
              .then(function (related) {
                expect(related.length).to.equal(1);
                expect(related[0]).to.be.a(Model1);
                expect(_.uniq(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['$afterGetCalled', 'id']);
              });
          });

          it('.pluck()', function () {
            return parent1
              .$relatedQuery('model1Relation1')
              .pluck('id')
              .then(function (values) {
                expect(values).to.eql([2]);
              });
          });

          it('.first()', function () {
            return parent1
              .$relatedQuery('model1Relation1')
              .pluck('id')
              .first()
              .then(function (value) {
                expect(value).to.eql(2);
              });
          });

          it('.join()', function () {
            return parent1
              .$relatedQuery('model1Relation1')
              .select('Model1.*', 'Parent.model1Prop1 as parentProp1')
              .join('Model1 as Parent', 'Parent.model1Id', 'Model1.id')
              .first()
              .then(function (related) {
                expect(related).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  parentProp1: 'hello 1',
                  $afterGetCalled: 1
                });
              });
          });

        });

      });

      describe('has many relation', function () {
        var parent1;
        var parent2;

        before(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',
              model2Prop2: 6
            }, {
              idCol: 2,
              model2Prop1: 'text 2',
              model2Prop2: 5
            }, {
              idCol: 3,
              model2Prop1: 'text 3',
              model2Prop2: 4
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 4,
              model2Prop1: 'text 4',
              model2Prop2: 3
            }, {
              idCol: 5,
              model2Prop1: 'text 5',
              model2Prop2: 2
            }, {
              idCol: 6,
              model2Prop1: 'text 6',
              model2Prop2: 1
            }]
          }]);
        });

        beforeEach(function () {
          return Model1
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 2});
            });
        });

        it('should return all related rows when no knex methods are chained', function () {
          return Promise.all([
            parent1
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent1.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'model2Prop1').sort()).to.eql(['text 1', 'text 2', 'text 3']);
                expect(related[0]).to.eql({
                  idCol: 1,
                  model1Id: parent1.id,
                  model2Prop1: 'text 1',
                  model2Prop2: 6,
                  $afterGetCalled: 1
                });
              }),
            parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent2.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'model2Prop1').sort()).to.eql(['text 4', 'text 5', 'text 6']);
                expect(related[0]).to.eql({
                  idCol: 4,
                  model1Id: parent2.id,
                  model2Prop1: 'text 4',
                  model2Prop2: 3,
                  $afterGetCalled: 1
                });
              })
          ]);
        });

        // This doesn't belong here, but there is no better place at the moment.
        it('should join the related rows', function () {
          return Model1
            .getRelation('model1Relation2')
            .join(Model1.query())
            .then(function (models) {
              expect(models).to.have.length(6);
              expect(_.map(models, 'model_2_prop_1').sort()).to.eql(['text 1', 'text 2', 'text 3', 'text 4', 'text 5', 'text 6']);
            });
        });

        describe('knex methods', function () {

          it('.select()', function () {
            return parent1
              .$relatedQuery('model1Relation2')
              .select('id_col')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'idCol').sort()).to.eql([1, 2, 3]);
                expect(_.uniq(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['$afterGetCalled', 'idCol']);
              });
          });

          it('.where()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .where('model_2_prop_2', '=', '2')
              .then(function (related) {
                expect(_.map(related, 'model2Prop2')).to.eql([2]);
              });
          });

          it('.orWhere()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .where(function () {
                this.where('model_2_prop_2', '=', '1').orWhere('model_2_prop_2', '=', '3');
              })
              .orderBy('model_2_prop_2')
              .then(function (related) {
                expect(_.map(related, 'model2Prop2')).to.eql([1, 3]);
              });
          });

          it('.pluck()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .pluck('idCol')
              .then(function (values) {
                expect(values).to.eql([4, 5, 6]);
              });
          });

          it('.first()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .pluck('idCol')
              .first()
              .then(function (value) {
                expect(value).to.eql(4);
              });
          });

          it('.join()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .select('model_2.*', 'Parent.model1Prop1 as parentProp1')
              .join('Model1 as Parent', 'model_2.model_1_id', 'Parent.id')
              .orderBy('model_2.id_col', 'desc')
              .then(function (related) {
                expect(related).to.have.length(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[0]).to.eql({
                  idCol: 6,
                  model1Id: parent2.id,
                  model2Prop1: 'text 6',
                  model2Prop2: 1,
                  parentProp1: parent2.model1Prop1,
                  $afterGetCalled: 1
                });
              });
          });

        });

      });

      describe('many to many relation', function () {
        var parent1;
        var parent2;

        before(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',
              model2Relation1: [{
                id: 3,
                model1Prop1: 'blaa 1',
                model1Prop2: 6
              }, {
                id: 4,
                model1Prop1: 'blaa 2',
                model1Prop2: 5
              }, {
                id: 5,
                model1Prop1: 'blaa 3',
                model1Prop2: 4
              }]
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',
              model2Relation1: [{
                id: 6,
                model1Prop1: 'blaa 4',
                model1Prop2: 3,
                extra3: 'extra 4'
              }, {
                id: 7,
                model1Prop1: 'blaa 5',
                model1Prop2: 2
              }, {
                id: 8,
                model1Prop1: 'blaa 6',
                model1Prop2: 1,
                extra3: 'extra 6'
              }]
            }]
          }]);
        });

        beforeEach(function () {
          return Model2
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {idCol: 1});
              parent2 = _.find(parents, {idCol: 2});
            });
        });

        it('should return all related rows when no knex methods are chained', function () {
          return Promise.all([
            parent1
              .$relatedQuery('model2Relation1')
              .orderBy('id')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent1.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'model1Prop1').sort()).to.eql(['blaa 1', 'blaa 2', 'blaa 3']);
                expect(_.map(related, 'extra3').sort()).to.eql([null, null, null]);
                expect(related[0]).to.eql({
                  id: 3,
                  model1Id: null,
                  model1Prop1: 'blaa 1',
                  model1Prop2: 6,
                  extra3: null,
                  $afterGetCalled: 1
                });
              }),
            parent2
              .$relatedQuery('model2Relation1')
              .orderBy('id')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent2.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'model1Prop1').sort()).to.eql(['blaa 4', 'blaa 5', 'blaa 6']);
                expect(_.map(related, 'extra3').sort()).to.eql(['extra 4', 'extra 6', null]);
                expect(related[0]).to.eql({
                  id: 6,
                  model1Id: null,
                  model1Prop1: 'blaa 4',
                  model1Prop2: 3,
                  extra3: 'extra 4',
                  $afterGetCalled: 1
                });
              })
          ]);
        });

        it('should work in both directions', function () {
          return Model1
            .query()
            .where({id: 6})
            .first()
            .then(function (model) {
              return model.$relatedQuery('model1Relation3');
            })
            .then(function (models) {
              expect(models).to.have.length(1);
              expect(models[0]).to.be.a(Model2);
              expect(models[0].idCol).to.equal(2);
            });
        });

        it('should be able to filter using extra columns', function () {
          return parent2
            .$relatedQuery('model2Relation1')
            .where('extra3', 'extra 6')
            .then(function (related) {
              expect(related).to.eql([{
                id: 8,
                model1Id: null,
                model1Prop1: 'blaa 6',
                model1Prop2: 1,
                extra3: 'extra 6',
                $afterGetCalled: 1
              }]);
            })
        });

        // This doesn't belong here, but there is no better place at the moment.
        it('should join the related rows', function () {
          return Model2
            .getRelation('model2Relation1')
            .join(Model2.query())
            .then(function (models) {
              expect(models).to.have.length(6);
              expect(_.map(models, 'model1Prop1').sort()).to.eql(['blaa 1', 'blaa 2', 'blaa 3', 'blaa 4', 'blaa 5', 'blaa 6']);
            });
        });

        describe('knex methods', function () {

          it('.select()', function () {
            return parent1
              .$relatedQuery('model2Relation1')
              .select('Model1.id')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'id').sort()).to.eql([3, 4, 5]);
                expect(_.uniq(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['$afterGetCalled', 'id']);
              });
          });

          it('.where()', function () {
            return parent2
              .$relatedQuery('model2Relation1')
              .where('model1Prop2', '=', '2')
              .then(function (related) {
                expect(_.map(related, 'model1Prop2')).to.eql([2]);
              });
          });

          it('.orWhere()', function () {
            return parent2
              .$relatedQuery('model2Relation1')
              .where(function () {
                this.where('model1Prop2', '1').orWhere('model1Prop2', '3');
              })
              .orderBy('model1Prop2')
              .then(function (related) {
                expect(_.map(related, 'model1Prop2')).to.eql([1, 3]);
              });
          });

          it('.pluck()', function () {
            return parent2
              .$relatedQuery('model2Relation1')
              .orderBy('Model1.id', 'desc')
              .pluck('id')
              .then(function (values) {
                expect(values).to.eql([8, 7, 6]);
              });
          });

          it('.first()', function () {
            return parent1
              .$relatedQuery('model2Relation1')
              .orderBy('Model1.id')
              .pluck('id')
              .first()
              .then(function (value) {
                expect(value).to.eql(3);
              });
          });

        });

      });

    });

  });

};
