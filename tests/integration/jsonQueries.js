'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var Model = require('../../').Model;
var ref = require('../../').ref;

function expectIdsEqual(resultArray, expectedIds) {
  expectArraysEqual(_(resultArray).map('id').sort().value(), expectedIds);
}

function expectArraysEqual(arr1, arr2) {
  expect({arr : arr1}).to.eql({arr: arr2});
}

module.exports = function (session) {

  function ModelJson() {

  }
  Model.extend(ModelJson);

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

  var BoundModel = ModelJson.bindKnex(session.knex);

  before(function () {
    return session.knex.schema
      .dropTableIfExists('ModelJson')
      .createTable('ModelJson', function (table) {
        table.bigincrements('id').primary();
        table.string('name');
        table.jsonb('jsonObject');
        table.jsonb('jsonArray');
      });
  });

  describe('QueryBuilder using ref() in normal query builder methods', function () {
    describe('Querying rows', function () {
      before(function () {
        return BoundModel
          .query()
          .delete()
          .then(function () {
            return BoundModel.query().insert([
              {name: "test1", jsonObject: {}, jsonArray: [ 1 ]},
              {name: "test2", jsonObject: { attr: 2 }, jsonArray: [ 2 ]},
              {name: "test3", jsonObject: { attr: 3 }, jsonArray: [ 3 ]},
              {name: "test4", jsonObject: { attr: 4 }, jsonArray: [ 4 ]},
            ]);
        });
      });

      it('should be able to extract json attr in select(ref)', function () {
        return BoundModel.query()
          .select(ref('jsonArray:[0]').as('foo'))
          .orderBy('foo')
          .then(function (result) {
            expect(result).to.have.length(4);
            expect(_.first(result)).eql({ foo: 1 });
          });
      });

      it('should be able to extract json attr in select(array)', function () {
        return BoundModel.query()
          .select([
            ref('jsonObject:attr').castBigInt().as('bar'),
            ref('jsonArray:[0]').as('foo')
          ])
          .orderBy('foo')
          .then(function (result) {
            expect(result).to.have.length(4);
            expect(_.first(result)).eql({ foo: 1, bar: null });
          });
      });

      it('should be able to use ref inside select of select subquery', function () {
        return BoundModel.query()
          .select([
            function (builder) {
              builder.select([
                ref('name').as('barName')
              ])
              .from('ModelJson')
              .orderBy('name')
              .limit(1).as('foo');
            },
            ref('jsonArray:[0]').as('firstArrayItem')
          ])
          .orderBy('firstArrayItem', 'desc')
          .then(function (result) {
            expect(result).to.have.length(4);
            // foo is always name of the first row of the table (quite a nonsense query)
            expect(_.first(result)).eql({ foo: 'test1', firstArrayItem: 4 });
          });
      });

      it('should be able to use ref with where', function () {
        return BoundModel.query()
          .where(
            ref('jsonArray:[0]').castBigInt(),
            ref('jsonObject:attr').castBigInt()
          )
          .then(function (result) {
            expect(result).to.have.length(3);
          });
      });

      it('should be able to use ref with where subquery', function () {
        return BoundModel.query()
          .where(function (builder) {
            builder.where(
              ref('jsonArray:[0]').castBigInt(),
              ref('jsonObject:attr').castBigInt()
            );
          })
          .then(function (result) {
            expect(result).to.have.length(3);
          });
      });

      it('should be able to use ref with join', function () {
        // select * from foo join bar on ref() = ref()
        return BoundModel.query()
          .join(
            'ModelJson as t2',
            ref('ModelJson.jsonArray:[0]'), '=', ref('t2.jsonObject:attr')
          )
          .select('t2.*')
          .then(function (result) {
            expect(result).to.have.length(3);
          });
      });

      it('should be able to use ref with double nested join builder', function () {
        return BoundModel.query()
          .join('ModelJson as t2', function (builder) {
            builder
              .on(ref('ModelJson.jsonArray:[0]'), '=', ref('t2.jsonObject:attr'))
              .on(function (nestedBuilder) {
                nestedBuilder
                  .on(
                    ref('ModelJson.id').castInt(), '=',
                    ref('t2.jsonArray:[0]').castInt()
                  )
                  .orOn(
                    ref('ModelJson.id').castInt(), '=',
                    ref('t2.jsonObject:attr').castInt()
                  );
              });
          })
          .select('t2.*')
          .then(function (result) {
            expect(result).to.have.length(3);
          });
      });

      it('should be able to use ref with orderBy', function () {
        return BoundModel.query().orderBy(ref('jsonObject:attr'), 'desc')
          .then(function (result) {
            expect(result).to.have.length(4);
            // null is first
            expect(_.first(result).name).to.equal('test1');
          });
      });

      it('should be able to use ref with groupBy and having (last argument of having is ref)', function () {
        return BoundModel.query()
          .select(['id', ref('jsonObject:attr').as('foo')])
          .groupBy([ref('jsonObject:attr'), 'id'])
          .having('id', '>=', ref('jsonObject:attr').castInt())
          .orderBy('foo')
          .then(function (result) {
            expect(result).to.have.length(3);
            expect(_.first(result)).to.eql({ id: 2, foo: 2 });
          });
      });

      it.skip('should be able to use ref with groupBy and having (also first arg is ref)', function () {
        return BoundModel.query()
          .select(['id', ref('jsonObject:attr').as('foo')])
          .groupBy([ref('jsonObject:attr'), 'id'])
          // knex doesn't support knex raw as first arg here so this test fails....
          .having(ref('id').castInt(), '>=', ref('jsonObject:attr').castInt())
          .orderBy('foo')
          .then(function (result) {
            expect(result).to.have.length(3);
            expect(_.first(result)).to.eql({ id: 2, foo: 2 });
          });
      });

      it('should be able to use ref with groupBy and nested having', function () {
        return BoundModel.query()
          .select(['id', ref('jsonObject:attr').as('foo')])
          .groupBy([ref('jsonObject:attr'), 'id'])
          .having('id', '>=', ref('jsonObject:attr').castInt())
          .having(function (builder) {
            builder
              .having('id', '=', ref('id'))
              .having(function (nestedBuilder) {
                nestedBuilder.having('id', '=', ref('id'));
              });
          })
          .orderBy('foo')
          .then(function (result) {
            expect(result).to.have.length(3);
            expect(_.first(result)).to.eql({ id: 2, foo: 2 });
          });
      });
    });

    describe.skip('.insert()', function () {
      it('should insert nicely', function () {
        // this query actually isnt valid, but I couldn't figure any query where one would actually use ref as value
        // so just testing that refs are converted to raw correctly
        var query = BoundModel.query()
          .insert({
            name: ref('jsonArray:[0]').castText(),
            jsonObject: ref('name').castJson(),
            jsonArray: [ 1 ]
          });
        // I have no idea how to check built result.. toSql() didn't seem to help in this case
      });
    });

    describe('.update() and .patch()', function () {
      beforeEach(function () {
        return BoundModel
          .query()
          .truncate()
          .then(function () {
            return BoundModel.query().insert([
              {name: "test1", jsonObject: {}, jsonArray: [ 1 ]},
              {name: "test2", jsonObject: { attr: 2 }, jsonArray: [ 2 ]},
              {name: "test3", jsonObject: { attr: 3 }, jsonArray: [ 3 ]},
              {name: "test4", jsonObject: { attr: 4 }, jsonArray: [ 4 ]},
            ]);
          });
      });

      it('should be able to use knex.raw to jsonb column in update', function () {
        return BoundModel.query()
          .update({
            jsonArray: BoundModel.knex().raw('to_jsonb(??)', ['name'])
          }).then(function (result) {
            expect(result).to.be(4);
          });
      });

      it('should be able to update internal field of json column and allow ref() syntax', function () {
        // should do something like:
        // update "ModelJson" set
        //   "jsonArray" = jsonb_set('[]', '{0}', to_jsonb("name"), true),
        //   "jsonObject" = jsonb_set("jsonObject", '{attr}', to_jsonb("name"), true),
        //   "name" = "jsonArray"#>>'{0}' where "id" = 1 returning *;
        return BoundModel.query()
          .update({
            name: ref('jsonArray:[0]').castText(),
            'jsonObject:attr': ref('name'),
            // each attribute which is updated with ref must be updated separately
            // e.g. SET "jsonArray" = '[ ref(...), ref(...) ]' just isn't valid SQL
            // (though it could be kind of parsed to multiple jsonb_set calls which would be insanely cool)
            jsonArray: ref('name').castJson()
          })
          .where('id', 1)
          .returning('*')
          .then(function (result) {
            expect(result).to.eql([{
              id: 1,
              name: '1',
              jsonObject: { attr: 'test1' },
              jsonArray: 'test1' }
            ]);
          });
      });

      it('should be able to patch internal field of json column and allow ref() syntax', function () {
        // same stuff that with patch but different api method
        return BoundModel.query()
          .patch({
            name: ref('jsonArray:[0]').castText(),
            'jsonObject:attr': ref('name'),
            jsonArray: ref('name').castJson()
          })
          .where('id', 1)
          .returning('*')
          .then(function (result) {
            expect(result).to.eql([{
              id: 1,
              name: '1',
              jsonObject: { attr: 'test1' },
              jsonArray: 'test1' }
            ]);
          });
      });
    });
  });

  describe('QueryBuilder JSON queries', function () {
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

      return BoundModel
        .query()
        .delete()
        .then(function () {
          return Promise
            .all([
              BoundModel.query().insert(complexJsonObj),
              BoundModel.query().insert({id: 2, name: "empty object and array", jsonObject: {}, jsonArray: []}),
              BoundModel.query().insert({id: 3, name: "null object and array"}),
              BoundModel.query().insert({id: 4, name: "empty object and [1,2]", jsonObject: {}, jsonArray: [1, 2]}),
              BoundModel.query().insert({
                id: 5,
                name: "empty object and array [ null ]",
                jsonObject: {},
                jsonArray: [null]
              }),
              BoundModel.query().insert({id: 6, name: "{a: 1} and empty array", jsonObject: {a: 1}, jsonArray: []}),
              BoundModel.query().insert({
                id: 7,
                name: "{a: {1:1, 2:2}, b:{2:2, 1:1}} for equality comparisons",
                jsonObject: {a: {1: 1, 2: 2}, b: {2: 2, 1: 1}}, jsonArray: []
              })
            ]);
        });
    });

    it('should have test data', function () {
      return BoundModel.query().then(function (all) {
        expect(_.find(all, {name : 'complex line'}).jsonObject.stringField).to.be(complexJsonObj.jsonObject.stringField);
      });
    });

    describe('private function parseFieldExpression(expression, extractAsText)', function () {
      it('should quote ModelJson.jsonArray column reference properly', function () {
        expect(BoundModel.query().whereJsonIsArray("ModelJson.jsonArray").toString())
          .to.contain('"ModelJson"."jsonArray"');
      });

      it('should quote ModelJson.jsonArray:[10] column reference properly', function () {
        expect(BoundModel.query().whereJsonIsArray("ModelJson.jsonArray:[50]").toString())
          .to.contain('"ModelJson"."jsonArray"');
      });
    });

    describe('function whereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpr, operator, <array|object|string>)', function () {
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
          BoundModel.query().whereJsonEquals("jsonObject", "jsonArray:");
        }).to.throwException();
      });

      it('should fail if left hand is not parseable expression', function () {
        expect(function () {
          BoundModel.query().whereJsonEquals("jsonObject:", "jsonArray");
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

      it('should find results for jsonArray != []', function () {
        return BoundModel.query().whereJsonNotEquals("jsonArray", [])
          .then(function (results) {
            expectIdsEqual(results, [1,4,5]);
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
        return BoundModel.query().whereJsonEquals("jsonObject:a", "jsonObject:[b]")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find result where keys are in different order jsonObject.a == {2:2, 1:1}', function () {
        return BoundModel.query().whereJsonEquals("jsonObject:a", {2:2, 1:1})
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
          .whereJsonEquals("jsonArray:[0].arrayField[0]", { noMoreLevels: true })
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonArray[0].arrayField[0] == { noMoreLevels: false }', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray:[0].arrayField[0]", { noMoreLevels: false })
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
        return BoundModel.query().whereJsonEquals("jsonObject:jsonArray", complexJsonObj.jsonArray)
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

      it('should find results jsonArray == [2,1] OR jsonArray == [1,2]', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray", [2,1])
          .orWhereJsonEquals("jsonArray", [1,2])
          .then(function (results) {
            expectIdsEqual(results, [4]);
          });
      });

      it('should find results jsonArray == [1,2] OR jsonArray != [1,2]', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray", [1,2])
          .orWhereJsonNotEquals("jsonArray", [1,2])
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find results jsonObject.a != jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonNotEquals("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should find all rows with jsonObject.a = jsonObject.b OR jsonObject.a != jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonObject:a", "jsonObject:b")
          .orWhereJsonNotEquals("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results jsonObject != jsonArray', function () {
        return BoundModel.query()
          .whereJsonNotEquals("jsonObject", "jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find results jsonArray = {} or jsonObject != jsonArray', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray", {})
          .orWhereJsonNotEquals("jsonObject", "jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });
    });

    describe('.whereJsonSupersetOf(fieldExpr, <array|object|string>)', function () {
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

      it('should find subset where both sides are references', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject:a", "jsonObject:b")
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
          .whereJsonSupersetOf("jsonObject:objectField", complexJsonObj.jsonObject.objectField )
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonObject.objectField @> complexJsonObj.jsonObject.objectField that has additional key', function () {
        var obj = _.cloneDeep(complexJsonObj.jsonObject.objectField);
        obj.otherKey = "Im here too!";
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject:objectField", obj)
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should not find results jsonObject.objectField @> { object: "other string" }', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject:objectField", {
            object: "something else"
          })
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find results jsonObject @> [] OR jsonObject @> {}', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject", [])
          .orWhereJsonSupersetOf("jsonObject", {})
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find results not jsonObject.objectField @> complexJsonObj.jsonObject.objectField', function () {
        return BoundModel.query()
          .whereJsonNotSupersetOf("jsonObject:objectField", complexJsonObj.jsonObject.objectField)
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should find results not jsonObject.a @> jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonNotSupersetOf("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should find results jsonObject.a @> jsonObject.b OR not jsonObject.a @> jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonSupersetOf("jsonObject:a", "jsonObject:b")
          .orWhereJsonNotSupersetOf("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results not jsonObject.x @> jsonObject.y', function () {
        return BoundModel.query()
          .whereJsonNotSupersetOf("jsonObject:x", "jsonObject:y")
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should find results jsonArray = {} or not jsonObject @> jsonArray', function () {
        return BoundModel.query()
          .whereJsonEquals("jsonArray", {})
          .orWhereJsonNotSupersetOf("jsonObject", "jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });
    });

    describe('.whereJsonSubsetOf(fieldExpr, <array|object|string>)', function () {
      it('should find all empty arrays with jsonArray <@ []', function () {
        return BoundModel.query().whereJsonSubsetOf("jsonArray", [])
          .then(function (results) {
            expectIdsEqual(results, [2,6,7]);
          });
      });

      it('should find results jsonArray <@ [1,2] (set is its own subset)', function () {
        return BoundModel.query().whereJsonSubsetOf("jsonArray", [1,2])
          .then(function (results) {
            expectIdsEqual(results, [2,4,6,7]);
          });
      });

      it('should not find results jsonArray <@ {}', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonArray", {})
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should not find results jsonObject <@ []', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject", [])
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find subset where both sides are references', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results jsonObject <@ {}', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject", {})
          .then(function (results) {
            expectIdsEqual(results, [2,4,5]);
          });
      });

      it('should find results jsonObject.objectField <@ complexJsonObj.jsonObject.objectField', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject:objectField", complexJsonObj.jsonObject.objectField )
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should find results jsonObject.objectField <@ complexJsonObj.jsonObject.objectField that has additional key', function () {
        var obj = _.cloneDeep(complexJsonObj.jsonObject.objectField);
        obj.otherKey = "Im here too!";
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject:objectField", obj)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find results jsonObject.objectField <@ { object: "other string" }', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject:objectField", {
            object: "something else"
          })
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find results jsonObject <@ {} OR jsonArray <@ []', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject", {})
          .orWhereJsonSubsetOf("jsonArray", [])
          .then(function (results) {
            expectIdsEqual(results, [2,4,5,6,7]);
          });
      });

      it('should find results not jsonObject.a <@ jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonNotSubsetOf("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should find results jsonObject.a <@ jsonObject.b OR not jsonObject.a <@ jsonObject.b', function () {
        return BoundModel.query()
          .whereJsonSubsetOf("jsonObject:a", "jsonObject:b")
          .orWhereJsonNotSubsetOf("jsonObject:a", "jsonObject:b")
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });
    });

    describe('.whereJsonIsArray(fieldExpr)', function () {
      it('should find all arrays that has an array in index 5', function () {
        return BoundModel.query().whereJsonIsArray("jsonArray:[5]")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should find no arrays from object type of field arrays', function () {
        return BoundModel.query().whereJsonIsArray("jsonObject:objectField")
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find objects with orWhereJsonIsArray', function () {
        return BoundModel.query()
          .whereJsonIsArray("jsonObject")
          .orWhereJsonIsArray("jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should add parenthesis for find arrays with whereJsonNotArray()', function () {
        return BoundModel.query()
          .whereJsonNotArray("jsonObject")
          .whereJsonIsObject("jsonObject")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should add parenthesis for find arrays with orWhereJsonNotArray()', function () {
        return BoundModel.query()
          .whereJsonIsObject("jsonArray")
          .orWhereJsonNotArray("jsonObject")
          .whereJsonIsObject("jsonObject")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find all rows with orWhereJsonNotArray(jsonObject)', function () {
        return BoundModel.query()
          .whereJsonIsObject("jsonArray")
          .orWhereJsonNotArray("jsonObject")
          .then(function (results) {
            expectIdsEqual(results, [1,2,3,4,5,6,7]);
          });
      });
    });

    describe('.whereJsonIsObject(fieldExpr)', function () {
      it('should find first object', function () {
        return BoundModel.query().whereJsonIsObject("jsonObject:objectField")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should find nothing for array field', function () {
        return BoundModel.query().whereJsonIsObject("jsonObject:arrayField")
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find nothing for non existing field', function () {
        return BoundModel.query().whereJsonIsObject("jsonObject:arrayField.imNot")
          .then(function (results) {
            expect(results).to.have.length(0);
          });
      });

      it('should find objects with orWhereJsonIsObject', function () {
        return BoundModel.query()
          .whereJsonIsObject("jsonArray")
          .orWhereJsonIsObject("jsonObject:objectField")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should add parenthesis for find objects with whereJsonNotObject(jsonArray)', function () {
        return BoundModel.query()
          .whereJsonNotObject("jsonArray")
          .whereJsonIsArray("jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should add parenthesis for find objects with orWhereJsonNotObject(jsonArray)', function () {
        return BoundModel.query()
          .whereJsonIsArray("jsonObject")
          .orWhereJsonNotObject("jsonArray")
          .whereJsonIsArray("jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,4,5,6,7]);
          });
      });

      it('should find all rows with orWhereJsonNotObject(jsonArray)', function () {
        return BoundModel.query()
          .whereJsonIsArray("jsonObject")
          .orWhereJsonNotObject("jsonArray")
          .then(function (results) {
            expectIdsEqual(results, [1,2,3,4,5,6,7]);
          });
      });
    });

    describe('.whereJsonHasAny(fieldExpr, keys) and .whereJsonHasAll(fieldExpr, keys)', function () {
      it('should throw error if null in input array', function () {
        expect(function () {
          BoundModel.query().whereJsonHasAny("jsonObject", [null]);
        }).to.throwException();
      });

      it('should throw error if number in input array', function () {
        expect(function () {
          BoundModel.query().whereJsonHasAny("jsonObject", 1);
        }).to.throwException();
      });

      it('should throw error if boolean in input array', function () {
        expect(function () {
          BoundModel.query().whereJsonHasAny("jsonObject", false);
        }).to.throwException();
      });

      it('should find results for a', function () {
        return BoundModel.query().whereJsonHasAny("jsonObject", 'a')
          .then(function (results) {
            expectIdsEqual(results, [6,7]);
          });
      });

      it('should find results for a or b', function () {
        return BoundModel.query().whereJsonHasAny("jsonObject", 'b')
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results for b or notMe', function () {
        return BoundModel.query().whereJsonHasAny("jsonObject", ['b', 'notMe'])
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results for hasAny(notMe) orHasAny(b)', function () {
        return BoundModel.query()
          .whereJsonHasAny("jsonObject", 'notMe')
          .orWhereJsonHasAny("jsonObject", 'b')
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results for a and b', function () {
        return BoundModel.query().whereJsonHasAll("jsonObject", ['a', 'b'])
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results for hasAll(notMe) orHasAll([a, b])', function () {
        return BoundModel.query()
          .whereJsonHasAll("jsonObject", 'notMe')
          .orWhereJsonHasAll("jsonObject", ['a', 'b'])
          .then(function (results) {
            expectIdsEqual(results, [7]);
          });
      });

      it('should find results for string in array "string in jsonArray[3]"', function () {
        return BoundModel.query().whereJsonHasAny("jsonArray", "string in jsonArray[3]")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });
    });

    describe('.whereJsonField(fieldExpr, operator, value)', function () {
      it('should throw error if operator is not valid', function () {
        expect(function () {
          BoundModel.query().whereJsonField("jsonObject:numberField", ';', {});
        }).to.throwException();
      });

      it('should throw error if value is object', function () {
        expect(function () {
          BoundModel.query().whereJsonField("jsonObject:numberField", '>', {});
        }).to.throwException();
      });

      it('should throw error if value is array', function () {
        expect(function () {
          BoundModel.query().whereJsonField("jsonObject:nullField", '=', []);
        }).to.throwException();
      });

      it('should be able to find numbers with >', function () {
        return BoundModel.query().whereJsonField("jsonObject:numberField", '>', 1.4)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should not find where 1.5 < 1.5', function () {
        return BoundModel.query().whereJsonField("jsonObject:numberField", '<', 1.5)
          .then(function (results) {
            expectIdsEqual(results, []);
          });
      });

      it('should be able to find strings with =', function () {
        return BoundModel.query().whereJsonField("jsonObject:stringField", '=', "string in jsonObject.stringField")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should be able to find strings with !=', function () {
        return BoundModel.query().whereJsonField("jsonObject:stringField", '!=', "not me")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should be able to find strings with like', function () {
        return BoundModel.query().whereJsonField("jsonObject:stringField", 'LIKE', "%jsonObject.st%")
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should be able to find is null or field does not exist', function () {
        return BoundModel.query().whereJsonField("jsonObject:nullField", 'IS', null)
          .then(function (results) {
            expectIdsEqual(results, [1,2,3,4,5,6,7]);
          });
      });

      it('should be able to find is not null', function () {
        return BoundModel.query().whereJsonField("jsonObject:stringField", 'IS NOT', null)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should be able to find boolean equals false', function () {
        return BoundModel.query().whereJsonField("jsonObject:booleanField", '=', false)
          .then(function (results) {
            expectIdsEqual(results, [1]);
          });
      });

      it('should be able to find every but first row where booleanField equals true or is NULL', function () {
        return BoundModel.query()
          .whereJsonField("jsonObject:booleanField", '=', true)
          .orWhereJsonField("jsonObject:booleanField", 'IS', null)
          .then(function (results) {
            expectIdsEqual(results, [2,3,4,5,6,7]);
          });
      });
    });

  });
};

