var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var MoronModel = require('../../src/MoronModel');

module.exports = function (session) {

  function ModelJson() {
    MoronModel.apply(this, arguments);
  }
  MoronModel.extend(ModelJson);

  ModelJson.tableName = 'ModelJson';

  ModelJson.jsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      jsonObject: { type: 'object' },
      jsonArray: { type: 'array' }
    }
  };

  before(function () {
    return session.knex.schema
      .dropTableIfExists('ModelJson')
      .createTable('ModelJson', function (table) {
        table.bigincrements('id').primary();
        table.string('name');
        table.json('jsonObject', true);
        table.json('jsonArray', true);
      });
  });

  var BoundModel = ModelJson.bindKnex(session.knex);

  describe('MoronQueryBuilder JSON queries', function () {
    var complexJsonObj;

    before(function () {
      complexJsonObj = {
        name: 'complex line',
        jsonObject: {
          stringField: "string in jsonObject.stringField",
          numberField: 1.5,
          nullField: null,
          booleanField: false,
          arrayField: [
            { noMoreLevels: true },
            1,
            true,
            null,
            "string in jsonObject.arrayField[4]"
          ],
          objectField: {
            object: "string in jsonObject.objectField.object"
          }
        },
        jsonArray: [
          {
            stringField: "string in jsonArray[0].stringField",
            numberField: 5.5,
            nullField: null,
            booleanField: true,
            arrayField: [
              { noMoreLevels: true }
            ],
            objectField: {
              object: "I'm string in jsonArray[0].objectField.object"
            }
          },
          null,
          1,
          "string in jsonArray[3]",
          false,
          [
            { noMoreLevels: true },
            null,
            1,
            "string in jsonArray[5][3]",
            true
          ]
        ]
      };

      return Promise
        .all([
          BoundModel.query().insert(complexJsonObj),
          BoundModel.query().insert({ name: "empty object and array", jsonObject: {}, jsonArray: [] }),
          BoundModel.query().insert({ name: "null object and array",  jsonObject: {}, jsonArray: [] }),
          BoundModel.query().insert({ name: "empty object and [1]",   jsonObject: {}, jsonArray: [1] }),
          BoundModel.query().insert({ name: "empty object and array [ null ]",   jsonObject: {}, jsonArray: [ null ] }),
          BoundModel.query().insert({ name: "{a: 1} and empty array", jsonObject: {a: 1}, jsonArray: [] })
        ]);
    });

    it('should have test data', function () {
      return BoundModel.query().then(function (all) {
        expect(_.find(all, {name : 'complex line'}).jsonObject.stringField).to.be(complexJsonObj.jsonObject.stringField);
      });
    });

    describe('.whereJsonEquals(fieldExpr, <array|object>)', function () {
      it('should fail if input not array or object', function () {
      });

      it('should find results for jsonArray == []', function () {
      });

      it('should find results for jsonObject == {}', function () {
      });

      it('should not find results for jsonArray == {}', function () {
      });

      it('should not find results for jsonObject == []', function () {
      });

      it('should find result for jsonObject == {a: 1}', function () {
      });

      it('should not find result with wrong type as value jsonObject == {a: "1"}', function () {
      });

      it('should find results jsonArray[0].arrayfield[0] == { noMoreLevels: true }', function () {
      });

      it('should not find results jsonArray[0].arrayfield[0] == { noMoreLevels: false }', function () {
      });

      it('should find result with jsonArray == [ null ]', function () {
      });

      it('should find results with jsonArray == complexJsonObj.jsonArray', function () {
      });

      it('should find results with jsonObject == complexJsonObj.jsonArray', function () {
      });
    });

  });

};
