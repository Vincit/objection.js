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

  // schema probably needed for automatic recognition if data is JSON?
  ModelJson.jsonSchema = {
    type: 'object',
    properties: {
      id: {type: 'integer'},
      jsonObject: { type: 'object' },
      jsonArray: { type: 'array' }
    }
  };

  before(function () {
    return session.knex.schema
      .dropTableIfExists('ModelJson')
      .createTable('ModelJson', function (table) {
        table.bigincrements('id').primary();
        table.json('jsonObject', true);
        table.json('jsonArray', true);
      });
  });

  var BoundModel = ModelJson.bindKnex(session.knex);

  describe('MoronQueryBuilder JSON queries', function () {
    var complexJsonObj;

    before(function () {
      complexJsonObj = {
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

      return BoundModel.query().insert(complexJsonObj);
    });

    it('should have test data', function () {
      return BoundModel.query().then(function (all) {
        expect(all[0].jsonObject.stringField).to.be(complexJsonObj.jsonObject.stringField);
      });
    });

  });

};
