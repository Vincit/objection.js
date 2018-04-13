const _ = require('lodash'),
  Knex = require('knex'),
  expect = require('expect.js'),
  chai = require('chai'),
  Promise = require('bluebird'),
  objection = require('../../../'),
  knexUtils = require('../../../lib/utils/knexUtils'),
  knexMocker = require('../../../testUtils/mockKnex'),
  ref = objection.ref,
  Model = objection.Model,
  QueryBuilder = objection.QueryBuilder,
  QueryBuilderBase = objection.QueryBuilderBase,
  RelationExpression = objection.RelationExpression;

describe('QueryBuilder', () => {
  let mockKnexQueryResults = [];
  let mockKnexQueryResultIndex = 0;
  let executedQueries = [];
  let mockKnex = null;
  let TestModel = null;

  before(() => {
    let knex = Knex({ client: 'pg' });

    mockKnex = knexMocker(knex, function(mock, oldImpl, args) {
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

    TestModel = class TestModel extends Model {
      static get tableName() {
        return 'Model';
      }
    };

    TestModel.knex(mockKnex);
  });

  it("should throw if model doesn't have a `tableName`", done => {
    class TestModel extends Model {
      // no tableName
    }

    TestModel.query(mockKnex)
      .then(() => done(new Error('should not get here')))
      .catch(err => {
        expect(err.message).to.equal('Model TestModel must have a static property tableName');
        done();
      })
      .catch(done);
  });

  it('should have knex methods', () => {
    let ignore = [
      'and',
      'toSQL',
      'timeout',
      'connection',
      'stream',
      'finally',
      'yield',
      'ensure',
      'reflect',
      'domain',
      'setMaxListeners',
      'getMaxListeners',
      'emit',
      'addListener',
      'on',
      'prependListener',
      'once',
      'prependOnceListener',
      'removeListener',
      'removeAllListeners',
      'listeners',
      'listenerCount',
      'eventNames',
      'rawListeners'
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

    builder.modify(function(b) {
      called = true;
      expect(b === builder).to.equal(true);
      expect(this === builder).to.equal(true);
    });

    expect(called).to.equal(true);
  });

  it('modify() accept a list of strings and call the corresponding named filters', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let aCalled = false;
    let bCalled = false;

    TestModel.namedFilters = {
      a(qb) {
        aCalled = qb === builder;
      },

      b(qb) {
        bCalled = qb === builder;
      }
    };

    builder.modify('a', 'b');

    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(true);
  });

  it('applyFilter() accept a list of strings and call the corresponding named filters', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let aCalled = false;
    let bCalled = false;

    TestModel.namedFilters = {
      a(qb) {
        aCalled = qb === builder;
      },

      b(qb) {
        bCalled = qb === builder;
      }
    };

    builder.applyFilter('a', 'b');

    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(true);
  });

  it('should call the callback passed to .then after execution', done => {
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];
    // Make sure the callback is called by not returning a promise from the test.
    // Instead call the `done` function so that the test times out if the callback
    // is not called.
    QueryBuilder.forClass(TestModel)
      .then(result => {
        expect(result).to.eql(mockKnexQueryResults[0]);
        done();
      })
      .catch(done);
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

  it('should return a promise from .reduce method', () => {
    let promise = QueryBuilder.forClass(TestModel).reduce(_.identity);
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
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];
    QueryBuilder.forClass(TestModel).asCallback((err, models) => {
      expect(models).to.eql(mockKnexQueryResults[0]);
      done();
    });
  });

  it('should pass node-style values to the nodeify method', done => {
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];
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
    return QueryBuilder.forClass(TestModel)
      .select('name', 'id', 'age')
      .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
      .where('id', 10)
      .where('height', '>', 180)
      .where({ name: 'test' })
      .orWhere(function(builder) {
        // The builder passed to these functions should be a QueryBuilderBase instead of
        // knex query builder.
        expect(this).to.equal(builder);
        expect(this).to.be.a(QueryBuilderBase);
        this.where('age', '<', 10).andWhere('eyeColor', 'blue');
      })
      .then(() => {
        expect(executedQueries).to.eql([
          [
            'select "name", "id", "age" from "Model"',
            'inner join "AnotherTable" on "AnotherTable"."modelId" = "Model"."id"',
            'where "id" = 10',
            'and "height" > 180',
            'and "name" = \'test\'',
            'or ("age" < 10 and "eyeColor" = \'blue\')'
          ].join(' ')
        ]);
      });
  });

  describe('where(..., ref(...))', () => {
    it('should create a where clause using column references instead of values (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .where('SomeTable.someColumn', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should create a where clause using column references instead of values (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .where('SomeTable.someColumn', '>', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" > "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(
        QueryBuilder.forClass(TestModel)
          .where('SomeTable.someColumn', 'lol', ref('SomeOtherTable.someOtherColumn'))
          .toString()
      ).to.equal(
        'This query cannot be built synchronously. Consider using debug() method instead.'
      );
    });

    it('orWhere(..., ref(...)) should create a where clause using column references instead of values', () => {
      return QueryBuilder.forClass(TestModel)
        .where('id', 10)
        .orWhere('SomeTable.someColumn', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "id" = 10 or "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
          ]);
        });
    });
  });

  describe('whereComposite', () => {
    it('should create multiple where queries', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], '>', [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "A"."a" > 1 and "B"."b" > 2'
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(
        QueryBuilder.forClass(TestModel)
          .whereComposite('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toString()
      ).to.equal(
        'This query cannot be built synchronously. Consider using debug() method instead.'
      );
    });

    it('operator should default to `=`', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "A"."a" = 1 and "B"."b" = 2'
          ]);
        });
    });

    it('should work like a normal `where` when one column is given (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a'], 1)
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" = 1']);
        });
    });

    it('should work like a normal `where` when one column is given (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite('A.a', 1)
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" = 1']);
        });
    });
  });

  describe('whereInComposite', () => {
    it('should create a where-in query for composite id and array of choices', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], [[1, 2], [3, 4]])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a", "B"."b") in ((1, 2), (3, 4))'
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a'], [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (3)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', [1, 3])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (4)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', TestModel.query().select('a'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "A"."a" in (select "a" from "Model")'
          ]);
        });
    });

    it('should create a where-in query for composite id and a subquery', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], TestModel.query().select('a', 'b'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a","B"."b") in (select "a", "b" from "Model")'
          ]);
        });
    });
  });

  it('should convert array query result into Model instances', () => {
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];

    return QueryBuilder.forClass(TestModel).then(result => {
      expect(result).to.have.length(2);
      expect(result[0]).to.be.a(TestModel);
      expect(result[1]).to.be.a(TestModel);
      expect(result).to.eql(mockKnexQueryResults[0]);
    });
  });

  it('should convert an object query result into a Model instance', () => {
    mockKnexQueryResults = [{ a: 1 }];

    return QueryBuilder.forClass(TestModel).then(result => {
      expect(result).to.be.a(TestModel);
      expect(result.a).to.equal(1);
    });
  });

  it('should pass the query builder as `this` and parameter for the hooks', done => {
    let text = '';

    QueryBuilder.forClass(TestModel)
      .runBefore(function(result, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'a';
      })
      .onBuild(function(builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'b';
      })
      .onBuildKnex(function(knexBuilder, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(knexUtils.isKnexQueryBuilder(knexBuilder)).to.equal(true);
        expect(this).to.equal(knexBuilder);
        text += 'c';
      })
      .runAfter(function(data, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'd';
      })
      .runAfter(function(data, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        text += 'e';
      })
      .runAfter(() => {
        throw new Error('abort');
      })
      .onError(function(err, builder) {
        expect(builder).to.be.a(QueryBuilder);
        expect(this).to.equal(builder);
        expect(err.message).to.equal('abort');
        text += 'f';
      })
      .then(() => {
        expect(text).to.equal('abcdef');
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
    QueryBuilder.forClass(TestModel)
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
      })
      .catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', done => {
    QueryBuilder.forClass(TestModel)
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
    QueryBuilder.forClass(TestModel)
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
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory(function(builder) {
        expect(builder).to.equal(this);
        return createFindOperation(builder, { a: 1 });
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('select "Model".* from "Model" where "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if insert is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, { a: 1 });
      })
      .insert({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (1) returning "id"');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if update is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, { a: 1 });
      })
      .update({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if delete is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory(builder => {
        return createFindOperation(builder, { a: 1 });
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model"');
      });
  });

  it('should call custom insert implementation defined by insertOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .insertOperationFactory(builder => {
        return createInsertOperation(builder, { b: 2 });
      })
      .insert({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom update implementation defined by updateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .updateOperationFactory(builder => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .update({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom patch implementation defined by patchOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .patchOperationFactory(builder => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .patch({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom delete implementation defined by deleteOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .deleteOperationFactory(builder => {
        return createDeleteOperation(builder, { id: 100 });
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  it('should call custom relate implementation defined by relateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .relateOperationFactory(builder => {
        return createInsertOperation(builder, { b: 2 });
      })
      .relate({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom unrelate implementation defined by unrelateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .unrelateOperationFactory(builder => {
        return createDeleteOperation(builder, { id: 100 });
      })
      .unrelate()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  it('should be able to execute same query multiple times', () => {
    let query = QueryBuilder.forClass(TestModel)
      .updateOperationFactory(builder => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .where('test', '<', 100)
      .update({ a: 1 });

    query
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toString()).to.equal(executedQueries[0]);
        expect(query.toSql()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100'
        );
        executedQueries = [];
        return query;
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toString()).to.equal(executedQueries[0]);
        expect(query.toSql()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100'
        );
        executedQueries = [];
        return query;
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toString()).to.equal(executedQueries[0]);
        expect(query.toSql()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100'
        );
      });
  });

  it('resultSize should create and execute a query that returns the size of the query', done => {
    mockKnexQueryResults = [[{ count: 123 }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .resultSize()
      .then(res => {
        expect(executedQueries).to.have.length(1);
        expect(res).to.equal(123);
        // resultSize should cancel the groupBy call since it doesn't affect the outcome.
        expect(executedQueries[0]).to.equal(
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"'
        );
        done();
      })
      .catch(done);
  });

  it('range should return a range and the total count', done => {
    mockKnexQueryResults = [[{ a: 1 }], [{ count: 123 }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .range(100, 200)
      .then(res => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          'select "Model".* from "Model" where "test" = 100 order by "order" asc limit 101 offset 100',
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"'
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{ a: 1 }]);
        done();
      })
      .catch(done);
  });

  it('page should return a page and the total count', done => {
    mockKnexQueryResults = [[{ a: 1 }], [{ count: 123 }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .page(10, 100)
      .then(res => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          'select "Model".* from "Model" where "test" = 100 order by "order" asc limit 100 offset 1000',
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"'
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{ a: 1 }]);
        done();
      })
      .catch(done);
  });

  it('isFind, isInsert, isUpdate, isPatch, isDelete, isRelate, isUnrelate should return true only for the right operations', () => {
    TestModel.relationMappings = {
      someRel: {
        relation: Model.HasManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          to: 'Model.someRelId'
        }
      }
    };

    const queries = {
      find: TestModel.query(),
      insert: TestModel.query().insert(),
      update: TestModel.query().update(),
      patch: TestModel.query().patch(),
      delete: TestModel.query().delete(),
      relate: TestModel.relatedQuery('someRel').relate(1),
      unrelate: TestModel.relatedQuery('someRel').unrelate()
    };

    // Check all types of operations, call all available checks for reach of them,
    // (e.g. isFind(), isUpdate(), etc) and see if they return the expected result.
    const getMethodName = name => `is${_.capitalize(name === 'patch' ? 'update' : name)}`;

    for (const name in queries) {
      const query = queries[name];
      for (const other in queries) {
        const method = getMethodName(other);
        chai
          .expect(query[method](), `queries.${name}.${method}()`)
          .to.equal(method === getMethodName(name));
        chai.expect(query.hasWheres(), `queries.${name}.hasWheres()`).to.equal(false);
        chai.expect(query.hasSelects(), `queries.${name}.hasSelects()`).to.equal(false);
      }
    }
  });

  it('hasWheres() should return true for all variants of where queries', () => {
    const wheres = [
      'where',
      'andWhere',
      'orWhere',
      'whereNot',
      'orWhereNot',
      'whereRaw',
      'whereWrapped',
      'orWhereRaw',
      'whereExists',
      'orWhereExists',
      'whereNotExists',
      'orWhereNotExists',
      'whereIn',
      'orWhereIn',
      'whereNotIn',
      'orWhereNotIn',
      'whereNull',
      'orWhereNull',
      'whereNotNull',
      'orWhereNotNull',
      'whereBetween',
      'andWhereBetween',
      'whereNotBetween',
      'andWhereNotBetween',
      'orWhereBetween',
      'orWhereNotBetween'
    ];

    for (let i = 0; i < wheres.length; i++) {
      const name = wheres[i];
      const query = TestModel.query()[name]();
      chai.expect(query.hasWheres(), `TestModel.query().${name}().hasWheres()`).to.equal(true);
    }
  });

  it('hasSelects() should return true for all variants of select queries', () => {
    const selects = [
      'select',
      'columns',
      'column',
      'distinct',
      'count',
      'countDistinct',
      'min',
      'max',
      'sum',
      'sumDistinct',
      'avg',
      'avgDistinct'
    ];

    for (let i = 0; i < selects.length; i++) {
      const name = selects[i];
      const query = TestModel.query()[name]('arg');
      chai
        .expect(query.hasSelects(), `TestModel.query().${name}('arg').hasSelects()`)
        .to.equal(true);
    }
  });

  it('hasEager() should return true for queries with eager statements', () => {
    TestModel.relationMappings = {
      someRel: {
        relation: Model.HasManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          to: 'Model.someRelId'
        }
      }
    };

    const query = TestModel.query();
    expect(query.hasEager(), false);
    query.eager('someRel');
    expect(query.hasEager(), true);
    query.clearEager();
    expect(query.hasEager(), false);
  });

  it('has() should match defined query operations', () => {
    // A bunch of random operations to test against.
    const operations = [
      'range',
      'orderBy',
      'limit',
      'where',
      'andWhere',
      'whereRaw',
      'havingWrapped',
      'rightOuterJoin',
      'crossJoin',
      'offset',
      'union',
      'count',
      'avg',
      'with'
    ];
    const test = (query, name, expected) => {
      const regexp = new RegExp(`^${name}$`);
      chai
        .expect(query.has(name), `TestModel.query().${name}('arg').has('${name}')`)
        .to.equal(expected);
      chai
        .expect(query.has(regexp), `TestModel.query().${name}('arg').has(${regexp})`)
        .to.equal(expected);
    };

    operations.forEach(operation => {
      const query = TestModel.query()[operation]('arg');
      operations.forEach(testOperation => {
        test(query, testOperation, testOperation === operation);
      });
    });
  });

  it('clear() should remove matching query operations', () => {
    // A bunch of random operations to test against.
    const operations = ['where', 'limit', 'offset', 'count'];

    operations.forEach(operation => {
      const query = TestModel.query();
      operations.forEach(operation => query[operation]('arg'));
      chai.expect(query.has(operation), `query().has('${operation}')`).to.equal(true);
      chai
        .expect(
          query.clear(operation).has(operation),
          `query().clear('${operation}').has('${operation}')`
        )
        .to.equal(false);
      operations.forEach(testOperation => {
        chai
          .expect(query.has(testOperation), `query().has('${testOperation}')`)
          .to.equal(testOperation !== operation);
      });
    });
  });

  it('update() should call $beforeUpdate on the model', done => {
    TestModel.prototype.$beforeUpdate = function() {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\''
        );
        done();
      })
      .catch(done);
  });

  it('update() should call $beforeUpdate on the model (async)', done => {
    TestModel.prototype.$beforeUpdate = function() {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeUpdate';
      });
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\''
        );
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model', done => {
    TestModel.prototype.$beforeUpdate = function() {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\''
        );
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model (async)', done => {
    TestModel.prototype.$beforeUpdate = function() {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeUpdate';
      });
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\''
        );
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model', done => {
    TestModel.prototype.$beforeInsert = function() {
      this.c = 'beforeInsert';
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder.forClass(TestModel)
      .insert(TestModel.fromJson({ a: 10, b: 'test' }))
      .then(model => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal(
          'insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"'
        );
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model (async)', done => {
    TestModel.prototype.$beforeInsert = function() {
      let self = this;
      return Promise.delay(5).then(() => {
        self.c = 'beforeInsert';
      });
    };

    TestModel.prototype.$afterGet = function() {
      throw new Error('$afterGet should not be called');
    };

    QueryBuilder.forClass(TestModel)
      .insert({ a: 10, b: 'test' })
      .then(model => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal(
          'insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"'
        );
        done();
      })
      .catch(done);
  });

  it('should call $afterGet on the model if no write operation is specified', done => {
    mockKnexQueryResults = [
      [
        {
          a: 1
        },
        {
          a: 2
        }
      ]
    ];

    TestModel.prototype.$afterGet = function(context) {
      this.b = this.a * 2 + context.x;
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12
          },
          {
            a: 2,
            b: 14
          }
        ]);
        done();
      })
      .catch(done);
  });

  it('should call $afterGet on the model if no write operation is specified (async)', done => {
    mockKnexQueryResults = [
      [
        {
          a: 1
        },
        {
          a: 2
        }
      ]
    ];

    TestModel.prototype.$afterGet = function(context) {
      let self = this;
      return Promise.delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12
          },
          {
            a: 2,
            b: 14
          }
        ]);
        done();
      })
      .catch(done);
  });

  it('should call $afterGet before any `runAfter` hooks', done => {
    mockKnexQueryResults = [
      [
        {
          a: 1
        },
        {
          a: 2
        }
      ]
    ];

    TestModel.prototype.$afterGet = function(context) {
      let self = this;
      return Promise.delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .runAfter((result, builder) => {
        builder.context().x = 666;
        return result;
      })
      .then(models => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12
          },
          {
            a: 2,
            b: 14
          }
        ]);
        done();
      })
      .catch(done);
  });

  it('should not be able to call setQueryExecutor twice', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel)
        .setQueryExecutor(function() {})
        .setQueryExecutor(function() {});
    }).to.throwException();
  });

  it('clearEager() should clear everything related to eager', () => {
    let builder = QueryBuilder.forClass(TestModel)
      .eager('a(f).b', {
        f: _.noop
      })
      .filterEager('a', _.noop);

    expect(builder._eagerExpression).to.be.a(RelationExpression);
    expect(builder._eagerFiltersAtPath).to.have.length(1);

    builder.clearEager();

    expect(builder._eagerExpression).to.equal(null);
    expect(builder._eagerFiltersAtPath).to.have.length(0);
  });

  it('clearReject() should clear remove explicit rejection', () => {
    let builder = QueryBuilder.forClass(TestModel).reject('error');

    expect(builder._explicitRejectValue).to.equal('error');

    builder.clearReject();

    expect(builder._explicitRejectValue).to.equal(null);
  });

  it('joinRelation should add join clause to correct place', done => {
    class M1 extends Model {
      static get tableName() {
        return 'M1';
      }
    }

    class M2 extends Model {
      static get tableName() {
        return 'M2';
      }

      static get relationMappings() {
        return {
          m1: {
            relation: Model.HasManyRelation,
            modelClass: M1,
            join: {
              from: 'M2.id',
              to: 'M1.m2Id'
            }
          }
        };
      }
    }

    M1.knex(mockKnex);
    M2.knex(mockKnex);

    M2.query()
      .joinRelation('m1', { alias: 'm' })
      .join('M1', 'M1.id', 'M2.m1Id')
      .then(() => {
        expect(executedQueries[0]).to.equal(
          'select "M2".* from "M2" inner join "M1" as "m" on "m"."m2Id" = "M2"."id" inner join "M1" on "M1"."id" = "M2"."m1Id"'
        );
        done();
      })
      .catch(done);
  });

  it('undefined values as query builder method arguments should raise an exception', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel)
        .where('id', undefined)
        .build();
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "undefined passed as argument #1 for 'where' operation. Call skipUndefined() method to ignore the undefined values."
      );
    });

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .orWhere('id', '<', undefined)
        .build();
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "undefined passed as argument #2 for 'orWhere' operation. Call skipUndefined() method to ignore the undefined values."
      );
    });

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .orWhere('id', undefined, 10)
        .build();
    }).to.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .delete()
        .whereIn('id', undefined)
        .build();
    }).to.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .delete()
        .whereIn('id', [1, undefined, 3])
        .build();
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "undefined passed as an item in argument #1 for 'whereIn' operation. Call skipUndefined() method to ignore the undefined values."
      );
    });
  });

  it('undefined values as query builder method arguments should be ignored if `skipUndefined` is called', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .where('id', undefined)
        .build();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .orWhere('id', '<', undefined)
        .build();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .orWhere('id', undefined, 10)
        .build();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .deleteById(undefined)
        .build();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', undefined)
        .build();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', [1, undefined, 3])
        .build();
    }).to.not.throwException();
  });

  it('all query builder methods should work if model is not bound to a knex, when the query is', () => {
    class UnboundModel extends Model {
      static get tableName() {
        return 'Bar';
      }
    }

    expect(
      UnboundModel.query(mockKnex)
        .increment('foo', 10)
        .toString()
    ).to.equal('update "Bar" set "foo" = "foo" + 10');
    expect(
      UnboundModel.query(mockKnex)
        .decrement('foo', 5)
        .toString()
    ).to.equal('update "Bar" set "foo" = "foo" - 5');
  });

  it('first should not add limit(1) by default', () => {
    return TestModel.query()
      .first()
      .then(model => {
        expect(executedQueries[0]).to.equal('select "Model".* from "Model"');
      });
  });

  it('first should add limit(1) if Model.useLimitInFirst = true', () => {
    TestModel.useLimitInFirst = true;

    return TestModel.query()
      .first()
      .then(model => {
        expect(executedQueries[0]).to.equal('select "Model".* from "Model" limit 1');
      });
  });

  describe('eager, allowEager, and mergeAllowEager', () => {
    beforeEach(() => {
      const rel = {
        relation: TestModel.BelongsToOneRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.foo',
          to: 'Model.id'
        }
      };

      TestModel.relationMappings = {
        a: rel,
        b: rel,
        c: rel,
        d: rel,
        e: rel
      };
    });

    it("allowEager('a').eager('a(f1)') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('a')
        .eager('a(f1)', { f1: _.noop })
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(err => {
          done(new Error('should not get here'));
        });
    });

    it("eager('a(f1)').allowEager('a') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .eager('a(f1)', { f1: _.noop })
        .allowEager('a')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(err => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('a')
        .then(() => {
          done();
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a, b.c.[d, e]]').eager('b.c.e') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .eager('b.c.e')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("mergeAllowEager('a').eager('a(f1)') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .mergeAllowEager('a')
        .eager('a(f1)', { f1: _.noop })
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(err => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a, b.c.[a, e]]').mergeAllowEager('b.c.[b, d]').eager('a') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a, b.c.[a, e]]')
        .mergeAllowEager('b.c.[b, d]')
        .eager('a')
        .then(() => {
          done();
        });
    });

    it("allowEager('[a.[a, b], b.c.[a, e]]').mergeAllowEager('[a.[c, d], b.c.[b, d]]').eager('a.b') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a.[a, b], b.c.[a, e]]')
        .mergeAllowEager('[a.[c, d], b.c.[b, d]]')
        .eager('a.b')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a.[a, b], b.[a, c]]').mergeAllowEager('[a.[c, d], b.c.[b, d]]').eager('a.c') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a.[a, b], b.[a, c]]')
        .mergeAllowEager('[a.[c, d], b.c.[b, d]]')
        .eager('a.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a.[a, b], b.[a, c]]').mergeAllowEager('[a.[c, d], b.c.[b, d]]').eager('b.a') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a.[a, b], b.[a, c]]')
        .mergeAllowEager('[a.[c, d], b.c.[b, d]]')
        .eager('b.a')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a.[a, b], b.[a, c]]').mergeAllowEager('[a.[c, d], b.c.[b, d]]').eager('b.c') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a.[a, b], b.[a, c]]')
        .mergeAllowEager('[a.[c, d], b.c.[b, d]]')
        .eager('b.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('[a.[a, b], b.[a, c]]').mergeAllowEager('[a.[c, d], b.c.[b, d]]').eager('b.c.b') should be ok", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a.[a, b], b.[a, c]]')
        .mergeAllowEager('[a.[c, d], b.c.[b, d]]')
        .eager('b.c.b')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowEager('a').allowEager('b').eager('a') should fail", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('a')
        .allowEager('b')
        .eager('a')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(err => {
          expect(err).to.be.a(objection.ValidationError);
          expect(err.type).to.equal('UnallowedRelation');
          expect(err.message).to.equal('eager expression not allowed');
          expect(executedQueries).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it("allowEager('[a, b.c.[d, e]]').eager('a.b') should fail", done => {
      QueryBuilder.forClass(TestModel)
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

    it("allowEager('[a, b.c.[d, e]]').mergeAllowEager('a.[c, d]').eager('a.b') should fail", done => {
      QueryBuilder.forClass(TestModel)
        .allowEager('[a, b.c.[d, e]]')
        .mergeAllowEager('a.[c, d]')
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
      QueryBuilder.forClass(TestModel)
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

    it("eager('a.b').allowEager('[a, b.c.[d, e]]').mergeAllowEager('a.[c, d]') should fail", done => {
      QueryBuilder.forClass(TestModel)
        .eager('a.b')
        .allowEager('[a, b.c.[d, e]]')
        .mergeAllowEager('a.[c, d]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('b.c.d.e').allowEager('[a, b.c.[d, e]]') should fail", done => {
      QueryBuilder.forClass(TestModel)
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

    it("eager('b.c.d.e').allowEager('[a, b.c.[d, e]]').mergeAllowEager('b.c.a') should fail", done => {
      QueryBuilder.forClass(TestModel)
        .eager('b.c.d.e')
        .allowEager('[a, b.c.[d, e]]')
        .mergeAllowEager('b.c.a')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it('should use correct query builders', done => {
      class M1QueryBuilder extends QueryBuilder {}
      class M2QueryBuilder extends QueryBuilder {}
      class M3QueryBuilder extends QueryBuilder {}

      class M1 extends Model {
        static get tableName() {
          return 'M1';
        }

        static get relationMappings() {
          return {
            m2: {
              relation: Model.HasManyRelation,
              modelClass: M2,
              join: {
                from: 'M1.id',
                to: 'M2.m1Id'
              }
            }
          };
        }

        static get QueryBuilder() {
          return M1QueryBuilder;
        }
      }

      class M2 extends Model {
        static get tableName() {
          return 'M2';
        }

        static get relationMappings() {
          return {
            m3: {
              relation: Model.BelongsToOneRelation,
              modelClass: M3,
              join: {
                from: 'M2.m3Id',
                to: 'M3.id'
              }
            }
          };
        }

        static get QueryBuilder() {
          return M2QueryBuilder;
        }
      }

      class M3 extends Model {
        static get tableName() {
          return 'M3';
        }

        static get QueryBuilder() {
          return M3QueryBuilder;
        }
      }

      M1.knex(mockKnex);
      M2.knex(mockKnex);
      M3.knex(mockKnex);

      mockKnexQueryResults = [
        [{ id: 1, m1Id: 2, m3Id: 3 }],
        [{ id: 1, m1Id: 2, m3Id: 3 }],
        [{ id: 1, m1Id: 2, m3Id: 3 }]
      ];

      let filter1Check = false;
      let filter2Check = false;

      QueryBuilder.forClass(M1)
        .eager('m2.m3')
        .filterEager('m2', builder => {
          filter1Check = builder instanceof M2QueryBuilder;
        })
        .filterEager('m2.m3', builder => {
          filter2Check = builder instanceof M3QueryBuilder;
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

    it('$afterGet should be called after relations have been fetched', done => {
      class M1 extends Model {
        static get tableName() {
          return 'M1';
        }

        $afterGet() {
          this.ids = _.map(this.someRel, 'id');
        }

        static get relationMappings() {
          return {
            someRel: {
              relation: Model.HasManyRelation,
              modelClass: M1,
              join: {
                from: 'M1.id',
                to: 'M1.m1Id'
              }
            }
          };
        }
      }

      M1.knex(mockKnex);

      mockKnexQueryResults = [
        [{ id: 1 }, { id: 2 }],
        [{ id: 3, m1Id: 1 }, { id: 4, m1Id: 1 }, { id: 5, m1Id: 2 }, { id: 6, m1Id: 2 }],
        [
          { id: 7, m1Id: 3 },
          { id: 8, m1Id: 3 },
          { id: 9, m1Id: 4 },
          { id: 10, m1Id: 4 },
          { id: 11, m1Id: 5 },
          { id: 12, m1Id: 5 },
          { id: 13, m1Id: 6 },
          { id: 14, m1Id: 6 }
        ]
      ];

      QueryBuilder.forClass(M1)
        .eager('someRel.someRel')
        .then(x => {
          expect(executedQueries).to.eql([
            'select "M1".* from "M1"',
            'select "M1".* from "M1" where "M1"."m1Id" in (1, 2)',
            'select "M1".* from "M1" where "M1"."m1Id" in (3, 4, 5, 6)'
          ]);

          expect(x).to.eql([
            {
              id: 1,
              ids: [3, 4],
              someRel: [
                {
                  id: 3,
                  m1Id: 1,
                  ids: [7, 8],
                  someRel: [{ id: 7, m1Id: 3, ids: [] }, { id: 8, m1Id: 3, ids: [] }]
                },
                {
                  id: 4,
                  m1Id: 1,
                  ids: [9, 10],
                  someRel: [{ id: 9, m1Id: 4, ids: [] }, { id: 10, m1Id: 4, ids: [] }]
                }
              ]
            },
            {
              id: 2,
              ids: [5, 6],
              someRel: [
                {
                  id: 5,
                  m1Id: 2,
                  ids: [11, 12],
                  someRel: [{ id: 11, m1Id: 5, ids: [] }, { id: 12, m1Id: 5, ids: [] }]
                },
                {
                  id: 6,
                  m1Id: 2,
                  ids: [13, 14],
                  someRel: [{ id: 13, m1Id: 6, ids: [] }, { id: 14, m1Id: 6, ids: [] }]
                }
              ]
            }
          ]);

          done();
        })
        .catch(done);
    });
  });

  describe('context', () => {
    it('context() should replace context', () => {
      const builder = TestModel.query();

      builder.context({ a: 1 });
      builder.context({ b: 2 });

      expect(builder.context()).to.eql({
        b: 2
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('`mergeContext` should merge context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);
      builder.mergeContext({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(origContext).to.eql({
        a: 1
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('`mergeContext` can be called without `context` having been called', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.mergeContext(origContext);
      builder.mergeContext({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(origContext).to.eql({
        a: 1
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('cloning a query builder should clone the context also', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = builder.clone();
      builder2.mergeContext({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(origContext).to.eql({
        a: 1
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('calling `childQueryOf` should copy a reference of the context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = TestModel.query().childQueryOf(builder);
      builder2.mergeContext({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(origContext).to.eql({
        a: 1
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('calling `childQueryOf(builder, true)` should copy the context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = TestModel.query().childQueryOf(builder, true);
      builder2.mergeContext({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2
      });

      expect(origContext).to.eql({
        a: 1
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('values saved to context in hooks should be available later', () => {
      let foo = null;

      TestModel = class extends TestModel {
        $beforeUpdate(opt, ctx) {
          ctx.foo = 100;
        }

        $afterUpdate(opt, ctx) {
          foo = ctx.foo;
        }
      };

      return TestModel.query()
        .patch({ a: 1 })
        .then(() => {
          expect(foo).to.equal(100);
        });
    });

    describe('executeOnBuild', () => {
      it('should move added operations right after the adding operation (push)', () => {
        const builder = QueryBuilder.forClass(TestModel);
        const calls = [];

        builder._operations = [
          op(builder => {
            calls.push(0);
          }),

          op(builder => {
            calls.push(1);

            // This should be called next even though we add it to the end.
            builder._operations.push(
              op(() => {
                calls.push(2);
              })
            );
          }),

          op(builder => {
            calls.push(3);
          })
        ];

        builder.executeOnBuild();
        expect(calls).to.eql([0, 1, 2, 3]);
      });

      it('should move added operations right after the adding operation (concat)', () => {
        const builder = QueryBuilder.forClass(TestModel);
        const calls = [];

        builder._operations = [
          op(builder => {
            calls.push(0);
          }),

          op(builder => {
            calls.push(1);

            // This should be called next even though we add it to the end.
            builder._operations = builder._operations.concat(
              op(() => {
                calls.push(2);
              })
            );
          }),

          op(builder => {
            calls.push(3);
          })
        ];

        builder.executeOnBuild();
        expect(calls).to.eql([0, 1, 2, 3]);
      });

      it('should work if an operation removes a bunch of other operations', () => {
        const builder = QueryBuilder.forClass(TestModel);
        const calls = [];

        builder._operations = [
          op(builder => {
            calls.push(0);
          }),

          op(builder => {
            calls.push(1);
          }),

          op(builder => {
            calls.push(2);
          }),

          op(builder => {
            calls.push(3);

            builder._operations = [builder._operations[3], builder._operations[5]];
          }),

          op(builder => {
            calls.push(4);
          }),

          op(builder => {
            calls.push(5);
          })
        ];

        builder.executeOnBuild();
        expect(calls).to.eql([0, 1, 2, 3, 5]);
      });

      it('should work if an operation removes and adds a bunch of other operations', () => {
        const builder = QueryBuilder.forClass(TestModel);
        const calls = [];

        builder._operations = [
          op(builder => {
            calls.push(0);
          }),

          op(builder => {
            calls.push(1);
          }),

          op(builder => {
            calls.push(2);
          }),

          op(builder => {
            calls.push(3);

            builder._operations = [
              builder._operations[3],
              builder._operations[5],

              op(builder => {
                calls.push(4);
              }),

              op(builder => {
                calls.push(5);
              })
            ];
          }),

          op(builder => {
            calls.push(6);
          }),

          op(builder => {
            calls.push(7);
          })
        ];

        builder.executeOnBuild();
        expect(calls).to.eql([0, 1, 2, 3, 4, 5, 7]);
      });

      function op(onBuild) {
        return { onBuild };
      }
    });
  });
});

const operationBuilder = QueryBuilder.forClass(Model);

function createFindOperation(builder, whereObj) {
  const operation = operationBuilder._findOperationFactory(builder);

  operation.onBefore2 = operation.onAfter2 = () => {};

  operation.onBuildKnex = knexBuilder => {
    knexBuilder.where(whereObj);
  };

  return operation;
}

function createInsertOperation(builder, mergeWithModel) {
  const operation = operationBuilder._insertOperationFactory(builder);

  operation.onBefore2 = operation.onAfter2 = () => {};

  operation.onAdd = function(builder, args) {
    this.models = [args[0]];
    return true;
  };

  operation.onBuildKnex = function(knexBuilder) {
    let json = _.merge(this.models[0], mergeWithModel);
    knexBuilder.insert(json);
  };

  return operation;
}

function createUpdateOperation(builder, mergeWithModel) {
  const operation = operationBuilder._updateOperationFactory(builder);

  operation.onBefore2 = operation.onAfter2 = () => {};

  operation.onAdd = function(builder, args) {
    this.models = [args[0]];
    return true;
  };

  operation.onBuildKnex = function(knexBuilder) {
    let json = _.merge(this.models[0], mergeWithModel);
    knexBuilder.update(json);
  };

  return operation;
}

function createDeleteOperation(builder, whereObj) {
  const operation = operationBuilder._updateOperationFactory(builder);

  operation.onBefore2 = operation.onAfter2 = () => {};

  operation.onBuildKnex = knexBuilder => {
    knexBuilder.delete().where(whereObj);
  };

  return operation;
}
