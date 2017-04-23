var _ = require('lodash');
var Knex = require('knex');
var Model = require('../../../').Model;
var expect = require('expect.js');
var Promise = require('bluebird');

module.exports = function (session) {

  describe('mysql', function () {
    var db2Knex;
    var T1;
    var T2;

    before(function () {
      // Create another database.
      return session.knex.raw('CREATE DATABASE IF NOT EXISTS objection_test_2').then(function () {
        var config = _.cloneDeep(session.opt.knexConfig);

        config.connection.database = 'objection_test_2';
        db2Knex = Knex(config);

        // Create tables t1 and t2 to the new database.
        return db2Knex.schema.dropTableIfExists('t2').then(function () {
          return db2Knex.schema.dropTableIfExists('t1');
        }).then(function () {
          return db2Knex.schema.createTable('t1', function (table) {
            table.integer('id').primary();
            table.integer('foo');
          });
        }).then(function () {
          return db2Knex.schema.createTable('t2', function (table) {
            table.integer('id').primary();
            table.integer('t1_id').references('t1.id');
            table.integer('bar');
          });
        });
      });
    });

    after(function () {
      return db2Knex.schema.dropTableIfExists('t2').then(function () {
        return db2Knex.schema.dropTableIfExists('t1');
      }).then(function () {
        return db2Knex.destroy();
      }).then(function () {
        return session.knex.raw('DROP DATABASE IF EXISTS objection_test_2');
      });
    });

    beforeEach(function () {
      // Create model T1 that points to the t1 table in the other database.
      T1 = function T1() {

      };

      // Create model T2 that points to the t2 table in the other database.
      T2 = function T2() {

      };

      T1.tableName = 'objection_test_2.t1';
      T2.tableName = 'objection_test_2.t2';

      Model.extend(T1);
      Model.extend(T2);

      T1.relationMappings = {
        manyT2: {
          relation: Model.HasManyRelation,
          modelClass: T2,
          join: {
            from: 'objection_test_2.t1.id',
            to: 'objection_test_2.t2.t1_id'
          }
        }
      };

      T2.relationMappings = {
        oneT1: {
          relation: Model.BelongsToOneRelation,
          modelClass: T1,
          join: {
            from: 'objection_test_2.t1.id',
            to: 'objection_test_2.t2.t1_id'
          }
        }
      };

      // Bind to the database the is connected to the objection_test database instead of
      // objection_test_2 database.
      T1 = T1.bindKnex(session.knex);
      T2 = T2.bindKnex(session.knex);
    });

    beforeEach(function () {
      return db2Knex('t2').delete().then(function () {
        return db2Knex('t1').delete();
      });
    });

    it('should be able to insert to another database', function () {
      return T1
        .query()
        .insert({id: 1, foo: 1})
        .then(function () {
          return db2Knex('t1');
        })
        .then(function (rows) {
          expect(rows).to.eql([{id: 1, foo: 1}]);
        });
    });

    it('should be able to insert a graph to another database', function () {
      return T1
        .query()
        .insertGraph({
          id: 1,
          foo: 1,
          manyT2: [{
            id: 1,
            bar: 2
          }]
        })
        .then(function () {
          return Promise.all([
            db2Knex('t1'),
            db2Knex('t2')
          ]);
        })
        .then(function (res) {
          expect(res).to.eql([
            [{id: 1, foo: 1}],
            [{id: 1, bar: 2, t1_id: 1}]
          ]);
        })
    });

    it('select should work with a normal query', function () {
      return T1
        .query()
        .insert({id: 1, foo: 1})
        .then(function () {
          return T1.query().select('objection_test_2.t1.*');
        })
        .then(function (models) {
          expect(models).to.eql([{id: 1, foo: 1}]);
        })
        .then(function () {
          return T1.query().select('objection_test_2.t1.id');
        })
        .then(function (models) {
          expect(models).to.eql([{id: 1}]);
        });
    });

    it('select should work with an eager query', function () {
      return T1
        .query()
        .insertGraph({
          id: 1,
          foo: 1,
          manyT2: [{
            id: 1,
            bar: 2
          }]
        })
        .then(function () {
          return T1.query().eager('manyT2').select('objection_test_2.t1.*');
        })
        .then(function (models) {
          expect(models).to.eql([{
            id: 1,
            foo: 1,
            manyT2: [{
              id: 1,
              t1_id: 1,
              bar: 2
            }]
          }]);
        })
        .then(function () {
          return T1.query().eager('manyT2').select('objection_test_2.t1.foo').modifyEager('manyT2', function (builder) {
            builder.select('bar');
          });
        })
        .then(function (models) {
          expect(models).to.eql([{
            foo: 1,
            manyT2: [{
              bar: 2
            }]
          }]);
        });
    });

  });

};