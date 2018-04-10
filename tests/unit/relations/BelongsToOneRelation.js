const _ = require('lodash'),
  Knex = require('knex'),
  expect = require('expect.js'),
  Promise = require('bluebird'),
  objection = require('../../../'),
  knexMocker = require('../../../testUtils/mockKnex'),
  Model = objection.Model,
  QueryBuilder = objection.QueryBuilder,
  BelongsToOneRelation = objection.BelongsToOneRelation;

describe('BelongsToOneRelation', () => {
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

  describe('find', () => {
    it('should generate a find query', () => {
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 1 });
      let expectedResult = [{ id: 1, a: 10, rid: 1 }];

      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return relation.find(builder, [owner]);
      });

      return builder.then(result => {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1)'
        );
      });
    });

    it('should generate a find query (composite key)', () => {
      let expectedResult = [{ id: 1, aid: 11, bid: 22 }, { id: 2, aid: 11, bid: 33 }];

      mockKnexQueryResults = [expectedResult];

      let owners = [
        OwnerModel.fromJson({ id: 666, relatedAId: 11, relatedBId: 22 }),
        OwnerModel.fromJson({ id: 667, relatedAId: 11, relatedBId: 33 })
      ];

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return compositeKeyRelation.find(builder, owners);
      });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.equal(result[0]);
        expect(owners[1].nameOfOurRelation).to.equal(result[1]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22), (11, 33))'
        );
      });
    });

    it('should find for multiple owners', () => {
      let expectedResult = [{ id: 1, a: 10, rid: 2 }, { id: 2, a: 10, rid: 3 }];

      mockKnexQueryResults = [expectedResult];

      let owners = [
        OwnerModel.fromJson({ id: 666, relatedId: 2 }),
        OwnerModel.fromJson({ id: 667, relatedId: 3 })
      ];

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return relation.find(builder, owners);
      });

      return builder.then(result => {
        expect(result).to.have.length(2);
        expect(result).to.eql(expectedResult);
        expect(owners[0].nameOfOurRelation).to.equal(result[0]);
        expect(owners[1].nameOfOurRelation).to.equal(result[1]);
        expect(result[0]).to.be.a(RelatedModel);
        expect(result[1]).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (2, 3)'
        );
      });
    });

    it('explicit selects should override the RelatedModel.*', () => {
      let expectedResult = [{ id: 1, a: 10, rid: 2 }];
      mockKnexQueryResults = [expectedResult];
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .findOperationFactory(builder => {
          return relation.find(builder, [owner]);
        })
        .select('name');

      return builder.then(result => {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel"."rid", "name" from "RelatedModel" where "RelatedModel"."rid" in (2)'
        );
      });
    });

    it('should apply the modifier (object)', () => {
      createModifiedRelation({ filterCol: 100 });

      let expectedResult = [{ id: 1, a: 10, rid: 1 }];
      mockKnexQueryResults = [expectedResult];
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 1 });

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return relation.find(builder, [owner]);
      });

      return builder.then(result => {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1) and "filterCol" = 100'
        );
      });
    });

    it('should apply the modifier (function)', () => {
      createModifiedRelation(query => {
        query.where('name', 'Jennifer');
      });

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 1 });
      let expectedResult = [{ id: 1, a: 10, rid: 1 }];
      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return relation.find(builder, [owner]);
      });

      return builder.then(result => {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.equal(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1) and "name" = \'Jennifer\''
        );
      });
    });

    it('should support named filters', () => {
      createModifiedRelation('namedFilter');

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 1 });
      let expectedResult = [{ id: 1, a: 10, rid: 1 }];
      mockKnexQueryResults = [expectedResult];

      let builder = QueryBuilder.forClass(RelatedModel).findOperationFactory(builder => {
        return relation.find(builder, [owner]);
      });

      return builder.then(result => {
        expect(result).to.eql(expectedResult[0]);
        expect(owner.nameOfOurRelation).to.eql(expectedResult[0]);
        expect(result).to.be.a(RelatedModel);

        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'select "RelatedModel".* from "RelatedModel" where "RelatedModel"."rid" in (1) and "filteredProperty" = true'
        );
      });
    });
  });

  describe('insert', () => {
    it('should generate an insert query', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = [RelatedModel.fromJson({ a: 'str1', rid: 2 })];

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
          'update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666'
        );

        expect(owner.nameOfOurRelation).to.equal(result[0]);
        expect(owner.relatedId).to.equal(2);
        expect(result).to.eql([{ a: 'str1', id: 1, rid: 2 }]);
        expect(result[0]).to.be.a(RelatedModel);
      });
    });

    it('should generate an insert query (composite key)', () => {
      mockKnexQueryResults = [[{ aid: 11, bid: 22 }]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = [RelatedModel.fromJson({ a: 'str1', aid: 11, bid: 22 })];

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
          'insert into "RelatedModel" ("a", "aid", "bid") values (\'str1\', 11, 22) returning "id"'
        );
        expect(executedQueries[1]).to.equal(
          'update "OwnerModel" set "relatedAId" = 11, "relatedBId" = 22 where "OwnerModel"."id" = 666'
        );

        expect(owner.relatedAId).to.equal(11);
        expect(owner.relatedBId).to.equal(22);
        expect(owner.nameOfOurRelation).to.equal(result[0]);
        expect(result).to.eql([{ a: 'str1', aid: 11, bid: 22 }]);
        expect(result[0]).to.be.a(RelatedModel);
      });
    });

    it('should accept json object array', () => {
      mockKnexQueryResults = [[5]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = [{ a: 'str1', rid: 2 }];

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"'
          );
          expect(executedQueries[1]).to.equal(
            'update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666'
          );
          expect(owner.nameOfOurRelation).to.equal(result[0]);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql([{ a: 'str1', id: 5, rid: 2 }]);
          expect(result[0]).to.be.a(RelatedModel);
        });
    });

    it('should accept single model', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = RelatedModel.fromJson({ a: 'str1', rid: 2 });

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"'
          );
          expect(executedQueries[1]).to.equal(
            'update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666'
          );
          expect(owner.nameOfOurRelation).to.equal(result);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql({ a: 'str1', id: 1, rid: 2 });
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should accept single json object', () => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = { a: 'str1', rid: 2 };

      return QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(result => {
          expect(executedQueries).to.have.length(2);
          expect(executedQueries[0]).to.equal(
            'insert into "RelatedModel" ("a", "rid") values (\'str1\', 2) returning "id"'
          );
          expect(executedQueries[1]).to.equal(
            'update "OwnerModel" set "relatedId" = 2 where "OwnerModel"."id" = 666'
          );
          expect(owner.nameOfOurRelation).to.equal(result);
          expect(owner.relatedId).to.equal(2);
          expect(result).to.eql({ a: 'str1', id: 1, rid: 2 });
          expect(result).to.be.a(RelatedModel);
        });
    });

    it('should fail if trying to insert multiple', done => {
      mockKnexQueryResults = [[1]];

      let owner = OwnerModel.fromJson({ id: 666 });
      let related = [{ a: 'str1', rid: 2 }, { a: 'str1', rid: 2 }];

      QueryBuilder.forClass(RelatedModel)
        .insertOperationFactory(builder => {
          return relation.insert(builder, owner);
        })
        .insert(related)
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });
  });

  describe('update', () => {
    it('should generate an update query', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update);

      return builder.then(numUpdates => {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)'
        );
      });
    });

    it('should generate an update query (composite key)', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ id: 666, relatedAId: 11, relatedBId: 22 });
      let update = RelatedModel.fromJson({ a: 'str1', aid: 11, bid: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return compositeKeyRelation.update(builder, owner);
        })
        .update(update);

      return builder.then(numUpdates => {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "a" = \'str1\', "aid" = 11, "bid" = 22 where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22))'
        );
      });
    });

    it('should accept json object', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let update = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update)
        .then(numUpdates => {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)'
          );
        });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 'foo' });

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .updateOperationFactory(builder => {
          return relation.update(builder, owner);
        })
        .update(update)
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2) and "someColumn" = \'foo\''
          );
        });
    });
  });

  describe('patch', () => {
    it('should generate an patch query', () => {
      mockKnexQueryResults = [42];

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let patch = RelatedModel.fromJson({ a: 'str1' });

      let builder = QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(patch);

      return builder.then(numUpdates => {
        expect(numUpdates).to.equal(42);
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)'
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

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let patch = { a: 'str1' };

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(patch)
        .then(numUpdates => {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2)'
          );
        });
    });

    it('should work with increment', () => {
      mockKnexQueryResults = [42];
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 1 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .increment('test', 1)
        .then(numUpdates => {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "test" = "test" + 1 where "RelatedModel"."rid" in (1)'
          );
        });
    });

    it('should work with decrement', () => {
      mockKnexQueryResults = [42];
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .decrement('test', 10)
        .then(numUpdates => {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "test" = "test" - 10 where "RelatedModel"."rid" in (2)'
          );
        });
    });

    it('should apply the modifier', () => {
      mockKnexQueryResults = [42];
      createModifiedRelation({ someColumn: 'foo' });

      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });
      let update = RelatedModel.fromJson({ a: 'str1' });

      return QueryBuilder.forClass(RelatedModel)
        .patchOperationFactory(builder => {
          return relation.patch(builder, owner);
        })
        .patch(update)
        .then(numUpdates => {
          expect(numUpdates).to.equal(42);
          expect(executedQueries).to.have.length(1);
          expect(executedQueries[0]).to.eql(
            'update "RelatedModel" set "a" = \'str1\' where "RelatedModel"."rid" in (2) and "someColumn" = \'foo\''
          );
        });
    });
  });

  describe('delete', () => {
    it('should generate a delete query', () => {
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return relation.delete(builder, owner);
        })
        .delete();

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'delete from "RelatedModel" where "RelatedModel"."rid" in (2)'
        );
      });
    });

    it('should generate a delete query (composite key)', () => {
      let owner = OwnerModel.fromJson({ id: 666, relatedAId: 11, relatedBId: 22 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return compositeKeyRelation.delete(builder, owner);
        })
        .delete();

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql({});

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'delete from "RelatedModel" where ("RelatedModel"."aid", "RelatedModel"."bid") in ((11, 22))'
        );
      });
    });

    it('should apply the modifier', () => {
      createModifiedRelation({ someColumn: 100 });
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 2 });

      return QueryBuilder.forClass(RelatedModel)
        .deleteOperationFactory(builder => {
          return relation.delete(builder, owner);
        })
        .delete()
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({});
          expect(executedQueries[0]).to.eql(
            'delete from "RelatedModel" where "RelatedModel"."rid" in (2) and "someColumn" = 100'
          );
        });
    });
  });

  describe('relate', () => {
    it('should generate a relate query', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

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
          'update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a relate query (array value)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([10]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a relate query (object value)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate({ rid: 10 });

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a relate query (array of objects values)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([{ rid: 10 }]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "OwnerModel" set "relatedId" = 10 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a relate query (composite key)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate([10, 20]);

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "OwnerModel" set "relatedAId" = 10, "relatedBId" = 20 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a relate query (composite key with object value)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      let builder = QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate({ aid: 10, bid: 20 });

      return builder.then(result => {
        expect(executedQueries).to.have.length(1);
        expect(result).to.eql(123);

        expect(executedQueries[0]).to.equal(builder.toString());
        expect(executedQueries[0]).to.equal(builder.toSql());
        expect(executedQueries[0]).to.eql(
          'update "OwnerModel" set "relatedAId" = 10, "relatedBId" = 20 where "OwnerModel"."id" = 666'
        );
      });
    });

    it('should accept one id', () => {
      mockKnexQueryResults = [{ a: 1, b: 2 }];
      let owner = OwnerModel.fromJson({ id: 666 });

      return QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate(11)
        .then(result => {
          expect(executedQueries).to.have.length(1);
          expect(result).to.eql({ a: 1, b: 2 });
          expect(executedQueries[0]).to.eql(
            'update "OwnerModel" set "relatedId" = 11 where "OwnerModel"."id" = 666'
          );
        });
    });

    it('should fail if trying to relate multiple', done => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate([11, 12])
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });

    it("should fail if object value doesn't contain the needed id", done => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return relation.relate(builder, owner);
        })
        .relate({ wrongId: 10 })
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });

    it("should fail if object value doesn't contain the needed id (composite key)", done => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666 });

      QueryBuilder.forClass(RelatedModel)
        .relateOperationFactory(builder => {
          return compositeKeyRelation.relate(builder, owner);
        })
        .relate({ aid: 10, wrongId: 20 })
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });
  });

  describe('unrelate', () => {
    it('should generate a unrelate query', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666, relatedId: 123 });

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
          'update "OwnerModel" set "relatedId" = NULL where "code" in (55, 66, 77) and "OwnerModel"."id" = 666'
        );
      });
    });

    it('should generate a unrelate query (composite key)', () => {
      mockKnexQueryResults = [123];
      let owner = OwnerModel.fromJson({ id: 666, relatedAId: 11, relatedBId: 22 });

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
          'update "OwnerModel" set "relatedAId" = NULL, "relatedBId" = NULL where "code" in (55, 66, 77) and "OwnerModel"."id" = 666'
        );
      });
    });

    it('should throw is a `through` object is given', () => {
      expect(() => {
        relation = new BelongsToOneRelation('nameOfOurRelation', OwnerModel);

        relation.setMapping({
          modelClass: RelatedModel,
          relation: BelongsToOneRelation,
          join: {
            from: 'OwnerModel.relatedId',
            through: {},
            to: 'RelatedModel.rid'
          }
        });
      }).to.throwException(err => {
        expect(err.message).to.equal(
          'OwnerModel.relationMappings.nameOfOurRelation: Property join.through is not supported for this relation type.'
        );
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
