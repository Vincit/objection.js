var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , MoronModel = require('../../../src/MoronModel')
  , MoronQueryBuilder = require('../../../src/MoronQueryBuilder')
  , MoronHasOneRelation = require('../../../src/relations/MoronHasOneRelation');

describe('MoronHasOneRelation', function () {
  var originalKnexQueryBuilderThen = null;
  var mockKnexQueryResults = [];
  var executedQueries = [];
  var mockKnex = null;
  var OwnerModel = null;
  var RelatedModel = null;
  var relation;

  before(function () {
    mockKnex = knex({client: 'pg'});
    originalKnexQueryBuilderThen = mockKnex.client.QueryBuilder.prototype.then;
    mockKnex.client.QueryBuilder.prototype.then = function (cb, ecb) {
      executedQueries.push(this.toString());
      return Promise.resolve(mockKnexQueryResults.shift() || []).then(cb, ecb);
    };
  });

  after(function () {
    mockKnex.client.QueryBuilder.prototype.then = originalKnexQueryBuilderThen;
  });

  beforeEach(function () {
    mockKnexQueryResults = [];
    executedQueries = [];

    OwnerModel = MoronModel.extend(function Model () {
      MoronModel.apply(this, arguments);
    });

    RelatedModel = MoronModel.extend(function Model () {
      MoronModel.apply(this, arguments);
    });

    OwnerModel.tableName = 'OwnerModel';
    OwnerModel.knex(mockKnex);

    RelatedModel.tableName = 'RelatedModel';
    RelatedModel.knex(mockKnex);
  });

  beforeEach(function () {
    relation = new MoronHasOneRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: MoronHasOneRelation,
      join: {
        from: 'OwnerModel.relatedId',
        to: 'RelatedModel.rid'
      }
    });
  });

  describe('find', function () {

    it('should generate a find query', function () {
      var expectedResult = [{id: 1, a: 10, rid: 1}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .findImpl(function () {
          relation.find(this, owner);
        })
        .then(function (result) {
          expect(result).to.have.length(1);
          expect(result).to.eql(expectedResult);
          expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal('select * from "RelatedModel" where "RelatedModel"."rid" in (\'1\')');
        });
    });

    it('should find for multiple owners', function () {
      var expectedResult = [{id: 1, a: 10, rid: 2}, {id: 2, a: 10, rid: 3}];
      mockKnexQueryResults = [expectedResult];
      var owners = [OwnerModel.fromJson({id: 666, relatedId: 2}), OwnerModel.fromJson({id: 667, relatedId: 3})];

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .findImpl(function () {
          relation.find(this, owners);
        })
        .then(function (result) {
          expect(result).to.have.length(2);
          expect(result).to.eql(expectedResult);
          expect(owners[0].nameOfOurRelation).to.equal(result[0]);
          expect(owners[1].nameOfOurRelation).to.equal(result[1]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal('select * from "RelatedModel" where "RelatedModel"."rid" in (\'2\', \'3\')');
        });
    });

    it('explicit selects should override the RelatedModel.*', function () {
      var expectedResult = [{id: 1, a: 10, rid: 2}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .findImpl(function () {
          relation.find(this, owner);
        })
        .select('name')
        .then(function (result) {
          expect(result).to.have.length(1);
          expect(result).to.eql(expectedResult);
          expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal('select "name" from "RelatedModel" where "RelatedModel"."rid" in (\'2\')');
        });
    });

  });

  describe('insert', function () {

    it('should generate an insert query', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [RelatedModel.fromJson({a: 'str1', rid: 2})];

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "RelatedModel"."id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = \'2\' where "OwnerModel"."id" = \'666\'');
          expect(owner.nameOfOurRelation).to.equal(result[0]);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql([{a: 'str1', id: 1, rid: 2}]);
          expect(result[0]).to.be.a(RelatedModel);
        });
    });

    it('should accept json object array', function () {
      mockKnexQueryResults = [[5]];

      var owner = OwnerModel.fromJson({id: 666});
      var related = [{a: 'str1', rid: 2}];

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "RelatedModel"."id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = \'2\' where "OwnerModel"."id" = \'666\'');
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

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "RelatedModel"."id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = \'2\' where "OwnerModel"."id" = \'666\'');
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

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "RelatedModel"."id"');
          expect(executedQueries[1]).to.equal('update "OwnerModel" set "relatedId" = \'2\' where "OwnerModel"."id" = \'666\'');
          expect(owner.nameOfOurRelation).to.equal(result);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql({a: 'str1', id: 1, rid: 2});
          expect(result).to.be.a(RelatedModel);
        });
    });

  });

  describe('update', function () {

    it('should generate an update query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = RelatedModel.fromJson({a: 'str1'});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (\'2\')');
        });
    });

    it('should accept json object', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var update = {a: 'str1'};

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (\'2\')');
        });
    });

    it('should work with increment', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update()
        .increment('test', 1)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" + 1 where \"RelatedModel\".\"rid\" in ('2')");
        });
    });

    it('should work with decrement', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update()
        .decrement('test', 10)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" - 10 where \"RelatedModel\".\"rid\" in ('2')");
        });
    });

  });

  describe('patch', function () {

    it('should generate an patch query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});
      var patch = RelatedModel.fromJson({a: 'str1'});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch(patch)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (\'2\')');
        });
    });

    it('should accept json object', function () {
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

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch(patch)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql('update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (\'2\')');
        });
    });

    it('should work with increment', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 1});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch()
        .increment('test', 1)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" + 1 where \"RelatedModel\".\"rid\" in ('1')");
        });
    });

    it('should work with decrement', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch()
        .decrement('test', 10)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql("update \"RelatedModel\" set \"test\" = \"test\" - 10 where \"RelatedModel\".\"rid\" in ('2')");
        });
    });

  });

  describe('delete', function () {

    it('should generate a delete query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 2});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .deleteImpl(function () {
          relation.delete(this, owner);
        })
        .delete()
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql("delete from \"RelatedModel\" where \"RelatedModel\".\"rid\" in ('2')");
        });
    });

  });

  describe('relate', function () {

    it('should generate a relate query', function () {
      var owner = OwnerModel.fromJson({id: 666});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate([10])
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql([10]);
          expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = \'10\' where "OwnerModel"."id" = \'666\'');
        });
    });

    it('should accept one id', function () {
      var owner = OwnerModel.fromJson({id: 666});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate(11)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql(11);
          expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = \'11\' where "OwnerModel"."id" = \'666\'');
        });
    });

  });

  describe('unrelate', function () {

    it('should generate a unrelate query', function () {
      var owner = OwnerModel.fromJson({id: 666, relatedId: 123});

      return MoronQueryBuilder
        .forClass(RelatedModel)
        .unrelateImpl(function () {
          relation.unrelate(this, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77])
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql('update "OwnerModel" set "relatedId" = NULL where "code" in (\'55\', \'66\', \'77\') and "OwnerModel"."id" = \'666\'');
        });
    });

  });

});
