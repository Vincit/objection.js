'use strict';

const _ = require('lodash')
  , Knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , objection = require('../../../')
  , knexUtils = require('../../../lib/utils/knexUtils')
  , knexMocker = require('../../../testUtils/mockKnex')
  , Model = objection.Model
  , QueryBuilder = objection.QueryBuilder
  , QueryBuilderBase = objection.QueryBuilderBase
  , QueryBuilderOperation = objection.QueryBuilderOperation
  , RelationExpression = objection.RelationExpression;

describe('QueryBuilder', () => {
  let mockKnexQueryResults = [];
  let mockKnexQueryResultIndex = 0;
  let executedQueries = [];
  let mockKnex = null;
  let TestModel = null;

  before(() => {
    let knex = Knex({client: 'pg'});

    mockKnex = knexMocker(knex, function (mock, oldImpl, args) {
      executedQueries.push(this.toString());

      let result = mockKnexQueryResults[mockKnexQueryResultIndex++] || [];
      let promise = Promise.resolve(result);

      return promise.then.apply(promise, args);
    });
  });

  beforeEach(() => {
    mockKnexQueryResults = [];
    mockKnexQueryResultIndex = 0;
    executedQueries = [];

    TestModel = Model.extend(function TestModel() {

    });

    TestModel.tableName = 'Model';
    TestModel.knex(mockKnex);
  });

  it('should have knex methods', () => {
    let ignore = [
      'and', 'toSQL', 'timeout', 'connection', 'stream', 'finally', 'yield', 'ensure', 'reflect', 'domain',
      'setMaxListeners', 'getMaxListeners', 'emit', 'addListener', 'on', 'prependListener', 'once', 'prependOnceListener',
      'removeListener', 'removeAllListeners', 'listeners', 'listenerCount', 'eventNames'
    ];

    let builder = QueryBuilder.forClass(TestModel);
    for (let name in mockKnex.queryBuilder()) {
      let func = mockKnex[name];
      if (typeof func === 'function' && name.charAt(0) !== '_' && ignore.indexOf(name) === -1) {
        if (typeof builder[name] !== 'function') {
          expect().to.fail("knex method '" + name + "' is missing from QueryBuilder");
        }
      }
    }
  });

  it('modelClass() should return the model class', () => {
    expect(QueryBuilder.forClass(TestModel).modelClass() === TestModel).to.equal(true);
  });

  it('modify() should execute the given function and pass the builder to it', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let called = false;

    builder.modify(function (b) {
      called = true;
      expect(b === builder).to.equal(true);
      expect(this === builder).to.equal(true);
    });

    expect(called).to.equal(true);
  });

  it('should call the callback passed to .then after execution', done => {
    mockKnexQueryResults = [[{a: 1}, {a: 2}]];
    // Make sure the callback is called by not returning a promise from the test.
    // Instead call the `done` function so that the test times out if the callback
    // is not called.
    QueryBuilder.forClass(TestModel).then(result => {
      expect(result).to.eql(mockKnexQueryResults[0]);
      done();
    }).catch(done);
  });

  it('should return a promise from .then method', () => {
    let promise = QueryBuilder.forClass(TestModel).then(_.identity);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .execute method', () => {
    let promise = QueryBuilder.forClass(TestModel).execute();
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .map method', () => {
    let promise = QueryBuilder.forClass(TestModel).map(_.identity);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .return method', () => {
    let promise = QueryBuilder.forClass(TestModel).return({});
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .bind method', () => {
    let promise = QueryBuilder.forClass(TestModel).bind({});
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should pass node-style values to the asCallback method', done => {
    mockKnexQueryResults = [[{a: 1}, {a: 2}]];
    QueryBuilder.forClass(TestModel).asCallback((err, models) => {
      expect(models).to.eql(mockKnexQueryResults[0]);
      done();
    });
  });

  it('should pass node-style values to the nodeify method', done => {
    mockKnexQueryResults = [[{a: 1}, {a: 2}]];
    QueryBuilder.forClass(TestModel).nodeify((err, models) => {
      expect(models).to.eql(mockKnexQueryResults[0]);
      done();
    });
  });

  it('should return a promise from .catch method', () => {
    let promise = QueryBuilder.forClass(TestModel).catch(_.noop);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should select all from the model table if no query methods are called', () => {
    let queryBuilder = QueryBuilder.forClass(TestModel);
    return queryBuilder.then(() => {
      expect(executedQueries).to.eql(['select "Model".* from "Model"']);
    });
  });

  it('should have knex query builder methods', () => {
    // Doesn't test all the methods. Just enough to make sure the method calls are correctly
    // passed to the knex query builder.
    return QueryBuilder
      .forClass(TestModel)
      .select('name', 'id', 'age')
      .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
      .where('id', 10)
      .where('height', '>', 180)
      .where({name: 'test'})
      .orWhere(function (builder) {
        // The builder passed to these functions should be a QueryBuilderBase instead of
        // knex query builder.
        expect(this).to.equal(builder);
        expect(this).to.be.a(QueryBuilderBase);
        this.where('age', '<', 10).andWhere('eyeColor', 'blue');
      })
      .then(() => {
        expect(executedQueries).to.eql([[
          'select "name", "id", "age" from "Model"',
          'inner join "AnotherTable" on "AnotherTable"."modelId" = "Model"."id"',
          'where "id" = 10',
          'and "height" > 180',
          'and "name" = \'test\'',
          'or ("age" < 10 and "eyeColor" = \'blue\')'
        ].join(' ')]);
      });
  });

  describe('whereRef', () => {

    it('should create a where clause using column references instead of values (1)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereRef('SomeTable.someColumn', 'SomeOtherTable.someOtherColumn')
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should create a where clause using column references instead of values (2)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereRef('SomeTable.someColumn', '>', 'SomeOtherTable.someOtherColumn')
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" > "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(() => {
        QueryBuilder
          .forClass(TestModel)
          .whereRef('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toString();
      }).to.throwException();
    });

    it('orWhereRef should create a where clause using column references instead of values', () => {
      return QueryBuilder
        .forClass(TestModel)
        .where('id', 10)
        .orWhereRef('SomeTable.someColumn', 'SomeOtherTable.someOtherColumn')
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "id" = 10 or "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

  });

  describe('whereComposite', () => {

    it('should create multiple where queries', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], '>', [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" > 1 and \"B\".\"b\" > 2"
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(() => {
        QueryBuilder
          .forClass(TestModel)
          .whereComposite('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toString();
      }).to.throwException();
    });

    it('operator should default to `=`', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" = 1 and \"B\".\"b\" = 2"
          ]);
        });
    });

    it('should work like a normal `where` when one column is given (1)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a'], 1)
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" = 1"
           ]);
        });
    });

    it('should work like a normal `where` when one column is given (2)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite('A.a', 1)
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" = 1"
          ]);
        });
    });

  });

  describe('whereInComposite', () => {

    it('should create a where-in query for composite id and array of choices', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], [[1, 2], [3, 4]])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where (\"A\".\"a\", \"B\".\"b\") in ((1, 2),(3, 4))"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (1)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a'], [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" in (1, 3)"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (2)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" in (1, 3)"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (3)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', [1, 3])
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" in (1, 3)"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (4)', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', TestModel.query().select('a'))
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where \"A\".\"a\" in (select \"a\" from \"Model\")"
          ]);
        });
    });

    it('should create a where-in query for composite id and a subquery', () => {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], TestModel.query().select('a', 'b'))
        .then(() => {
          expect(executedQueries).to.eql([
            "select \"Model\".* from \"Model\" where (\"A\".\"a\",\"B\".\"b\") in (select \"a\", \"b\" from \"Model\")"
          ]);
        });
    });

  });

  it('should convert array query result into Model instances', () => {
    mockKnexQueryResults = [[{a: 1}, {a: 2}]];

    return QueryBuilder
      .forClass(TestModel)
      .then(result => {
        expect(result).to.have.length(2);
        expect(result[0]).to.be.a(TestModel);
        expect(result[1]).to.be.a(TestModel);
        expect(result).to.eql(mockKnexQueryResults[0]);
      });
  });

  it('should convert an object query result into a Model instance', () => {
    mockKnexQueryResults = [{a: 1}];

    return QueryBuilder
      .forClass(TestModel)
      .then(result => {
        expect(result).to.be.a(TestModel);
        expect(result.a).to.equal(1);
      });
  });

  it('should pass the query builder as `this` and parameter for the hooks', done => {
    let text = '';

    QueryBuilder
      .forClass(TestModel)
      .runBefore(function (result, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'a';
      })
      .onBuild(function (builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'b';
      })
      .runAfter(function (data, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'c';
      })
      .runAfter(function (data, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'd';
      })
      .then(() => {
        expect(text).to.equal('abcd');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should call run* methods in the correct order', done => {
    mockKnexQueryResults = [0];

    // Again call `done` instead of returning a promise just to make sure the final
    // `.then` callback is called. (I'm paranoid).
    QueryBuilder
      .forClass(TestModel)

      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(0);
        return ++mockKnexQueryResults[0];
      })
      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(1);
        return Promise.delay(1).return(++mockKnexQueryResults[0]);
      })
      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(2);
        ++mockKnexQueryResults[0];
      })

      .runAfter(res => {
        expect(res).to.equal(3);
        return Promise.delay(1).then(() => {
          return ++res;
        });
      })
      .runAfter(res => {
        expect(res).to.equal(4);
        return ++res;
      })

      .then(res => {
        expect(res).to.equal(5);
        done();
      }).catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', done => {
    QueryBuilder
      .forClass(TestModel)
      .runBefore(() => {
        throw new Error('some error');
      })
      .onBuild(() => {
        done(new Error('should not get here'));
      })
      .runAfter(() => {
        done(new Error('should not get here'));
      })
      .then(() => {
        done(new Error('should not get here'));
      })
      .catch(err => {
        expect(err.message).to.equal('some error');
        expect(executedQueries).to.have.length(0);
        done();
      });
  });

  it('should reject promise if an error is throw from from runAfter', done => {
    QueryBuilder
      .forClass(TestModel)
      .runAfter(() => {
        throw new Error('some error');
      })
      .then(() => {
        done(new Error('should not get here'));
      })
      .catch(err => {
        expect(err.message).to.equal('some error');
        done();
      });
  });

  it('should call custom find implementation defined by findOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(function (builder) {
        expect(builder).to.equal(this);
        return createFindOperation(builder, {a: 1});
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('select "Model".* from "Model" where "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if insert is called', () => {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, {a: 1});
      })
      .insert({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (1) returning "id"');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if update is called', () => {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, {a: 1});
      })
      .update({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if delete is called', () => {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, {a: 1});
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model"');
      });
  });

  it('should call custom insert implementation defined by insertOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .insertOperationFactory(builder => {
        return createInsertOperation(builder, {b: 2});
      })
      .insert({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom update implementation defined by updateOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .updateOperationFactory(builder => {
        return createUpdateOperation(builder, {b: 2});
      })
      .update({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom patch implementation defined by patchOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .patchOperationFactory(builder => {
        return createUpdateOperation(builder, {b: 2});
      })
      .patch({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom delete implementation defined by deleteOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .deleteOperationFactory(builder => {
        return createDeleteOperation(builder, {id: 100});
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  it('should call custom relate implementation defined by relateOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .relateOperationFactory(builder => {
        return createInsertOperation(builder, {b: 2});
      })
      .relate({a: 1})
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom unrelate implementation defined by unrelateOperationFactory', () => {
    return QueryBuilder
      .forClass(TestModel)
      .unrelateOperationFactory(builder => {
        return createDeleteOperation(builder, {id: 100});
      })
      .unrelate()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  it('should be able to execute same query multiple times', () => {
    let query = QueryBuilder
      .forClass(TestModel)
      .updateOperationFactory(builder => {
        return createUpdateOperation(builder, {b: 2});
      })
      .where('test', '<', 100)
      .update({a: 1});

    query.then(() => {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2 where "test" < 100');
      executedQueries = [];
      return query;
    }).then(() => {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2 where "test" < 100');
      executedQueries = [];
      return query;
    }).then(() => {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2 where "test" < 100');
    });
  });

  it('resultSize should create and execute a query that returns the size of the query', done => {
    mockKnexQueryResults = [[{count: 123}]];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .resultSize()
      .then(res => {
        expect(executedQueries).to.have.length(1);
        expect(res).to.equal(123);
        // resultSize should cancel the groupBy call since it doesn't affect the outcome.
        expect(executedQueries[0]).to.equal('select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as temp');
        done();
      })
      .catch(done);
  });

  it('range should return a range and the total count', done => {
    mockKnexQueryResults = [[{count: 123}], [{a: 1}]];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .range(100, 200)
      .then(res => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          "select count(*) as \"count\" from (select \"Model\".* from \"Model\" where \"test\" = 100) as temp",
          "select \"Model\".* from \"Model\" where \"test\" = 100 order by \"order\" asc limit 101 offset 100"
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{a: 1}]);
        done();
      })
      .catch(done);
  });

  it('page should return a page and the total count', done => {
    mockKnexQueryResults = [[{count: 123}], [{a: 1}]];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .page(10, 100)
      .then(res => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          "select count(*) as \"count\" from (select \"Model\".* from \"Model\" where \"test\" = 100) as temp",
          "select \"Model\".* from \"Model\" where \"test\" = 100 order by \"order\" asc limit 100 offset 1000"
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{a: 1}]);
        done();
      })
      .catch(done);
  });

  it('isFindQuery should return true if none of the insert, update, patch, delete, relate or unrelate has been called', () => {
    expect(QueryBuilder.forClass(TestModel).isFindQuery()).to.equal(true);
    expect(QueryBuilder.forClass(TestModel).insert().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).update().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).patchOperationFactory(builder => { return createUpdateOperation(builder, {}); }).patch().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).delete().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).relateOperationFactory(builder => { return createUpdateOperation(builder, {}); }).relate(1).isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).unrelateOperationFactory(builder => { return createUpdateOperation(builder, {}); }).unrelate().isFindQuery()).to.equal(false);
  });

  it('update() should call $beforeUpdate on the model', done => {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('update() should call $beforeUpdate on the model (async)', done => {
    TestModel.prototype.$beforeUpdate = function () {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeUpdate'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model', done => {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model (async)', done => {
    TestModel.prototype.$beforeUpdate = function () {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeUpdate'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({a: 10, b: 'test'})
    QueryBuilder
      .forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model', done => {
    TestModel.prototype.$beforeInsert = function () {
      this.c = 'beforeInsert';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder
      .forClass(TestModel)
      .insert(TestModel.fromJson({a: 10, b: 'test'}))
      .then(model => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"');
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model (async)', done => {
    TestModel.prototype.$beforeInsert = function () {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeInsert'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder
      .forClass(TestModel)
      .insert({a: 10, b: 'test'})
      .then(model => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"');
        done();
      })
      .catch(done);
  });

  it('should call $afterGet on the model if no write operation is specified', done => {
    mockKnexQueryResults = [[{
      a: 1
    }, {
      a: 2
    }]];

    TestModel.prototype.$afterGet = function (context) {
      this.b = this.a * 2 + context.x;
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([{
          a: 1,
          b: 12
        }, {
          a: 2,
          b: 14
        }]);
        done();
      })
      .catch(done);
  });

  it('should call $afterGet on the model if no write operation is specified (async)', done => {
    mockKnexQueryResults = [[{
      a: 1
    }, {
      a: 2
    }]];

    TestModel.prototype.$afterGet = function (context) {
      let self = this;
      return Promise.delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([{
          a: 1,
          b: 12
        }, {
          a: 2,
          b: 14
        }]);
        done();
      })
      .catch(done);
  });

  it('should call $afterGet before any `runAfter` hooks', done => {
    mockKnexQueryResults = [[{
      a: 1
    }, {
      a: 2
    }]];

    TestModel.prototype.$afterGet = function (context) {
      let self = this;
      return Promise.delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .runAfter((result, builder) => {
        builder.context().x = 666;
        return result;
      })
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([{
          a: 1,
          b: 12
        }, {
          a: 2,
          b: 14
        }]);
        done();
      })
      .catch(done);
  });

  it('should not be able to call setQueryExecutor twice', () => {
    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .setQueryExecutor(function () {})
        .setQueryExecutor(function () {});
    }).to.throwException();
  });

  it('clearEager() should clear everything related to eager', () => {
    let builder = QueryBuilder
      .forClass(TestModel)
      .eager('a(f).b', {
        f: _.noop
      })
      .filterEager('a', _.noop);

    expect(builder._eagerExpression).to.be.a(RelationExpression);
    expect(builder._eagerFilterExpressions).to.have.length(1);

    builder.clearEager();

    expect(builder._eagerExpression).to.equal(null);
    expect(builder._eagerFilterExpressions).to.have.length(0);
  });

  it('clearReject() should clear remove explicit rejection', () => {
    let builder = QueryBuilder
      .forClass(TestModel)
      .reject('error');

    expect(builder._explicitRejectValue).to.equal('error');

    builder.clearReject();

    expect(builder._explicitRejectValue).to.equal(null);
  });

  it("joinRelation should add join clause to correct place", done => {
    let M1 = Model.extend(function M1() {

    });

    M1.tableName = 'M1';
    M1.knex(mockKnex);

    let M2 = Model.extend(function M2() {

    });

    M2.tableName = 'M2';
    M2.knex(mockKnex);

    M2.relationMappings = {
      m1: {
        relation: Model.HasManyRelation,
        modelClass: M1,
        join: {
          from: 'M2.id',
          to: 'M1.m2Id'
        }
      }
    };

    M2
      .query()
      .joinRelation('m1', {alias: 'm'})
      .join('M1', 'M1.id', 'M2.m1Id')
      .then(() => {
        expect(executedQueries[0]).to.equal('select "M2".* from "M2" inner join "M1" as "m" on "m"."m2Id" = "M2"."id" inner join "M1" on "M1"."id" = "M2"."m1Id"');
        done();
      })
      .catch(done);
  });

  it('undefined values as query builder method arguments should raise an exception', () => {
    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .where('id', undefined)
    }).to.throwException(err => {
      expect(err.message).to.equal("undefined passed as argument #2 for \'where\' operation. Call skipUndefined() method to ignore the undefined values.")
    });

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .orWhere('id', '<', undefined)
    }).to.throwException(err => {
      expect(err.message).to.equal("undefined passed as argument #3 for \'orWhere\' operation. Call skipUndefined() method to ignore the undefined values.")
    });

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .orWhere('id', undefined, 10)
    }).to.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .deleteById(undefined)
    }).to.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .delete()
        .whereIn('id', undefined)
    }).to.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .delete()
        .whereIn('id', [1, undefined, 3])
    }).to.throwException(err => {
      expect(err.message).to.equal("undefined passed as an item in argument #2 for \'whereIn\' operation. Call skipUndefined() method to ignore the undefined values.")
    });
  });

  it('undefined values as query builder method arguments should be ignored if `skipUndefined` is called', () => {
    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .where('id', undefined)
    }).to.not.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .orWhere('id', '<', undefined)
    }).to.not.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .orWhere('id', undefined, 10)
    }).to.not.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .deleteById(undefined)
    }).to.not.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', undefined)
    }).to.not.throwException();

    expect(() => {
      QueryBuilder
        .forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', [1, undefined, 3])
    }).to.not.throwException();
  });

  it('all query builder methods should work if model is not bound to a knex, when the query is', () => {
    function UnboundModel() {

    }

    Model.extend(UnboundModel);
    UnboundModel.tableName = 'Bar';

    expect(UnboundModel.query(mockKnex).increment("foo", 10).toString()).to.equal('update "Bar" set "foo" = "foo" + 10');
    expect(UnboundModel.query(mockKnex).decrement("foo", 5).toString()).to.equal('update "Bar" set "foo" = "foo" - 5');
  });

  describe('eager and allowEager' , () => {

    it("allowEager('a').eager('a(f1)') should be ok", done => {
      QueryBuilder
        .forClass(TestModel)
        .eager('a(f1)', {f1: _.noop})
        .allowEager('a')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(err => {
          console.log(err.stack);
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a') should be ok", done => {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('a')
        .then(() => {
          done();
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c') should be ok", done => {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        })
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c.e') should be ok", done => {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c.e')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        })
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a.b') should fail", done => {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('a.b')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('a.b').allowEager('[a, b.c.[d, e]]') should fail", done => {
      QueryBuilder
        .forClass(TestModel)
        .eager('a.b')
        .allowEager('[a, b.c.[d, e]]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('b.c.d.e').allowEager('[a, b.c.[d, e]]') should fail", done => {
      QueryBuilder
        .forClass(TestModel)
        .eager('b.c.d.e')
        .allowEager('[a, b.c.[d, e]]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("should use correct query builders", done => {
      let M1 = Model.extend(function M1() {

      });

      M1.tableName = 'M1';
      M1.knex(mockKnex);

      let M2 = Model.extend(function M2() {

      });

      M2.tableName = 'M2';
      M2.knex(mockKnex);

      let M3 = Model.extend(function M3() {

      });

      M3.tableName = 'M3';
      M3.knex(mockKnex);

      M1.relationMappings = {
        m2: {
          relation: Model.HasManyRelation,
          modelClass: M2,
          join: {
            from: 'M1.id',
            to: 'M2.m1Id'
          }
        }
      };

      M2.relationMappings = {
        m3: {
          relation: Model.BelongsToOneRelation,
          modelClass: M3,
          join: {
            from: 'M2.m3Id',
            to: 'M3.id'
          }
        }
      };

      class M1RelatedBuilder extends QueryBuilder {

      }

      class M2RelatedBuilder extends QueryBuilder {

      }

      M1.RelatedQueryBuilder = M1RelatedBuilder;
      M2.RelatedQueryBuilder = M2RelatedBuilder;

      mockKnexQueryResults = [
        [{id: 1, m1Id: 2, m3Id: 3}],
        [{id: 1, m1Id: 2, m3Id: 3}],
        [{id: 1, m1Id: 2, m3Id: 3}]
      ];

      let filter1Check = false;
      let filter2Check = false;

      QueryBuilder
        .forClass(M1)
        .eager('m2.m3')
        .filterEager('m2', builder => {
          filter1Check = builder instanceof M1RelatedBuilder;
        })
        .filterEager('m2.m3', builder => {
          filter2Check = builder instanceof M2RelatedBuilder;
        })
        .then(() => {
          expect(executedQueries).to.eql([
            'select "M1".* from "M1"',
            'select "M2".* from "M2" where "M2"."m1Id" in (1)',
            'select "M3".* from "M3" where "M3"."id" in (3)'
          ]);

          expect(filter1Check).to.equal(true);
          expect(filter2Check).to.equal(true);

          done();
        })
        .catch(done);
    });

    it("$afterGet should be called after relations have been fetched", done => {
      let M1 = Model.extend(function M1() {

      });

      M1.prototype.$afterGet = function () {
        this.ids = _.map(this.someRel, 'id');
      };

      M1.tableName = 'M1';
      M1.knex(mockKnex);

      M1.relationMappings = {
        someRel: {
          relation: Model.HasManyRelation,
          modelClass: M1,
          join: {
            from: 'M1.id',
            to: 'M1.m1Id'
          }
        }
      };

      mockKnexQueryResults = [
        [{id: 1}, {id: 2}],
        [{id: 3, m1Id: 1}, {id: 4, m1Id: 1}, {id: 5, m1Id: 2}, {id: 6, m1Id: 2}],
        [{id: 7, m1Id: 3}, {id: 8, m1Id: 3}, {id: 9, m1Id: 4}, {id: 10, m1Id: 4},  {id: 11, m1Id: 5}, {id: 12, m1Id: 5},  {id: 13, m1Id: 6}, {id: 14, m1Id: 6}]
      ];

      QueryBuilder
        .forClass(M1)
        .eager('someRel.someRel')
        .then(x => {
          expect(executedQueries).to.eql([
            'select "M1".* from "M1"',
            'select "M1".* from "M1" where "M1"."m1Id" in (1, 2)',
            'select "M1".* from "M1" where "M1"."m1Id" in (3, 4, 5, 6)'
          ]);

          expect(x).to.eql([{
            "id": 1,
            "ids": [3, 4],
            "someRel": [{
              "id": 3,
              "m1Id": 1,
              "ids": [7, 8],
              "someRel": [
                {"id": 7, "m1Id": 3, "ids": []},
                {"id": 8, "m1Id": 3, "ids": []}
              ]
            }, {
              "id": 4,
              "m1Id": 1,
              "ids": [9, 10],
              "someRel": [
                {"id": 9, "m1Id": 4, "ids": []},
                {"id": 10, "m1Id": 4, "ids": []}
              ]
            }]
          },
          {
            "id": 2,
            "ids": [5, 6],
            "someRel": [{
              "id": 5,
              "m1Id": 2,
              "ids": [11, 12],
              "someRel": [
                {"id": 11, "m1Id": 5, "ids": []},
                {"id": 12, "m1Id": 5, "ids": []}
              ]
            }, {
              "id": 6,
              "m1Id": 2,
              "ids": [13, 14],
              "someRel": [
                {"id": 13, "m1Id": 6, "ids": []},
                {"id": 14, "m1Id": 6, "ids": []}
              ]
            }]
          }]);

          done();
        })
        .catch(done);
    });

  });

});

function createFindOperation(builder, whereObj) {
  let method = new QueryBuilderOperation("find");

  method.onBuild = knexBuilder => {
    knexBuilder.where(whereObj);
  };

  return method;
}

function createInsertOperation(builder, mergeWithModel) {
  let method = new QueryBuilderOperation("insert");
  method.isWriteOperation = true;

  method.call = function (builder, args) {
    this.model = args[0];
    return true;
  };

  method.onBuild = function (knexBuilder) {
    let json = _.merge(this.model, mergeWithModel);
    knexBuilder.insert(json);
  };

  return method;
}

function createUpdateOperation(builder, mergeWithModel) {
  let method = new QueryBuilderOperation("update");
  method.isWriteOperation = true;

  method.call = function (builder, args) {
    this.model = args[0];
    return true;
  };

  method.onBuild = function (knexBuilder) {
    let json = _.merge(this.model, mergeWithModel);
    knexBuilder.update(json);
  };

  return method;
}

function createDeleteOperation(builder, whereObj) {
  let method = new QueryBuilderOperation("delete");
  method.isWriteOperation = true;

  method.onBuild = knexBuilder => {
    knexBuilder.delete().where(whereObj);
  };

  return method;
}