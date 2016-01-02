'use strict';

var _ = require('lodash');
var utils = require('../../lib/utils');
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

};