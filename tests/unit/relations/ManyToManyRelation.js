var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , objection = require('../../../')
  , Model = objection.Model
  , QueryBuilder = objection.QueryBuilder
  , ManyToManyRelation = objection.ManyToManyRelation;

describe('ManyToManyRelation', function () {
  var originalKnexQueryBuilderThen = null;
  var mockKnexQueryResults = [];
  var executedQueries = [];
  var mockKnex = null;
  var OwnerModel = null;
  var RelatedModel = null;
  var JoinModel = null;
  var relation;
  var compositeKeyRelation;

  beforeEach(function () {
    mockKnex = knex({client: 'pg'});
    originalKnexQueryBuilderThen = mockKnex.client.QueryBuilder.prototype.then;

    mockKnex.client.QueryBuilder.prototype.then = function (cb, ecb) {
      executedQueries.push(this.toString());
      return Promise.resolve(mockKnexQueryResults.shift() || []).then(cb, ecb);
    };
  });

  afterEach(function () {
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

    JoinModel = Model.extend(function JoinModel () {
      Model.apply(this, arguments);
    });

    OwnerModel.tableName = 'OwnerModel';
    OwnerModel.knex(mockKnex);

    RelatedModel.tableName = 'RelatedModel';
    RelatedModel.knex(mockKnex);

    JoinModel.tableName = 'JoinModel';
    JoinModel.knex(mockKnex);
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
          to: "JoinTable.relatedId",
          extra: ['extra1', 'extra2']
        },
        to: 'RelatedModel.rid'
      }
    });

    compositeKeyRelation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    compositeKeyRelation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      join: {
        from: ['OwnerModel.aid', 'OwnerModel.bid'],
        through: {
          from: ['JoinTable.ownerAId', 'JoinTable.ownerBId'],
          to: ['JoinTable.relatedCId', 'JoinTable.relatedDId']
        },
        to: ['RelatedModel.cid', 'RelatedModel.did']
      }
    });
  });

  it('should accept a join table in join.through object', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinTable.ownerId',
          to: 'JoinTable.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerId']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedId']);
  });

  it('should accept a join model in join.through object', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          modelClass: JoinModel,
          from: 'JoinTable.ownerId',
          to: 'JoinTable.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerId']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedId']);
    expect(relation.joinTableModelClass).to.equal(JoinModel);
  });

  it('should accept an absolute file path to a join model in join.through object', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          modelClass: __dirname + '/files/JoinModel',
          from: 'JoinTable.ownerId',
          to: 'JoinTable.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerId']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedId']);
    expect(relation.joinTableModelClass).to.equal(require('./files/JoinModel'));
  });

  it('should accept a composite keys in join.through object (1)', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: ['OwnerModel.name', 'OwnerModel.dateOfBirth'],
        through: {
          from: ['JoinTable.ownerName', 'JoinTable.ownerDateOfBirth'],
          to: 'JoinTable.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedId']);
  });

  it('should accept a composite keys in join.through object (2)', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: ['OwnerModel.name', 'OwnerModel.dateOfBirth'],
        through: {
          from: ['JoinTable.ownerName', 'JoinTable.ownerDateOfBirth'],
          to: ['JoinTable.relatedA', 'JoinTable.relatedB']
        },
        to: ['RelatedModel.A', 'RelatedModel.B']
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedA', 'relatedB']);
  });

  it('should be able to swap join.through.from and join.through.to', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'RelatedModel.ownerId',
        through: {
          from: 'JoinTable.relatedId',
          to: 'JoinTable.ownerId'
        },
        to: 'OwnerModel.id'
      }
    });

    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.eql(['ownerId']);
    expect(relation.joinTableRelatedCol).to.eql(['relatedId']);
  });

  it('should fail if join.through.modelClass is not a subclass of Model', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            modelClass: function () {},
            from: 'JoinTable.relatedId',
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: Join table model class is not a subclass of Model');
    });
  });

  it('should fail if join.through.modelClass is an invalid path', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            modelClass: '/not/a/path/to/a/model',
            from: 'JoinTable.relatedId',
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: Join table model class is not a subclass of Model');
    });
  });

  it('should fail if join.through.to is missing', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}');
    });
  });

  it('should fail if join.through.from is missing', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}');
    });
  });

  it('join.through.from should have format JoinTable.columnName', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'relatedId',
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    });
  });

  it('join.through.to should have format JoinTable.columnName', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId',
            to: 'ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].');
    });
  });

  it('join.through `to` and `from` should point to the same table', function () {
    var relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId',
            to: 'OtherTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation: join.through `from` and `to` must point to the same join table.');
    });
  });

  describe('find', function () {

    it('should generate a find query', function () {
      var owner = OwnerModel.fromJson({oid: 666});
      var expectedResult = [
        {a: 1, objectiontmpjoin0: 666},
        {a: 2, objectiontmpjoin0: 666}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function (builder) {
          relation.find(builder, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "RelatedModel".*, "JoinTable"."extra1", "JoinTable"."extra2", "JoinTable"."ownerId" as "objectiontmpjoin0"',
          'from "RelatedModel"',
          'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
          'where "name" = \'Teppo\'',
          'or "age" > \'60\'',
          'and "JoinTable"."ownerId" in (\'666\')'
        ].join(' '));
      });
    });

    it('should generate a find query (composite key)', function () {
      var owner = OwnerModel.fromJson({aid: 11, bid:22});
      var expectedResult = [
        {a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22},
        {a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function (builder) {
          compositeKeyRelation.find(builder, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "RelatedModel".*, "JoinTable"."ownerAId" as "objectiontmpjoin0", "JoinTable"."ownerBId" as "objectiontmpjoin1"',
          'from "RelatedModel"',
          'inner join "JoinTable" on "JoinTable"."relatedCId" = "RelatedModel"."cid" and "JoinTable"."relatedDId" = "RelatedModel"."did"',
          'where "name" = \'Teppo\'',
          'or "age" > \'60\'',
          'and ("JoinTable"."ownerAId", "JoinTable"."ownerBId") in ((\'11\', \'22\'))'
        ].join(' '));
      });
    });

    it('should find for multiple owners', function () {
      var owners = [
        OwnerModel.fromJson({oid: 666}),
        OwnerModel.fromJson({oid: 667})
      ];

      var expectedResult = [
        {a: 1, objectiontmpjoin0: 666},
        {a: 2, objectiontmpjoin0: 666},
        {a: 3, objectiontmpjoin0: 667},
        {a: 4, objectiontmpjoin0: 667}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          relation.find(this, owners);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(4);
        expect(result).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(owners[0].nameOfOurRelation).to.eql([{a: 1}, {a: 2}]);
        expect(owners[1].nameOfOurRelation).to.eql([{a: 3}, {a: 4}]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "RelatedModel".*, "JoinTable"."extra1", "JoinTable"."extra2", "JoinTable"."ownerId" as "objectiontmpjoin0"',
          'from "RelatedModel"',
          'inner join "JoinTable" on "JoinTable"."relatedId" = "RelatedModel"."rid"',
          'where "name" = \'Teppo\'',
          'or "age" > \'60\'',
          'and "JoinTable"."ownerId" in (\'666\', \'667\')'
        ].join(' '));
      });
    });

    it('should find for multiple owners (composite key)', function () {
      var owners = [
        OwnerModel.fromJson({aid: 11, bid: 22}),
        OwnerModel.fromJson({aid: 11, bid: 33})
      ];

      var expectedResult = [
        {a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22},
        {a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22},
        {a: 3, objectiontmpjoin0: 11, objectiontmpjoin1: 33},
        {a: 4, objectiontmpjoin0: 11, objectiontmpjoin1: 33}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          compositeKeyRelation.find(this, owners);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([{a: 1}, {a: 2}]);
        expect(owners[1].nameOfOurRelation).to.eql([{a: 3}, {a: 4}]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "RelatedModel".*, "JoinTable"."ownerAId" as "objectiontmpjoin0", "JoinTable"."ownerBId" as "objectiontmpjoin1"',
          'from "RelatedModel"',
          'inner join "JoinTable" on "JoinTable"."relatedCId" = "RelatedModel"."cid" and "JoinTable"."relatedDId" = "RelatedModel"."did"',
          'where "name" = \'Teppo\'',
          'or "age" > \'60\'',
          'and ("JoinTable"."ownerAId", "JoinTable"."ownerBId") in ((\'11\', \'22\'),(\'11\', \'33\'))'
        ].join(' '));
      });
    });

    it('explicit selects should override the RelatedModel.*', function () {
      var owner = OwnerModel.fromJson({oid: 666});
      var expectedResult = [
        {a: 1, objectiontmpjoin0: 666},
        {a: 2, objectiontmpjoin0: 666}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .select('name')
        .findImpl(function () {
          relation.find(this, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "name", "JoinTable"."ownerId" as "objectiontmpjoin0"',
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

      var owner = OwnerModel.fromJson({oid: 666});
      var expectedResult = [
        {a: 1, objectiontmpjoin0: 666},
        {a: 2, objectiontmpjoin0: 666}
      ];

      mockKnexQueryResults = [expectedResult];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findImpl(function () {
          relation.find(this, [owner]);
        });

      return builder.then(function (result) {
        expect(result).to.have.length(2);
        expect(result).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(owner.nameOfOurRelation).to.eql(_.omit(expectedResult, 'objectiontmpjoin0'));
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal([
          'select "RelatedModel".*, "JoinTable"."ownerId" as "objectiontmpjoin0"',
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
      var related = [
        RelatedModel.fromJson({a: 'str1', rid: 3}),
        RelatedModel.fromJson({a: 'str2', rid: 4})
      ];

      owner.nameOfOurRelation = [
        RelatedModel.fromJson({a: 'str0', id: 3})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (insertion) {
          relation.insert(this, owner, insertion);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'3\'), (\'str2\', \'4\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'3\'), (\'666\', \'4\') returning "relatedId"');

        expect(owner.nameOfOurRelation).to.eql([
          {a: 'str1', id: 1, rid: 3},
          {a: 'str2', id: 2, rid: 4},
          {a: 'str0', id: 3}
        ]);

        expect(result).to.eql([
          {a: 'str1', id: 1, rid: 3},
          {a: 'str2', id: 2, rid: 4}
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', function () {
      mockKnexQueryResults = [[
        {id: 1, cid: 33, did: 44},
        {id: 2, cid: 33, did: 55}
      ]];

      var owner = OwnerModel.fromJson({aid: 11, bid: 22});
      var related = [
        RelatedModel.fromJson({a: 'str1', cid: 33, did: 44}),
        RelatedModel.fromJson({a: 'str2', cid: 33, did: 55})
      ];

      owner.nameOfOurRelation = [
        RelatedModel.fromJson({a: 'str0', id: 3})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (insertion) {
          compositeKeyRelation.insert(this, owner, insertion);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "cid", "did") values (\'str1\', \'33\', \'44\'), (\'str2\', \'33\', \'55\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (\'11\', \'22\', \'33\', \'44\'), (\'11\', \'22\', \'33\', \'55\') returning "relatedCId", "relatedDId"');

        expect(owner.nameOfOurRelation).to.eql([
          {a: 'str1', id: 1, cid: 33, did: 44},
          {a: 'str2', id: 2, cid: 33, did: 55},
          {a: 'str0', id: 3}
        ]);

        expect(result).to.eql([
          {a: 'str1', id: 1, cid: 33, did: 44},
          {a: 'str2', id: 2, cid: 33, did: 55}
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', function () {
      mockKnexQueryResults = [[1, 2]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = [
        {a: 'str1', rid: 3},
        {a: 'str2', rid: 4}
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'3\'), (\'str2\', \'4\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'3\'), (\'666\', \'4\') returning "relatedId"');

        expect(owner.nameOfOurRelation).to.eql([
          {a: 'str1', id: 1, rid: 3},
          {a: 'str2', id: 2, rid: 4}
        ]);

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

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'2\') returning "relatedId"');

        expect(result).to.eql({a: 'str1', id: 1, rid: 2});
        expect(result).to.be.a(RelatedModel);
      });
    });

    it('should accept single json object', function () {
      mockKnexQueryResults = [[1]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = {a: 'str1', rid: 2};

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (models) {
          relation.insert(this, owner, models);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str1\', \'2\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'2\') returning "relatedId"');

        expect(result).to.eql({a: 'str1', id: 1, rid: 2});
        expect(result).to.be.a(RelatedModel);
      });
    });

    it('should insert extra properties to join table', function () {
      mockKnexQueryResults = [[1, 2]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = RelatedModel.fromJson({a: 'str2', rid: 4, extra1: 'extraVal1', extra2: 'extraVal2'});

      owner.nameOfOurRelation = [
        RelatedModel.fromJson({a: 'str0', id: 3})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (insertion) {
          relation.insert(this, owner, insertion);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str2\', \'4\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("extra1", "extra2", "ownerId", "relatedId") values (\'extraVal1\', \'extraVal2\', \'666\', \'4\') returning "relatedId"');

        expect(_.invokeMap(owner.nameOfOurRelation, 'toJSON')).to.eql([
          {a: 'str2', id: 1, rid: 4, extra1: 'extraVal1', extra2: 'extraVal2'},
          {a: 'str0', id: 3}
        ]);

        expect(result).to.be.a(RelatedModel);
        expect(result.toJSON()).to.eql({a: 'str2', id: 1, rid: 4, extra1: 'extraVal1', extra2: 'extraVal2'});
      });
    });

    it('should insert extra properties to join table (not all)', function () {
      mockKnexQueryResults = [[1, 2]];

      var owner = OwnerModel.fromJson({oid: 666});
      var related = RelatedModel.fromJson({a: 'str2', rid: 4, extra2: 'extraVal2'});

      owner.nameOfOurRelation = [
        RelatedModel.fromJson({a: 'str0', id: 3})
      ];

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .insertImpl(function (insertion) {
          relation.insert(this, owner, insertion);
        })
        .insert(related);

      var toString = builder.toString();
      var toSql = builder.toSql();

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal('insert into "RelatedModel" ("a", "rid") values (\'str2\', \'4\') returning "id"');
        expect(executedQueries[1]).to.equal('insert into "JoinTable" ("extra2", "ownerId", "relatedId") values (\'extraVal2\', \'666\', \'4\') returning "relatedId"');

        expect(_.invokeMap(owner.nameOfOurRelation, 'toJSON')).to.eql([
          {a: 'str2', id: 1, rid: 4, extra2: 'extraVal2'},
          {a: 'str0', id: 3}
        ]);

        expect(result).to.be.a(RelatedModel);
        expect(result.toJSON()).to.eql({a: 'str2', id: 1, rid: 4, extra2: 'extraVal2'});
      });
    });

  });

  describe('update', function () {

    it('should generate an update query', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({oid: 666});
      var update = RelatedModel.fromJson({a: 'str1'});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          relation.update(this, owner, updt);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(function (numUpdated) {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'update "RelatedModel" set "a" = \'str1\'',
          'where "gender" = \'male\' and',
          '"thingy" is not null and',
          '"RelatedModel"."rid" in',
            '(select "JoinTable"."relatedId" from "JoinTable"',
            'where "JoinTable"."ownerId" = \'666\')'
        ].join(' '));
      });
    });

    it('should generate an update query (composite key)', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({aid: 11, bid: 22});
      var update = RelatedModel.fromJson({a: 'str1'});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .updateImpl(function (updt) {
          compositeKeyRelation.update(this, owner, updt);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(function (numUpdated) {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'update "RelatedModel" set "a" = \'str1\'',
          'where "gender" = \'male\'',
          'and "thingy" is not null',
          'and ("RelatedModel"."cid","RelatedModel"."did") in',
            '(select "JoinTable"."relatedCId", "JoinTable"."relatedDId" from "JoinTable"',
            'where "JoinTable"."ownerAId" = \'11\' and "JoinTable"."ownerBId" = \'22\')'
        ].join(' '));
      });
    });

    it('should accept json object', function () {
      mockKnexQueryResults = [42];

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
        .then(function (numUpdated) {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."rid" in',
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
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\'',
            'and "thingy" is not null and',
            '"RelatedModel"."rid" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')',
            'and "someColumn" = \'100\''
          ].join(' '));
        });
    });

  });

  describe('patch', function () {

    it('should generate a patch query', function () {
      mockKnexQueryResults = [42];

      var owner = OwnerModel.fromJson({oid: 666});
      var patch = RelatedModel.fromJson({a: 'str1'});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .patchImpl(function (ptch) {
          relation.patch(this, owner, ptch);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(function (numUpdated) {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'update "RelatedModel" set "a" = \'str1\'',
          'where "gender" = \'male\' and',
          '"thingy" is not null and',
          '"RelatedModel"."rid" in',
            '(select "JoinTable"."relatedId" from "JoinTable"',
            'where "JoinTable"."ownerId" = \'666\')'
        ].join(' '));
      });
    });

    it('should accept json object', function () {
      mockKnexQueryResults = [42];

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
        .then(function (numUpdated) {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\' and',
            '"thingy" is not null and',
            '"RelatedModel"."rid" in',
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
        .increment('test', 1)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" + \'1\'',
            'where "RelatedModel"."rid" in',
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
        .decrement('test', 10)
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "test" = "test" - \'10\'',
            'where "RelatedModel"."rid" in',
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
        .then(function () {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql([
            'update "RelatedModel" set "a" = \'str1\'',
            'where "gender" = \'male\'',
            'and "thingy" is not null and',
            '"RelatedModel"."rid" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')',
            'and "someColumn" = \'100\''
          ].join(' '));
        });
    });

  });

  describe('delete', function () {

    it('should generate a delete query', function () {
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .deleteImpl(function () {
          relation.delete(this, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'delete from "RelatedModel"',
          'where "gender" = \'male\'',
          'and "thingy" is not null',
          'and "RelatedModel"."rid" in',
            '(select "JoinTable"."relatedId" from "JoinTable"',
            'where "JoinTable"."ownerId" = \'666\')'
        ].join(' '));
      });
    });

    it('should generate a delete query (composite key)', function () {
      var owner = OwnerModel.fromJson({aid: 11, bid: 22});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .deleteImpl(function () {
          compositeKeyRelation .delete(this, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'delete from "RelatedModel"',
          'where "gender" = \'male\'',
          'and "thingy" is not null',
          'and ("RelatedModel"."cid","RelatedModel"."did") in',
            '(select "JoinTable"."relatedCId", "JoinTable"."relatedDId" from "JoinTable"',
            'where "JoinTable"."ownerAId" = \'11\' and "JoinTable"."ownerBId" = \'22\')'
        ].join(' '));
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
          expect(executedQueries[0]).to.eql([
            'delete from "RelatedModel"',
            'where "gender" = \'male\'',
            'and "thingy" is not null',
            'and "RelatedModel"."rid" in',
              '(select "JoinTable"."relatedId" from "JoinTable"',
              'where "JoinTable"."ownerId" = \'666\')',
            'and "someColumn" = \'100\''
          ].join(' '));
        });
    });

  });

  describe('relate', function () {

    it('should generate a relate query', function () {
      mockKnexQueryResults = [[5]];
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate(10);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(10);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'10\') returning "relatedId"'
        ].join(' '));
      });
    });

    it('should generate a relate query (array value)', function () {
      mockKnexQueryResults = [[5, 6, 7]];
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate([10, 20, 30]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([10, 20, 30]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'10\'), (\'666\', \'20\'), (\'666\', \'30\') returning "relatedId"'
        ].join(' '));
      });
    });

    it('should generate a relate query (object value)', function () {
      mockKnexQueryResults = [[5, 6, 7]];
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate([{rid: 10}, {rid: 20}, {rid: 30}]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([{rid: 10}, {rid: 20}, {rid: 30}]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'10\'), (\'666\', \'20\'), (\'666\', \'30\') returning "relatedId"'
        ].join(' '));
      });
    });

    it('should generate a relate query (composite key)', function () {
      mockKnexQueryResults = [[
        {relatedCId: 33, relatedDId: 44},
        {relatedCId: 33, relatedDId: 55},
        {relatedCId: 66, relatedDId: 77}
      ]];

      var owner = OwnerModel.fromJson({aid: 11, bid: 22});
      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          compositeKeyRelation.relate(this, owner, ids);
        })
        .relate([[33, 44], [33, 55], [66, 77]]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([[33, 44], [33, 55], [66, 77]]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (\'11\', \'22\', \'33\', \'44\'), (\'11\', \'22\', \'33\', \'55\'), (\'11\', \'22\', \'66\', \'77\') returning "relatedCId", "relatedDId"'
        ].join(' '));
      });
    });

    it('should generate a relate query (composite key with object value)', function () {
      mockKnexQueryResults = [[
        {relatedCId: 33, relatedDId: 44},
        {relatedCId: 33, relatedDId: 55},
        {relatedCId: 66, relatedDId: 77}
      ]];

      var owner = OwnerModel.fromJson({aid: 11, bid: 22});
      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          compositeKeyRelation.relate(this, owner, ids);
        })
        .relate([{cid: 33, did: 44}, {cid: 33, did: 55}, {cid: 66, did: 77}]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([{cid: 33, did: 44}, {cid: 33, did: 55}, {cid: 66, did: 77}]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (\'11\', \'22\', \'33\', \'44\'), (\'11\', \'22\', \'33\', \'55\'), (\'11\', \'22\', \'66\', \'77\') returning "relatedCId", "relatedDId"'
        ].join(' '));
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
          expect(result).to.eql(11);
          expect(executedQueries[0]).to.eql('insert into "JoinTable" ("ownerId", "relatedId") values (\'666\', \'11\') returning "relatedId"');
        });
    });

    it('should also insert extra properties', function () {
      mockKnexQueryResults = [[5]];
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .relateImpl(function (ids) {
          relation.relate(this, owner, ids);
        })
        .relate({rid: 10, extra2: 'foo', shouldNotBeInQuery: 'bar'});

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({rid: 10, extra2: 'foo', shouldNotBeInQuery: 'bar'});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'insert into "JoinTable" ("extra2", "ownerId", "relatedId") values (\'foo\', \'666\', \'10\') returning "relatedId"'
        ].join(' '));
      });
    });

  });

  describe('unrelate', function () {

    it('should generate a unrelate query', function () {
      createFilteredRelation({someColumn: 100});
      var owner = OwnerModel.fromJson({oid: 666});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .unrelateImpl(function () {
          relation.unrelate(this, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77]);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'delete from "JoinTable"',
          'where "JoinTable"."ownerId" = \'666\'',
          'and "JoinTable"."relatedId" in',
            '(select "RelatedModel"."rid" from "RelatedModel"',
            'where "code" in (\'55\', \'66\', \'77\')',
            'and "someColumn" = \'100\')'
        ].join(' '));
      });
    });

    it('should generate a unrelate query (composite key)', function () {
      var owner = OwnerModel.fromJson({aid: 11, bid: 22});

      var builder = QueryBuilder
        .forClass(RelatedModel)
        .unrelateImpl(function () {
          compositeKeyRelation.unrelate(this, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66 ,77])
        .where('someColumn', 100);

      return builder.then(function (result) {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql([
          'delete from "JoinTable"',
          'where "JoinTable"."ownerAId" = \'11\'',
          'and "JoinTable"."ownerBId" = \'22\'',
          'and ("JoinTable"."relatedCId","JoinTable"."relatedDId") in',
            '(select "RelatedModel"."cid", "RelatedModel"."did" from "RelatedModel"',
            'where "code" in (\'55\', \'66\', \'77\')',
            'and "someColumn" = \'100\')'
        ].join(' '));
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
