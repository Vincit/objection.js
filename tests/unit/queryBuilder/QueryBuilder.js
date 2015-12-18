var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , Model = require('../../../lib/model/Model').default
  , QueryBuilder = require('../../../lib/queryBuilder/QueryBuilder').default
  , QueryBuilderBase = require('../../../lib/queryBuilder/QueryBuilderBase')
  , RelationExpression = require('../../../lib/queryBuilder/RelationExpression');

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
      .runAfterModelCreate(function (data, builder) {
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

      .runAfterModelCreate(function (res) {
        expect(res).to.equal(4);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfterModelCreate(function (res) {
        expect(res).to.equal(5);
        return ++res;
      })
      .runAfterModelCreatePushFront(function (res) {
        expect(res).to.equal(3);
        return ++res;
      })

      .runAfter(function (res) {
        expect(res).to.equal(7);
        return Promise.delay(1).then(function () {
          return ++res;
        });
      })
      .runAfter(function (res) {
        expect(res).to.equal(8);
        return ++res;
      })
      .runAfterPushFront(function (res) {
        expect(res).to.equal(6);
        return ++res;
      })

      .then(function (res) {
        expect(res).to.equal(9);
        done();
      }).catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', function (done) {
    QueryBuilder
      .forClass(TestModel)
      .runBefore(function () {
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
        expect(executedQueries).to.have.length(0);
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
      .findImpl(function (builder) {
        expect(builder).to.equal(this);
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
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (\'1\') returning "id"');
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
      .insertImpl(function (insert, builder) {
        insert.model().b = 2;
        expect(builder).to.equal(this);
        this.$$insert(insert);
      })
      .insert({a: 1})
      .then(function () {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (\'1\', \'2\') returning "id"');
      });
  });

  it('should call custom update implementation defined by updateImpl', function () {
    return QueryBuilder
      .forClass(TestModel)
      .updateImpl(function (update, builder) {
        update.model().b = 2;
        expect(builder).to.equal(this);
        this.$$update(update);
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
      .patchImpl(function (patch, builder) {
        patch.model().b = 2;
        expect(builder).to.equal(this);
        this.$$update(patch);
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
      .deleteImpl(function (builder) {
        expect(builder).to.equal(this);
        this.$$delete().where('id', 100);
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
      .relateImpl(function (relate, builder) {
        relate[0].b = 2;
        expect(builder).to.equal(this);
        this.$$insert(relate);
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
      .unrelateImpl(function (builder) {
        expect(builder).to.equal(this);
        this.$$delete().where('id', 100);
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
        update.model().b = 2;
        this.$$update(update);
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
    expect(QueryBuilder.forClass(TestModel).patchImpl(function (model) { this.$$update(model); }).patch().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).delete().isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).relate(1).isFindQuery()).to.equal(false);
    expect(QueryBuilder.forClass(TestModel).unrelateImpl(function () { this.$$delete(); }).unrelate().isFindQuery()).to.equal(false);
  });

  it('update() should call $beforeUpdate on the model', function (done) {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
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

  });

});
