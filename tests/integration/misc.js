'use strict';

var _ = require('lodash');
var utils = require('../../lib/utils/dbUtils');
var Model = require('../../').Model;
var expect = require('expect.js');
var inheritModel = require('../../lib/model/inheritModel');

module.exports = function (session) {

  describe('generated id', function () {
    var TestModel;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('generated_id_test')
        .createTable('generated_id_test', function (table) {
          table.string('idCol').primary();
          table.string('value');
        });
    });

    after(function () {
      return session.knex.schema.dropTableIfExists('generated_id_test');
    });

    before(function () {
      TestModel = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(TestModel);

      TestModel.tableName = 'generated_id_test';
      TestModel.idColumn = 'idCol';
      TestModel.knex(session.knex);

      TestModel.prototype.$beforeInsert = function () {
        this.idCol = 'someRandomId';
      };
    });

    it('should return the generated id when inserted', function () {
      return TestModel.query().insert({value: 'hello'}).then(function (ret) {
        expect(ret.idCol).to.equal('someRandomId');
        return session.knex(TestModel.tableName);
      }).then(function (rows) {
        expect(rows[0]).to.eql({value: 'hello', idCol: 'someRandomId'});
      });
    });

  });

  if (session.isMySql()) {
    describe('mysql binary columns', function () {
      var TestModel;

      before(function () {
        return session.knex.schema
          .dropTableIfExists('mysql_binary_test')
          .createTable('mysql_binary_test', function (table) {
            table.increments('id').primary();
            table.binary('binary', 4);
          });
      });

      after(function () {
        return session.knex.schema.dropTableIfExists('mysql_binary_test');
      });

      before(function () {
        TestModel = function TestModel() {
          Model.apply(this, arguments);
        };

        Model.extend(TestModel);

        TestModel.tableName = 'mysql_binary_test';
        TestModel.knex(session.knex);
      });

      function buffer() {
        return new Buffer([192, 168, 163, 17]);
      }

      function bufferEquals(a, b) {
        if (!Buffer.isBuffer(a)) return false;
        if (!Buffer.isBuffer(b)) return false;
        if (typeof a.equals === 'function') return a.equals(b);
        if (a.length !== b.length) return false;

        for (var i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }

        return true;
      }

      it('#insert should insert a buffer', function () {
        return TestModel.query().insert({binary: buffer()}).then(function (ret) {
          expect(bufferEquals(buffer(), ret.binary)).to.equal(true);
          return session.knex(TestModel.tableName);
        }).then(function (rows) {
          expect(bufferEquals(buffer(), rows[0].binary)).to.equal(true);
        });
      });

    });
  }

  describe('model with `length` property', function () {
    var TestModel;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('model_with_length_test')
        .createTable('model_with_length_test', function (table) {
          table.increments('id');
          table.integer('length');
        });
    });

    after(function () {
      return session.knex.schema.dropTableIfExists('model_with_length_test');
    });

    before(function () {
      TestModel = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(TestModel);

      TestModel.tableName = 'model_with_length_test';
      TestModel.knex(session.knex);
    });

    it('should insert', function () {
      return TestModel.query().insert({length: 10}).then(function (model) {
        expect(model).to.eql({id: 1, length: 10});
        return session.knex(TestModel.tableName);
      }).then(function (rows) {
        expect(rows.length).to.equal(1);
        expect(rows[0]).to.eql({id: 1, length: 10});
      });
    });
  });

  describe('aggregate methods with relations', function () {

    beforeEach(function () {
      return session.populate([{
        model1Prop1: 'a',
        model1Relation2: [
          {model_2_prop_1: 'one'},
          {model_2_prop_1: 'two'},
          {model_2_prop_1: 'three'}
        ]
      }, {
        model1Prop1: 'b',
        model1Relation2: [
          {model_2_prop_1: 'four'},
          {model_2_prop_1: 'five'}
        ]
      }]);
    });

    it('count of HasManyRelation', function () {
      return session.models.Model1
        .query()
        .select('Model1.*')
        .count('model1Relation2.id_col as relCount')
        .joinRelation('model1Relation2')
        .groupBy('Model1.id')
        .orderBy('Model1.model1Prop1')
        .then(function (models) {
          expect(models[0].relCount).to.equal(3);
          expect(models[1].relCount).to.equal(2);
        });
    });
  });

};
