var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var MoronModel = require('../../src/MoronModel');

function expectIdsEqual(resultArray, expectedIds) {
  expectArraysEqual(_(resultArray).pluck('id').sort().value(), expectedIds);
}

function expectArraysEqual(arr1, arr2) {
  expect({arr : arr1}).to.eql({arr: arr2});
}

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
        id: 1,
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

      complexJsonObj.jsonObject.jsonArray = _.cloneDeep(complexJsonObj.jsonArray);

      return Promise
        .all([
          BoundModel.query().insert(complexJsonObj),
          BoundModel.query().insert({ id:2, name: "empty object and array", jsonObject: {}, jsonArray: [] }),
          BoundModel.query().insert({ id:3, name: "null object and array"}),
          BoundModel.query().insert({ id:4, name: "empty object and [1,2]",   jsonObject: {}, jsonArray: [1,2] }),
          BoundModel.query().insert({ id:5, name: "empty object and array [ null ]",   jsonObject: {}, jsonArray: [ null ] }),
          BoundModel.query().insert({ id:6, name: "{a: 1} and empty array", jsonObject: {a: 1}, jsonArray: [] }),
          BoundModel.query().insert({
            id: 7,
            name: "{a: {1:1, 2:2}, b:{2:2, 1:1}} for equality comparisons",
            jsonObject: {a: {1:1, 2:2}, b:{2:2, 1:1}}, jsonArray: []
          })
        ]);
    });

    it('should have test data', function () {
      return BoundModel.query().then(function (all) {
        expect(_.find(all, {name : 'complex line'}).jsonObject.stringField).to.be(complexJsonObj.jsonObject.stringField);
      });
    });

    describe('.whereJsonObject(fieldExpr, operator, <array|object|string>)', function () {
      it('should fail if right hand is null', function () {
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonArray", null);
        }).to.throwException();
      });

      it('should fail if right hand is number', function () {
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonArray", 1);
        }).to.throwException();
      });

      it('should fail if right hand is not valid json', function () {
        var selfreference = {};
        selfreference.me = selfreference;
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonObject", selfreference);
        }).to.throwException();
      });

      it('should fail if right hand is not parseable expression', function () {
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonObject", "jsonArray.");
        }).to.throwException();
      });

      it('should fail if left hand is not parseable expression', function () {
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonObject.", "jsonArray");
        }).to.throwException();
      });
    });

    describe('.whereJsonEquals(fieldExpr, <array|object|string>)', function () {
      it('should find results for jsonArray == []', function () {
        return BoundModel.query().whereJsonEquals("jsonArray", [])
          .then(function (results) {
            expectIdsEqual(results, [2,6,7]);
          });
      });

      it('should find results for jsonObject == {}', function () {
        return BoundModel.query().whereJsonEquals("jsonObject", {})
          .then(function (results) {
            expectIdsEqual(results, [2,4,5]);
          });
      });

      it('should not find results for jsonArray == {}', function () {
        return BoundModel.query().whereJsonEquals("jsonArray", {})
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should not find results for jsonObject == []', function () {
        return BoundModel.query().whereJsonEquals("jsonObject", [])
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find result for jsonObject == {a: 1}', function () {
        return BoundModel.query().whereJsonEquals("jsonObject", {a:1})
          .then(function (results) {
            expectIdsEqual(results, [6]);
          });
      });

      it('should find result for jsonObject.a == jsonObject[b]', function () {
        return BoundModel.query().whereJsonEquals("jsonObject.a", "jsonObject[b]")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find result where keys are in different order jsonObject.a == {2:2, 1:1}', function () {
        return BoundModel.query().whereJsonEquals("jsonObject.a", {2:2, 1:1})
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should not find result with wrong type as value jsonObject == {a: "1"}', function () {
        return BoundModel.query().whereJsonEquals("jsonObject", {a: "1"})
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find results jsonArray[0].arrayField[0] == { noMoreLevels: true }', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray[0].arrayField[0]", { noMoreLevels: true })
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonArray[0].arrayField[0] == { noMoreLevels: false }', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray[0].arrayField[0]", { noMoreLevels: false })
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find result with jsonArray == [ null ]', function () {
        return BoundModel.query().whereJsonEquals("jsonArray", [ null ])
          .then(function (results) {
            expectIdsEqual(results, [5]);
          });
      });

      it('should find results with jsonArray == complexJsonObj.jsonArray', function () {
        return BoundModel.query().whereJsonEquals("jsonArray", complexJsonObj.jsonArray)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should find results with jsonObject,jsonArray == complexJsonObj.jsonArray', function () {
        return BoundModel.query().whereJsonEquals("jsonObject.jsonArray", complexJsonObj.jsonArray)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonArray == [2,1]', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray", [2,1])
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find results jsonArray == [1,2]', function () {
        return BoundModel.query().whereJsonEquals("jsonArray", [1,2])
          .then(function (results) {
            expectIdsEqual(results, [4]);
          });
      });
    });

    describe.only('.whereJsonSupersetOf(fieldExpr, <array|object|string>)', function () {
      it('should find all empty arrays with jsonArray @> []', function () {
        return BoundModel.query().whereJsonSupersetOf("jsonArray", [])
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find results jsonArray @> [1,2] (set is its own superset)', function () {
        return BoundModel.query().whereJsonSupersetOf("jsonArray", [1,2])
          .then(function (results) {
            expectIdsEqual(results, [4]);
          });
      });

      it('should not find results jsonArray @> {}', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonArray", {})
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should not find results jsonObject @> []', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject", [])
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it.skip('should find subset where both sides are references', function () {
        // TODO: try to resolve how to do this with postgre
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject.a", "jsonObject.b")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results jsonObject @> {}', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject", {})
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find results jsonObject.objectField @> complexJsonObj.jsonObject.objectField', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject.objectField", complexJsonObj.jsonObject.objectField )
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonObject.objectField @> complexJsonObj.jsonObject.objectField that has additional key', function () {
        complexJsonObj.jsonObject.objectField.otherKey = "Im here too!";
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject.objectField", complexJsonObj.jsonObject.objectField )
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should not find results jsonObject.objectField @> { object: "other string" }', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject.objectField", {
            object: "something else"
          })
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });
    });

  });
};

