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
            extra3: 'extra 5'
          }, {
            id: 6,
            model1Prop1: 'hello 6',
            extra3: 'extra 6',

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
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');
      expect(models[0].model1Relation1.model1Relation1).to.equal(undefined);

      expect(models[0].model1Relation2).to.equal(undefined);
    });

    test('model1Relation1.model1Relation1', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation1.model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1.id).to.equal(3);
      expect(models[0].model1Relation1.model1Relation1.model1Prop1).to.equal('hello 3');

      expect(models[0].model1Relation2).to.equal(undefined);
    });

    test('model1Relation1.model1Relation1Inverse', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation1.model1Relation1Inverse).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1Inverse.id).to.equal(1);
      expect(models[0].model1Relation1.model1Relation1Inverse.model1Prop1).to.equal('hello 1');

      expect(models[0].model1Relation2).to.equal(undefined);
    });

    test('model1Relation1.^', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation1.model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1.id).to.equal(3);
      expect(models[0].model1Relation1.model1Relation1.model1Prop1).to.equal('hello 3');

      expect(models[0].model1Relation1.model1Relation1.model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1.model1Relation1.id).to.equal(4);
      expect(models[0].model1Relation1.model1Relation1.model1Relation1.model1Prop1).to.equal('hello 4');

      expect(models[0].model1Relation1.model1Relation1.model1Relation1.model1Relation2).to.equal(undefined);

      expect(models[0].model1Relation2).to.equal(undefined);
    });

    test('model1Relation1(selectId).^', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1).to.not.have.property('model1Prop1');
      expect(models[0].model1Relation1).to.not.have.property('model1Prop2');

      expect(models[0].model1Relation1.model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1.id).to.equal(3);
      expect(models[0].model1Relation1.model1Relation1).to.not.have.property('model1Prop1');
      expect(models[0].model1Relation1.model1Relation1).to.not.have.property('model1Prop2');

      expect(models[0].model1Relation1.model1Relation1.model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.model1Relation1.model1Relation1.id).to.equal(4);
      expect(models[0].model1Relation1.model1Relation1.model1Relation1).to.not.have.property('model1Prop1');
      expect(models[0].model1Relation1.model1Relation1.model1Relation1).to.not.have.property('model1Prop2');

      expect(models[0].model1Relation1.model1Relation1.model1Relation1.model1Relation2).to.equal(undefined);

      expect(models[0].model1Relation2).to.equal(undefined);
    }, {
      filters: {
        selectId: function (builder) {
          builder.select('id', 'model1Id');
        }
      }
    });

    test('[model1Relation1, model1Relation2]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      _.sortBy(models[0].model1Relation2, 'idCol');

      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.equal(undefined);
      expect(models[0].model1Relation2[1].model2Relation1).to.equal(undefined);
    });

    test('[model1Relation1, model1Relation2(orderByDesc, selectProps)]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');
      expect(models[0].model1Relation1).to.have.property('model1Prop2');

      expect(models[0].model1Relation2).to.have.length(2);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(2);
      expect(models[0].model1Relation2[1].idCol).to.equal(1);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 2');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[0]).to.not.have.property('model2Prop2');
      expect(models[0].model1Relation2[1]).to.not.have.property('model2Prop2');

      expect(models[0].model1Relation2[0].model2Relation1).to.equal(undefined);
      expect(models[0].model1Relation2[1].model2Relation1).to.equal(undefined);
    }, {
      filters: {
        selectProps: function (builder) {
          builder.select('id_col', 'model_1_id', 'model_2_prop_1');
        },
        orderByDesc: function (builder) {
          builder.orderBy('model_2_prop_1', 'desc');
        }
      }
    });

    test('[model1Relation1, model1Relation2.model2Relation1]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      _.sortBy(models[0].model1Relation2, 'idCol');

      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.have.length(0);
      expect(models[0].model1Relation2[1].model2Relation1).to.have.length(2);
      _.sortBy(models[0].model1Relation2[1].model2Relation1, 'id');

      expect(models[0].model1Relation2[1].model2Relation1[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[1]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[0].id).to.equal(5);
      expect(models[0].model1Relation2[1].model2Relation1[1].id).to.equal(6);
      expect(models[0].model1Relation2[1].model2Relation1[0].model1Prop1).to.equal('hello 5');
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Prop1).to.equal('hello 6');
      expect(models[0].model1Relation2[1].model2Relation1[0].extra3).to.equal('extra 5');
      expect(models[0].model1Relation2[1].model2Relation1[1].extra3).to.equal('extra 6');
    });

    test('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      _.sortBy(models[0].model1Relation2, 'idCol');

      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.have.length(0);
      expect(models[0].model1Relation2[1].model2Relation1).to.have.length(2);
      _.sortBy(models[0].model1Relation2[1].model2Relation1, 'id');

      expect(models[0].model1Relation2[1].model2Relation1[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[1]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[0].id).to.equal(5);
      expect(models[0].model1Relation2[1].model2Relation1[1].id).to.equal(6);
      expect(models[0].model1Relation2[1].model2Relation1[0].model1Prop1).to.equal('hello 5');
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Prop1).to.equal('hello 6');

      expect(models[0].model1Relation2[1].model2Relation1[0].model1Relation1).to.equal(null);
      expect(models[0].model1Relation2[1].model2Relation1[0].model1Relation2).to.eql([]);

      expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation1.id).to.equal(7);
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation2[0].idCol).to.eql(3);
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

    describe('QueryBuilder.filterEager', function () {

      it('should filter the eager query using relation expressions as paths', function () {
        return Model1
          .query()
          .where('id', 1)
          .filterEager('model1Relation2.model2Relation1', function (builder) {
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

    });

    describe('QueryBuilder.pick', function () {

      it('pick(properties) should pick properties recursively', function () {
        return Model1
          .query()
          .where('id', 1)
          .eager('model1Relation2.model2Relation1.[model1Relation1, model1Relation2]')
          .first()
          .pick(['id', 'idCol', 'model1Relation1', 'model1Relation2', 'model2Relation1'])
          .then(function (model) {
            _.sortBy(model.model1Relation2, 'idCol');
            _.sortBy(model.model1Relation2[1].model2Relation1, 'id');

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
          .then(function (model) {
            _.sortBy(model.model1Relation2, 'idCol');
            _.sortBy(model.model1Relation2[1].model2Relation1, 'id');

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
          .then(function (model) {
            _.sortBy(model.model1Relation2, 'idCol');
            _.sortBy(model.model1Relation2[1].model2Relation1, 'id');

            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  extra3: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  extra3: 'extra 6',
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
          .then(function (model) {
            _.sortBy(model.model1Relation2, 'idCol');
            _.sortBy(model.model1Relation2[1].model2Relation1, 'id');

            expect(model.toJSON()).to.eql({
              id: 1,
              model1Relation2: [{
                idCol: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model2Relation1: [{
                  id: 5,
                  extra3: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: []
                }, {
                  id: 6,
                  extra3: 'extra 6',
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

    var idCol = opt.Model.idColumn;

    it(expr + ' (QueryBuilder.eager)', function () {
      return opt.Model.query().where(idCol, opt.id).eager(expr, opt.filters).then(tester);
    });

    it(expr + ' (Model.loadRelated)', function () {
      return opt.Model.query().where(idCol, opt.id).then(function (models) {
        return opt.Model.loadRelated(models, expr, opt.filters);
      }).then(tester);
    });

    it(expr + ' (Model.$loadRelated)', function () {
      return opt.Model.query().where(idCol, opt.id).then(function (models) {
        return models[0].$loadRelated(expr, opt.filters);
      }).then(function (result) {
        tester([result]);
      });
    });
  }

};
