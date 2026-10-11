const Knex = require('knex');
const expect = require('expect.js');
const objection = require('../../../');
const { isFunction } = require('../../../lib/utils/objectUtils');
const knexMocker = require('../../../testUtils/mockKnex');
const RelationOwner = require('../../../lib/relations/RelationOwner').RelationOwner;
const { sortBy } = require('../../../testUtils/testUtils');

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

    mockKnex = knexMocker(knex, function (mock, oldImpl, args) {
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

      static get modifiers() {
        return {
          modifier: (builder) => builder.where('filteredProperty', true),
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
          extra: ['extra1', 'extra2'],
        },
        to: 'RelatedModel.rid',
      },
    });

    compositeKeyRelation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    compositeKeyRelation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      join: {
        from: ['OwnerModel.aid', 'OwnerModel.bid'],
        through: {
          from: ['JoinModel.ownerAId', 'JoinModel.ownerBId'],
          to: ['JoinModel.relatedCId', 'JoinModel.relatedDId'],
        },
        to: ['RelatedModel.cid', 'RelatedModel.did'],
      },
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
          to: 'JoinModel.relatedId',
        },
        to: 'RelatedModel.ownerId',
      },
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
          to: 'JoinModel.relatedId',
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.props).to.eql(['relatedId']);
    expect(isSubclassOf(relation.joinModelClass, JoinModel)).to.equal(true);
  });

  it('should accept references created with Model.ref()', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: OwnerModel.ref('id'),
        through: {
          modelClass: JoinModel,
          from: JoinModel.ref('ownerId'),
          to: JoinModel.ref('relatedId'),
        },
        to: RelatedModel.ref('ownerId'),
      },
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedId']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
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
          to: 'JoinModel.relatedId',
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerId']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedId']);
    expect(isSubclassOf(relation.joinModelClass, require('./files/JoinModel'))).to.equal(true);
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
          to: 'JoinModel.relatedId',
        },
        to: 'RelatedModel.ownerId',
      },
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
          to: ['JoinModel.relatedA', 'JoinModel.relatedB'],
        },
        to: ['RelatedModel.A', 'RelatedModel.B'],
      },
    });

    expect(relation.joinTable).to.equal('JoinModel');
    expect(relation.joinTableOwnerProp.cols).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.joinTableRelatedProp.cols).to.eql(['relatedA', 'relatedB']);
  });

  it('should accept an array in through.extra', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
          extra: ['extra1', 'extra2'],
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relation.joinTableExtras[0].joinTableCol).to.equal('extra1');
    expect(relation.joinTableExtras[1].joinTableCol).to.equal('extra2');
  });

  it('should accept a string in through.extra', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
          extra: 'extra1',
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relation.joinTableExtras[0].joinTableCol).to.equal('extra1');
  });

  it('should accept an object in through.extra', () => {
    let relation = new ManyToManyRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
          extra: {
            extra1: 'extraColumn',
          },
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relation.joinTableExtras[0].joinTableCol).to.equal('extraColumn');
    expect(relation.joinTableExtras[0].joinTableProp).to.equal('extraColumn');
    expect(relation.joinTableExtras[0].aliasCol).to.equal('extra1');
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
            modelClass: function () {},
            from: 'JoinModel.relatedId',
            to: 'JoinModel.ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.through.modelClass: is not a subclass of Model or a file path to a module that exports one. You may be dealing with a require loop. See the documentation section about require loops.',
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
            to: 'JoinModel.ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        "OwnerModel.relationMappings.testRelation: Cannot find module '/not/a/path/to/a/model'",
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
            from: 'JoinModel.relatedId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        'OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}',
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
            to: 'JoinModel.ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        'OwnerModel.relationMappings.testRelation: join.through must be an object that describes the join table. For example: {from: "JoinTable.someId", to: "JoinTable.someOtherId"}',
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
            to: 'JoinModel.ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        'OwnerModel.relationMappings.testRelation: join.through.from must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].',
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
            to: 'ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        'OwnerModel.relationMappings.testRelation: join.through.to must have format JoinTable.columnName. For example "JoinTable.someId" or in case of composite key ["JoinTable.a", "JoinTable.b"].',
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
            to: 'OtherTable.ownerId',
          },
          to: 'OwnerModel.id',
        },
      });
    }).to.throwException((err) => {
      expect(err.message).to.contain(
        'OwnerModel.relationMappings.testRelation: join.through `from` and `to` must point to the same join table.',
      );
    });
  });

  it('should accept a modifier in join.through', () => {
    // modifier defined in join.through.modify
    let modifier = (builder) => builder.where('someColumn', 'foo');
    createJoinThroughModifiedRelation(modifier);

    expect(relation.joinTableModify).to.be.a(Function);

    // test also join.through.filter
    let relationFilter = new ManyToManyRelation('testRelation', OwnerModel);
    relationFilter.setMapping({
      relation: ManyToManyRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
          filter: modifier,
        },
        to: 'RelatedModel.ownerId',
      },
    });

    expect(relationFilter.joinTableModify).to.be.a(Function);
  });

  describe('find', () => {
    it('should generate a find query', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory((builder) => {
          return relation.find(builder, RelationOwner.create(owner));
        });

      return builder.then((result) => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."extra1" as "extra1", "JoinModel"."extra2" as "extra2", "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    it('should generate a find query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory((builder) => {
          return compositeKeyRelation.find(builder, RelationOwner.create(owner));
        });

      return builder.then((result) => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerAId" as "objectiontmpjoin0", "JoinModel"."ownerBId" as "objectiontmpjoin1"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId"',
            'where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22))',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    it('should find for multiple owners', () => {
      let owners = [OwnerModel.fromJson({ oid: 666 }), OwnerModel.fromJson({ oid: 667 })];

      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
        { a: 3, objectiontmpjoin0: 667 },
        { a: 4, objectiontmpjoin0: 667 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function () {
          return relation.find(this, RelationOwner.create(owners));
        });

      return builder.then((result) => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([{ a: 1 }, { a: 2 }]);
        expect(owners[1].nameOfOurRelation).to.eql([{ a: 3 }, { a: 4 }]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."extra1" as "extra1", "JoinModel"."extra2" as "extra2", "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666, 667)',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    it('should find for multiple owners (composite key)', () => {
      let owners = [
        OwnerModel.fromJson({ aid: 11, bid: 22 }),
        OwnerModel.fromJson({ aid: 11, bid: 33 }),
      ];

      let expectedResult = [
        { a: 1, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 2, objectiontmpjoin0: 11, objectiontmpjoin1: 22 },
        { a: 3, objectiontmpjoin0: 11, objectiontmpjoin1: 33 },
        { a: 4, objectiontmpjoin0: 11, objectiontmpjoin1: 33 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function () {
          return compositeKeyRelation.find(this, RelationOwner.create(owners));
        });

      return builder.then((result) => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([{ a: 1 }, { a: 2 }]);
        expect(owners[1].nameOfOurRelation).to.eql([{ a: 3 }, { a: 4 }]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerAId" as "objectiontmpjoin0", "JoinModel"."ownerBId" as "objectiontmpjoin1"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId"',
            'where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22), (11, 33))',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    it('explicit selects should override the RelatedModel.*', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .select('name')
        .findOperationFactory(function () {
          return relation.find(this, RelationOwner.create(owner));
        });

      return builder.then((result) => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "JoinModel"."ownerId" as "objectiontmpjoin0", "RelatedModel"."rid", "name"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    // TODO expectedResult array is changed in-place and the items in it are replaced with model instances. SHOULD FIX THAT!
    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function () {
          return relation.find(this, RelationOwner.create(owner));
        });

      return builder.then((result) => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "someColumn" = 100',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    // TODO expectedResult array is changed in-place and the items in it are replaced with model instances. SHOULD FIX THAT!
    it('should support modifiers', () => {
      createModifiedRelation('modifier');

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [
        { a: 1, objectiontmpjoin0: 666 },
        { a: 2, objectiontmpjoin0: 666 },
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(function () {
          return relation.find(this, RelationOwner.create(owner));
        });

      return builder.then((result) => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owner.nameOfOurRelation).to.eql(expectedResult);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
            'and "filteredProperty" = true',
            'and ("name" = \'Teppo\'',
            'or "age" > 60)',
          ].join(' '),
        );
      });
    });

    it('should support modifiers in join.through', () => {
      createJoinThroughModifiedRelation((builder) => builder.where('someColumn', 'foo'));

      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(function () {
        return relation.find(this, RelationOwner.create(owner));
      });

      return builder.then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(
          [
            'select "RelatedModel".*, "JoinModel"."ownerId" as "objectiontmpjoin0"',
            'from "RelatedModel"',
            'inner join (select "JoinModel".* from "JoinModel" where "someColumn" = \'foo\') as "JoinModel"',
            'on "RelatedModel"."rid" = "JoinModel"."relatedId"',
            'where "JoinModel"."ownerId" in (666)',
          ].join(' '),
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
        RelatedModel.fromJson({ a: 'str2', rid: 4 }),
      ];

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 3), (\'str2\', 4) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 3), (666, 4) returning "relatedId"',
        );

        expect(sortBy(owner.nameOfOurRelation, 'id')).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 },
          { a: 'str0', id: 3 },
        ]);

        expect(result).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 },
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', () => {
      mockKnexQueryResults = [
        [
          { id: 1, cid: 33, did: 44 },
          { id: 2, cid: 33, did: 55 },
        ],
      ];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let related = [
        RelatedModel.fromJson({ a: 'str1', cid: 33, did: 44 }),
        RelatedModel.fromJson({ a: 'str2', cid: 33, did: 55 }),
      ];

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return compositeKeyRelation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "cid", "did") values (\'str1\', 33, 44), (\'str2\', 33, 55) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55) returning "relatedCId", "relatedDId"',
        );

        expect(sortBy(owner.nameOfOurRelation, 'id')).to.eql([
          { a: 'str1', id: 1, cid: 33, did: 44 },
          { a: 'str2', id: 2, cid: 33, did: 55 },
          { a: 'str0', id: 3 },
        ]);

        expect(result).to.eql([
          { a: 'str1', id: 1, cid: 33, did: 44 },
          { a: 'str2', id: 2, cid: 33, did: 55 },
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = [
        { a: 'str1', rid: 3 },
        { a: 'str2', rid: 4 },
      ];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 3), (\'str2\', 4) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 3), (666, 4) returning "relatedId"',
        );

        expect(owner.nameOfOurRelation).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 },
        ]);

        expect(result).to.eql([
          { a: 'str1', id: 1, rid: 3 },
          { a: 'str2', id: 2, rid: 4 },
        ]);

        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept single model', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({ a: 'str1', rid: 2 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 2) returning "relatedId"',
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
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 2) returning "relatedId"',
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
        extra2: 'extraVal2',
      });

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str2\', 4) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("extra1", "extra2", "ownerId", "relatedId") values (\'extraVal1\', \'extraVal2\', 666, 4) returning "relatedId"',
        );

        expect(
          sortBy(
            owner.nameOfOurRelation.map((it) => it.toJSON()),
            'id',
          ),
        ).to.eql([
          { a: 'str2', id: 1, rid: 4, extra1: 'extraVal1', extra2: 'extraVal2' },
          { a: 'str0', id: 3 },
        ]);

        expect(result).to.be.a(RelatedModel);
        expect(result.toJSON()).to.eql({
          a: 'str2',
          id: 1,
          rid: 4,
          extra1: 'extraVal1',
          extra2: 'extraVal2',
        });
      });
    });

    it('should insert extra properties to join table (not all)', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({ a: 'str2', rid: 4, extra2: 'extraVal2' });

      owner.nameOfOurRelation = [RelatedModel.fromJson({ a: 'str0', id: 3 })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory((builder) => {
          return relation.insert(builder, RelationOwner.create(owner));
        })
        .insert(related);

      let toString = builder.toKnexQuery().toString();
      let toSql = builder.toKnexQuery().toString();

      return builder.then((result) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "rid") values (\'str2\', 4) returning "id"',
        );
        expect(executedQueries[1]).to.equal(
          'insert into "JoinModel" ("extra2", "ownerId", "relatedId") values (\'extraVal2\', 666, 4) returning "relatedId"',
        );

        expect(
          sortBy(
            owner.nameOfOurRelation.map((it) => it.toJSON()),
            'id',
          ),
        ).to.eql([
          { a: 'str2', id: 1, rid: 4, extra2: 'extraVal2' },
          { a: 'str0', id: 3 },
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
        .updateOperationFactory((builder) => {
          return relation.update(builder, RelationOwner.create(owner));
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then((numUpdated) => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`,
        );
      });
    });

    it('should generate an update query (composite key)', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory((builder) => {
          return compositeKeyRelation.update(builder, RelationOwner.create(owner));
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then((numUpdated) => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and "gender" = 'male' and "thingy" is not null)`,
        );
      });
    });

    it('should accept json object', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let update = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory((builder) => {
          return relation.update(builder, RelationOwner.create(owner));
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then((numUpdated) => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`,
          );
        });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory((builder) => {
          return relation.update(builder, RelationOwner.create(owner));
        })
        .update(update)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`,
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
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then((numUpdated) => {
        expect(numUpdated).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`,
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
          b: { type: 'string' },
        },
      };

      let owner = OwnerModel.fromJson({ oid: 666 });
      let patch = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then((numUpdated) => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`,
          );
        });
    });

    it('should work with increment', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .increment('test', 1)
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "test" = "test" + 1 where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666))`,
          );
        });
    });

    it('should work with decrement', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .decrement('test', 10)
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "test" = "test" - 10 where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666))`,
          );
        });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });

      let owner = OwnerModel.fromJson({ oid: 666 });
      let patch = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch(patch)
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`,
          );
        });
    });
  });

  describe('delete', () => {
    it('should generate a delete query', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory((builder) => {
          return relation.delete(builder, RelationOwner.create(owner));
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "gender" = 'male' and "thingy" is not null)`,
        );
      });
    });

    it('should generate a delete query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory((builder) => {
          return compositeKeyRelation.delete(builder, RelationOwner.create(owner));
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored');

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and "gender" = 'male' and "thingy" is not null)`,
        );
      });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory((builder) => {
          return relation.delete(builder, RelationOwner.create(owner));
        })
        .delete()
        .where('gender', 'male')
        .whereNotNull('thingy')
        .select('shouldBeIgnored')
        .then((result) => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql(
            `delete from "RelatedModel" where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = 'male' and "thingy" is not null)`,
          );
        });
    });
  });

  describe('relate', () => {
    it('should generate a relate query', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate(10);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(1);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10) returning "relatedId"',
          ].join(' '),
        );
      });
    });

    it('should generate a relate query (array value)', () => {
      mockKnexQueryResults = [[5, 6, 7]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate([10, 20, 30]);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(3);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10), (666, 20), (666, 30) returning "relatedId"',
          ].join(' '),
        );
      });
    });

    it('should generate a relate query (object value)', () => {
      mockKnexQueryResults = [[5, 6, 7]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate([{ rid: 10 }, { rid: 20 }, { rid: 30 }]);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(3);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10), (666, 20), (666, 30) returning "relatedId"',
          ].join(' '),
        );
      });
    });

    it('should generate a relate query (composite key)', () => {
      mockKnexQueryResults = [
        [
          { relatedCId: 33, relatedDId: 44 },
          { relatedCId: 33, relatedDId: 55 },
          { relatedCId: 66, relatedDId: 77 },
        ],
      ];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return compositeKeyRelation.relate(builder, RelationOwner.create(owner));
        })
        .relate([
          [33, 44],
          [33, 55],
          [66, 77],
        ]);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(3);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55), (11, 22, 66, 77) returning "relatedCId", "relatedDId"',
          ].join(' '),
        );
      });
    });

    it('should generate a relate query (composite key with object value)', () => {
      mockKnexQueryResults = [
        [
          { relatedCId: 33, relatedDId: 44 },
          { relatedCId: 33, relatedDId: 55 },
          { relatedCId: 66, relatedDId: 77 },
        ],
      ];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return compositeKeyRelation.relate(builder, RelationOwner.create(owner));
        })
        .relate([
          { cid: 33, did: 44 },
          { cid: 33, did: 55 },
          { cid: 66, did: 77 },
        ]);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.equal(3);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("ownerAId", "ownerBId", "relatedCId", "relatedDId") values (11, 22, 33, 44), (11, 22, 33, 55), (11, 22, 66, 77) returning "relatedCId", "relatedDId"',
          ].join(' '),
        );
      });
    });

    it('should accept one id', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate(11)
        .then((result) => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql(1);
          expect(executedQueries[0]).to.eql(
            'insert into "JoinModel" ("ownerId", "relatedId") values (666, 11) returning "relatedId"',
          );
        });
    });

    it('should also insert extra properties', () => {
      mockKnexQueryResults = [[5]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate({ rid: 10, extra2: 'foo', shouldNotBeInQuery: 'bar' });

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(1);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          [
            'insert into "JoinModel" ("extra2", "ownerId", "relatedId") values (\'foo\', 666, 10) returning "relatedId"',
          ].join(' '),
        );
      });
    });

    it('should return the inserted join rows when returning() is used', () => {
      mockKnexQueryResults = [
        [
          { id: 1, ownerId: 666, relatedId: 10 },
          { id: 2, ownerId: 666, relatedId: 20 },
        ],
      ];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory((builder) => {
          return relation.relate(builder, RelationOwner.create(owner));
        })
        .relate([10, 20])
        .returning('*');

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          'insert into "JoinModel" ("ownerId", "relatedId") values (666, 10), (666, 20) returning *',
        );

        expect(result).to.have.length(2);
        expect(result[0]).to.be.a(relation.joinModelClass);
        expect(result[0].toJSON()).to.eql({ id: 1, ownerId: 666, relatedId: 10 });
        expect(result[1].toJSON()).to.eql({ id: 2, ownerId: 666, relatedId: 20 });
      });
    });
  });

  describe('unrelate', () => {
    it('should generate a unrelate query', () => {
      mockKnexQueryResults = [123];
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return relation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .whereIn('code', [55, 66, 77]);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `delete from "JoinModel" where "JoinModel"."ownerId" in (666) and exists (select 1 from "RelatedModel" where "RelatedModel"."rid" = "JoinModel"."relatedId" and "someColumn" = 100 and "code" in (55, 66, 77))`,
        );
      });
    });

    it('should generate a unrelate query (composite key)', () => {
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return compositeKeyRelation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .whereIn('code', [55, 66, 77])
        .where('someColumn', 100);

      return builder.then((result) => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.equal(builder.toKnexQuery().toString());
        expect(executedQueries[0]).to.eql(
          `delete from "JoinModel" where ("JoinModel"."ownerAId", "JoinModel"."ownerBId") in ((11, 22)) and exists (select 1 from "RelatedModel" where "RelatedModel"."cid" = "JoinModel"."relatedCId" and "RelatedModel"."did" = "JoinModel"."relatedDId" and "code" in (55, 66, 77) and "someColumn" = 100)`,
        );
      });
    });

    it('should apply join table filters to the deleted join rows (#1853)', () => {
      mockKnexQueryResults = [1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return relation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .where('RelatedModel.code', 55)
        .where('JoinModel.extra1', 'foo')
        .then((result) => {
          expect(result).to.equal(1);
          // Only the join rows that match the filters themselves are deleted.
          expect(executedQueries).to.eql([
            `delete from "JoinModel" where "JoinModel"."ownerId" in (666) and exists (select 1 from "RelatedModel" where "RelatedModel"."rid" = "JoinModel"."relatedId" and "RelatedModel"."code" = 55 and "JoinModel"."extra1" = 'foo')`,
          ]);
        });
    });

    it('should apply join table filters with an aliased join table', () => {
      mockKnexQueryResults = [1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return relation.unrelate(builder, RelationOwner.create(owner));
        })
        .aliasFor('JoinModel', 'jm')
        .unrelate()
        .where('jm.extra1', 'foo')
        .then(() => {
          expect(executedQueries).to.eql([
            `delete from "JoinModel" as "jm" where "jm"."ownerId" in (666) and exists (select 1 from "RelatedModel" where "RelatedModel"."rid" = "jm"."relatedId" and "jm"."extra1" = 'foo')`,
          ]);
        });
    });
  });

  describe('patch join table extras', () => {
    it('should apply the filters to both the related table and the join table', () => {
      mockKnexQueryResults = [1, 1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch({ a: 'str1', extra2: 'extraVal' })
        .where('RelatedModel.code', 55)
        .where('JoinModel.extra1', 'foo')
        .then((result) => {
          expect(result).to.equal(1);
          expect(executedQueries).to.eql([
            `update "RelatedModel" set "a" = 'str1' where "RelatedModel"."id" in (select "RelatedModel"."id" from "RelatedModel" inner join "JoinModel" on "RelatedModel"."rid" = "JoinModel"."relatedId" where "JoinModel"."ownerId" in (666) and "RelatedModel"."code" = 55 and "JoinModel"."extra1" = 'foo')`,
            `update "JoinModel" set "extra2" = 'extraVal' where "JoinModel"."ownerId" in (666) and exists (select 1 from "RelatedModel" where "RelatedModel"."rid" = "JoinModel"."relatedId" and "RelatedModel"."code" = 55 and "JoinModel"."extra1" = 'foo')`,
          ]);
        });
    });

    it('should only patch the join table if only extras are patched', () => {
      mockKnexQueryResults = [1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch({ extra2: 'extraVal' })
        .where('RelatedModel.code', 55)
        .then(() => {
          expect(executedQueries).to.eql([
            `update "JoinModel" set "extra2" = 'extraVal' where "JoinModel"."ownerId" in (666) and exists (select 1 from "RelatedModel" where "RelatedModel"."rid" = "JoinModel"."relatedId" and "RelatedModel"."code" = 55)`,
          ]);
        });
    });
  });

  describe('mysql', () => {
    beforeEach(() => {
      useClient('mysql');
    });

    function unrelate(builder) {
      let owner = OwnerModel.fromJson({ oid: 666 });

      return builder
        .unrelateOperationFactory((builder) => {
          return relation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate();
    }

    it('unrelate should fetch the keys of the join rows first', () => {
      mockKnexQueryResults = [
        [
          { ownerId: 666, relatedId: 5 },
          { ownerId: 666, relatedId: 6 },
        ],
        2,
      ];

      return unrelate(QueryBuilder.forClass(RelatedModel))
        .whereIn('code', [55, 66, 77])
        .then((result) => {
          expect(result).to.equal(2);
          expect(executedQueries).to.eql([
            'select `JoinModel`.`ownerId`, `JoinModel`.`relatedId` from `JoinModel` where `JoinModel`.`ownerId` in (666) and exists (select 1 from `RelatedModel` where `RelatedModel`.`rid` = `JoinModel`.`relatedId` and `code` in (55, 66, 77))',
            'delete from `JoinModel` where `JoinModel`.`ownerId` in (666) and (`JoinModel`.`ownerId`, `JoinModel`.`relatedId`) in ((666, 5), (666, 6))',
          ]);
        });
    });

    it('unrelate should fetch the keys of the join rows first with composite keys', () => {
      mockKnexQueryResults = [
        [
          { ownerAId: 11, ownerBId: 22, relatedCId: 1, relatedDId: 2 },
          { ownerAId: 11, ownerBId: 22, relatedCId: 3, relatedDId: 4 },
        ],
        2,
      ];
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return compositeKeyRelation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .where('someColumn', 100)
        .then((result) => {
          expect(result).to.equal(2);
          expect(executedQueries).to.eql([
            'select `JoinModel`.`ownerAId`, `JoinModel`.`ownerBId`, `JoinModel`.`relatedCId`, `JoinModel`.`relatedDId` from `JoinModel` where (`JoinModel`.`ownerAId`, `JoinModel`.`ownerBId`) in ((11, 22)) and exists (select 1 from `RelatedModel` where `RelatedModel`.`cid` = `JoinModel`.`relatedCId` and `RelatedModel`.`did` = `JoinModel`.`relatedDId` and `someColumn` = 100)',
            'delete from `JoinModel` where (`JoinModel`.`ownerAId`, `JoinModel`.`ownerBId`) in ((11, 22)) and (`JoinModel`.`ownerAId`, `JoinModel`.`ownerBId`, `JoinModel`.`relatedCId`, `JoinModel`.`relatedDId`) in ((11, 22, 1, 2), (11, 22, 3, 4))',
          ]);
        });
    });

    it('unrelate should return the count of the delete query if no join rows match', () => {
      mockKnexQueryResults = [[], 0];

      return unrelate(QueryBuilder.forClass(RelatedModel))
        .where('code', 55)
        .then((result) => {
          expect(result).to.equal(0);
          expect(executedQueries.slice(1)).to.eql([
            'delete from `JoinModel` where `JoinModel`.`ownerId` in (666) and 1 = 0',
          ]);
        });
    });

    it('patch should fetch the keys of the join rows first', () => {
      mockKnexQueryResults = [1, [{ ownerId: 666, relatedId: 5 }], 1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch({ a: 'str1', extra2: 'extraVal' })
        .where('code', 55)
        .then((result) => {
          expect(result).to.equal(1);
          expect(executedQueries).to.eql([
            "update `RelatedModel` set `a` = 'str1' where `RelatedModel`.`id` in (select * from (select `RelatedModel`.`id` from `RelatedModel` inner join `JoinModel` on `RelatedModel`.`rid` = `JoinModel`.`relatedId` where `JoinModel`.`ownerId` in (666) and `code` = 55) as `mysql_subquery_fix`)",
            'select `JoinModel`.`ownerId`, `JoinModel`.`relatedId` from `JoinModel` where `JoinModel`.`ownerId` in (666) and exists (select 1 from `RelatedModel` where `RelatedModel`.`rid` = `JoinModel`.`relatedId` and `code` = 55)',
            "update `JoinModel` set `extra2` = 'extraVal' where `JoinModel`.`ownerId` in (666) and (`JoinModel`.`ownerId`, `JoinModel`.`relatedId`) in ((666, 5))",
          ]);
        });
    });

    it('delete should not fetch the related ids', () => {
      mockKnexQueryResults = [3];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory((builder) => {
          return relation.delete(builder, RelationOwner.create(owner));
        })
        .delete()
        .where('code', 55)
        .then((result) => {
          expect(result).to.equal(3);
          expect(executedQueries).to.eql([
            'delete from `RelatedModel` where `RelatedModel`.`id` in (select * from (select `RelatedModel`.`id` from `RelatedModel` inner join `JoinModel` on `RelatedModel`.`rid` = `JoinModel`.`relatedId` where `JoinModel`.`ownerId` in (666) and `code` = 55) as `mysql_subquery_fix`)',
          ]);
        });
    });

    it('unrelate should support joins with subqueries', () => {
      mockKnexQueryResults = [[{ ownerId: 666, relatedId: 5 }], 1];

      return unrelate(QueryBuilder.forClass(RelatedModel))
        .join('Other', (join) => {
          join
            .on('Other.id', 'RelatedModel.otherId')
            .andOnIn('Other.code', OwnerModel.query().select('code'));
        })
        .then((result) => {
          expect(result).to.equal(1);
          expect(executedQueries).to.eql([
            'select `JoinModel`.`ownerId`, `JoinModel`.`relatedId` from `JoinModel` where `JoinModel`.`ownerId` in (666) and exists (select 1 from `RelatedModel` inner join `Other` on `Other`.`id` = `RelatedModel`.`otherId` and `Other`.`code` in (select `code` from `OwnerModel`) where `RelatedModel`.`rid` = `JoinModel`.`relatedId`)',
            'delete from `JoinModel` where `JoinModel`.`ownerId` in (666) and (`JoinModel`.`ownerId`, `JoinModel`.`relatedId`) in ((666, 5))',
          ]);
        });
    });
  });

  describe('mssql', () => {
    beforeEach(() => {
      useClient('mssql');
    });

    it('unrelate should select the related rows of the join rows', () => {
      mockKnexQueryResults = [2];
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return compositeKeyRelation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .where('JoinModel.extra1', 'foo')
        .orWhere('code', 55)
        .then(() => {
          expect(executedQueries).to.eql([
            "delete from [JoinModel] where exists (select * from (VALUES (11,22)) AS V([objectiontmpjoin0],[objectiontmpjoin1]) where [objectiontmpjoin0] = [JoinModel].[ownerAId] and [objectiontmpjoin1] = [JoinModel].[ownerBId]) and exists (select 1 from [RelatedModel] where [RelatedModel].[cid] = [JoinModel].[relatedCId] and [RelatedModel].[did] = [JoinModel].[relatedDId] and ([JoinModel].[extra1] = 'foo' or [code] = 55));select @@rowcount",
          ]);
        });
    });

    it('patch should select the related rows of the join rows', () => {
      mockKnexQueryResults = [1, 1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch({ extra2: 'extraVal' })
        .where('code', 55)
        .then(() => {
          expect(executedQueries).to.eql([
            "update [JoinModel] set [extra2] = 'extraVal' where [JoinModel].[ownerId] in (666) and exists (select 1 from [RelatedModel] where [RelatedModel].[rid] = [JoinModel].[relatedId] and [code] = 55);select @@rowcount",
          ]);
        });
    });
  });

  describe('sqlite', () => {
    beforeEach(() => {
      useClient('sqlite3');
    });

    it('unrelate should select the related rows of the join rows', () => {
      mockKnexQueryResults = [2];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory((builder) => {
          return relation.unrelate(builder, RelationOwner.create(owner));
        })
        .unrelate()
        .whereIn('code', [55, 66, 77])
        .then((result) => {
          expect(result).to.equal(2);
          expect(executedQueries).to.eql([
            'delete from `JoinModel` where `JoinModel`.`ownerId` in (666) and exists (select 1 from `RelatedModel` where `RelatedModel`.`rid` = `JoinModel`.`relatedId` and `code` in (55, 66, 77))',
          ]);
        });
    });

    it('patch should use the related table row ids', () => {
      mockKnexQueryResults = [1, 1];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory((builder) => {
          return relation.patch(builder, RelationOwner.create(owner));
        })
        .patch({ a: 'str1', extra2: 'extraVal' })
        .where('code', 55)
        .then((result) => {
          expect(result).to.equal(1);
          expect(executedQueries).to.eql([
            "update `RelatedModel` set `a` = 'str1' where `RelatedModel`.`_rowid_` in (select `RelatedModel`.`_rowid_` from `RelatedModel` inner join `JoinModel` on `RelatedModel`.`rid` = `JoinModel`.`relatedId` where `JoinModel`.`ownerId` in (666) and `code` = 55)",
            "update `JoinModel` set `extra2` = 'extraVal' where `JoinModel`.`ownerId` in (666) and exists (select 1 from `RelatedModel` where `RelatedModel`.`rid` = `JoinModel`.`relatedId` and `code` = 55)",
          ]);
        });
    });

    it('delete should use the related table row ids', () => {
      mockKnexQueryResults = [3];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory((builder) => {
          return relation.delete(builder, RelationOwner.create(owner));
        })
        .delete()
        .where('code', 55)
        .then((result) => {
          expect(result).to.equal(3);
          expect(executedQueries).to.eql([
            'delete from `RelatedModel` where `RelatedModel`.`_rowid_` in (select `RelatedModel`.`_rowid_` from `RelatedModel` inner join `JoinModel` on `RelatedModel`.`rid` = `JoinModel`.`relatedId` where `JoinModel`.`ownerId` in (666) and `code` = 55)',
          ]);
        });
    });
  });

  function useClient(client) {
    const knex = knexMocker(
      Knex({ client, useNullAsDefault: true }),
      function (mock, oldImpl, args) {
        executedQueries.push(this.toString());

        // Unlike the default mock, allow falsy results such as a count of 0.
        let result = mockKnexQueryResults.length ? mockKnexQueryResults.shift() : [];
        let promise = Promise.resolve(result);

        return promise.then.apply(promise, args);
      },
    );

    OwnerModel.knex(knex);
    RelatedModel.knex(knex);
    JoinModel.knex(knex);
  }

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
          to: 'JoinModel.relatedId',
        },
        to: 'RelatedModel.rid',
      },
    });
  }

  function createJoinThroughModifiedRelation(modify) {
    relation = new ManyToManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: ManyToManyRelation,
      join: {
        from: 'OwnerModel.oid',
        through: {
          from: 'JoinModel.ownerId',
          to: 'JoinModel.relatedId',
          modify: modify,
        },
        to: 'RelatedModel.rid',
      },
    });
  }
});

function isSubclassOf(Constructor, SuperConstructor) {
  if (!isFunction(SuperConstructor)) {
    return false;
  }

  while (isFunction(Constructor)) {
    if (Constructor === SuperConstructor) {
      return true;
    }

    Constructor = Object.getPrototypeOf(Constructor);
  }

  return false;
}
