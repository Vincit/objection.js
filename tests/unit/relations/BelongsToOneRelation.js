var _ = require('lodash')
  , Knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , objection = require('../../../')
  , knexMocker = require('../../../testUtils/mockKnex')
  , Model = objection.Model
  , QueryBuilder = objection.QueryBuilder
  , BelongsToOneRelation = objection.BelongsToOneRelation;

describe('BelongsToOneRelation', function () {
  var mockKnexQueryResults = [];
  var executedQueries = [];
  var mockKnex = null;

  var OwnerModel = null;
  var RelatedModel = null;

  var relation;
  var compositeKeyRelation;

  before(function () {
    var knex = Knex({client: 'pg'});

    mockKnex = knexMocker(knex, function (mock, oldImpl, args) {
      executedQueries.push(this.toString());

      var result = mockKnexQueryResults.shift() || [];
      var promise = Promise.resolve(result);

      return promise.then.apply(promise, args);
    });
  });

  beforeEach(function () {
    mockKnexQueryResults = [];
    executedQueries = [];

    OwnerModel = Model.extend(function OwnerModel () {

    });

    RelatedModel = Model.extend(function RelatedModel () {

    });

    OwnerModel.tableName = 'OwnerModel';
    OwnerModel.knex(mockKnex);

    RelatedModel.tableName = 'RelatedModel';
    RelatedModel.knex(mockKnex);
  });

  beforeEach(function () {
    relation = new BelongsToOneRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: BelongsToOneRelation,
      join: {
        from: 'OwnerModel.relatedId',
        to: 'RelatedModel.rid'
      }
    });

    compositeKeyRelation = new BelongsToOneRelation('nameOfOurRelation', OwnerModel);
    compositeKeyRelation.setMapping({
      modelClass: RelatedModel,
      relation: BelongsToOneRelation,
      join: {
        from: ['OwnerModel.relatedAId', 'OwnerModel.relatedBId'],
        to: ['RelatedModel.aid', 'RelatedModel.bid']
      }
    });
  });

  describe('find', function () {

    it('should generate a find query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});
      var expectedResult = [{id: 1, a: 10, rid: 1}];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return relation.find(builder, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1)');
      });
    });

    it('should generate a find query (composite key)', function () {
      var expectedResult = [
        {id: 1, aid: 11, bid: 22},
        {id: 2, aid: 11, bid: 33}
      ];

      mockKnexQueryResults = [expectedResult];

      var owners = [
        OwnerModel.fromJson({id: 666, relatedAId: 11, relatedBId: 22}),
        OwnerModel.fromJson({id: 667, relatedAId: 11, relatedBId: 33})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return compositeKeyRelation.find(builder, owners);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.equal(result[0]);
        expect(owners[1].nameOfOurRelation).to.equal(result[1]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel".* from "RelatedModel" where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22),(11, 33))');
      });
    });

    it('should find for multiple owners', function () {
      var expectedResult = [
        {id: 1, a: 10, rid: 2},
        {id: 2, a: 10, rid: 3}
      ];

      mockKnexQueryResults = [expectedResult];

      var owners = [
        OwnerModel.fromJson({id: 666, relatedId: 2}),
        OwnerModel.fromJson({id: 667, relatedId: 3})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return relation.find(builder, owners);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.equal(result[0]);
        expect(owners[1].nameOfOurRelation).to.equal(result[1]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (2, 3)');
      });
    });

    it('explicit selects should override the RelatedModel.*', function () {
      var expectedResult = [{id: 1, a: 10, rid: 2}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return relation.find(builder, [owner]);
        })
        .select('name');

      return builder.then(function (result) {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel"."rid", "name" from "RelatedModel" where "RelatedModel"."rid" in (2)');
      });
    });

    it('should apply the modifier (object)', function () {
      createModifiedRelation({filterCol: 100});

      var expectedResult = [{id: 1, a: 10, rid: 1}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return relation.find(builder, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1) and "filterCol" = 100');
      });
    });

    it('should apply the modifier (function)', function () {
      createModifiedRelation(function (query) {
        query.where('name', 'Jennifer');
      });

      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});
      var expectedResult = [{id: 1, a: 10, rid: 1}];
      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .findOperationFactory(function (builder) {
          return relation.find(builder, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal('select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1) and "name" = \'Jennifer\'');
      });
    });

  });

  describe('insert', function () {

    it('should generate an insert query', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [RelatedModel.fromJson({a: 'str1', rid: 2})];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return relation.insert(builder, owner);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"');
        expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666');

        expect(owner.nameOfOurRelation).to.equal(result[0]);
        expect(owner.relatedId).to.equal(2);
        expect(result).to.eql([{a: 'str1', id: 1, rid: 2}]);
        expect(result[0]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', function () {
      mockKnexQueryResults = [[{aid: 11, bid: 22}]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [RelatedModel.fromJson({a: 'str1', aid: 11, bid: 22})];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return compositeKeyRelation.insert(builder, owner);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "aid", "bid") values (\'str1\', 11, 22) returning "id"');
        expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedAId" = 11, "relatedBId" = 22 where "OwnerModel"."id" = 666');

        expect(owner.relatedAId).to.equal(11);
        expect(owner.relatedBId).to.equal(22);
        expect(owner.nameOfOurRelation).to.equal(result[0]);
        expect(result).to.eql([{a: 'str1', aid: 11, bid: 22}]);
        expect(result[0]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', function () {
      mockKnexQueryResults = [[5]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [{a: 'str1', rid: 2}];

      return QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666');
          expect(owner.nameOfOurRelation).to.equal(result[0]);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql([{a: 'str1', id: 5, rid: 2}]);
          expect(result[0]).to.be.a(RelatedModel);
        });
    });

    it('should accept single model', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = RelatedModel.fromJson({a: 'str1', rid: 2});

      return QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666');
          expect(owner.nameOfOurRelation).to.equal(result);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql({a: 'str1', id: 1, rid: 2});
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should accept single json object', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = {a: 'str1', rid: 2};

      return QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666');
          expect(owner.nameOfOurRelation).to.equal(result);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql({a: 'str1', id: 1, rid: 2});
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should fail if trying to insert multiple', function (done) {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [{a: 'str1', rid: 2}, {a: 'str1', rid: 2}];

      QueryBuilder
        .forClass(RelatedModel)
        .insertOperationFactory(function (builder) {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          done();
        });
    });

  });

  describe('update', function () {

    it('should generate an update query', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = RelatedModel.fromJson({a: 'str1'});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .updateOperationFactory(function (builder) {
          return relation.update(builder, owner);
        })
        .update(update);

      return builder.then(function (numUpdates) {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)');
      });
    });

    it('should generate an update query (composite key)', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({id: 666, relatedAId: 11, relatedBId: 22});
      var update = RelatedModel.fromJson({a: 'str1', aid: 11, bid: 22});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .updateOperationFactory(function (builder) {
          return compositeKeyRelation.update(builder, owner);
        })
        .update(update);

      return builder.then(function (numUpdates) {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\', "aid" = 11, "bid" = 22 where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22))');
      });
    });

    it('should accept json object', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = {a: 'str1'};

      return QueryBuilder
        .forClass(RelatedModel)
        .updateOperationFactory(function (builder) {
          return relation.update(builder, owner);
        })
        .update(update)
        .then(function (numUpdates) {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)');
        });
    });

    it('should apply the modifier', function () {
      createModifiedRelation({someColumn: 'foo'});

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .updateOperationFactory(function (builder) {
          return relation.update(builder, owner);
        })
        .update(update)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2) and "someColumn" = \'foo\'');
        });
    });

  });

  describe('patch', function () {

    it('should generate an patch query', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var patch = RelatedModel.fromJson({a: 'str1'});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .patchOperationFactory(function (builder) {
          return relation.patch(builder, owner);
        })
        .patch(patch);
      
      return builder.then(function (numUpdates) {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)');
      });
    });

    it('should accept json object', function () {
      mockKnexQueryResults = [42];

      RelatedModel.jsonSchema = {
        type: 'object',
        required: ['b'],
        properties: {
          a: {type: 'string'},
          b: {type: 'string'}
        }
      };

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var patch = {a: 'str1'};

      return QueryBuilder
        .forClass(RelatedModel)
        .patchOperationFactory(function (builder) {
          return relation.patch(builder, owner);
        })
        .patch(patch)
        .then(function (numUpdates) {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)');
        });
    });

    it('should work with increment', function () {
      mockKnexQueryResults = [42];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchOperationFactory(function (builder) {
          return relation.patch(builder, owner);
        })
        .increment('test', 1)
        .then(function (numUpdates) {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" + 1 where \"RelatedModel\".\"rid\" in (1)");
        });
    });

    it('should work with decrement', function () {
      mockKnexQueryResults = [42];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchOperationFactory(function (builder) {
          return relation.patch(builder, owner);
        })
        .decrement('test', 10)
        .then(function (numUpdates) {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" - 10 where \"RelatedModel\".\"rid\" in (2)");
        });
    });

    it('should apply the modifier', function () {
      mockKnexQueryResults = [42];
      createModifiedRelation({someColumn: 'foo'});

      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchOperationFactory(function (builder) {
          return relation.patch(builder, owner);
        })
        .patch(update)
        .then(function (numUpdates) {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2) and "someColumn" = \'foo\'');
        });
    });

  });

  describe('delete', function () {

    it('should generate a delete query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .deleteOperationFactory(function (builder) {
          return relation.delete(builder, owner);
        })
        .delete();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql("delete from \"RelatedModel\" where \"RelatedModel\".\"rid\" in (2)");
      });
    });

    it('should generate a delete query (composite key)', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedAId: 11, relatedBId: 22});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .deleteOperationFactory(function (builder) {
          return compositeKeyRelation.delete(builder, owner);
        })
        .delete();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('delete from "RelatedModel" where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22))');
      });
    });

    it('should apply the modifier', function () {
      createModifiedRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return QueryBuilder
        .forClass(RelatedModel)
        .deleteOperationFactory(function (builder) {
          return relation.delete(builder, owner);
        })
        .delete()
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql("delete from \"RelatedModel\" where \"RelatedModel\".\"rid\" in (2) and \"someColumn\" = 100");
        });
    });

  });

  describe('relate', function () {

    it('should generate a relate query', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate(10);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(10);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666');
      });
    });

    it('should generate a relate query (array value)', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate([10]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([10]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666');
      });
    });

    it('should generate a relate query (object value)', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate({rid: 10});

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({rid: 10});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666');
      });
    });

    it('should generate a relate query (array of objects values)', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate([{rid: 10}]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([{rid: 10}]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666');
      });
    });

    it('should generate a relate query (composite key)', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate([10, 20]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([10, 20]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedAId" = 10, "relatedBId" = 20 where "OwnerModel"."id" = 666');
      });
    });

    it('should generate a relate query (composite key with object value)', function () {
      var owner = OwnerModel.fromJson({id: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate({aid: 10, bid: 20});

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({aid: 10, bid: 20});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedAId" = 10, "relatedBId" = 20 where "OwnerModel"."id" = 666');
      });
    });

    it('should accept one id', function () {
      var owner = OwnerModel.fromJson({id: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate(11)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql(11);
          expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = 11 where "OwnerModel"."id" = 666');
        });
    });

    it('should fail if trying to relate multiple', function (done) {
      var owner = OwnerModel.fromJson({id: 666});

      QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate([11, 12])
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          done();
        });
    });

    it('should fail if object value doesn\'t contain the needed id', function (done) {
      var owner = OwnerModel.fromJson({id: 666});

      QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return relation.relate(builder, owner);
        })
        .relate({wrongId: 10})
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          done();
        });
    });

    it('should fail if object value doesn\'t contain the needed id (composite key)', function (done) {
      var owner = OwnerModel.fromJson({id: 666});

      QueryBuilder
        .forClass(RelatedModel)
        .relateOperationFactory(function (builder) {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate({aid: 10, wrongId: 20})
        .then(function () {
          done(new Error('should not get here'));
        })
        .catch(function () {
          done();
        });
    });

  });

  describe('unrelate', function () {

    it('should generate a unrelate query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 123});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .unrelateOperationFactory(function (builder) {
          return relation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = NULL where "code" in (55, 66, 77) and "OwnerModel"."id" = 666');
      });
    });

    it('should generate a unrelate query (composite key)', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedAId: 11, relatedBId: 22});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .unrelateOperationFactory(function (builder) {
          return compositeKeyRelation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedAId" = NULL, "relatedBId" = NULL where "code" in (55, 66, 77) and "OwnerModel"."id" = 666');
      });
    });

  });

  function createModifiedRelation(modifier) {
    relation = new BelongsToOneRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: BelongsToOneRelation,
      modify: modifier,
      join: {
        from: 'OwnerModel.relatedId',
        to: 'RelatedModel.rid'
      }
    });
  }

});
