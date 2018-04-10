const _ = require('lodash'),
  Knex = require('knex'),
  expect = require('expect.js'),
  Promise = require('bluebird'),
  objection = require('../../../'),
  knexMocker = require('../../../testUtils/mockKnex'),
  Model = objection.Model,
  QueryBuilder = objection.QueryBuilder,
  HasManyRelation = objection.HasManyRelation;

describe('HasManyRelation', () => {
  let mockKnexQueryResults = [];
  let executedQueries = [];
  let mockKnex = null;

  let OwnerModel = null;
  let RelatedModel = null;

  let relation;
  let compositeKeyRelation;

  before(() => {
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

    OwnerModel = class extends Model {
      static get tableName() {
        return 'OwnerModel';
      }
    };

    RelatedModel = class extends Model {
      static get tableName() {
        return 'RelatedModel';
      }

      static get namedFilters() {
        return {
          namedFilter: builder => builder.where('filteredProperty', true)
        };
      }
    };

    OwnerModel.knex(mockKnex);
    RelatedModel.knex(mockKnex);
  });

  beforeEach(() => {
    relation = new HasManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: HasManyRelation,
      join: {
        from: 'OwnerModel.oid',
        to: 'RelatedModel.ownerId'
      }
    });

    compositeKeyRelation = new HasManyRelation('nameOfOurRelation', OwnerModel);
    compositeKeyRelation.setMapping({
      modelClass: RelatedModel,
      relation: HasManyRelation,
      join: {
        from: ['OwnerModel.aid', 'OwnerModel.bid'],
        to: ['RelatedModel.ownerAId', 'RelatedModel.ownerBId']
      }
    });
  });

  describe('find', () => {
    it('should generate a find query', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, ownerId: 666 }, { a: 2, ownerId: 666 }];

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
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });

    it('should generate a find query (composite key)', () => {
      let owners = [
        OwnerModel.fromJson({ aid: 11, bid: 22 }),
        OwnerModel.fromJson({ aid: 11, bid: 33 })
      ];

      let expectedResult = [
        { a: 1, ownerAId: 11, ownerBId: 22 },
        { a: 2, ownerAId: 11, ownerBId: 22 },
        { a: 3, ownerAId: 11, ownerBId: 33 },
        { a: 4, ownerAId: 11, ownerBId: 33 }
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(builder => {
          return compositeKeyRelation.find(builder, owners);
        });

      return builder.then(result => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([
          { a: 1, ownerAId: 11, ownerBId: 22 },
          { a: 2, ownerAId: 11, ownerBId: 22 }
        ]);
        expect(owners[1].nameOfOurRelation).to.eql([
          { a: 3, ownerAId: 11, ownerBId: 33 },
          { a: 4, ownerAId: 11, ownerBId: 33 }
        ]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where ("RelatedModel"."ownerAId", "RelatedModel"."ownerBId") in ((11, 22), (11, 33)) and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });

    it('should find for multiple owners', () => {
      let owners = [OwnerModel.fromJson({ oid: 666 }), OwnerModel.fromJson({ oid: 667 })];

      let expectedResult = [
        { a: 1, ownerId: 666 },
        { a: 2, ownerId: 666 },
        { a: 3, ownerId: 667 },
        { a: 4, ownerId: 667 }
      ];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .findOperationFactory(builder => {
          return relation.find(builder, owners);
        });

      return builder.then(result => {
        expect(result).to.have.length(4);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.eql([
          { a: 1, ownerId: 666 },
          { a: 2, ownerId: 666 }
        ]);
        expect(owners[1].nameOfOurRelation).to.eql([
          { a: 3, ownerId: 667 },
          { a: 4, ownerId: 667 }
        ]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
        expect(result[2]).to.be.a(RelatedModel);
        expect(result[3]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."ownerId" in (666, 667) and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });

    it('explicit selects should override the RelatedModel.*', () => {
      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, ownerId: 666 }, { a: 2, ownerId: 666 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel)
        .where('name', 'Teppo')
        .orWhere('age', '>', 60)
        .select('name')
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
          'select "RelatedModel"."ownerId", "name" from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 'foo' });

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, ownerId: 666 }, { a: 2, ownerId: 666 }];

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
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "someColumn" = \'foo\' and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });

    it('should support named filters', () => {
      createModifiedRelation('namedFilter');

      let owner = OwnerModel.fromJson({ oid: 666 });
      let expectedResult = [{ a: 1, ownerId: 666 }, { a: 2, ownerId: 666 }];

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
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "filteredProperty" = true and "name" = \'Teppo\' or "age" > 60'
        );
      });
    });
  });

  describe('insert', () => {
    it('should generate an insert query', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = [RelatedModel.fromJson({ a: 'str1' }), RelatedModel.fromJson({ a: 'str2' })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "ownerId") values (\'str1\', 666), (\'str2\', 666) returning "id"'
        );

        expect(owner.nameOfOurRelation).to.eql(result);
        expect(result).to.eql([
          { a: 'str1', id: 1, ownerId: 666 },
          { a: 'str2', id: 2, ownerId: 666 }
        ]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });
      let related = [RelatedModel.fromJson({ a: 'str1' }), RelatedModel.fromJson({ a: 'str2' })];

      let builder = QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return compositeKeyRelation.insert(builder, owner);
        })
        .insert(related);

      let toString = builder.toString();
      let toSql = builder.toSql();

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(toString);
        expect(executedQueries[0]).to.equal(toSql);
        expect(executedQueries[0]).to.equal(
          'insert into "RelatedModel" ("a", "ownerAId", "ownerBId") values (\'str1\', 11, 22), (\'str2\', 11, 22) returning "id"'
        );

        expect(owner.nameOfOurRelation).to.eql(result);
        expect(result).to.eql([
          { a: 'str1', id: 1, ownerAId: 11, ownerBId: 22 },
          { a: 'str2', id: 2, ownerAId: 11, ownerBId: 22 }
        ]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', () => {
      mockKnexQueryResults = [[1, 2]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = [{ a: 'str1' }, { a: 'str2' }];

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "ownerId") values (\'str1\', 666), (\'str2\', 666) returning "id"'
          );
          expect(result).to.eql([
            { a: 'str1', id: 1, ownerId: 666 },
            { a: 'str2', id: 2, ownerId: 666 }
          ]);
          expect(result[0]).to.be.a(RelatedModel);
          expect(result[1]).to.be.a(RelatedModel);
        });
    });

    it('should accept single model', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "ownerId") values (\'str1\', 666) returning "id"'
          );
          expect(result).to.eql({ a: 'str1', id: 1, ownerId: 666 });
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should accept single json object', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ oid: 666 });
      let related = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "ownerId") values (\'str1\', 666) returning "id"'
          );
          expect(result).to.eql({ a: 'str1', id: 1, ownerId: 666 });
          expect(result).to.be.a(RelatedModel);
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
          'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "gender" = \'male\' and "thingy" is not null'
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
          'update "RelatedModel" set "a" = \'str1\' where ("RelatedModel"."ownerAId", "RelatedModel"."ownerBId") in ((11, 22)) and "gender" = \'male\' and "thingy" is not null'
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
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "gender" = \'male\' and "thingy" is not null'
          );
        });
    });

    it('should apply the modifier', () => {
      mockKnexQueryResults = [42];

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
        .then(numUpdated => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = \'male\' and "thingy" is not null'
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
          'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "gender" = \'male\' and "thingy" is not null'
        );
      });
    });

    it('should accept json object', () => {
      mockKnexQueryResults = [42];

      RelatedModel.jsonSchema = {
        type: 'object',
        required: ['b'],
        properties: {
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
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "gender" = \'male\' and "thingy" is not null'
          );
        });
    });

    it('should work with increment', () => {
      mockKnexQueryResults = [42];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .increment('test', 1)
        .then(numUpdated => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "test" = "test" + 1 where "RelatedModel"."ownerId" in (666)'
          );
        });
    });

    it('should work with decrement', () => {
      mockKnexQueryResults = [42];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .decrement('test', 10)
        .then(numUpdated => {
          expect(numUpdated).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "test" = "test" - 10 where "RelatedModel"."ownerId" in (666)'
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
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = \'male\' and "thingy" is not null'
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
          'delete from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "gender" = \'male\' and "thingy" is not null'
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
          'delete from "RelatedModel" where ("RelatedModel"."ownerAId", "RelatedModel"."ownerBId") in ((11, 22)) and "gender" = \'male\' and "thingy" is not null'
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
            'delete from "RelatedModel" where "RelatedModel"."ownerId" in (666) and "someColumn" = 100 and "gender" = \'male\' and "thingy" is not null'
          );
        });
    });
  });

  describe('relate', () => {
    it('should generate a relate query', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate(10);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerId" = 666 where "RelatedModel"."id" in (10)'
        );
      });
    });

    it('should generate a relate query (multiple ids)', () => {
      mockKnexQueryResults = [[5, 6, 7]];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([10, 20, 30]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql([5, 6, 7]);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerId" = 666 where "RelatedModel"."id" in (10, 20, 30)'
        );
      });
    });

    it('should generate a relate query (object value)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate({ id: 10 });

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerId" = 666 where "RelatedModel"."id" in (10)'
        );
      });
    });

    it('should generate a relate query (array of object values)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ oid: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([{ id: 10 }, { id: 20 }]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerId" = 666 where "RelatedModel"."id" in (10, 20)'
        );
      });
    });

    it('should generate a relate query (composite key)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate([1, 2, 3]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerAId" = 11, "ownerBId" = 22 where "RelatedModel"."id" in (1, 2, 3)'
        );
      });
    });

    it('should accept one id', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate(11)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql(123);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "ownerId" = 666 where "RelatedModel"."id" in (11)'
          );
        });
    });
  });

  describe('unrelate', () => {
    it('should generate a unrelate query', () => {
      mockKnexQueryResults = [123];
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
          'update "RelatedModel" set "ownerId" = NULL where "code" in (55, 66, 77) and "RelatedModel"."ownerId" = 666'
        );
      });
    });

    it('should generate a unrelate query (composite key)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory(builder => {
          return compositeKeyRelation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66, 77]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "ownerAId" = NULL, "ownerBId" = NULL where "code" in (55, 66, 77) and "RelatedModel"."ownerAId" = 11 and "RelatedModel"."ownerBId" = 22'
        );
      });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ oid: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .unrelateOperationFactory(builder => {
          return relation.unrelate(builder, owner);
        })
        .unrelate()
        .whereIn('code', [55, 66, 77])
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "ownerId" = NULL where "code" in (55, 66, 77) and "RelatedModel"."ownerId" = 666 and "someColumn" = 100'
          );
        });
    });

    it('should throw is a `through` object is given', () => {
      expect(() => {
        relation = new HasManyRelation('nameOfOurRelation', OwnerModel);

        relation.setMapping({
          modelClass: RelatedModel,
          relation: HasManyRelation,
          join: {
            from: 'OwnerModel.oid',
            through: {},
            to: 'RelatedModel.ownerId'
          }
        });
      }).to.throwException(err => {
        expect(err.message).to.equal(
          'OwnerModel.relationMappings.nameOfOurRelation: Property join.through is not supported for this relation type.'
        );
      });
    });
  });

  function createModifiedRelation(filter) {
    relation = new HasManyRelation('nameOfOurRelation', OwnerModel);
    relation.setMapping({
      modelClass: RelatedModel,
      relation: HasManyRelation,
      // Use filter here on purpose instead of `modify`. Other relation tests test the `modify`
      // here we test the `filter` alias.
      filter: filter,
      join: {
        from: 'OwnerModel.oid',
        to: 'RelatedModel.ownerId'
      }
    });
  }
});
