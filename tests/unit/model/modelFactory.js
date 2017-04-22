var expect = require('expect.js');
var KnexQueryBuilder = require('knex/lib/query/builder');
var KnexRaw = require('knex/lib/raw');
var Knex = require('knex');

var modelFactory = require('../../../lib/model/modelFactory');
var ReferenceBuilder = require('../../../lib/queryBuilder/ReferenceBuilder').ReferenceBuilder;
var QueryBuilderBase = require('../../../').QueryBuilderBase;
var Model = require('../../../').Model;
var ref = require('../../../').ref;

describe('modelFactory', function () {

  function Person() {}
  Model.extend(Person);
  Person.tableName = 'Person';

  function Animal() {}
  Model.extend(Animal);
  Animal.tableName = 'Animal';

  Person.relationMappings = {
    parent: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Person.parentId',
        to: 'Person.id'
      }
    },

    pets: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    }
  };

  describe('fromJson', function () {
    var fromJson = modelFactory.fromJson;
    var knex = Knex({client: 'pg'});

    it('should split json into models and query props (deep)', function () {
      var json = {
        name: 'Person 1',
        test1: new QueryBuilderBase(knex),

        parent: {
          name: 'Person 2',
          test2: knex.raw(''),

          pets: [{
            name: 'Fluffy'
          }, {
            name: 'Puudel',
            test3: knex('test'),
            test4: ref('testRef')
          }]
        }
      };

      var result = fromJson({
        modelClass: Person,
        json: json,
        deep: true
      });

      var model = result.model;
      var queryProps = result.queryProps;

      expect(model).to.eql({
        name: 'Person 1',
        parent: {
          name: 'Person 2',
          pets: [
            { name: 'Fluffy' },
            { name: 'Puudel' }
          ]
        }
      });

      expect(queryProps.get(model).test1 instanceof QueryBuilderBase).to.equal(true);
      expect(queryProps.get(model.parent).test2 instanceof KnexRaw).to.equal(true);
      expect(queryProps.get(model.parent.pets[1]).test3 instanceof KnexQueryBuilder).to.equal(true);
      expect(queryProps.get(model.parent.pets[1]).test4 instanceof ReferenceBuilder).to.equal(true);
    });
  });

  describe('toDatabaseJson', function () {
    var fromJson = modelFactory.fromJson;
    var toDatabaseJson = modelFactory.toDatabaseJson;
    var knex = Knex({client: 'pg'});

    it('should merge a model and query props and produce a database json object', function () {
      var json = {
        name: 'Person 1',
        test1: new QueryBuilderBase(knex),

        parent: {
          name: 'Person 2',
          test2: knex.raw(''),

          pets: [{
            name: 'Fluffy'
          }, {
            name: 'Puudel',
            test3: knex('test'),
            test4: ref('testRef')
          }]
        }
      };

      var res = fromJson({
        modelClass: Person,
        json: json,
        deep: true
      });

      var result = toDatabaseJson({
        model: res.model.parent,
        queryProps: res.queryProps
      });

      expect(result.name).to.equal('Person 2');
      expect(result.test2).to.be.a(KnexRaw);
    });

  });

});