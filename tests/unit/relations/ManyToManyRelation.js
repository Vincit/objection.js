var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , Model = require('../../../src/Model')
  , QueryBuilder = require('../../../src/QueryBuilder')
  , ManyToManyRelation = require('../../../src/relations/ManyToManyRelation');

describe('ManyToManyRelation', function () {
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

    OwnerModel = Model.extend(function OwnerModel () {
      Model.apply(this, arguments);
    });

    RelatedModel = Model.extend(function RelatedModel () {
      Model.apply(this, arguments);
    });

    OwnerModel.tableName = 'OwnerModel';
    OwnerModel.knex(mockKnex);

    RelatedModel.tableName = 'RelatedModel';
    RelatedModel.knex(mockKnex);
  });

  beforeEach(function () {
    relation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      join: {
        from: 'OwnerModel.oid',
        through: {
          from: "JoinTable.ownerId",
          to: "JoinTable.relatedId"
        },
        to: 'RelatedModel.rid'
      }
    });
  });

  describe('find', function () {

    it('should generate a find query', function () {
      var expectedResult = [{a: 1, _join_: 666}, {a: 2, _join_: 666}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          relation.find(this, owner);
        })
        .then(function (result) {
          expect(result).to.have.length(2);
          expect(result).to.eql(_.omit(expectedResult, '_join_'));
          expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, '_join_'));
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal([
            'select "RelatedModel".*, "JoinTable"."ownerId" as "_join_"',
            'from "RelatedModel"',
            'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
            'where "name" = \'Teppo\'',
            'or "age" > \'60\'',
            'and "JoinTable"."ownerId" in (\'666\')'
          ].join(' '));
        });
    });

    it('should find for multiple owners', function () {
      var expectedResult = [{a: 1, _join_: 666}, {a: 2, _join_: 666}, {a: 3, _join_: 667}, {a: 4, _join_: 667}];
      mockKnexQueryResults = [expectedResult];
      var owners = [OwnerModel.fromJson({oid: 666}), OwnerModel.fromJson({oid: 667})];

      return QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          relation.find(this, owners);
        })
        .then(function (result) {
          expect(result).to.have.length(4);
          expect(result).to.eql(_.omit(expectedResult, '_join_'));
          expect(owners[0].nameOfOurRelation).to.eql([{a: 1}, {a: 2}]);
          expect(owners[1].nameOfOurRelation).to.eql([{a: 3}, {a: 4}]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
          expect(result[2]).to.be.a(RelatedModel);
          expect(result[3]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal([
            'select "RelatedModel".*, "JoinTable"."ownerId" as "_join_"',
            'from "RelatedModel"',
            'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
            'where "name" = \'Teppo\'',
            'or "age" > \'60\'',
            'and "JoinTable"."ownerId" in (\'666\', \'667\')'
          ].join(' '));
        });
    });

    it('explicit selects should override the RelatedModel.*', function () {
      var expectedResult = [{a: 1, _join_: 666}, {a: 2, _join_: 666}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .select('name')
        .findImpl(function () {
          relation.find(this, owner);
        })
        .then(function (result) {
          expect(result).to.have.length(2);
          expect(result).to.eql(_.omit(expectedResult, '_join_'));
          expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, '_join_'));
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal([
            'select "name", "JoinTable"."ownerId" as "_join_"',
            'from "RelatedModel"',
            'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
            'where "name" = \'Teppo\'',
            'or "age" > \'60\'',
            'and "JoinTable"."ownerId" in (\'666\')'
          ].join(' '));
        });
    });

    it('should apply the filter', function () {
      createFilteredRelation({someColumn: 100});

      var expectedResult = [{a: 1, _join_: 666}, {a: 2, _join_: 666}];
      mockKnexQueryResults = [expectedResult];
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          relation.find(this, owner);
        })
        .then(function (result) {
          expect(result).to.have.length(2);
          expect(result).to.eql(_.omit(expectedResult, '_join_'));
          expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, '_join_'));
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal([
            'select "RelatedModel".*, "JoinTable"."ownerId" as "_join_"',
            'from "RelatedModel"',
            'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
            'where "name" = \'Teppo\'',
            'or "age" > \'60\'',
            'and "JoinTable"."ownerId" in (\'666\')',
            'and "someColumn" = \'100\''
          ].join(' '));
        });
    });

  });

  describe('insert', function () {

    it('should generate an insert query', function () {
      mockKnexQueryResults = [[1, 2]];

      var owner = OwnerModel.fromJson({oid: 666});
      owner.nameOfOurRelation = [RelatedModel.fromJson({a: 'str0'})];
      var related = [RelatedModel.fromJson({a: 'str1', rid: 3}), RelatedModel.fromJson({a: 'str2', rid: 4})];

      return QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'3\'), (\'str2\', \'4\') returning "id"');
          expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'3\'), (\'666\', \'4\')');
          expect(owner.nameOfOurRelation).to.eql([{a: 'str0'}, {a: 'str1', id: 1, rid: 3}, {a: 'str2', id: 2, rid: 4}]);
          expect(result).to.eql([
            {a: 'str1', id: 1, rid: 3},
            {a: 'str2', id: 2, rid: 4}
          ]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
        });
    });

    it('should accept json object array', function () {
      mockKnexQueryResults = [[1, 2]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = [{a: 'str1', rid: 3}, {a: 'str2', rid: 4}];

      return QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'3\'), (\'str2\', \'4\') returning "id"');
          expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'3\'), (\'666\', \'4\')');
          expect(owner.nameOfOurRelation).to.eql([{a: 'str1', id: 1, rid: 3}, {a: 'str2', id: 2, rid: 4}]);
          expect(result).to.eql([
            {a: 'str1', id: 1, rid: 3},
            {a: 'str2', id: 2, rid: 4}
          ]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
        });
    });

    it('should accept single model', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = RelatedModel.fromJson({a: 'str1', rid: 2});

      return QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "id"');
          expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'2\')');
          expect(result).to.eql({a: 'str1', id: 1, rid: 2});
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should accept single json object', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = {a: 'str1', rid: 2};

      return QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related)
        .then(function (result) {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "id"');
          expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'2\')');
          expect(result).to.eql({a: 'str1', id: 1, rid: 2});
          expect(result).to.be.a(RelatedModel);
        });
    });

  });

  describe('update', function () {

    it('should generate an update query', function () {
      var owner = OwnerModel.fromJson({oid: 666});
      var update = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should accept json object', function () {
      var owner = OwnerModel.fromJson({oid: 666});
      var update = {a: 'str1'};

      return QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should work with increment', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update()
        .increment('test', 1)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" + 1',
            'where "RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should work with decrement', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update()
        .decrement('test', 10)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" - 10',
            'where "RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should apply the filter', function () {
      createFilteredRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({oid: 666});
      var update = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\'',
            'and "thingy" is not null and',
            '"RelatedModel"."id" in',
            '(select "JoinTable"."relatedId" from "JoinTable"',
            'where "JoinTable"."ownerId" = \'666\')',
            'and "someColumn" = \'100\''
          ].join(' '));
        });
    });

  });

  describe('patch', function () {

    it('should generate a patch query', function () {
      var owner = OwnerModel.fromJson({oid: 666});
      var patch = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should accept json object', function () {
      RelatedModel.jsonSchema = {
        type: 'object',
        required: ['b'],
        properties: {
          id: {type: 'number'},
          a: {type: 'string'},
          b: {type: 'string'}
        }
      };

      var owner = OwnerModel.fromJson({oid: 666});
      var patch = {a: 'str1'};

      return QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should work with increment', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch()
        .increment('test', 1)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" + 1',
            'where "RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should work with decrement', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch()
        .decrement('test', 10)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" - 10',
            'where "RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')'
          ].join(' '));
        });
    });

    it('should apply the filter', function () {
      createFilteredRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({oid: 666});
      var patch = RelatedModel.fromJson({a: 'str1'});

      return QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (patch) {
          relation.patch(this, owner, patch);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({a: 'str1'});
          expect(result).to.be.a(RelatedModel);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\'',
            'and "thingy" is not null and',
            '"RelatedModel"."id" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')',
            'and "someColumn" = \'100\'',
          ].join(' '));
        });
    });

  });

  describe('delete', function () {

    it('should generate a delete query', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .deleteImpl(function () {
          relation.delete(this, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql('delete from "RelatedModel" where "gender" = \'male\' and "thingy" is not null and "RelatedModel"."id" in (select "JoinTable"."relatedId" from "JoinTable" where "JoinTable"."ownerId" = \'666\')');
        });
    });

    it('should apply the filter', function () {
      createFilteredRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .deleteImpl(function () {
          relation.delete(this, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql('delete from "RelatedModel" where "gender" = \'male\' and "thingy" is not null and "RelatedModel"."id" in (select "JoinTable"."relatedId" from "JoinTable" where "JoinTable"."ownerId" = \'666\') and "someColumn" = \'100\'');
        });
    });

  });

  describe('relate', function () {

    it('should generate a relate query', function () {
      mockKnexQueryResults = [[5, 6, 7]];
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate([10, 20, 30])
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql([
            { ownerId: 666, relatedId: 10, id: 5 },
            { ownerId: 666, relatedId: 20, id: 6 },
            { ownerId: 666, relatedId: 30, id: 7 }
          ]);
          expect(executedQueries[0]).to.eql('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'10\'), (\'666\', \'20\'), (\'666\', \'30\') returning "id"');
        });
    });

    it('should accept one id', function () {
      mockKnexQueryResults = [[5]];
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate(11)
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({ ownerId: 666, relatedId: 11, id: 5 });
          expect(executedQueries[0]).to.eql('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'11\') returning "id"');
        });
    });

  });

  describe('unrelate', function () {

    it('should generate a unrelate query', function () {
      createFilteredRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({oid: 666});

      return QueryBuilder
        .forClass(RelatedModel)
        .unrelateImpl(function () {
          relation.unrelate(this, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77])
        .then(function (result) {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql('delete from "JoinTable" where "JoinTable"."ownerId" = \'666\' and "JoinTable"."relatedId" in (select "RelatedModel"."rid" from "RelatedModel" where "code" in (\'55\', \'66\', \'77\') and "someColumn" = \'100\')');
        });
    });

  });

  function createFilteredRelation(filter) {
    relation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      filter: filter,
      join: {
        from: 'OwnerModel.oid',
        through: {
          from: "JoinTable.ownerId",
          to: "JoinTable.relatedId"
        },
        to: 'RelatedModel.rid'
      }
    });
  }

});
