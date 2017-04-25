'use strict';

const expect = require('expect.js');
const KnexQueryBuilder = require('knex/lib/query/builder');
const KnexRaw = require('knex/lib/raw');
const Knex = require('knex');

const modelFactory = require('../../../lib/model/modelFactory');
const ReferenceBuilder = require('../../../lib/queryBuilder/ReferenceBuilder').ReferenceBuilder;
const QueryBuilderBase = require('../../../').QueryBuilderBase;
const Model = require('../../../').Model;
const ref = require('../../../').ref;

describe('modelFactory', () => {

  class Person extends Model {
    static get tableName() {
      return 'Person';
    }

    static get relationMappings() {
      return {
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
    }
  }

  class Animal extends Model {
    static get tableName() {
      return 'Animal';
    }
  }

  describe('fromJson', () => {
    let fromJson = modelFactory.fromJson;
    let knex = Knex({client: 'pg'});

    it('should split json into models and query props (deep)', () => {
      let json = {
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

      let result = fromJson({
        modelClass: Person,
        json: json,
        deep: true
      });

      let model = result.model;
      let queryProps = result.queryProps;

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

  describe('toDatabaseJson', () => {
    let fromJson = modelFactory.fromJson;
    let toDatabaseJson = modelFactory.toDatabaseJson;
    let knex = Knex({client: 'pg'});

    it('should merge a model and query props and produce a database json object', () => {
      let json = {
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

      let res = fromJson({
        modelClass: Person,
        json: json,
        deep: true
      });

      let result = toDatabaseJson({
        model: res.model.parent,
        queryProps: res.queryProps
      });

      expect(result.name).to.equal('Person 2');
      expect(result.test2).to.be.a(KnexRaw);
    });

  });

});