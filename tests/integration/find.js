var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('MoronModel find queries', function () {

    describe('.query()', function () {

      beforeEach(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1',
          model1Relation2: [{
            id: 1,
            model2Prop1: 'hejsan 1',
            model2Prop2: 30
          }, {
            id: 2,
            model2Prop1: 'hejsan 2',
            model2Prop2: 20
          }, {
            id: 3,
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
            expect(_.pluck(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            return Model2.query();
          })
          .then(function (models) {
            expect(_.pluck(models, 'model2Prop1').sort()).to.eql(['hejsan 1', 'hejsan 2', 'hejsan 3']);
          });
      });

      describe('knex methods', function () {

        it('.select()', function () {
          return Model2
            .query()
            .select('model_2.id', 'model2Prop2')
            .then(function (models) {
              expect(models[0]).to.be.a(Model2);
              expect(_.unique(_.flattenDeep(_.map(models, _.keys))).sort()).to.eql(['id', 'model2Prop2']);
            });
        });

        it('.where()', function () {
          return Model2
            .query()
            .where('model_2_prop_2', '>', 15)
            .then(function (models) {
              expect(models[0]).to.be.a(Model2);
              expect(_.pluck(models, 'model2Prop2').sort()).to.eql([20, 30]);
            });
        });

        it('.orderBy()', function () {
          return Model2
            .query()
            .where('model_2_prop_2', '>', 15)
            .orderBy('model_2_prop_2')
            .then(function (models) {
              expect(models[0]).to.be.a(Model2);
              expect(_.pluck(models, 'model2Prop2')).to.eql([20, 30]);
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
              expect(models[0]).to.be.a(Model2);
              expect(_.pluck(models, 'model2Prop1').sort()).to.eql(['hejsan 1', 'hejsan 2']);
              expect(_.pluck(models, 'model1Prop1')).to.eql(['hello 1', 'hello 1']);
            });
        });

      });

    });

    describe('.$query()', function () {

      it('should find the model itself', function () {
        return Model1
          .query()
          .then(function (models) {
            expect(_.pluck(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            models[0].model1Prop1 = 'blaa';
            return models[0].$query();
          })
          .then(function (models) {
            expect(models).to.have.length(1);
            expect(models[0]).to.be.a(Model1);
            expect(models[0].model1Prop1).to.equal('hello 1');
          });
      });

    });

    describe('.relatedQuery()', function () {

      describe('has one relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
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
              expect(parent1.model1Relation1).to.eql(related[0]);
              expect(related[0]).to.be.a(Model1);
              expect(related[0]).to.eql({
                id: 2,
                model1Id: null,
                model1Prop1: 'hello 2',
                model1Prop2: null
              });
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
                expect(_.unique(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['id']);
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
                  parentProp1: 'hello 1'
                });
              });
          });

        });

      });

      describe('has may relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              id: 1,
              model2Prop1: 'text 1',
              model2Prop2: 6
            }, {
              id: 2,
              model2Prop1: 'text 2',
              model2Prop2: 5
            }, {
              id: 3,
              model2Prop1: 'text 3',
              model2Prop2: 4
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              id: 4,
              model2Prop1: 'text 4',
              model2Prop2: 3
            }, {
              id: 5,
              model2Prop1: 'text 5',
              model2Prop2: 2
            }, {
              id: 6,
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
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent1.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(related[0]).to.eql({
                  id: 1,
                  model1Id: parent1.id,
                  model2Prop1: 'text 1',
                  model2Prop2: 6
                });
              }),
            parent2
              .$relatedQuery('model1Relation2')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent2.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(related[0]).to.eql({
                  id: 4,
                  model1Id: parent2.id,
                  model2Prop1: 'text 4',
                  model2Prop2: 3
                });
              })
          ]);
        });

        describe('knex methods', function () {

          it('.select()', function () {
            return parent1
              .$relatedQuery('model1Relation2')
              .select('id')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.pluck(related, 'id').sort()).to.eql([1, 2, 3]);
                expect(_.unique(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['id']);
              });
          });

          it('.where()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .where('model_2_prop_2', '=', '2')
              .then(function (related) {
                expect(_.pluck(related, 'model2Prop2')).to.eql([2]);
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
                expect(_.pluck(related, 'model2Prop2')).to.eql([1, 3]);
              });
          });

          it('.pluck()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id')
              .pluck('id')
              .then(function (values) {
                expect(values).to.eql([4, 5, 6]);
              });
          });

          it('.first()', function () {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id')
              .pluck('id')
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
              .orderBy('model_2.id', 'desc')
              .then(function (related) {
                expect(related).to.have.length(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[0]).to.eql({
                  id: 6,
                  model1Id: parent2.id,
                  model2Prop1: 'text 6',
                  model2Prop2: 1,
                  parentProp1: parent2.model1Prop1
                });
              });
          });

        });

      });

      describe('many to many relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              id: 1,
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
              id: 2,
              model2Prop1: 'text 2',
              model2Relation1: [{
                id: 6,
                model1Prop1: 'blaa 4',
                model1Prop2: 3
              }, {
                id: 7,
                model1Prop1: 'blaa 5',
                model1Prop2: 2
              }, {
                id: 8,
                model1Prop1: 'blaa 6',
                model1Prop2: 1
              }]
            }]
          }]);
        });

        beforeEach(function () {
          return Model2
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 2});
            });
        });

        it('should return all related rows when no knex methods are chained', function () {
          return Promise.all([
            parent1
              .$relatedQuery('model2Relation1')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent1.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(related[0]).to.eql({
                  id: 3,
                  model1Id: null,
                  model1Prop1: 'blaa 1',
                  model1Prop2: 6
                });
              }),
            parent2
              .$relatedQuery('model2Relation1')
              .then(function (related) {
                expect(related.length).to.equal(3);
                expect(parent2.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(related[0]).to.eql({
                  id: 6,
                  model1Id: null,
                  model1Prop1: 'blaa 4',
                  model1Prop2: 3
                });
              })
          ]);
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
                expect(_.pluck(related, 'id').sort()).to.eql([3, 4, 5]);
                expect(_.unique(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql(['id']);
              });
          });

          it('.where()', function () {
            return parent2
              .$relatedQuery('model2Relation1')
              .where('model1Prop2', '=', '2')
              .then(function (related) {
                expect(_.pluck(related, 'model1Prop2')).to.eql([2]);
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
                expect(_.pluck(related, 'model1Prop2')).to.eql([1, 3]);
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

          it('.join()', function () {
            return Promise.all([
              parent1
                .$relatedQuery('model2Relation1')
                .select('Model1.*', 'model_2.model_2_prop_1 as parentProp1')
                .join('model_2', 'Model1Model2.model2Id', 'model_2.id')
                .orderBy('Model1.id', 'asc')
                .then(function (related) {
                  expect(related).to.have.length(3);
                  expect(related[0]).to.be.a(Model1);
                  expect(related[0]).to.eql({
                    id: 3,
                    model1Id: null,
                    model1Prop1: 'blaa 1',
                    model1Prop2: 6,
                    parentProp1: parent1.model2Prop1
                  });
                  expect(related[1]).to.eql({
                    id: 4,
                    model1Id: null,
                    model1Prop1: 'blaa 2',
                    model1Prop2: 5,
                    parentProp1: parent1.model2Prop1
                  });
                  expect(related[2]).to.eql({
                    id: 5,
                    model1Id: null,
                    model1Prop1: 'blaa 3',
                    model1Prop2: 4,
                    parentProp1: parent1.model2Prop1
                  });
                }),
              parent2
                .$relatedQuery('model2Relation1')
                .select('Model1.*', 'model_2.model_2_prop_1 as parentProp1')
                .join('model_2', 'Model1Model2.model2Id', 'model_2.id')
                .orderBy('Model1.id', 'asc')
                .then(function (related) {
                  expect(related).to.have.length(3);
                  expect(related[0]).to.be.a(Model1);
                  expect(related[0]).to.eql({
                    id: 6,
                    model1Id: null,
                    model1Prop1: 'blaa 4',
                    model1Prop2: 3,
                    parentProp1: parent2.model2Prop1
                  });
                  expect(related[1]).to.eql({
                    id: 7,
                    model1Id: null,
                    model1Prop1: 'blaa 5',
                    model1Prop2: 2,
                    parentProp1: parent2.model2Prop1
                  });
                  expect(related[2]).to.eql({
                    id: 8,
                    model1Id: null,
                    model1Prop1: 'blaa 6',
                    model1Prop2: 1,
                    parentProp1: parent2.model2Prop1
                  });
                })
            ]);
          });

        });

      });

    });

  });

};
