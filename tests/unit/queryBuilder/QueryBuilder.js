'use strict';

var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , objection = require('../../../')
  , Model = objection.Model
  , QueryBuilder = objection.QueryBuilder
  , QueryBuilderBase = objection.QueryBuilderBase
  , QueryBuilderOperation = objection.QueryBuilderOperation
  , RelationExpression = objection.RelationExpression;

describe('QueryBuilder', function () {
  var mockKnexQueryResult = [];
  var executedQueries = [];
  var mockKnex = null;
  var TestModel = null;

  before(function () {
    mockKnex = knex({client: 'pg'});
    mockKnex.client.QueryBuilder.prototype.then = function (cb, ecb) {
      executedQueries.push(this.toString());
      return Promise.resolve(mockKnexQueryResult).then(cb, ecb);
    };
  });

  beforeEach(function () {
    mockKnexQueryResult = [];
    executedQueries = [];

    TestModel = Model.extend(function TestModel() {
      Model.apply(this, arguments);
    });

    TestModel.tableName = 'Model';
    TestModel.knex(mockKnex);
  });

  it('modelClass() should return the model class', function () {
    expect(QueryBuilder.forClass(TestModel).modelClass() === TestModel).to.equal(true);
  });

  it('call() should execute the given function and pass the builder to it', function () {
    var builder = QueryBuilder.forClass(TestModel);
    var called = false;

    builder.modify(function (b) {
      called = true;
      expect(b === builder).to.equal(true);
      expect(this === builder).to.equal(true);
    });

    expect(called).to.equal(true);
  });

  it('dumpSql() should dump the contents of toString() to a logger', function () {
    var logCalled = false;
    var builder = QueryBuilder.forClass(TestModel);

    builder
      .where('a', 10)
      .dumpSql(function (str) {
        logCalled = true;
        expect(str).to.equal(builder.toString());
      });

    expect(logCalled).to.equal(true);
  });

  it('should call the callback passed to .then after execution', function (done) {
    mockKnexQueryResult = [{a: 1}, {a: 2}];
    // Make sure the callback is called by not returning a promise from the test.
    // Instead call the `done` function so that the test times out if the callback
    // is not called.
    QueryBuilder.forClass(TestModel).then(function (result) {
      expect(result).to.eql(mockKnexQueryResult);
      done();
    }).catch(done);
  });

  it('should return a promise from .then method', function () {
    var promise = QueryBuilder.forClass(TestModel).then(_.identity);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .execute method', function () {
    var promise = QueryBuilder.forClass(TestModel).execute();
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .map method', function () {
    var promise = QueryBuilder.forClass(TestModel).map(_.identity);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .return method', function () {
    var promise = QueryBuilder.forClass(TestModel).return({});
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .bind method', function () {
    var promise = QueryBuilder.forClass(TestModel).bind({});
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should pass node-style values to the asCallback method', function (done) {
    mockKnexQueryResult = [{a: 1}, {a: 2}];
    QueryBuilder.forClass(TestModel).asCallback(function (err, models) {
      expect(models).to.eql(mockKnexQueryResult);
      done();
    });
  });

  it('should pass node-style values to the nodeify method', function (done) {
    mockKnexQueryResult = [{a: 1}, {a: 2}];
    QueryBuilder.forClass(TestModel).nodeify(function (err, models) {
      expect(models).to.eql(mockKnexQueryResult);
      done();
    });
  });

  it('should return a promise from .catch method', function () {
    var promise = QueryBuilder.forClass(TestModel).catch(_.noop);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should select all from the model table if no query methods are called', function () {
    var queryBuilder = QueryBuilder.forClass(TestModel);
    return queryBuilder.then(function () {
      expect(executedQueries).to.eql(['select * from "Model"']);
    });
  });

  it('should have knex query builder methods', function () {
    // Doesn't test all the methods. Just enough to make sure the method calls are correctly
    // passed to the knex query builder.
    return QueryBuilder
      .forClass(TestModel)
      .select('name', 'id', 'age')
      .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
      .where('id', 10)
      .where('height', '>', '180')
      .where({name: 'test'})
      .orWhere(function (builder) {
        // The builder passed to these functions should be a QueryBuilderBase instead of
        // knex query builder.
        expect(this).to.equal(builder);
        expect(this).to.be.a(QueryBuilderBase);
        this.where('age', '<', 10).andWhere('eyeColor', 'blue');
      })
      .then(function () {
        expect(executedQueries).to.eql([[
          'select "name", "id", "age" from "Model"',
          'inner join "AnotherTable" on "AnotherTable"."modelId" = "Model"."id"',
          'where "id" = \'10\'',
          'and "height" > \'180\'',
          'and "name" = \'test\'',
          'or ("age" < \'10\' and "eyeColor" = \'blue\')'
        ].join(' ')]);
      });
  });

  describe('whereRef', function () {

    it('should create a where clause using column references instead of values (1)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereRef('SomeTable.someColumn', 'SomeOtherTable.someOtherColumn')
        .then(function () {
          expect(executedQueries).to.eql([
            'select * from "Model" where "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should create a where clause using column references instead of values (2)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereRef('SomeTable.someColumn', '>', 'SomeOtherTable.someOtherColumn')
        .then(function () {
          expect(executedQueries).to.eql([
            'select * from "Model" where "SomeTable"."someColumn" > "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should fail with invalid operator', function () {
      expect(function () {
        QueryBuilder
          .forClass(TestModel)
          .whereRef('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toString();
      }).to.throwException();
    });

    it('orWhereRef should create a where clause using column references instead of values', function () {
      return QueryBuilder
        .forClass(TestModel)
        .where('id', 10)
        .orWhereRef('SomeTable.someColumn', 'SomeOtherTable.someOtherColumn')
        .then(function () {
          expect(executedQueries).to.eql([
            'select * from "Model" where "id" = \'10\' or "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

  });

  describe('whereComposite', function () {

    it('should create multiple where queries', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], '>', [1, 2])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" > '1' and \"B\".\"b\" > '2'"
          ]);
        });
    });

    it('should fail with invalid operator', function () {
      expect(function () {
        QueryBuilder
          .forClass(TestModel)
          .whereComposite('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toString();
      }).to.throwException();
    });

    it('operator should default to `=`', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], [1, 2])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" = '1' and \"B\".\"b\" = '2'"
          ]);
        });
    });

    it('should work like a normal `where` when one column is given (1)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite(['A.a'], 1)
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" = '1'"
           ]);
        });
    });

    it('should work like a normal `where` when one column is given (2)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereComposite('A.a', 1)
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" = '1'"
          ]);
        });
    });

  });

  describe('whereInComposite', function () {

    it('should create a where-in query for composite id and array of choices', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], [[1, 2], [3, 4]])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where (\"A\".\"a\", \"B\".\"b\") in (('1', '2'),('3', '4'))"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (1)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a'], [[1], [3]])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" in ('1', '3')"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (2)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', [[1], [3]])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" in ('1', '3')"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (3)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', [1, 3])
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" in ('1', '3')"
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (4)', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite('A.a', TestModel.query().select('a'))
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where \"A\".\"a\" in (select \"a\" from \"Model\")"
          ]);
        });
    });

    it('should create a where-in query for composite id and a subquery', function () {
      return QueryBuilder
        .forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], TestModel.query().select('a', 'b'))
        .then(function () {
          expect(executedQueries).to.eql([
            "select * from \"Model\" where (\"A\".\"a\",\"B\".\"b\") in (select \"a\", \"b\" from \"Model\")"
          ]);
        });
    });

  });

  it('should convert array query result into Model instances', function () {
    mockKnexQueryResult = [{a: 1}, {a: 2}];

    return QueryBuilder
      .forClass(TestModel)
      .then(function (result) {
        expect(result).to.have.length(2);
        expect(result[0]).to.be.a(TestModel);
        expect(result[1]).to.be.a(TestModel);
        expect(result).to.eql(mockKnexQueryResult);
      });
  });

  it('should convert an object query result into a Model instance', function () {
    mockKnexQueryResult = {a: 1};

    return QueryBuilder
      .forClass(TestModel)
      .then(function (result) {
        expect(result).to.be.a(TestModel);
        expect(result.a).to.equal(1);
      });
  });

  it('should pass the query builder as `this` and parameter for the hooks', function (done) {
    var text = '';

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
      .then(function () {
        expect(text).to.equal('abcd');
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });

  it('should call run* methods in the correct order', function (done) {
    mockKnexQueryResult = 0;

    // Again call `done` instead of returning a promise just to make sure the final
    // `.then` callback is called. (I'm paranoid).
    QueryBuilder
      .forClass(TestModel)

      .runBefore(function () {
        expect(mockKnexQueryResult).to.equal(0);
        return ++mockKnexQueryResult;
      })
      .runBefore(function () {
        expect(mockKnexQueryResult).to.equal(1);
        return Promise.delay(1).return(++mockKnexQueryResult);
      })
      .runBefore(function () {
        expect(mockKnexQueryResult).to.equal(2);
        ++mockKnexQueryResult;
      })

      .runAfter(function (res) {
        expect(res).to.equal(3);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfter(function (res) {
        expect(res).to.equal(4);
        return ++res;
      })

      .then(function (res) {
        expect(res).to.equal(5);
        done();
      }).catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runBefore(function () {
        throw new Error('some error');
      })
      .onBuild(function () {
        done(new Error('should not get here'));
      })
      .runAfter(function () {
        done(new Error('should not get here'));
      })
      .then(function () {
        done(new Error('should not get here'));
      })
      .catch(function (err) {
        expect(err.message).to.equal('some error');
        expect(executedQueries).to.have.length(0);
        done();
      });
  });

  it('should reject promise if an error is throw from from runAfter', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runAfter(function () {
        throw new Error('some error');
      })
      .then(function () {
        done(new Error('should not get here'));
      })
      .catch(function (err) {
        expect(err.message).to.equal('some error');
        done();
      });
  });

  it('should call custom find implementation defined by findOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(function (builder) {
        expect(builder).to.equal(this);
        return createFindOperation(builder, {a: 1});
      })
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('select * from "Model" where "a" = \'1\'');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if insert is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(function (builder) {
        return createFindOperation(builder, {a: 1});
      })
      .insert({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (\'1\') returning "id"');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if update is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(function () {
        return createFindOperation(builder, {a: 1});
      })
      .update({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\'');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if delete is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findOperationFactory(function () {
        return createFindOperation(builder, {a: 1});
      })
      .delete()
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model"');
      });
  });

  it('should call custom insert implementation defined by insertOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .insertOperationFactory(function (builder) {
        return createInsertOperation(builder, {b: 2});
      })
      .insert({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (\'1\', \'2\')');
      });
  });

  it('should call custom update implementation defined by updateOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .updateOperationFactory(function (builder) {
        return createUpdateOperation(builder, {b: 2});
      })
      .update({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\'');
      });
  });

  it('should call custom patch implementation defined by patchOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .patchOperationFactory(function (builder) {
        return createUpdateOperation(builder, {b: 2});
      })
      .patch({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\'');
      });
  });

  it('should call custom delete implementation defined by deleteOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .deleteOperationFactory(function (builder) {
        return createDeleteOperation(builder, {id: 100});
      })
      .delete()
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = \'100\'');
      });
  });

  it('should call custom relate implementation defined by relateOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .relateOperationFactory(function (builder) {
        return createInsertOperation(builder, {b: 2});
      })
      .relate({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (\'1\', \'2\')');
      });
  });

  it('should call custom unrelate implementation defined by unrelateOperationFactory', function () {
    return QueryBuilder
      .forClass(TestModel)
      .unrelateOperationFactory(function (builder) {
        return createDeleteOperation(builder, {id: 100});
      })
      .unrelate()
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = \'100\'');
      });
  });

  it('should be able to execute same query multiple times', function () {
    var query = QueryBuilder
      .forClass(TestModel)
      .updateOperationFactory(function (builder) {
        return createUpdateOperation(builder, {b: 2});
      })
      .where('test', '<', 100)
      .update({a: 1});

    query.then(function () {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\' where "test" < \'100\'');
      executedQueries = [];
      return query;
    }).then(function () {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\' where "test" < \'100\'');
      executedQueries = [];
      return query;
    }).then(function () {
      expect(executedQueries).to.have.length(1);
      expect(query.toString()).to.equal(executedQueries[0]);
      expect(query.toSql()).to.equal(executedQueries[0]);
      expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\' where "test" < \'100\'');
    });
  });

  it('resultSize should create and execute a query that returns the size of the query', function (done) {
    mockKnexQueryResult = [{count: 123}];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .resultSize()
      .then(function (res) {
        expect(executedQueries).to.have.length(1);
        expect(res).to.equal(123);
        // resultSize should cancel the groupBy call since it doesn't affect the outcome.
        expect(executedQueries[0]).to.equal('select count(*) as "count" from (select * from "Model" where "test" = \'100\') as temp');
        done();
      })
      .catch(done);
  });

  it('range should return a range and the total count', function (done) {
    mockKnexQueryResult = [{count: 123}];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .range(100, 200)
      .then(function (res) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal('select count(*) as "count" from (select * from "Model" where "test" = \'100\') as temp');
        expect(executedQueries[1]).to.equal('select * from "Model" where "test" = \'100\' order by "order" asc limit \'101\' offset \'100\'');
        expect(res.total).to.equal(123);
        expect(res.results).to.eql(mockKnexQueryResult);
        done();
      })
      .catch(done);
  });

  it('page should return a page and the total count', function (done) {
    mockKnexQueryResult = [{count: 123}];
    QueryBuilder
      .forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .page(10, 100)
      .then(function (res) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal('select count(*) as "count" from (select * from "Model" where "test" = \'100\') as temp');
        expect(executedQueries[1]).to.equal('select * from "Model" where "test" = \'100\' order by "order" asc limit \'100\' offset \'1000\'');
        expect(res.total).to.equal(123);
        expect(res.results).to.eql(mockKnexQueryResult);
        done();
      })
      .catch(done);
  });

  it('isFindQuery should return true if none of the insert, update, patch, delete, relate or unrelate has been called', function () {
    expect(QueryBuilder.forClass(TestModel).isFindQuery()).to.equal(true);
    expect(QueryBuilder.forClass(TestModel).insert().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).update().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).patchOperationFactory(function (builder) { return createUpdateOperation(builder, {}); }).patch().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).delete().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).relateOperationFactory(function (builder) { return createUpdateOperation(builder, {}); }).relate(1).isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).unrelateOperationFactory(function (builder) { return createUpdateOperation(builder, {}); }).unrelate().isFindQuery()).to.equal(false);
  });

  it('update() should call $beforeUpdate on the model', function (done) {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    var model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .update(model)
      .then(function () {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'10\', "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('update() should call $beforeUpdate on the model (async)', function (done) {
    TestModel.prototype.$beforeUpdate = function () {
      var self = this;
      return Promise.delay(5).then(function () {
        self.c = 'beforeUpdate'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    var model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .update(model)
      .then(function () {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'10\', "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model', function (done) {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    var model = TestModel.fromJson({a: 10, b: 'test'});
    QueryBuilder
      .forClass(TestModel)
      .patch(model)
      .then(function () {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'10\', "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model (async)', function (done) {
    TestModel.prototype.$beforeUpdate = function () {
      var self = this;
      return Promise.delay(5).then(function () {
        self.c = 'beforeUpdate'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    var model = TestModel.fromJson({a: 10, b: 'test'})
    QueryBuilder
      .forClass(TestModel)
      .patch(model)
      .then(function () {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'10\', "b" = \'test\', "c" = \'beforeUpdate\'');
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model', function (done) {
    TestModel.prototype.$beforeInsert = function () {
      this.c = 'beforeInsert';
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder
      .forClass(TestModel)
      .insert(TestModel.fromJson({a: 10, b: 'test'}))
      .then(function (model) {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b", "c") values (\'10\', \'test\', \'beforeInsert\') returning "id"');
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model (async)', function (done) {
    TestModel.prototype.$beforeInsert = function () {
      var self = this;
      return Promise.delay(5).then(function () {
        self.c = 'beforeInsert'
      });
    };

    TestModel.prototype.$afterGet = function () {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder
      .forClass(TestModel)
      .insert({a: 10, b: 'test'})
      .then(function (model) {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b", "c") values (\'10\', \'test\', \'beforeInsert\') returning "id"');
        done();
      })
      .catch(done);
  });

  it('should call $afterGet on the model if no write operation is specified', function (done) {
    mockKnexQueryResult = [{
      a: 1
    }, {
      a: 2
    }];

    TestModel.prototype.$afterGet = function (context) {
      this.b = this.a * 2 + context.x;
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .then(function (models) {
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

  it('should call $afterGet on the model if no write operation is specified (async)', function (done) {
    mockKnexQueryResult = [{
      a: 1
    }, {
      a: 2
    }];

    TestModel.prototype.$afterGet = function (context) {
      var self = this;
      return Promise.delay(10).then(function () {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .then(function (models) {
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

  it('should call $afterGet before any `runAfter` hooks', function (done) {
    mockKnexQueryResult = [{
      a: 1
    }, {
      a: 2
    }];

    TestModel.prototype.$afterGet = function (context) {
      var self = this;
      return Promise.delay(10).then(function () {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder
      .forClass(TestModel)
      .context({x: 10})
      .runAfter(function (result, builder) {
        builder.context().x = 666;
        return result;
      })
      .then(function (models) {
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

  it('should not be able to call setQueryExecutor twice', function () {
    expect(function () {
      QueryBuilder
        .forClass(TestModel)
        .setQueryExecutor(function () {})
        .setQueryExecutor(function () {});
    }).to.throwException();
  });

  it('clearEager() should clear everything related to eager', function () {
    var builder = QueryBuilder
      .forClass(TestModel)
      .eager('a(f).b', {
        f: _.noop
      });

    expect(builder._eagerExpression).to.be.a(RelationExpression);
    expect(builder._eagerFilters).to.have.property('f');

    builder.clearEager();

    expect(builder._eagerExpression).to.equal(null);
    expect(builder._eagerFilters).to.equal(null);
  });

  it('clearReject() should clear remove explicit rejection', function () {
    var builder = QueryBuilder
      .forClass(TestModel)
      .reject('error');

    expect(builder._explicitRejectValue).to.equal('error');

    builder.clearReject();

    expect(builder._explicitRejectValue).to.equal(null);
  });

  describe('eager and allowEager' , function () {

    it("allowEager('a').eager('a(f1)') should be ok", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .eager('a(f1)', {f1: _.noop})
        .allowEager('a')
        .then(function () {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(function (err) {
          console.log(err.stack);
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a') should be ok", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('a')
        .then(function () {
          done();
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c') should be ok", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c')
        .then(function () {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(function () {
          done(new Error('should not get here'));
        })
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c.e') should be ok", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c.e')
        .then(function () {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(function () {
          done(new Error('should not get here'));
        })
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a.b') should fail", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('a.b')
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('a.b').allowEager('[a, b.c.[d, e]]') should fail", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .eager('a.b')
        .allowEager('[a, b.c.[d, e]]')
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('b.c.d.e').allowEager('[a, b.c.[d, e]]') should fail", function (done) {
      QueryBuilder
        .forClass(TestModel)
        .eager('b.c.d.e')
        .allowEager('[a, b.c.[d, e]]')
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("should use correct query builders", function (done) {
      var M1 = Model.extend(function M1() {
        Model.apply(this, arguments);
      });

      M1.tableName = 'M1';
      M1.knex(mockKnex);

      var M2 = Model.extend(function M2() {
        Model.apply(this, arguments);
      });

      M2.tableName = 'M2';
      M2.knex(mockKnex);

      var M3 = Model.extend(function M3() {
        Model.apply(this, arguments);
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

      var M1RelatedBuilder = QueryBuilder.extend(function M1RelatedBuilder() {
        QueryBuilder.apply(this, arguments);
      });

      var M2RelatedBuilder = QueryBuilder.extend(function M2RelatedBuilder() {
        QueryBuilder.apply(this, arguments);
      });

      M1.RelatedQueryBuilder = M1RelatedBuilder;
      M2.RelatedQueryBuilder = M2RelatedBuilder;

      mockKnexQueryResult = [{id: 1, m1Id: 2, m3Id: 3}];

      var filter1Check = false;
      var filter2Check = false;

      QueryBuilder
        .forClass(M1)
        .eager('m2.m3')
        .filterEager('m2', function (builder) {
          filter1Check = builder instanceof M1RelatedBuilder;
        })
        .filterEager('m2.m3', function (builder) {
          filter2Check = builder instanceof M2RelatedBuilder;
        })
        .then(function () {
          expect(executedQueries).to.eql([
            'select * from "M1"',
            'select * from "M2" where "M2"."m1Id" in (\'1\')',
            'select * from "M3" where "M3"."id" in (\'3\')'
          ]);

          expect(filter1Check).to.equal(true);
          expect(filter2Check).to.equal(true);

          done();
        })
        .catch(done);
    });

  });

});

function createFindOperation(builder, whereObj) {
  var method = new QueryBuilderOperation(builder, "find");

  method.onBuild = function (knexBuilder) {
    knexBuilder.where(whereObj);
  };

  return method;
}

function createInsertOperation(builder, mergeWithModel) {
  var method = new QueryBuilderOperation(builder, "insert");
  method.isWriteOperation = true;

  method.call = function (builder, args) {
    this.model = args[0];
    return true;
  };

  method.onBuild = function (knexBuilder) {
    var json = _.merge(this.model, mergeWithModel);
    knexBuilder.insert(json);
  };

  return method;
}

function createUpdateOperation(builder, mergeWithModel) {
  var method = new QueryBuilderOperation(builder, "update");
  method.isWriteOperation = true;

  method.call = function (builder, args) {
    this.model = args[0];
    return true;
  };

  method.onBuild = function (knexBuilder) {
    var json = _.merge(this.model, mergeWithModel);
    knexBuilder.update(json);
  };

  return method;
}

function createDeleteOperation(builder, whereObj) {
  var method = new QueryBuilderOperation(builder, "delete");
  method.isWriteOperation = true;

  method.onBuild = function (knexBuilder) {
    knexBuilder.delete().where(whereObj);
  };

  return method;
}