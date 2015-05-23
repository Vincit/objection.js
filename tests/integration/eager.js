var _ = require('lodash');
var expect = require('expect.js');
var modelTestUtils = require('./utils');

describe('MoronModel eager queries', function () {
  var session = {};
  var Model1 = null;
  var Model2 = null;

  before(function () {
    return modelTestUtils.initialize().then(function ($session) {
      session = $session;
      Model1 = session.models.Model1;
      Model2 = session.models.Model2;
    });
  });

  beforeEach(function () {
    return modelTestUtils.populate(session, [{
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
        id: 1,
        model2Prop1: 'hejsan 1'
      }, {
        id: 2,
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
            id: 3,
            model2Prop1: 'hejsan 3'
          }]
        }]
      }]
    }]);
  });

  after(function () {
    return modelTestUtils.destroy(session);
  });

  it('a', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('model1Relation1')
      .then(function (models) {
        expect(models).to.have.length(1);
        expect(models[0]).to.be.a(Model1);

        expect(models[0].model1Relation1).to.be.a(Model1);
        expect(models[0].model1Relation1.id).to.equal(2);
        expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');
        expect(models[0].model1Relation1.model1Relation1).to.equal(undefined);

        expect(models[0].model1Relation2).to.equal(undefined);
      });
  });

  it('a.a', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('model1Relation1.model1Relation1')
      .then(function (models) {
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
  });

  it('a.^', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('model1Relation1.^')
      .then(function (models) {
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
  });

  it('[a, b]', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('[model1Relation1, model1Relation2]')
      .then(function (models) {
        expect(models).to.have.length(1);
        expect(models[0]).to.be.a(Model1);

        expect(models[0].model1Relation1).to.be.a(Model1);
        expect(models[0].model1Relation1.id).to.equal(2);
        expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

        expect(models[0].model1Relation2).to.have.length(2);
        expect(models[0].model1Relation2[0]).to.be.a(Model2);
        expect(models[0].model1Relation2[1]).to.be.a(Model2);
        expect(models[0].model1Relation2[0].id).to.equal(1);
        expect(models[0].model1Relation2[1].id).to.equal(2);
        expect(models[0].model1Relation2[0].model2Prop1).to.equal('hejsan 1');
        expect(models[0].model1Relation2[1].model2Prop1).to.equal('hejsan 2');

        expect(models[0].model1Relation2[0].model2Relation1).to.equal(undefined);
        expect(models[0].model1Relation2[1].model2Relation1).to.equal(undefined);
      });
  });

  it('[a, b.c]', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('[model1Relation1, model1Relation2.model2Relation1]')
      .then(function (models) {
        expect(models).to.have.length(1);
        expect(models[0]).to.be.a(Model1);

        expect(models[0].model1Relation1).to.be.a(Model1);
        expect(models[0].model1Relation1.id).to.equal(2);
        expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

        expect(models[0].model1Relation2).to.have.length(2);
        expect(models[0].model1Relation2[0]).to.be.a(Model2);
        expect(models[0].model1Relation2[1]).to.be.a(Model2);
        expect(models[0].model1Relation2[0].id).to.equal(1);
        expect(models[0].model1Relation2[1].id).to.equal(2);
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
  });

  it('[a, b.c.[a, b]]', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]')
      .then(function (models) {
        expect(models).to.have.length(1);
        expect(models[0]).to.be.a(Model1);

        expect(models[0].model1Relation1).to.be.a(Model1);
        expect(models[0].model1Relation1.id).to.equal(2);
        expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

        expect(models[0].model1Relation2).to.have.length(2);
        expect(models[0].model1Relation2[0]).to.be.a(Model2);
        expect(models[0].model1Relation2[1]).to.be.a(Model2);
        expect(models[0].model1Relation2[0].id).to.equal(1);
        expect(models[0].model1Relation2[1].id).to.equal(2);
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
        expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation2[0].id).to.eql(3);

      });
  });

  it('*', function () {
    return Model1
      .query()
      .where('id', 1)
      .eager('*')
      .then(function (models) {
        expect(models).to.have.length(1);
        expect(models[0]).to.be.a(Model1);

        expect(models[0].model1Relation1).to.be.a(Model1);
        expect(models[0].model1Relation1.id).to.equal(2);
        expect(models[0].model1Relation1.model1Prop1).to.equal('hello 2');

        expect(models[0].model1Relation2).to.have.length(2);
        expect(models[0].model1Relation2[0]).to.be.a(Model2);
        expect(models[0].model1Relation2[1]).to.be.a(Model2);
        expect(models[0].model1Relation2[0].id).to.equal(1);
        expect(models[0].model1Relation2[1].id).to.equal(2);
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
        expect(models[0].model1Relation2[1].model2Relation1[1].model1Relation2[0].id).to.eql(3);
      });
  });

  it('c.*', function () {
    return Model2
      .query()
      .where('id', 2)
      .eager('model2Relation1.*')
      .then(function (models) {
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
        expect(models[0].model2Relation1[1].model1Relation2[0].id).to.eql(3);
      });
  });

});
