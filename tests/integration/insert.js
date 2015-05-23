var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var modelTestUtils = require('./utils');

describe('MoronModel insert queries', function () {
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

  after(function () {
    return modelTestUtils.destroy(session);
  });

  describe('.query()', function () {

    beforeEach(function () {
      return modelTestUtils.populate(session, [{
        id: 1,
        model1Prop1: 'hello 1'
      }, {
        id: 2,
        model1Prop1: 'hello 2'
      }]);
    });

    it('should insert new model', function () {
      var model = Model1.fromJson({model1Prop1: 'hello 3'});
      return Model1.query().insert(model).then(function (inserted) {
        expect(inserted).to.be.a(Model1);
        expect(inserted.id).to.eql(3);
        expect(inserted.model1Prop1).to.equal('hello 3');
        return session.knex(Model1.tableName);
      }).then(function (rows) {
        expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
      });
    });

    it('should accept an array', function () {
      var models = [Model1.fromJson({model1Prop1: 'hello 3'}), Model1.fromJson({model1Prop1: 'hello 4'})];
      return Model1.query().insert(models).then(function (inserted) {
        expect(inserted[0]).to.be.a(Model1);
        expect(inserted[1]).to.be.a(Model1);
        expect(_.pluck(inserted, 'id').sort()).to.eql([3, 4]);
        expect(_.pluck(inserted, 'model1Prop1').sort()).to.eql(['hello 3', 'hello 4']);
        return session.knex(Model1.tableName);
      }).then(function (rows) {
        expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3', 'hello 4']);
        expect(_.pluck(rows, 'id').sort()).to.eql([1, 2, 3, 4]);
      });
    });

    it('should accept json', function () {

    });

    it('should accept a json array', function () {

    });

    it('should validate', function () {

    });

  });

  describe('.relatedQuery()', function () {

    describe('has one relation', function () {
      var parent1;
      var parent2;

      beforeEach(function () {
        return modelTestUtils.populate(session, [{
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

      describe('knex methods', function () {

      });

    });

    describe('has may relation', function () {
      var parent1;
      var parent2;

      beforeEach(function () {
        return modelTestUtils.populate(session, [{
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

      describe('knex methods', function () {

      });

    });

    describe('many to many relation', function () {
      var parent1;
      var parent2;

      beforeEach(function () {
        return modelTestUtils.populate(session, [{
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

      describe('knex methods', function () {

      });

    });

  });

  function subClassWithSchema(Model, schema) {
    function SubModel() {
      Model.apply(this, arguments);
    }
    Model.makeSubclass(SubModel);
    SubModel.jsonSchema = schema;
    return SubModel;
  }

});
