var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , Model = require('../../lib/Model')
  , QueryBuilder = require('../../lib/QueryBuilder');

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

    builder.call(function (b) {
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
      .orWhere(function () {
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

  it('whereRef should create a where clause using column references instead of values (1)', function () {
    return QueryBuilder
      .forClass(TestModel)
      .whereRef('SomeTable.someColumn', 'SomeOtherTable.someOtherColumn')
      .then(function () {
        expect(executedQueries).to.eql([
          'select * from "Model" where "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"'
        ]);
      });
  });

  it('whereRef should create a where clause using column references instead of values (2)', function () {
    return QueryBuilder
      .forClass(TestModel)
      .whereRef('SomeTable.someColumn', '>', 'SomeOtherTable.someOtherColumn')
      .then(function () {
        expect(executedQueries).to.eql([
          'select * from "Model" where "SomeTable"."someColumn" > "SomeOtherTable"."someOtherColumn"'
        ]);
      });
  });

  it('whereRef should fail with invalid operator', function () {
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

  it('should not execute query when calling run* methods', function () {

  });

  it('should call run* methods in the correct order', function (done) {
    mockKnexQueryResult = 0;

    // Again call `done` instead of returning a promise just to make sure the final
    // `.then` callback is called. (I'm paranoid).
    QueryBuilder
      .forClass(TestModel)

      .runBefore(function () {
        expect(mockKnexQueryResult).to.equal(1);
        return ++mockKnexQueryResult;
      })
      .runBefore(function () {
        expect(mockKnexQueryResult).to.equal(2);
        return Promise.delay(1).return(++mockKnexQueryResult);
      })
      .runBeforePushFront(function () {
        expect(mockKnexQueryResult).to.equal(0);
        return ++mockKnexQueryResult;
      })

      .runAfterKnexQuery(function (res) {
        expect(res).to.equal(4);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfterKnexQuery(function (res) {
        expect(res).to.equal(5);
        return ++res;
      })
      .runAfterKnexQueryPushFront(function (res) {
        expect(res).to.equal(3);
        return ++res;
      })

      .runAfterModelCreate(function (res) {
        expect(res).to.equal(7);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfterModelCreate(function (res) {
        expect(res).to.equal(8);
        return ++res;
      })
      .runAfterModelCreatePushFront(function (res) {
        expect(res).to.equal(6);
        return ++res;
      })

      .runAfter(function (res) {
        expect(res).to.equal(10);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfter(function (res) {
        expect(res).to.equal(11);
        return ++res;
      })
      .runAfterPushFront(function (res) {
        expect(res).to.equal(9);
        return ++res;
      })

      .then(function (res) {
        expect(res).to.equal(12);
        done();
      }).catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runBefore(function () {
        throw new Error('some error');
      })
      .runAfterKnexQuery(function () {
        done(new Error('should not get here'));
      })
      .runAfterModelCreate(function () {
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

  it('should not call other run* methods if an error is thrown from runAfterKnexQuery', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runAfterKnexQuery(function () {
        throw new Error('some error');
      })
      .runAfterModelCreate(function () {
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
        done();
      });
  });

  it('should not call other run* methods if an error is thrown from runAfterModelCreate', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runAfterModelCreate(function () {
        throw new Error('some error');
      })
      .runAfter(function () {
        done(new Error('should not get here'));
      })
      .then(function () {
        done(new Error('should not get here'));
      })
      .catch(function (err) {
        expect(err.message).to.equal('some error');
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

  it('should call custom find implementation defined by findImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findImpl(function () {
        this.where({a: 1});
      })
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('select * from "Model" where "a" = \'1\'');
      });
  });

  it('should not call custom find implementation defined by findImpl if insert is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findImpl(function () {
        this.where({test: 'test'});
      })
      .insert({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (\'1\')');
      });
  });

  it('should not call custom find implementation defined by findImpl if update is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findImpl(function () {
        this.where({test: 'test'});
      })
      .update({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\'');
      });
  });

  it('should not call custom find implementation defined by findImpl if delete is called', function () {
    return QueryBuilder
      .forClass(TestModel)
      .findImpl(function () {
        this.where({test: 'test'});
      })
      .delete()
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model"');
      });
  });

  it('should call custom insert implementation defined by insertImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .insertImpl(function (insert) {
        insert.b = 2;
        this.insert(insert);
      })
      .insert({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (\'1\', \'2\')');
      });
  });

  it('should call custom update implementation defined by updateImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .updateImpl(function (update) {
        update.b = 2;
        this.update(update);
      })
      .update({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\'');
      });
  });

  it('should call custom patch implementation defined by patchImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .patchImpl(function (patch) {
        patch.b = 2;
        this.update(patch);
      })
      .patch({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = \'1\', "b" = \'2\'');
      });
  });

  it('should call custom delete implementation defined by deleteImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .deleteImpl(function () {
        this.delete().where('id', 100);
      })
      .delete()
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = \'100\'');
      });
  });

  it('should call custom relate implementation defined by relateImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .relateImpl(function (relate) {
        relate.b = 2;
        this.insert(relate);
      })
      .relate({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (\'1\', \'2\')');
      });
  });

  it('should call custom unrelate implementation defined by unrelateImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .unrelateImpl(function () {
        this.delete().where('id', 100);
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
      .updateImpl(function (update) {
        update.b = 2;
        this.update(update);
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
    expect(QueryBuilder.forClass(TestModel).patch().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).delete().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).relate().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).unrelate().isFindQuery()).to.equal(false);
  });

  it('resolve should replace the database query with the given value', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .resolve([{b: '100'}])
      .where('test', 100)
      .orderBy('order')
      .then(function (res) {
        expect(executedQueries).to.have.length(0);
        expect(res).to.eql([{b: '100'}]);
        done();
      })
      .catch(done);
  });

  describe('eager and allowEager' , function () {

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
  });

  /*
  it.only('performance', function () {
    mockKnexQueryResult = [{a: 1}, {a: 2}, {a: 3}, {a: 4}, {a: 5}];

    var a = [];
    var N = 10000;

    // Warmup.
    for (var i = 0; i < 100; ++i) {
      a.push(QueryBuilder
        .forClass(Model)
        .select('name', 'id', 'age')
        .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
        .where('id', 10)
        .where('height', '>', '180')
        .where({name: 'test'})
        .orWhere(function () {
          this.where('age', '<', 10).andWhere('eyeColor', 'blue');
        })
        .runAfterKnexQuery(function (x) {
          return x;
        })
        .runAfterModelCreate(function (x) {
          return x;
        })
        .then());
    }

    Promise.delay(1).then(function () {
      var d = new Date();
      for (var i = 0; i < N; ++i) {
        a.push(QueryBuilder
          .forClass(Model)
          .select('name', 'id', 'age')
          .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
          .where('id', 10)
          .where('height', '>', '180')
          .where({name: 'test'})
          .orWhere(function () {
            this.where('age', '<', 10).andWhere('eyeColor', 'blue');
          })
          .runAfterKnexQuery(function (x) {
            return x;
          })
          .runAfterModelCreate(function (x) {
            return x;
          })
          .then());
      }

      return Promise.all(a).then(function () {
        console.log((new Date() - d) / N);
      });
    });
  });
  */

});
