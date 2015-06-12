var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('MoronModel eager queries', function () {

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
              model1Prop1: 'hello 4'
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
            model1Prop1: 'hello 5'
          }, {
            id: 6,
            model1Prop1: 'hello 6',

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

      expect(models[0].model1Relation2).to.equal(undefined);
    });

    test('[model1Relation1, model1Relation2]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.equal(undefined);
      expect(models[0].model1Relation2[1].model2Relation1).to.equal(undefined);
    });

    test('[model1Relation1, model1Relation2.model2Relation1]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.have.length(0);
      expect(models[0].model1Relation2[1].model2Relation1).to.have.length(2);
      expect(models[0].model1Relation2[1].model2Relation1[0]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[1]).to.be.a(Model1);
      expect(models[0].model1Relation2[1].model2Relation1[0].id).to.equal(5);
      expect(models[0].model1Relation2[1].model2Relation1[1].id).to.equal(6);
      expect(models[0].model1Relation2[1].model2Relation1[0].model1Prop1).to.equal('hello 5');
      expect(models[0].model1Relation2[1].model2Relation1[1].model1Prop1).to.equal('hello 6');
    });

    test('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.have.length(0);
      expect(models[0].model1Relation2[1].model2Relation1).to.have.length(2);
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

    test('*', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model1);

      expect(models[0].model1Relation1).to.be.a(Model1);
      expect(models[0].model1Relation1.id).to.equal(2);
      expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

      expect(models[0].model1Relation2).to.have.length(2);
      expect(models[0].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model1Relation2[1]).to.be.a(Model2);
      expect(models[0].model1Relation2[0].idCol).to.equal(1);
      expect(models[0].model1Relation2[1].idCol).to.equal(2);
      expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
      expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

      expect(models[0].model1Relation2[0].model2Relation1).to.have.length(0);
      expect(models[0].model1Relation2[1].model2Relation1).to.have.length(2);
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

    test('model2Relation1.*', function (models) {
      expect(models).to.have.length(1);
      expect(models[0]).to.be.a(Model2);

      expect(models[0].model2Relation1).to.have.length(2);
      expect(models[0].model2Relation1[0]).to.be.a(Model1);
      expect(models[0].model2Relation1[1]).to.be.a(Model1);
      expect(models[0].model2Relation1[0].id).to.equal(5);
      expect(models[0].model2Relation1[1].id).to.equal(6);
      expect(models[0].model2Relation1[0].model1Prop1).to.equal('hello 5');
      expect(models[0].model2Relation1[1].model1Prop1).to.equal('hello 6');

      expect(models[0].model2Relation1[0].model1Relation1).to.equal(null);
      expect(models[0].model2Relation1[0].model1Relation2).to.eql([]);

      expect(models[0].model2Relation1[1].model1Relation1).to.be.a(Model1);
      expect(models[0].model2Relation1[1].model1Relation2[0]).to.be.a(Model2);
      expect(models[0].model2Relation1[1].model1Relation1.id).to.equal(7);
      expect(models[0].model2Relation1[1].model1Relation2[0].idCol).to.eql(3);
    }, {Model: Model2, id: 2});
  });

  // Tests all ways to fetch eagerly.
  function test(expr, tester, opt) {
    opt = opt || {
      Model: Model1,
      id: 1
    };

    var idCol = opt.Model.idColumn;

    it(expr + ' (MoronQueryBuilder.eager)', function () {
      return opt.Model.query().where(idCol, opt.id).eager(expr).then(tester);
    });

    it(expr + ' (MoronModel.loadRelated)', function () {
      return opt.Model.query().where(idCol, opt.id).then(function (models) {
        return opt.Model.loadRelated(models, expr);
      }).then(tester);
    });

    it(expr + ' (MoronModel.$loadRelated)', function () {
      return opt.Model.query().where(idCol, opt.id).then(function (models) {
        return models[0].$loadRelated(expr);
      }).then(function (result) {
        tester([result]);
      });
    });
  }

};
