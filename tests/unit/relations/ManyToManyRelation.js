const _ = require('lodash');
const Knex = require('knex');
const expect = require('expect.js');
const Promise = require('bluebird');
const objection = require('../../../');
const classUtils = require('../../../lib/utils/classUtils');
const knexMocker = require('../../../testUtils/mockKnex');

const Model = objection.Model;
const QueryBuilder = objection.QueryBuilder;
const ManyToManyRelation = objection.ManyToManyRelation;

describe('ManyToManyRelation', () => {
  let mockKnexQueryResults = [];
  let executedQueries = [];
  let mockKnex = null;

  let OwnerModel = null;
  let RelatedModel = null;
  let JoinModel = null;

  let relation;
  let compositeKeyRelation;

  beforeEach(() => {
    let knex = Knex({ client: 'pg' });

    mockKnex = knexMocker(knex, function(mock, oldImpl, args) {
      executedQueries.push(this.toString());

      let result = mockKnexQueryResults.shift() || [];
      let promise = Promise.resolve(result);

      return promise.then.apply(promise, args);
    });
  });

  beforeEach(() => {
    mockKnexQueryResults = [];
    executedQueries = [];

    OwnerModel = class OwnerModel extends Model {
      static get tableName() {
        return 'OwnerModel';
      }
    };

    RelatedModel = class RelatedModel extends Model {
      static get tableName() {
        return 'RelatedModel';
      }

      static get namedFilters() {
        return {
          namedFilter: builder => builder.where('filteredProperty', true)
        };
      }
    };

    JoinModel = class JoinModel extends Model {
      static get tableName() {
        return 'JoinModel';
      }
    };

    OwnerModel.knex(mockKnex);
    RelatedModel.knex(mockKnex);
    JoinModel.knex(mockKnex);
  });

  beforeEach(() => {
    relation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      join: {
        from: 'OwnerModel.oid',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
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
          from: ['JoinModel.ownerAId', 'JoinModel.ownerBId'],
          to: ['JoinModel.relatedCId', 'JoinModel.relatedDId']
        },
        to: ['RelatedModel.cid', 'RelatedModel.did']
      }
    });
  });

  it('should accept a join table in join.through object', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedId']);
  });

  it('should accept a join model in join.through object', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          modelClass: JoinModel,
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.props).to.eql(['relatedId']);
    expect(classUtils.isSubclassOf(relation.joinModelClass, JoinModel)).to.equal(true);
  });

  it('should accept an absolute file path to a join model in join.through object', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          modelClass: __dirname + '/files/JoinModel',
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedId']);
    expect(classUtils.isSubclassOf(relation.joinModelClass, require('./files/JoinModel'))).to.equal(
      true
    );
  });

  it('should accept a composite keys in join.through object (1)', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: ['OwnerModel.name', 'OwnerModel.dateOfBirth'],
        through: {
          from: ['JoinModel.ownerName', 'JoinModel.ownerDateOfBirth'],
          to: 'JoinModel.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedId']);
  });

  it('should accept a composite keys in join.through object (2)', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: ['OwnerModel.name', 'OwnerModel.dateOfBirth'],
        through: {
          from: ['JoinModel.ownerName', 'JoinModel.ownerDateOfBirth'],
          to: ['JoinModel.relatedA', 'JoinModel.relatedB']
        },
        to: ['RelatedModel.A', 'RelatedModel.B']
      }
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedA', 'relatedB']);
  });

  it('should fail if join.through.modelClass is not a subclass of Model', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            modelClass: function() {},
            from: 'JoinModel.relatedId',
            to: 'JoinModel.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through.modelClass is not a subclass of Model or a file path to a module that exports one. You may be dealing with a require loop. See the documentation section about require loops.'
      );
    });
  });

  it('should fail if join.through.modelClass is an invalid path', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            modelClass: '/not/a/path/to/a/model',
            from: 'JoinModel.relatedId',
            to: 'JoinModel.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through.modelClass: /not/a/path/to/a/model is an invalid file path to a model class'
      );
    });
  });

  it('should fail if join.through.to is missing', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinModel.relatedId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}'
      );
    });
  });

  it('should fail if join.through.from is missing', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            to: 'JoinModel.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}'
      );
    });
  });

  it('join.through.from should have format joinTable.columnName', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'relatedId',
            to: 'JoinModel.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].'
      );
    });
  });

  it('join.through.to should have format JoinModel.columnName', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinModel.relatedId',
            to: 'ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].'
      );
    });
  });

  it('join.through `to` and `from` should point to the same table', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: ManyToManyRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinModel.relatedId',
            to: 'OtherTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through `from` and `to` must point to the same join table.'
      );
    });
  });

  describe('find', () => {
    it('should generate a find query', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, objectiontmpjoin0: 666 }, { a: 2, objectiontmpjoin0: 666 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(builder => {
          return relation.find(builder, [owner]);
        });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."extra1" as "extra1", "JoinModel"."extra2" as "extra2", "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    it('should generate a find query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22 }
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(builder => {
          return compositeKeyRelation.find(builder, [owner]);
        });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerAId" as "objectiontmpjoin0", "JoinModel"."ownerBId" as "objectiontmpjoin1"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId"',
            'where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22))',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    it('should find for multiple owners', () => {
      let owners = [OwnerModel.fromJson({ oid: 666 }), OwnerModel.fromJson({ oid: 667 })];

      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
        { a: 3, objectiontmpjoin0: 667 },
        { a: 4, objectiontmpjoin0: 667 }
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function() {
          return relation.find(this, owners);
        });

      return builder.then(result => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([{ a: 1 }, { a: 2 }]);
        expect(owners[1].nameOfOurRelation).to.eql([{ a: 3 }, { a: 4 }]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."extra1" as "extra1", "JoinModel"."extra2" as "extra2", "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666, 667)',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    it('should find for multiple owners (composite key)', () => {
      let owners = [
        OwnerModel.fromJson({ aid: 11, bid: 22 }),
        OwnerModel.fromJson({ aid: 11, bid: 33 })
      ];

      let expectedResult = [
        { a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 3, objectiontmpjoin0: 11, objectiontmpjoin1: 33 },
        { a: 4, objectiontmpjoin0: 11, objectiontmpjoin1: 33 }
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function() {
          return compositeKeyRelation.find(this, owners);
        });

      return builder.then(result => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([{ a: 1 }, { a: 2 }]);
        expect(owners[1].nameOfOurRelation).to.eql([{ a: 3 }, { a: 4 }]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerAId" as "objectiontmpjoin0", "JoinModel"."ownerBId" as "objectiontmpjoin1"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId"',
            'where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22), (11, 33))',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    it('explicit selects should override the RelatedModel.*', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, objectiontmpjoin0: 666 }, { a: 2, objectiontmpjoin0: 666 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .select('name')
        .findOperationFactory(function() {
          return relation.find(this, [owner]);
        });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "JoinModel"."ownerId" as "objectiontmpjoin0", "RelatedModel"."rid", "name"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    // TODO expectedResult array is changed in-place and the items in it are replaced with model instances. SHOULD FIX THAT!
    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, objectiontmpjoin0: 666 }, { a: 2, objectiontmpjoin0: 666 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function() {
          return relation.find(this, [owner]);
        });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "someColumn" = 100',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });

    // TODO expectedResult array is changed in-place and the items in it are replaced with model instances. SHOULD FIX THAT!
    it('should support named filters', () => {
      createModifiedRelation('namedFilter');

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, objectiontmpjoin0: 666 }, { a: 2, objectiontmpjoin0: 666 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function() {
          return relation.find(this, [owner]);
        });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "filteredProperty" = true',
            'and "name" = \'Teppo\'',
            'or "age" > 60'
          ].join(' ')
        );
      });
    });
  });

  describe('insert', () => {
    it('should generate an insert query', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = [
        RelatedModel.fromJson({ a: 'str1', rid: 3 }),
        RelatedModel.fromJson({ a: 'str2', rid: 4 })
      ];

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 3), (\'str2\', 4) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 3), (666, 4) returning "relatedId"'
        );

        expect(_.sortBy(owner.nameOfOurRelation, 'id')).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 },
          { a: 'str0', id: 3 }
        ]);

        expect(result).to.eql([{ a: 'str1', id: 1, rid: 3 }, { a: 'str2', id: 2, rid: 4 }]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', () => {
      mockKnexQueryResults = [[{ id: 1, cid: 33, did: 44 }, { id: 2, cid: 33, did: 55 }]];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let related = [
        RelatedModel.fromJson({ a: 'str1', cid: 33, did: 44 }),
        RelatedModel.fromJson({ a: 'str2', cid: 33, did: 55 })
      ];

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return compositeKeyRelation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "cid", "did") values (\'str1\', 33, 44), (\'str2\', 33, 55) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55) returning "relatedCId", "relatedDId"'
        );

        expect(_.sortBy(owner.nameOfOurRelation, 'id')).to.eql([
          { a: 'str1', id: 1, cid: 33, did: 44 },
          { a: 'str2', id: 2, cid: 33, did: 55 },
          { a: 'str0', id: 3 }
        ]);

        expect(result).to.eql([
          { a: 'str1', id: 1, cid: 33, did: 44 },
          { a: 'str2', id: 2, cid: 33, did: 55 }
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = [{ a: 'str1', rid: 3 }, { a: 'str2', rid: 4 }];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 3), (\'str2\', 4) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 3), (666, 4) returning "relatedId"'
        );

        expect(owner.nameOfOurRelation).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 }
        ]);

        expect(result).to.eql([{ a: 'str1', id: 1, rid: 3 }, { a: 'str2', id: 2, rid: 4 }]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept single model', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({ a: 'str1', rid: 2 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 2) returning "relatedId"'
        );

        expect(result).to.eql({ a: 'str1', id: 1, rid: 2 });
        expect(result).to.be.a(RelatedModel);
      });
    });

    it('should accept single json object', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = { a: 'str1', rid: 2 };

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 2) returning "relatedId"'
        );

        expect(result).to.eql({ a: 'str1', id: 1, rid: 2 });
        expect(result).to.be.a(RelatedModel);
      });
    });

    it('should insert extra properties to join table', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({
        a: 'str2',
        rid: 4,
        extra1: 'extraVal1',
        extra2: 'extraVal2'
      });

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str2\', 4) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("extra1", "extra2", "ownerId", "relatedId") values (\'extraVal1\', \'extraVal2\', 666, 4) returning "relatedId"'
        );

        expect(_.sortBy(_.invokeMap(owner.nameOfOurRelation, 'toJSON'), 'id')).to.eql([
          { a: 'str2', id: 1, rid: 4, extra1: 'extraVal1', extra2: 'extraVal2' },
          { a: 'str0', id: 3 }
        ]);

        expect(result).to.be.a(RelatedModel);
        expect(result.toJSON()).to.eql({
          a: 'str2',
          id: 1,
          rid: 4,
          extra1: 'extraVal1',
          extra2: 'extraVal2'
        });
      });
    });

    it('should insert extra properties to join table (not all)', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({ a: 'str2', rid: 4, extra2: 'extraVal2' });

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str2\', 4) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("extra2", "ownerId", "relatedId") values (\'extraVal2\', 666, 4) returning "relatedId"'
        );

        expect(_.sortBy(_.invokeMap(owner.nameOfOurRelation, 'toJSON'), 'id')).to.eql([
          { a: 'str2', id: 1, rid: 4, extra2: 'extraVal2' },
          { a: 'str0', id: 3 }
        ]);

        expect(result).to.be.a(RelatedModel);
        expect(result.toJSON()).to.eql({ a: 'str2', id: 1, rid: 4, extra2: 'extraVal2' });
      });
    });
  });

  describe('update', () => {
    it('should generate an update query', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(numUpdated => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`
        );
      });
    });

    it('should generate an update query (composite key)', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return compositeKeyRelation.update(builder, owner);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(numUpdated => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and "gender" = 'male' and "thingy" is not null)`
        );
      });
    });

    it('should accept json object', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let update = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(numUpdated => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`
          );
        });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`
          );
        });
    });
  });

  describe('patch', () => {
    it('should generate a patch query', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let patch = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(numUpdated => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`
        );
      });
    });

    it('should accept json object', () => {
      mockKnexQueryResults = [42];

      RelatedModel.jsonSchema = {
        type: 'object',
        required: ['b'],
        properties: {
          id: { type: 'number' },
          a: { type: 'string' },
          b: { type: 'string' }
        }
      };

      let owner = OwnerModel.fromJson({ oid: 666 });
      let patch = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(numUpdated => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`
          );
        });
    });

    it('should work with increment', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .increment('test', 1)
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "test" = "test" + 1 where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666))`
          );
        });
    });

    it('should work with decrement', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .decrement('test', 10)
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "test" = "test" - 10 where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666))`
          );
        });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });

      let owner = OwnerModel.fromJson({ oid: 666 });
      let patch = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`
          );
        });
    });
  });

  describe('delete', () => {
    it('should generate a delete query', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return relation.delete(builder, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`
        );
      });
    });

    it('should generate a delete query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return compositeKeyRelation.delete(builder, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and "gender" = 'male' and "thingy" is not null)`
        );
      });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return relation.delete(builder, owner);
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql(
            `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`
          );
        });
    });
  });

  describe('relate', () => {
    it('should generate a relate query', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate(10);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({ ownerId: 666, relatedId: 10 });

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10) returning "relatedId"'
          ].join(' ')
        );
      });
    });

    it('should generate a relate query (array value)', () => {
      mockKnexQueryResults = [[5, 6, 7]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([10, 20, 30]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([
          { ownerId: 666, relatedId: 10 },
          { ownerId: 666, relatedId: 20 },
          { ownerId: 666, relatedId: 30 }
        ]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10), (666, 20), (666, 30) returning "relatedId"'
          ].join(' ')
        );
      });
    });

    it('should generate a relate query (object value)', () => {
      mockKnexQueryResults = [[5, 6, 7]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([{ rid: 10 }, { rid: 20 }, { rid: 30 }]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([
          { ownerId: 666, relatedId: 10 },
          { ownerId: 666, relatedId: 20 },
          { ownerId: 666, relatedId: 30 }
        ]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10), (666, 20), (666, 30) returning "relatedId"'
          ].join(' ')
        );
      });
    });

    it('should generate a relate query (composite key)', () => {
      mockKnexQueryResults = [
        [
          { relatedCId: 33, relatedDId: 44 },
          { relatedCId: 33, relatedDId: 55 },
          { relatedCId: 66, relatedDId: 77 }
        ]
      ];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate([[33, 44], [33, 55], [66, 77]]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([
          { ownerAId: 11, ownerBId: 22, relatedCId: 33, relatedDId: 44 },
          { ownerAId: 11, ownerBId: 22, relatedCId: 33, relatedDId: 55 },
          { ownerAId: 11, ownerBId: 22, relatedCId: 66, relatedDId: 77 }
        ]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55), (11, 22, 66, 77) returning "relatedCId", "relatedDId"'
          ].join(' ')
        );
      });
    });

    it('should generate a relate query (composite key with object value)', () => {
      mockKnexQueryResults = [
        [
          { relatedCId: 33, relatedDId: 44 },
          { relatedCId: 33, relatedDId: 55 },
          { relatedCId: 66, relatedDId: 77 }
        ]
      ];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate([{ cid: 33, did: 44 }, { cid: 33, did: 55 }, { cid: 66, did: 77 }]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([
          { ownerAId: 11, ownerBId: 22, relatedCId: 33, relatedDId: 44 },
          { ownerAId: 11, ownerBId: 22, relatedCId: 33, relatedDId: 55 },
          { ownerAId: 11, ownerBId: 22, relatedCId: 66, relatedDId: 77 }
        ]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55), (11, 22, 66, 77) returning "relatedCId", "relatedDId"'
          ].join(' ')
        );
      });
    });

    it('should accept one id', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate(11)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({ ownerId: 666, relatedId: 11 });
          expect(executedQueries[0]).to.eql(
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 11) returning "relatedId"'
          );
        });
    });

    it('should also insert extra properties', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate({ rid: 10, extra2: 'foo', shouldNotBeInQuery: 'bar' });

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({ ownerId: 666, relatedId: 10, extra2: 'foo' });

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("extra2", "ownerId", "relatedId") values (\'foo\', 666, 10) returning "relatedId"'
          ].join(' ')
        );
      });
    });
  });

  describe('unrelate', () => {
    it('should generate a unrelate query', () => {
      mockKnexQueryResults = [123];
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory(builder => {
          return relation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66, 77]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `delete from "JoinModel" where "JoinModel"."relatedId" in (select "RelatedModel"."rid" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "code" in (55, 66, 77)) and "JoinModel"."ownerId" = 666`
        );
      });
    });

    it('should generate a unrelate query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory(builder => {
          return compositeKeyRelation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66, 77])
        .where('someColumn', 100);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          `delete from "JoinModel" where ("JoinModel"."relatedCId","JoinModel"."relatedDId") in (select "RelatedModel"."cid", "RelatedModel"."did" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and "code" in (55, 66, 77) and "someColumn" = 100) and "JoinModel"."ownerAId" = 11 and "JoinModel"."ownerBId" = 22`
        );
      });
    });
  });

  function createModifiedRelation(modify) {
    relation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      modify: modify,
      join: {
        from: 'OwnerModel.oid',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId'
        },
        to: 'RelatedModel.rid'
      }
    });
  }
});
