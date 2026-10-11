const Knex = require('knex'),
  expect = require('expect.js'),
  chai = require('chai'),
  objection = require('../../../'),
  knexUtils = require('../../../lib/utils/knexUtils'),
  knexMocker = require('../../../testUtils/mockKnex'),
  { delay } = require('../../../testUtils/testUtils'),
  { resetDeprecations } = require('../../../lib/utils/deprecate'),
  ref = objection.ref,
  raw = objection.raw,
  val = objection.val,
  Model = objection.Model,
  QueryBuilder = objection.QueryBuilder,
  QueryBuilderBase = objection.QueryBuilderBase;

describe('QueryBuilder', () => {
  let mockKnexQueryResults = [];
  let mockKnexQueryResultIndex = 0;
  let executedQueries = [];
  let mockKnex = null;
  let TestModel = null;

  before(() => {
    let knex = Knex({ client: 'pg' });

    mockKnex = knexMocker(knex, function (mock, oldImpl, args) {
      executedQueries.push(this.toString());

      let result = mockKnexQueryResults[mockKnexQueryResultIndex++] || [];
      let promise = Promise.resolve(result);

      return promise.then.apply(promise, args);
    });
  });

  beforeEach(() => {
    mockKnexQueryResults = [];
    mockKnexQueryResultIndex = 0;
    executedQueries = [];

    TestModel = class TestModel extends Model {
      static get tableName() {
        return 'Model';
      }
    };

    TestModel.knex(mockKnex);
  });

  it("should throw if model doesn't have a `tableName`", (done) => {
    class TestModel extends Model {
      // no tableName
    }

    TestModel.query(mockKnex)
      .then(() => done(new Error('should not get here')))
      .catch((err) => {
        expect(err.message).to.equal('Model TestModel must have a static property tableName');
        done();
      })
      .catch(done);
  });

  it('should have knex methods', () => {
    let ignore = [
      'setMaxListeners',
      'getMaxListeners',
      'emit',
      'addListener',
      'on',
      'prependListener',
      'once',
      'prependOnceListener',
      'removeListener',
      'removeAllListeners',
      'listeners',
      'listenerCount',
      'eventNames',
      'rawListeners',
      'pluck', // not supported anymore in objection v3+
      'queryBuilder', // this method is added to the knex mock, but should not available on objection's QueryBuilder
      'raw', // this method is added to the knex mock, but should not available on objection's QueryBuilder
    ];

    let builder = QueryBuilder.forClass(TestModel);
    for (let name in mockKnex) {
      let func = mockKnex[name];
      if (typeof func === 'function' && name.charAt(0) !== '_' && ignore.indexOf(name) === -1) {
        if (typeof builder[name] !== 'function') {
          expect().to.fail("knex method '" + name + "' is missing from QueryBuilder");
        }
      }
    }
  });

  it('modelClass() should return the model class', () => {
    expect(QueryBuilder.forClass(TestModel).modelClass() === TestModel).to.equal(true);
  });

  it('modify() should execute the given function and pass the builder to it', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let called = false;

    builder.modify(function (b) {
      called = true;
      expect(b === builder).to.equal(true);
      expect(this === builder).to.equal(true);
    });

    expect(called).to.equal(true);
  });

  it('should be able to pass arguments to modify', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let called1 = false;
    let called2 = false;

    // Should accept a single function.
    builder.modify(
      (query, arg1, arg2) => {
        called1 = true;
        expect(query === builder).to.equal(true);
        expect(arg1).to.equal('foo');
        expect(arg2).to.equal(1);
      },
      'foo',
      1,
    );

    expect(called1).to.equal(true);
    called1 = false;
    called2 = false;

    // Should accept an array of functions.
    builder.modify(
      [
        (query, arg1, arg2) => {
          called1 = true;
          expect(query === builder).to.equal(true);
          expect(arg1).to.equal('foo');
          expect(arg2).to.equal(1);
        },

        (query, arg1, arg2) => {
          called2 = true;
          expect(query === builder).to.equal(true);
          expect(arg1).to.equal('foo');
          expect(arg2).to.equal(1);
        },
      ],
      'foo',
      1,
    );

    expect(called1).to.equal(true);
    expect(called2).to.equal(true);
  });

  it('should be able to pass arguments to modify when using named modifiers', () => {
    let builder = QueryBuilder.forClass(TestModel);

    let called1 = false;
    let called2 = false;

    TestModel.modifiers = {
      modifier1: (query, arg1, arg2) => {
        called1 = true;
        expect(query === builder).to.equal(true);
        expect(arg1).to.equal('foo');
        expect(arg2).to.equal(1);
      },

      modifier2: (query, arg1, arg2) => {
        called2 = true;
        expect(query === builder).to.equal(true);
        expect(arg1).to.equal('foo');
        expect(arg2).to.equal(1);
      },
    };

    // Should accept a single modifier.
    builder.modify('modifier1', 'foo', 1);
    expect(called1).to.equal(true);

    called1 = false;
    called2 = false;

    // Should accept an array of modifiers.
    builder.modify(['modifier1', 'modifier2'], 'foo', 1);

    expect(called1).to.equal(true);
    expect(called2).to.equal(true);
  });

  it('should throw if an unknown modifier is specified', () => {
    const builder = QueryBuilder.forClass(TestModel);

    TestModel.modifiers = {};

    expect(() => {
      builder.modify('unknown');
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        'Unable to determine modify function from provided value: "unknown".',
      );
    });
  });

  it('modify() should do nothing when receiving `undefined`', () => {
    let builder = QueryBuilder.forClass(TestModel);
    let res;
    expect(() => {
      res = builder.modify(undefined);
    }).to.not.throwException();
    expect(res === builder).to.equal(true);
  });

  it('modify accept a list of strings and call the corresponding modifiers', () => {
    const builder = QueryBuilder.forClass(TestModel);

    let aCalled = false;
    let bCalled = false;

    TestModel.modifiers = {
      a(qb) {
        aCalled = qb === builder;
      },

      b(qb) {
        bCalled = qb === builder;
      },

      c: 'a',

      d: ['c', 'b'],
    };

    aCalled = false;
    bCalled = false;
    builder.modify('a');
    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(false);

    aCalled = false;
    bCalled = false;
    builder.modify('b');
    expect(aCalled).to.equal(false);
    expect(bCalled).to.equal(true);

    aCalled = false;
    bCalled = false;
    builder.modify(['a', 'b']);
    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(true);

    aCalled = false;
    bCalled = false;
    builder.modify([['a', [[['b']]]]]);
    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(true);

    aCalled = false;
    bCalled = false;
    builder.modify('d');
    expect(aCalled).to.equal(true);
    expect(bCalled).to.equal(true);
  });

  it('modify calls the modifierNotFound() hook for unknown modifiers', () => {
    const builder = QueryBuilder.forClass(TestModel);

    let caughtModifiers = [];

    TestModel.modifierNotFound = (qb, modifier) => {
      if (qb === builder) {
        caughtModifiers.push(modifier);
      }
    };

    TestModel.modifiers = {
      c: 'a',

      d: ['c', 'b'],
    };

    caughtModifiers = [];
    builder.modify('a');
    expect(caughtModifiers).to.eql(['a']);

    caughtModifiers = [];
    builder.modify('b');
    expect(caughtModifiers).to.eql(['b']);

    caughtModifiers = [];
    builder.modify('c');
    expect(caughtModifiers).to.eql(['a']);

    caughtModifiers = [];
    builder.modify('d');
    expect(caughtModifiers).to.eql(['a', 'b']);
  });

  it('should still throw if modifierNotFound() delegate to the definition in the super class', () => {
    const builder = QueryBuilder.forClass(TestModel);

    TestModel.modifierNotFound = function (builder, modifier) {
      Model.modifierNotFound(builder, modifier);
    };

    expect(() => {
      builder.modify('unknown');
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        'Unable to determine modify function from provided value: "unknown".',
      );
    });
  });

  it('should not throw if modifierNotFound() handles an unknown modifier', () => {
    const builder = QueryBuilder.forClass(TestModel);

    let caughtModifier = null;
    TestModel.modifierNotFound = (builder, modifier) => {
      caughtModifier = modifier;
    };

    expect(() => {
      builder.modify('unknown');
    }).to.not.throwException();
    expect(caughtModifier).to.equal('unknown');
  });

  it('should call the callback passed to .then after execution', (done) => {
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];
    // Make sure the callback is called by not returning a promise from the test.
    // Instead call the `done` function so that the test times out if the callback
    // is not called.
    QueryBuilder.forClass(TestModel)
      .then((result) => {
        expect(result).to.eql(mockKnexQueryResults[0]);
        done();
      })
      .catch(done);
  });

  it('should return a promise from .then method', () => {
    let promise = QueryBuilder.forClass(TestModel).then((it) => it);
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .execute method', () => {
    let promise = QueryBuilder.forClass(TestModel).execute();
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should return a promise from .catch method', () => {
    let promise = QueryBuilder.forClass(TestModel).catch(() => {});
    expect(promise).to.be.a(Promise);
    return promise;
  });

  it('should select all from the model table if no query methods are called', () => {
    let queryBuilder = QueryBuilder.forClass(TestModel);
    return queryBuilder.then(() => {
      expect(executedQueries).to.eql(['select "Model".* from "Model"']);
    });
  });

  it('should have knex query builder methods', () => {
    // Doesn't test all the methods. Just enough to make sure the method calls are correctly
    // passed to the knex query builder.
    return QueryBuilder.forClass(TestModel)
      .select('name', 'id', 'age')
      .join('AnotherTable', 'AnotherTable.modelId', 'Model.id')
      .where('id', 10)
      .where('height', '>', 180)
      .where({ name: 'test' })
      .orWhere(function (builder) {
        // The builder passed to these functions should be a QueryBuilderBase instead of
        // knex query builder.
        expect(this).to.equal(builder);
        expect(this).to.be.a(QueryBuilderBase);
        this.where('age', '<', 10).andWhere('eyeColor', 'blue');
      })
      .then(() => {
        expect(executedQueries).to.eql([
          [
            'select "name", "id", "age" from "Model"',
            'inner join "AnotherTable" on "AnotherTable"."modelId" = "Model"."id"',
            'where "id" = 10',
            'and "height" > 180',
            'and "name" = \'test\'',
            'or ("age" < 10 and "eyeColor" = \'blue\')',
          ].join(' '),
        ]);
      });
  });

  it('should return a QueryBuilder from .timeout method', () => {
    const builder = QueryBuilder.forClass(TestModel).timeout(3000);

    expect(builder).to.be.a(QueryBuilder);
    return builder;
  });

  describe('where(..., ref(...))', () => {
    it('should create a where clause using column references instead of values (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .where('SomeTable.someColumn', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"',
          ]);
        });
    });

    it('should create a where clause using column references instead of values (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .where('SomeTable.someColumn', '>', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "SomeTable"."someColumn" > "SomeOtherTable"."someOtherColumn"',
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(() => {
        QueryBuilder.forClass(TestModel)
          .where('SomeTable.someColumn', 'lol', ref('SomeOtherTable.someOtherColumn'))
          .toKnexQuery()
          .toString();
      }).to.throwException((err) => {
        expect(err.message).to.equal('The operator "lol" is not permitted');
      });
    });

    it('orWhere(..., ref(...)) should create a where clause using column references instead of values', () => {
      return QueryBuilder.forClass(TestModel)
        .where('id', 10)
        .orWhere('SomeTable.someColumn', ref('SomeOtherTable.someOtherColumn'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "id" = 10 or "SomeTable"."someColumn" = "SomeOtherTable"."someOtherColumn"',
          ]);
        });
    });
  });

  describe('orderBy([...]) with refs and raws', () => {
    it('should support refs as array items', () => {
      expect(
        TestModel.query()
          .orderBy([ref('a'), ref('Model.b')])
          .toKnexQuery()
          .toString(),
      ).to.equal('select "Model".* from "Model" order by "a" asc, "Model"."b" asc');
    });

    it('should support mixed strings, refs, raws and objects as array items', () => {
      expect(
        TestModel.query()
          .orderBy([
            'a',
            ref('b'),
            raw('lower(??)', 'c'),
            { column: ref('d'), order: 'desc' },
            { column: 'e', order: 'desc', nulls: 'last' },
          ])
          .toKnexQuery()
          .toString(),
      ).to.equal(
        'select "Model".* from "Model" order by "a" asc, "b" asc, lower("c") asc, "d" desc, "e" desc nulls last',
      );
    });
  });

  describe('whereComposite', () => {
    it('should create multiple where queries', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], '>', [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a" > 1 and "B"."b" > 2)',
          ]);
        });
    });

    it('should fail with invalid operator', () => {
      expect(() => {
        QueryBuilder.forClass(TestModel)
          .whereComposite('SomeTable.someColumn', 'lol', 'SomeOtherTable.someOtherColumn')
          .toKnexQuery()
          .toString();
      }).to.throwException((err) => {
        expect(err.message).to.equal('The operator "lol" is not permitted');
      });
    });

    it('operator should default to `=`', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a', 'B.b'], [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a" = 1 and "B"."b" = 2)',
          ]);
        });
    });

    it('should work like a normal `where` when one column is given (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite(['A.a'], 1)
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" = 1']);
        });
    });

    it('should work like a normal `where` when one column is given (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereComposite('A.a', 1)
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" = 1']);
        });
    });
  });

  describe('whereInComposite', () => {
    it('should create a where-in query for composite id and a single choice', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], [1, 2])
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a", "B"."b") in ((1, 2))',
          ]);
        });
    });

    it('should create a where-in query for composite id and array of choices', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(
          ['A.a', 'B.b'],
          [
            [1, 2],
            [3, 4],
          ],
        )
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a", "B"."b") in ((1, 2), (3, 4))',
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (1)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a'], [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (2)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', [[1], [3]])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (3)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', [1, 3])
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1, 3)']);
        });
    });

    it('should work just like a normal where-in query if one column is given (4)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', TestModel.query().select('a'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "A"."a" in (select "a" from "Model")',
          ]);
        });
    });

    it('should work just like a normal where-in query if one column is given (5)', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite('A.a', 1)
        .then(() => {
          expect(executedQueries).to.eql(['select "Model".* from "Model" where "A"."a" in (1)']);
        });
    });

    it('should create a where-in query for composite id and a subquery', () => {
      return QueryBuilder.forClass(TestModel)
        .whereInComposite(['A.a', 'B.b'], TestModel.query().select('a', 'b'))
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where ("A"."a","B"."b") in (select "a", "b" from "Model")',
          ]);
        });
    });

    it('should create a where-in query for composite id and a subquery in mssql', () => {
      const knex = Knex({ client: 'mssql' });
      const sql = TestModel.query(knex)
        .whereInComposite(['A.a', 'B.b'], TestModel.query(knex).select('a', 'b'))
        .toKnexQuery()
        .toString();

      expect(sql).to.equal(
        'select [Model].* from [Model] where exists (select * from (select [a], [b] from [Model]) AS V([objectiontmpjoin0],[objectiontmpjoin1]) where [objectiontmpjoin0] = [A].[a] and [objectiontmpjoin1] = [B].[b])',
      );
    });

    it('should create a where-in query for composite id and a subquery in sqlite', () => {
      const knex = Knex({ client: 'sqlite3', useNullAsDefault: true });
      const sql = (method) =>
        TestModel.query(knex)
          [method](['A.a', 'B.b'], TestModel.query(knex).select('a', 'b'))
          .toKnexQuery()
          .toString();

      expect(sql('whereInComposite')).to.equal(
        'select `Model`.* from `Model` where (`A`.`a`, `B`.`b`) in (select `a`, `b` from `Model`)',
      );
      expect(sql('whereNotInComposite')).to.equal(
        'select `Model`.* from `Model` where (`A`.`a`, `B`.`b`) not in (select `a`, `b` from `Model`)',
      );
    });

    describe('empty array of values for composite id', () => {
      const clients = {
        pg: [
          'select "Model".* from "Model" where 1 = 0',
          'select "Model".* from "Model" where 1 = 1',
        ],
        sqlite3: [
          'select `Model`.* from `Model` where 1 = 0',
          'select `Model`.* from `Model` where 1 = 1',
        ],
        mssql: [
          'select [Model].* from [Model] where 1 = 0',
          'select [Model].* from [Model] where 1 = 1',
        ],
      };

      for (const [client, [whereInSql, whereNotInSql]] of Object.entries(clients)) {
        const knex = Knex({ client, useNullAsDefault: true });

        it(`whereInComposite should match nothing (${client})`, () => {
          const sql = TestModel.query(knex)
            .whereInComposite(['A.a', 'B.b'], [])
            .toKnexQuery()
            .toString();

          expect(sql).to.equal(whereInSql);
        });

        it(`whereNotInComposite should match everything (${client})`, () => {
          const sql = TestModel.query(knex)
            .whereNotInComposite(['A.a', 'B.b'], [])
            .toKnexQuery()
            .toString();

          expect(sql).to.equal(whereNotInSql);
        });
      }

      it('findByIds([]) should match nothing for composite id', () => {
        TestModel.idColumn = ['a', 'b'];

        return TestModel.query()
          .findByIds([])
          .then(() => {
            expect(executedQueries).to.eql(['select "Model".* from "Model" where 1 = 0']);
          });
      });
    });
  });

  describe('returning', () => {
    it('should pass the options to knex', () => {
      const knex = Knex({ client: 'mssql' });
      const options = { includeTriggerModifications: true };
      const expected = knex('Model').insert({ a: 1 }).returning(['id', 'a'], options).toString();

      expect(expected).to.contain('#out');

      for (const args of [
        ['id', 'a', options],
        [['id', 'a'], options],
      ]) {
        const sql = TestModel.query(knex)
          .insert({ a: 1 })
          .returning(...args)
          .toKnexQuery()
          .toString();

        expect(sql).to.equal(expected);
      }
    });

    it('should work without options', () => {
      const sql = TestModel.query()
        .update({ a: 1 })
        .returning(['id', 'a'])
        .toKnexQuery()
        .toString();

      expect(sql).to.equal('update "Model" set "a" = 1 returning "id", "a"');
    });

    it('should keep the options when cloned', () => {
      const sql = TestModel.query(Knex({ client: 'mssql' }))
        .insert({ a: 1 })
        .returning('id', { includeTriggerModifications: true })
        .clone()
        .toKnexQuery()
        .toString();

      expect(sql).to.contain('#out');
    });
  });

  describe('delete with joinRelated and a modifier (#2799)', () => {
    class Person extends Model {
      static get tableName() {
        return 'person';
      }
    }

    class PersonTag extends Model {
      static get tableName() {
        return 'personTag';
      }

      static get relationMappings() {
        return {
          person: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: { from: 'personTag.personId', to: 'person.id' },
          },
        };
      }
    }

    const expected = {
      mysql:
        'delete `personTag` from `personTag` inner join (select `person`.* from `person` where `favorite` = ?) as `person` on `person`.`id` = `personTag`.`personId` where `person`.`category` = ?',
      pg: 'delete from "personTag" using (select "person".* from "person" where "favorite" = ?) as "person" where "person"."category" = ? and "person"."id" = "personTag"."personId"',
    };

    // The bindings are only kept in order since knex 3.3.
    const [major, minor] = require('knex/package.json').version.split('.').map(Number);
    const itKnex33 = major > 3 || (major === 3 && minor >= 3) ? it : it.skip;

    for (const [client, sql] of Object.entries(expected)) {
      itKnex33(`should keep the bindings in the order of the sql (${client})`, () => {
        const query = PersonTag.query(Knex({ client }))
          .joinRelated('person(favoriteFilter)')
          .modifiers({ favoriteFilter: (builder) => builder.where('favorite', true) })
          .where('person.category', 'Follower')
          .delete()
          .toKnexQuery()
          .toSQL();

        expect(query.sql).to.equal(sql);
        expect(query.bindings).to.eql([true, 'Follower']);
      });
    }
  });

  it('should convert array query result into Model instances', () => {
    mockKnexQueryResults = [[{ a: 1 }, { a: 2 }]];

    return QueryBuilder.forClass(TestModel).then((result) => {
      expect(result).to.have.length(2);
      expect(result[0]).to.be.a(TestModel);
      expect(result[1]).to.be.a(TestModel);
      expect(result).to.eql(mockKnexQueryResults[0]);
    });
  });

  it('should convert an object query result into a Model instance', () => {
    mockKnexQueryResults = [{ a: 1 }];

    return QueryBuilder.forClass(TestModel).then((result) => {
      expect(result).to.be.a(TestModel);
      expect(result.a).to.equal(1);
    });
  });

  it('should pass the query builder as `this` and parameter for the hooks', (done) => {
    let text = '';

    QueryBuilder.forClass(TestModel)
      .runBefore(function (result, builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(this).to.equal(builder);
        text += 'a';
      })
      .onBuild(function (builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(this).to.equal(builder);
        text += 'b';
      })
      .onBuildKnex(function (knexBuilder, builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(knexUtils.isKnexQueryBuilder(knexBuilder)).to.equal(true);
        expect(this).to.equal(knexBuilder);
        text += 'c';
      })
      .runAfter(function (data, builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(this).to.equal(builder);
        text += 'd';
      })
      .runAfter(function (data, builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(this).to.equal(builder);
        text += 'e';
      })
      .runAfter(() => {
        throw new Error('abort');
      })
      .onError(function (err, builder) {
        expect(builder.constructor.name).to.equal('QueryBuilder');
        expect(this).to.equal(builder);
        expect(err.message).to.equal('abort');
        text += 'f';
      })
      .then(() => {
        expect(text).to.equal('abcdef');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('throwing at any phase should call the onError hook', (done) => {
    let called = false;
    QueryBuilder.forClass(TestModel)
      .runBefore(function (result, builder) {
        throw new Error();
      })
      .onError(function (err, builder) {
        called = true;
      })
      .then(() => {
        expect(called).to.equal(true);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('any return value from onError should be the result of the query', (done) => {
    QueryBuilder.forClass(TestModel)
      .runBefore(function (result, builder) {
        throw new Error();
      })
      .onError(function (err, builder) {
        return 'my custom error';
      })
      .then((result) => {
        expect(result).to.equal('my custom error');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should call run* methods in the correct order', (done) => {
    mockKnexQueryResults = [0];

    // Again call `done` instead of returning a promise just to make sure the final
    // `.then` callback is called. (I'm paranoid).
    QueryBuilder.forClass(TestModel)
      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(0);
        return ++mockKnexQueryResults[0];
      })
      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(1);
        return delay(1).then(() => ++mockKnexQueryResults[0]);
      })
      .runBefore(() => {
        expect(mockKnexQueryResults[0]).to.equal(2);
        ++mockKnexQueryResults[0];
      })
      .runAfter((res) => {
        expect(res).to.equal(3);
        return delay(1).then(() => {
          return ++res;
        });
      })
      .runAfter((res) => {
        expect(res).to.equal(4);
        return ++res;
      })
      .then((res) => {
        expect(res).to.equal(5);
        done();
      })
      .catch(done);
  });

  it('should not execute query if an error is thrown from runBefore', (done) => {
    QueryBuilder.forClass(TestModel)
      .runBefore(() => {
        throw new Error('some error');
      })
      .onBuild(() => {
        done(new Error('should not get here'));
      })
      .runAfter(() => {
        done(new Error('should not get here'));
      })
      .then(() => {
        done(new Error('should not get here'));
      })
      .catch((err) => {
        expect(err.message).to.equal('some error');
        expect(executedQueries).to.have.length(0);
        done();
      });
  });

  it('should reject promise if an error is throw from from runAfter', (done) => {
    QueryBuilder.forClass(TestModel)
      .runAfter(() => {
        throw new Error('some error');
      })
      .then(() => {
        done(new Error('should not get here'));
      })
      .catch((err) => {
        expect(err.message).to.equal('some error');
        done();
      });
  });

  it('should call custom find implementation defined by findOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory(function (builder) {
        expect(builder).to.equal(this);
        return createFindOperation(builder, { a: 1 });
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('select "Model".* from "Model" where "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if insert is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory((builder) => {
        return createFindOperation(builder, { a: 1 });
      })
      .insert({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a") values (1) returning "id"');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if update is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory((builder) => {
        return createFindOperation(builder, { a: 1 });
      })
      .update({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1');
      });
  });

  it('should not call custom find implementation defined by findOperationFactory if delete is called', () => {
    return QueryBuilder.forClass(TestModel)
      .findOperationFactory((builder) => {
        return createFindOperation(builder, { a: 1 });
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model"');
      });
  });

  it('should call custom insert implementation defined by insertOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .insertOperationFactory((builder) => {
        return createInsertOperation(builder, { b: 2 });
      })
      .insert({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom update implementation defined by updateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .updateOperationFactory((builder) => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .update({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom patch implementation defined by patchOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .patchOperationFactory((builder) => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .patch({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('update "Model" set "a" = 1, "b" = 2');
      });
  });

  it('should call custom delete implementation defined by deleteOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .deleteOperationFactory((builder) => {
        return createDeleteOperation(builder, { id: 100 });
      })
      .delete()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  it('should call custom relate implementation defined by relateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .relateOperationFactory((builder) => {
        return createInsertOperation(builder, { b: 2 });
      })
      .relate({ a: 1 })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('insert into "Model" ("a", "b") values (1, 2)');
      });
  });

  it('should call custom unrelate implementation defined by unrelateOperationFactory', () => {
    return QueryBuilder.forClass(TestModel)
      .unrelateOperationFactory((builder) => {
        return createDeleteOperation(builder, { id: 100 });
      })
      .unrelate()
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(executedQueries[0]).to.equal('delete from "Model" where "id" = 100');
      });
  });

  describe('*AndFetch* with select()', () => {
    it('patchAndFetchById should apply selects to the fetch query', async () => {
      mockKnexQueryResults = [1, [{ id: 1, a: 1 }]];

      const result = await TestModel.query().patchAndFetchById(1, { a: 1 }).select('id', 'a');

      expect(executedQueries).to.eql([
        'update "Model" set "a" = 1 where "Model"."id" = 1',
        'select "id", "a" from "Model" where "Model"."id" = 1',
      ]);
      expect(result).to.be.a(TestModel);
      expect(result.toJSON()).to.eql({ id: 1, a: 1 });
    });

    it('updateAndFetchById should apply selects to the fetch query', async () => {
      mockKnexQueryResults = [1, [{ a: 1 }]];

      await TestModel.query().updateAndFetchById(1, { a: 1 }).select('a');

      expect(executedQueries).to.eql([
        'update "Model" set "a" = 1 where "Model"."id" = 1',
        'select "a" from "Model" where "Model"."id" = 1',
      ]);
    });

    it('patchAndFetch should apply selects to the fetch query', async () => {
      mockKnexQueryResults = [1, [{ a: 1 }]];

      await TestModel.fromJson({ id: 1 }).$query().patchAndFetch({ a: 1 }).select('a');

      expect(executedQueries).to.eql([
        'update "Model" set "a" = 1 where "Model"."id" = 1',
        'select "a" from "Model" where "Model"."id" = 1',
      ]);
    });

    it('updateAndFetch should apply selects to the fetch query', async () => {
      mockKnexQueryResults = [1, [{ a: 1 }]];

      await TestModel.fromJson({ id: 1 }).$query().updateAndFetch({ a: 1 }).select('a');

      expect(executedQueries).to.eql([
        'update "Model" set "a" = 1 where "Model"."id" = 1',
        'select "a" from "Model" where "Model"."id" = 1',
      ]);
    });

    it('patchAndFetchById should select all columns without select', async () => {
      mockKnexQueryResults = [1, [{ id: 1, a: 1 }]];

      await TestModel.query().patchAndFetchById(1, { a: 1 });

      expect(executedQueries).to.eql([
        'update "Model" set "a" = 1 where "Model"."id" = 1',
        'select "Model".* from "Model" where "Model"."id" = 1',
      ]);
    });
  });

  describe('for()', () => {
    const message =
      'for() can only be used with queries created using the static relatedQuery method';

    let Person;

    beforeEach(() => {
      Person = class Person extends TestModel {
        static get tableName() {
          return 'person';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: TestModel,
              join: {
                from: 'person.id',
                to: 'Model.ownerId',
              },
            },
          };
        }
      };
    });

    const queries = {
      find: (query) => query,
      insert: (query) => query.insert({ a: 1 }),
      update: (query) => query.update({ a: 1 }),
      patch: (query) => query.patch({ a: 1 }),
      delete: (query) => query.delete(),
    };

    for (const [name, create] of Object.entries(queries)) {
      it(`should reject a ${name} query that wasn't created using relatedQuery`, () => {
        return create(TestModel.query().for(1))
          .then(() => {
            throw new Error('should not get here');
          })
          .catch((err) => {
            expect(err.message).to.equal(message);
            expect(executedQueries).to.have.length(0);
          });
      });

      it(`should reject a ${name} query that wasn't created using relatedQuery when for() is called last`, () => {
        return create(TestModel.query())
          .for(1)
          .then(() => {
            throw new Error('should not get here');
          })
          .catch((err) => {
            expect(err.message).to.equal(message);
            expect(executedQueries).to.have.length(0);
          });
      });
    }

    it("toKnexQuery() should throw for a query that wasn't created using relatedQuery", () => {
      expect(() => {
        TestModel.query().for(1).delete().toKnexQuery();
      }).to.throwException((err) => {
        expect(err.message).to.equal(message);
      });
    });

    it('should work with queries created using relatedQuery', () => {
      return Person.relatedQuery('pets')
        .for(1)
        .delete()
        .then(() => {
          expect(executedQueries).to.eql(['delete from "Model" where "Model"."ownerId" in (1)']);
        });
    });

    it('should work when called after other methods on a relatedQuery find query', () => {
      return Person.relatedQuery('pets')
        .where('a', 1)
        .for(1)
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "Model"."ownerId" in (1) and "a" = 1',
          ]);
        });
    });

    const writeQueries = {
      insert: (query) => query.insert({ a: 1 }),
      insertGraph: (query) => query.insertGraph({ a: 1 }),
      update: (query) => query.update({ a: 1 }),
      patch: (query) => query.patch({ a: 1 }),
      delete: (query) => query.delete(),
      relate: (query) => query.relate(2),
      unrelate: (query) => query.unrelate(),
    };

    for (const [name, create] of Object.entries(writeQueries)) {
      it(`should throw when called after ${name}() on a relatedQuery`, () => {
        expect(() => {
          create(Person.relatedQuery('pets')).for(1);
        }).to.throwException((err) => {
          expect(err.message).to.equal(
            'for() must be called before insert, update, patch, delete, relate or unrelate on queries created using the static relatedQuery method',
          );
        });
      });
    }
  });

  describe('none()', () => {
    beforeEach(() => {
      // If any query gets executed, it returns rows.
      mockKnexQueryResults = [[{ id: 1 }], [{ id: 2 }]];
    });

    it('should return an empty array without executing a query', () => {
      return TestModel.query()
        .where('a', 1)
        .none()
        .then((result) => {
          expect(result).to.eql([]);
          expect(executedQueries).to.have.length(0);
        });
    });

    it('should return undefined for single result queries', () => {
      return Promise.all([
        TestModel.query().none().first(),
        TestModel.query().none().findById(1),
        TestModel.query().findOne({ a: 1 }).none(),
      ]).then((results) => {
        expect(results).to.eql([undefined, undefined, undefined]);
        expect(executedQueries).to.have.length(0);
      });
    });

    it('should not execute eager queries', () => {
      const Person = class Person extends TestModel {
        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: TestModel,
              join: {
                from: 'Model.id',
                to: 'Model.ownerId',
              },
            },
          };
        }
      };

      return Person.query()
        .withGraphFetched('pets')
        .none()
        .then((result) => {
          expect(result).to.eql([]);
          expect(executedQueries).to.have.length(0);
        });
    });

    it('should return 0 for update, patch and delete queries without executing them', () => {
      return Promise.all([
        TestModel.query().none().update({ a: 1 }),
        TestModel.query().patch({ a: 1 }).none(),
        TestModel.query().none().delete(),
        TestModel.query().none().deleteById(1),
      ]).then((results) => {
        expect(results).to.eql([0, 0, 0, 0]);
        expect(executedQueries).to.have.length(0);
      });
    });

    it('should return undefined for patchAndFetchById without executing it', () => {
      return TestModel.query()
        .none()
        .patchAndFetchById(1, { a: 1 })
        .then((result) => {
          expect(result).to.equal(undefined);
          expect(executedQueries).to.have.length(0);
        });
    });

    it('should not modify the instance of an instance patch', async () => {
      const model = TestModel.fromJson({ id: 1, a: 1 });
      const result = await model.$query().patch({ a: 2 }).none();

      expect(result).to.equal(0);
      expect(model.a).to.equal(1);
      expect(executedQueries).to.have.length(0);
    });

    it('should not modify the owners of a belongs to one relation delete', async () => {
      class Pet extends TestModel {
        static get relationMappings() {
          return {
            owner: {
              relation: Model.BelongsToOneRelation,
              modelClass: TestModel,
              join: {
                from: 'Model.ownerId',
                to: 'Model.id',
              },
            },
          };
        }
      }

      const pet = Pet.fromJson({ id: 1, ownerId: 2 });
      const result = await pet.$relatedQuery('owner').delete().none();

      expect(result).to.equal(0);
      expect(pet.ownerId).to.equal(2);
      expect(executedQueries).to.have.length(0);

      const resolved = await pet
        .$relatedQuery('owner')
        .delete()
        .runBefore((_, builder) => {
          builder.resolve(0);
        });

      expect(resolved).to.equal(0);
      expect(pet.ownerId).to.equal(2);
      expect(executedQueries).to.have.length(0);
    });

    it('should not modify the instance of an instance patch resolved in a hook', async () => {
      const model = TestModel.fromJson({ id: 1, a: 1 });
      const result = await model
        .$query()
        .patch({ a: 2 })
        .runBefore((_, builder) => {
          builder.resolve(0);
        });

      expect(result).to.equal(0);
      expect(model.a).to.equal(1);
      expect(executedQueries).to.have.length(0);
    });

    it('should count falsy values passed to resolve() as resolved', () => {
      for (const value of [0, false, '', undefined]) {
        const builder = TestModel.query().resolve(value);

        expect(builder.isExplicitlyResolvedOrRejected()).to.equal(true);
        expect(builder.isExecutable()).to.equal(false);
      }

      expect(TestModel.query().isExplicitlyResolvedOrRejected()).to.equal(false);
      expect(TestModel.query().reject(0).isExplicitlyResolvedOrRejected()).to.equal(true);
    });

    it('should return an empty array for update and delete queries with returning', () => {
      return Promise.all([
        TestModel.query().none().patch({ a: 1 }).returning('*'),
        TestModel.query().none().delete().returning('*'),
      ]).then((results) => {
        expect(results).to.eql([[], []]);
        expect(executedQueries).to.have.length(0);
      });
    });

    it('should reject insert queries', () => {
      return TestModel.query()
        .none()
        .insert({ a: 1 })
        .then(() => {
          throw new Error('should not get here');
        })
        .catch((err) => {
          expect(err.message).to.equal(
            'none() can only be used with find, update and delete queries',
          );
          expect(executedQueries).to.have.length(0);
        });
    });

    it('should replace all where clauses with an always false condition in the built query', () => {
      expect(
        TestModel.query()
          .where('a', 1)
          .orWhere('b', 2)
          .none()
          .orWhere('c', 3)
          .toKnexQuery()
          .toString(),
      ).to.equal('select "Model".* from "Model" where 1 = 0');
    });

    it('should replace all where clauses with an always false condition in subqueries', () => {
      return TestModel.query()
        .whereIn('id', TestModel.query().select('x').where('a', 1).orWhere('b', 2).none())
        .then(() => {
          expect(executedQueries).to.eql([
            'select "Model".* from "Model" where "id" in (select "x" from "Model" where 1 = 0)',
          ]);
        });
    });

    it('should execute find queries with aggregates or groupBy', () => {
      mockKnexQueryResults = [[{ count: 0 }], [{ total: null }], []];

      return Promise.all([
        TestModel.query().none().count('* as count').first(),
        TestModel.query().sum('a as total').none(),
        TestModel.query().select('a').groupBy('a').none(),
      ]).then((results) => {
        expect(results).to.eql([{ count: 0 }, [{ total: null }], []]);
        expect(executedQueries).to.eql([
          'select count(*) as "count" from "Model" where 1 = 0',
          'select sum("a") as "total" from "Model" where 1 = 0',
          'select "a" from "Model" where 1 = 0 group by "a"',
        ]);
      });
    });

    it('should make resultSize return 0', () => {
      mockKnexQueryResults = [[{ count: '0' }]];

      return TestModel.query()
        .none()
        .resultSize()
        .then((result) => {
          expect(result).to.equal(0);
          expect(executedQueries).to.eql([
            'select count(*) as "count" from (select "Model".* from "Model" where 1 = 0) as "temp"',
          ]);
        });
    });

    it('should still call the static query hooks', () => {
      const calls = [];

      class HookModel extends TestModel {
        static beforeFind() {
          calls.push('beforeFind');
        }

        static afterFind({ result }) {
          calls.push(['afterFind', result]);
        }
      }

      return HookModel.query()
        .none()
        .then((result) => {
          expect(result).to.eql([]);
          expect(calls).to.eql(['beforeFind', ['afterFind', []]]);
          expect(executedQueries).to.have.length(0);
        });
    });

    it('should be matched by has() and removed by clear()', () => {
      const query = TestModel.query().none();
      expect(query.has('none')).to.equal(true);
      expect(query.clear('none').has('none')).to.equal(false);
    });
  });

  it('should be able to execute same query multiple times', () => {
    let query = QueryBuilder.forClass(TestModel)
      .updateOperationFactory((builder) => {
        return createUpdateOperation(builder, { b: 2 });
      })
      .where('test', '<', 100)
      .update({ a: 1 });

    return query
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toKnexQuery().toString()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100',
        );
        executedQueries = [];
        return query;
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toKnexQuery().toString()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100',
        );
        executedQueries = [];
        return query;
      })
      .then(() => {
        expect(executedQueries).to.have.length(1);
        expect(query.toKnexQuery().toString()).to.equal(executedQueries[0]);
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 1, "b" = 2 where "test" < 100',
        );
      });
  });

  it('resultSize should create and execute a query that returns the size of the query', (done) => {
    mockKnexQueryResults = [[{ count: '123' }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .limit(10)
      .offset(100)
      .resultSize()
      .then((res) => {
        expect(executedQueries).to.have.length(1);
        expect(res).to.equal(123);
        expect(executedQueries[0]).to.equal(
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"',
        );
        done();
      })
      .catch(done);
  });

  it('should consider withSchema when looking for column info', (done) => {
    class TestModelRelated extends Model {
      static get tableName() {
        return 'Related';
      }
    }

    class TestModel extends Model {
      static get tableName() {
        return 'Model';
      }

      static get relationMappings() {
        return {
          relatedModel: {
            relation: Model.BelongsToOneRelation,
            modelClass: TestModelRelated,
            join: {
              from: 'Model.id',
              to: 'Related.id',
            },
          },
        };
      }
    }
    TestModel.knex(mockKnex);
    TestModelRelated.knex(mockKnex);

    mockKnexQueryResults = [[{ count: '123' }]];
    QueryBuilder.forClass(TestModel)
      .withSchema('someSchema')
      .withGraphJoined('relatedModel')
      .then(() => {
        expect(executedQueries).to.eql([
          "select * from information_schema.columns where table_name = 'Model' and table_catalog = current_database() and table_schema = 'someSchema'",
          "select * from information_schema.columns where table_name = 'Related' and table_catalog = current_database() and table_schema = 'someSchema'",
          'select "Model"."0" as "0" from "someSchema"."Model" left join "someSchema"."Related" as "relatedModel" on "relatedModel"."id" = "Model"."id"',
        ]);
        done();
      })
      .catch(done);
  });

  it('range should return a range and the total count', (done) => {
    mockKnexQueryResults = [[{ a: '1' }], [{ count: '123' }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .range(100, 200)
      .then((res) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          'select "Model".* from "Model" where "test" = 100 order by "order" asc limit 101 offset 100',
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"',
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{ a: 1 }]);
        done();
      })
      .catch(done);
  });

  it('page should return a page and the total count', (done) => {
    mockKnexQueryResults = [[{ a: '1' }], [{ count: '123' }]];
    QueryBuilder.forClass(TestModel)
      .where('test', 100)
      .orderBy('order')
      .page(10, 100)
      .then((res) => {
        expect(executedQueries).to.have.length(2);
        expect(executedQueries).to.eql([
          'select "Model".* from "Model" where "test" = 100 order by "order" asc limit 100 offset 1000',
          'select count(*) as "count" from (select "Model".* from "Model" where "test" = 100) as "temp"',
        ]);
        expect(res.total).to.equal(123);
        expect(res.results).to.eql([{ a: 1 }]);
        done();
      })
      .catch(done);
  });

  describe('resultSize with withGraphJoined', () => {
    let Person;
    let Animal;

    const metadataQuery = (table) =>
      `select * from information_schema.columns where table_name = '${table}' and table_catalog = current_database() and table_schema = current_schema()`;

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: { from: 'Person.id', to: 'Animal.ownerId' },
            },
          };
        }
      };

      Animal = class Animal extends Model {
        static get tableName() {
          return 'Animal';
        }
      };

      Person.knex(mockKnex);
    });

    it('resultSize should fetch the table metadata and count the distinct root models', () => {
      mockKnexQueryResults = [[], [], [{ count: '2' }]];

      return Person.query()
        .withGraphJoined('pets')
        .where('pets.name', 'like', 'A%')
        .orderBy('Person.id')
        .limit(1)
        .resultSize()
        .then((res) => {
          expect(res).to.equal(2);
          expect(executedQueries).to.eql([
            metadataQuery('Person'),
            metadataQuery('Animal'),
            'select count(*) as "count" from (select distinct "Person"."id" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id" where "pets"."name" like \'A%\') as "temp"',
          ]);
        });
    });

    it('resultSize should count the distinct composite ids of the root models', () => {
      class CompositePerson extends Model {
        static get tableName() {
          return 'Person';
        }

        static get idColumn() {
          return ['id', 'tenantId'];
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: {
                from: ['Person.id', 'Person.tenantId'],
                to: ['Animal.ownerId', 'Animal.tenantId'],
              },
            },
          };
        }

        static tableMetadata() {
          return { columns: ['id', 'tenantId', 'name'] };
        }
      }

      Animal.tableMetadata = () => ({ columns: ['id', 'ownerId', 'tenantId'] });
      CompositePerson.knex(mockKnex);
      mockKnexQueryResults = [[{ count: '3' }]];

      return CompositePerson.query()
        .withGraphJoined('pets')
        .resultSize()
        .then((res) => {
          expect(res).to.equal(3);
          expect(executedQueries).to.eql([
            'select count(*) as "count" from (select distinct "Person"."id", "Person"."tenantId" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id" and "pets"."tenantId" = "Person"."tenantId") as "temp"',
          ]);
        });
    });

    it('resultSize should keep the selections when grouping', () => {
      Person.tableMetadata = () => ({ columns: ['id', 'name'] });
      Animal.tableMetadata = () => ({ columns: ['id', 'ownerId'] });
      mockKnexQueryResults = [[{ count: '1' }]];

      return Person.query()
        .select('Person.id', 'Person.name as personName')
        .withGraphJoined('pets')
        .groupBy('Person.id', 'pets.id')
        .having('personName', '=', 'A')
        .resultSize()
        .then((res) => {
          expect(res).to.equal(1);
          expect(executedQueries).to.eql([
            'select count(*) as "count" from (select distinct "id" from (select "Person"."id", "Person"."name" as "personName", "pets"."id" as "pets:id", "pets"."ownerId" as "pets:ownerId" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id" group by "Person"."id", "pets"."id" having "personName" = \'A\') as "inner") as "temp"',
          ]);
        });
    });

    it('page should count the distinct root models in the total count query', () => {
      Person.tableMetadata = () => ({ columns: ['id', 'name'] });
      Animal.tableMetadata = () => ({ columns: ['id', 'name', 'ownerId'] });
      mockKnexQueryResults = [
        [
          { id: 1, name: 'P1', 'pets:id': 10, 'pets:name': 'A10', 'pets:ownerId': 1 },
          { id: 1, name: 'P1', 'pets:id': 11, 'pets:name': 'A11', 'pets:ownerId': 1 },
          { id: 2, name: 'P2', 'pets:id': null, 'pets:name': null, 'pets:ownerId': null },
        ],
        [{ count: '2' }],
      ];

      return Person.query()
        .withGraphJoined('pets')
        .orderBy('Person.id')
        .page(0, 10)
        .then((res) => {
          expect(res.total).to.equal(2);
          expect(res.results).to.have.length(2);
          expect(executedQueries).to.eql([
            'select "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id" order by "Person"."id" asc limit 10',
            'select count(*) as "count" from (select distinct "Person"."id" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id") as "temp"',
          ]);
        });
    });
  });

  describe('orderBy added at build time', () => {
    class TestModelRelated extends Model {
      static get tableName() {
        return 'Related';
      }
    }

    class TestModel extends Model {
      static get tableName() {
        return 'Model';
      }

      static get relationMappings() {
        return {
          related: {
            relation: Model.HasManyRelation,
            modelClass: TestModelRelated,
            modify: (builder) => builder.orderBy('order'),
            join: {
              from: 'Model.id',
              to: 'Related.modelId',
            },
          },
        };
      }
    }

    beforeEach(() => {
      TestModel.knex(mockKnex);
      TestModelRelated.knex(mockKnex);
    });

    it('resultSize should not include orderBy added by relation modify', () => {
      mockKnexQueryResults = [[{ count: '123' }]];
      return TestModel.relatedQuery('related')
        .for(1)
        .resultSize()
        .then((res) => {
          expect(res).to.equal(123);
          expect(executedQueries).to.eql([
            'select count(*) as "count" from (select "Related".* from "Related" where "Related"."modelId" in (1)) as "temp"',
          ]);
        });
    });

    it('page should not include orderBy added by relation modify in the total count query', () => {
      mockKnexQueryResults = [[{ a: '1' }], [{ count: '123' }]];
      return TestModel.relatedQuery('related')
        .for(1)
        .page(0, 10)
        .then((res) => {
          expect(res.total).to.equal(123);
          expect(executedQueries).to.eql([
            'select "Related".* from "Related" where "Related"."modelId" in (1) order by "order" asc limit 10',
            'select count(*) as "count" from (select "Related".* from "Related" where "Related"."modelId" in (1)) as "temp"',
          ]);
        });
    });
  });

  it('isFind, isInsert, isUpdate, isPatch, isDelete, isRelate, isUnrelate should return true only for the right operations', () => {
    TestModel.relationMappings = {
      someRel: {
        relation: Model.HasManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          to: 'Model.someRelId',
        },
      },
    };

    const queries = {
      find: TestModel.query(),
      insert: TestModel.query().insert(),
      update: TestModel.query().update(),
      patch: TestModel.query().patch(),
      delete: TestModel.query().delete(),
      relate: TestModel.relatedQuery('someRel').relate(1),
      unrelate: TestModel.relatedQuery('someRel').unrelate(),
    };

    // Check all types of operations, call all available checks for reach of them,
    // (e.g. isFind(), isUpdate(), etc) and see if they return the expected result.
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const getMethodName = (name) => `is${capitalize(name === 'patch' ? 'update' : name)}`;

    for (const name in queries) {
      const query = queries[name];
      for (const other in queries) {
        const method = getMethodName(other);
        chai
          .expect(query[method](), `queries.${name}.${method}()`)
          .to.equal(method === getMethodName(name));
        chai
          .expect(query.hasWheres(), `queries.${name}.hasWheres()`)
          .to.equal(name.includes('relate'));
        chai.expect(query.hasSelects(), `queries.${name}.hasSelects()`).to.equal(false);
      }
    }
  });

  it('hasWheres() should return true for all variants of where queries', () => {
    TestModel.relationMappings = {
      belongsToOneRelation: {
        relation: Model.BelongsToOneRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.someId',
          to: 'Model.id',
        },
      },
      hasManyRelation: {
        relation: Model.HasManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          to: 'Model.someId',
        },
      },
      manyToManyRelation: {
        relation: Model.ManyToManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          through: {
            from: 'JoinTable.id1',
            to: 'JoinTable.id2',
          },
          to: 'Model.id',
        },
      },
    };

    expect(TestModel.query().hasWheres()).to.equal(false);
    expect(TestModel.query().insert({}).hasWheres()).to.equal(false);
    expect(TestModel.query().update({}).hasWheres()).to.equal(false);
    expect(TestModel.query().patch({}).hasWheres()).to.equal(false);
    expect(TestModel.query().delete().hasWheres()).to.equal(false);

    const wheres = [
      'findOne',
      'findById',
      'where',
      'andWhere',
      'orWhere',
      'whereNot',
      'orWhereNot',
      'whereRaw',
      'andWhereRaw',
      'orWhereRaw',
      'whereWrapped',
      'whereExists',
      'orWhereExists',
      'whereNotExists',
      'orWhereNotExists',
      'whereIn',
      'orWhereIn',
      'whereNotIn',
      'orWhereNotIn',
      'whereNull',
      'orWhereNull',
      'whereNotNull',
      'orWhereNotNull',
      'whereBetween',
      'andWhereBetween',
      'whereNotBetween',
      'andWhereNotBetween',
      'orWhereBetween',
      'orWhereNotBetween',
      'whereColumn',
      'andWhereColumn',
      'orWhereColumn',
      'whereNotColumn',
      'andWhereNotColumn',
      'orWhereNotColumn',
    ];

    for (let i = 0; i < wheres.length; i++) {
      const name = wheres[i];
      const query = TestModel.query()[name](1, '=', 1);
      chai.expect(query.hasWheres(), `TestModel.query().${name}().hasWheres()`).to.equal(true);
    }

    const model = TestModel.fromJson({ id: 1, someId: 1 });
    let query = model.$query();
    chai.expect(query.hasWheres()).to.equal(true);

    query = model.$query().withGraphJoined('manyToManyRelation');
    chai.expect(query.hasWheres()).to.equal(true);

    query = model.$relatedQuery('belongsToOneRelation');
    chai.expect(query.hasWheres()).to.equal(true);

    query = model.$relatedQuery('hasManyRelation');
    chai.expect(query.hasWheres()).to.equal(true);

    query = model.$relatedQuery('manyToManyRelation');
    chai.expect(query.hasWheres()).to.equal(true);
  });

  it('hasSelects() should return true for all variants of select queries', () => {
    const selects = [
      'select',
      'columns',
      'column',
      'distinct',
      'count',
      'countDistinct',
      'min',
      'max',
      'sum',
      'sumDistinct',
      'avg',
      'avgDistinct',
    ];

    for (let i = 0; i < selects.length; i++) {
      const name = selects[i];
      const query = TestModel.query()[name]('arg');
      chai
        .expect(query.hasSelects(), `TestModel.query().${name}('arg').hasSelects()`)
        .to.equal(true);
    }
  });

  it('hasWithGraph() should return true for queries with eager statements', () => {
    TestModel.relationMappings = {
      someRel: {
        relation: Model.HasManyRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.id',
          to: 'Model.someRelId',
        },
      },
    };

    const query = TestModel.query();
    expect(query.hasWithGraph()).to.equal(false);
    query.withGraphFetched('someRel');
    expect(query.hasWithGraph()).to.equal(true);
    query.clearWithGraph();
    expect(query.hasWithGraph()).to.equal(false);
  });

  it('has() should match defined query operations', () => {
    // A bunch of random operations to test against.
    const operations = [
      'range',
      'orderBy',
      'limit',
      'where',
      'andWhere',
      'whereRaw',
      'havingWrapped',
      'rightOuterJoin',
      'crossJoin',
      'offset',
      'union',
      'count',
      'avg',
      'with',
    ];
    const test = (query, name, expected) => {
      const regexp = new RegExp(`^${name}$`);
      chai
        .expect(query.has(name), `TestModel.query().${name}('arg').has('${name}')`)
        .to.equal(expected);
      chai
        .expect(query.has(regexp), `TestModel.query().${name}('arg').has(${regexp})`)
        .to.equal(expected);
    };

    operations.forEach((operation) => {
      const query = TestModel.query()[operation]('arg');
      operations.forEach((testOperation) => {
        test(query, testOperation, testOperation === operation);
      });
    });
  });

  it('clear() should remove matching query operations', () => {
    // A bunch of random operations to test against.
    const operations = ['where', 'limit', 'offset', 'count'];

    operations.forEach((operation) => {
      const query = TestModel.query();
      operations.forEach((operation) => query[operation]('arg'));
      chai.expect(query.has(operation), `query().has('${operation}')`).to.equal(true);
      chai
        .expect(
          query.clear(operation).has(operation),
          `query().clear('${operation}').has('${operation}')`,
        )
        .to.equal(false);
      operations.forEach((testOperation) => {
        chai
          .expect(query.has(testOperation), `query().has('${testOperation}')`)
          .to.equal(testOperation !== operation);
      });
    });
  });

  it('update() should call $beforeUpdate on the model', (done) => {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'',
        );
        done();
      })
      .catch(done);
  });

  it('update() should call $beforeUpdate on the model (async)', (done) => {
    TestModel.prototype.$beforeUpdate = function () {
      let self = this;
      return delay(5).then(() => {
        self.c = 'beforeUpdate';
      });
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .update(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'',
        );
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model', (done) => {
    TestModel.prototype.$beforeUpdate = function () {
      this.c = 'beforeUpdate';
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'',
        );
        done();
      })
      .catch(done);
  });

  it('patch() should call $beforeUpdate on the model (async)', (done) => {
    TestModel.prototype.$beforeUpdate = function () {
      let self = this;
      return delay(5).then(() => {
        self.c = 'beforeUpdate';
      });
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    let model = TestModel.fromJson({ a: 10, b: 'test' });
    QueryBuilder.forClass(TestModel)
      .patch(model)
      .then(() => {
        expect(model.c).to.equal('beforeUpdate');
        expect(executedQueries[0]).to.equal(
          'update "Model" set "a" = 10, "b" = \'test\', "c" = \'beforeUpdate\'',
        );
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model', (done) => {
    TestModel.prototype.$beforeInsert = function () {
      this.c = 'beforeInsert';
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    QueryBuilder.forClass(TestModel)
      .insert(TestModel.fromJson({ a: 10, b: 'test' }))
      .then((model) => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal(
          'insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"',
        );
        done();
      })
      .catch(done);
  });

  it('insert() should call $beforeInsert on the model (async)', (done) => {
    TestModel.prototype.$beforeInsert = function () {
      let self = this;
      return delay(5).then(() => {
        self.c = 'beforeInsert';
      });
    };

    TestModel.prototype.$afterFind = function () {
      throw new Error('$afterFind should not be called');
    };

    QueryBuilder.forClass(TestModel)
      .insert({ a: 10, b: 'test' })
      .then((model) => {
        expect(model.c).to.equal('beforeInsert');
        expect(executedQueries[0]).to.equal(
          'insert into "Model" ("a", "b", "c") values (10, \'test\', \'beforeInsert\') returning "id"',
        );
        done();
      })
      .catch(done);
  });

  it('should call $afterFind on the model if no write operation is specified', (done) => {
    mockKnexQueryResults = [
      [
        {
          a: 1,
        },
        {
          a: 2,
        },
      ],
    ];

    TestModel.prototype.$afterFind = function (context) {
      this.b = this.a * 2 + context.x;
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .then((models) => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12,
          },
          {
            a: 2,
            b: 14,
          },
        ]);
        done();
      })
      .catch(done);
  });

  it('should call $afterFind on the model if no write operation is specified (async)', (done) => {
    mockKnexQueryResults = [
      [
        {
          a: 1,
        },
        {
          a: 2,
        },
      ],
    ];

    TestModel.prototype.$afterFind = function (context) {
      let self = this;
      return delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .then((models) => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12,
          },
          {
            a: 2,
            b: 14,
          },
        ]);
        done();
      })
      .catch(done);
  });

  it('should call $afterFind before any `runAfter` hooks', (done) => {
    mockKnexQueryResults = [
      [
        {
          a: 1,
        },
        {
          a: 2,
        },
      ],
    ];

    TestModel.prototype.$afterFind = function (context) {
      let self = this;
      return delay(10).then(() => {
        self.b = self.a * 2 + context.x;
      });
    };

    QueryBuilder.forClass(TestModel)
      .context({ x: 10 })
      .runAfter((result, builder) => {
        builder.context().x = 666;
        return result;
      })
      .then((models) => {
        expect(models[0]).to.be.a(TestModel);
        expect(models[1]).to.be.a(TestModel);
        expect(models).to.eql([
          {
            a: 1,
            b: 12,
          },
          {
            a: 2,
            b: 14,
          },
        ]);
        done();
      })
      .catch(done);
  });

  it('should not be able to call setQueryExecutor twice', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel)
        .setQueryExecutor(function () {})
        .setQueryExecutor(function () {});
    }).to.throwException();
  });

  it('clearWithGraph() should clear everything related to eager', () => {
    let builder = QueryBuilder.forClass(TestModel)
      .withGraphFetched('a(f).b', {
        f: () => {},
      })
      .modifyGraph('a', () => {});

    expect(builder.findOperation('eager')).to.not.equal(null);
    builder.clearWithGraph();

    expect(builder.findOperation('eager')).to.equal(null);
  });

  it('clearReject() should clear remove explicit rejection', () => {
    let builder = QueryBuilder.forClass(TestModel).reject('error');

    expect(builder._explicitRejectValue).to.equal('error');

    builder.clearReject();

    expect(builder._explicitRejectValue).to.equal(null);
  });

  it('subqueries in join builders should work with mysql', () => {
    class MysqlModel extends TestModel {}
    MysqlModel.knex(Knex({ client: 'mysql' }));
    const subquery = () => MysqlModel.query().select('id').where('a', '>', 1);

    expect(
      MysqlModel.query()
        .innerJoin('Other', (join) => join.onIn('Other.modelId', subquery()))
        .toKnexQuery()
        .toString(),
    ).to.equal(
      'select `Model`.* from `Model` inner join `Other` on `Other`.`modelId` in (select `id` from `Model` where `a` > 1)',
    );

    expect(
      MysqlModel.query()
        .patch({ a: 1 })
        .innerJoin('Other', (join) => join.onIn('Other.modelId', subquery().from('Third')))
        .toKnexQuery()
        .toString(),
    ).to.equal(
      'update `Model` inner join `Other` on `Other`.`modelId` in (select `id` from `Third` where `a` > 1) set `a` = 1',
    );
  });

  it('joinRelated should add join clause to correct place', (done) => {
    class M1 extends Model {
      static get tableName() {
        return 'M1';
      }
    }

    class M2 extends Model {
      static get tableName() {
        return 'M2';
      }

      static get relationMappings() {
        return {
          m1: {
            relation: Model.HasManyRelation,
            modelClass: M1,
            join: {
              from: 'M2.id',
              to: 'M1.m2Id',
            },
          },
        };
      }
    }

    M1.knex(mockKnex);
    M2.knex(mockKnex);

    M2.query()
      .joinRelated('m1', { alias: 'm' })
      .join('M1', 'M1.id', 'M2.m1Id')
      .then(() => {
        expect(executedQueries[0]).to.equal(
          'select "M2".* from "M2" inner join "M1" as "m" on "m"."m2Id" = "M2"."id" inner join "M1" on "M1"."id" = "M2"."m1Id"',
        );
        done();
      })
      .catch(done);
  });

  it('undefined values as query builder method arguments should raise an exception', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel).where('id', undefined).toKnexQuery();
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        "undefined passed as argument #1 for 'where' operation. Call skipUndefined() method to ignore the undefined values.",
      );
    });

    expect(() => {
      QueryBuilder.forClass(TestModel).orWhere('id', '<', undefined).toKnexQuery();
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        "undefined passed as argument #2 for 'orWhere' operation. Call skipUndefined() method to ignore the undefined values.",
      );
    });

    expect(() => {
      QueryBuilder.forClass(TestModel).orWhere('id', undefined, 10).toKnexQuery();
    }).to.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel).delete().whereIn('id', undefined).toKnexQuery();
    }).to.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel).delete().whereIn('id', [1, undefined, 3]).toKnexQuery();
    }).to.throwException((err) => {
      expect(err.message).to.equal(
        "undefined passed as an item in argument #1 for 'whereIn' operation. Call skipUndefined() method to ignore the undefined values.",
      );
    });
  });

  it('undefined values as query builder method arguments should be ignored if `skipUndefined` is called', () => {
    expect(() => {
      QueryBuilder.forClass(TestModel).skipUndefined().where('id', undefined).toKnexQuery();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel).skipUndefined().orWhere('id', '<', undefined).toKnexQuery();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel).skipUndefined().orWhere('id', undefined, 10).toKnexQuery();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel).skipUndefined().deleteById(undefined).toKnexQuery();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', undefined)
        .toKnexQuery();
    }).to.not.throwException();

    expect(() => {
      QueryBuilder.forClass(TestModel)
        .skipUndefined()
        .delete()
        .whereIn('id', [1, undefined, 3])
        .toKnexQuery();
    }).to.not.throwException();
  });

  it('all query builder methods should work if model is not bound to a knex, when the query is', () => {
    class UnboundModel extends Model {
      static get tableName() {
        return 'Bar';
      }
    }

    expect(UnboundModel.query(mockKnex).increment('foo', 10).toKnexQuery().toString()).to.equal(
      'update "Bar" set "foo" = "foo" + 10',
    );
    expect(UnboundModel.query(mockKnex).decrement('foo', 5).toKnexQuery().toString()).to.equal(
      'update "Bar" set "foo" = "foo" - 5',
    );
  });

  it('json where methods should reference the bare column if no json path is given', () => {
    const toSql = (builder) => builder.toKnexQuery().toString();

    expect(toSql(TestModel.query().whereJsonSupersetOf('content', { a: 1 }))).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb @> '{"a":1}'::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonSubsetOf('Model.content', { a: 1 }))).to.equal(
      `select "Model".* from "Model" where ( "Model"."content" )::jsonb <@ '{"a":1}'::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonNotSupersetOf('content', 'other'))).to.equal(
      `select "Model".* from "Model" where not ( "content" )::jsonb @> ( "other" )::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonIsArray('content'))).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb @> '[]'::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonHasAny('content', ['a', 'b']))).to.equal(
      `select "Model".* from "Model" where "content" ?| array['a','b']`,
    );
    // `#>>'{}'` extracts json scalars as text and maps json null to NULL,
    // so it must be kept when extracting as text.
    expect(toSql(TestModel.query().whereJsonNotObject('content'))).to.equal(
      `select "Model".* from "Model" where (not ( "content" )::jsonb @> '{}'::jsonb or ("content"#>>'{}')::TEXT is NULL)`,
    );
    // Json paths are still extracted as before.
    expect(toSql(TestModel.query().whereJsonSupersetOf('content:a.b', { a: 1 }))).to.equal(
      `select "Model".* from "Model" where ( "content"#>'{a,b}' )::jsonb @> '{"a":1}'::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonHasAll('content:a', ['b']))).to.equal(
      `select "Model".* from "Model" where "content"#>'{a}' ?& array['b']`,
    );
  });

  it('json where methods should support ref(), val() and raw() on the right side', () => {
    const toSql = (builder) => builder.toKnexQuery().toString();

    expect(toSql(TestModel.query().whereJsonSupersetOf('content:a', ref('other:b')))).to.equal(
      `select "Model".* from "Model" where ( "content"#>'{a}' )::jsonb @> ( "other"#>'{b}' )::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonSubsetOf('content', ref('Model.other')))).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb <@ ( "Model"."other" )::jsonb`,
    );
    expect(
      toSql(
        TestModel.query()
          .whereJsonSupersetOf('a', 'b')
          .orWhereJsonNotSubsetOf('content', ref("other:x'?")),
      ),
    ).to.equal(
      `select "Model".* from "Model" where ( "a" )::jsonb @> ( "b" )::jsonb or not ( "content" )::jsonb <@ ( "other"#>'{x''?}' )::jsonb`,
    );
    expect(
      toSql(TestModel.query().whereJsonSupersetOf('content', val({ a: '?' }).castJson())),
    ).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb @> ( CAST('{"a":"?"}' AS jsonb) )::jsonb`,
    );
    expect(
      toSql(TestModel.query().whereJsonSupersetOf('content', raw('?::jsonb', '[1]'))),
    ).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb @> ( '[1]'::jsonb )::jsonb`,
    );
    expect(
      toSql(
        TestModel.query().whereJsonSupersetOf(
          'content',
          TestModel.query().select('other').limit(1),
        ),
      ),
    ).to.equal(
      `select "Model".* from "Model" where ( "content" )::jsonb @> ( (select "other" from "Model" limit 1) )::jsonb`,
    );
  });

  it('json methods should support empty keys in field expressions', () => {
    const toSql = (builder) => builder.toKnexQuery().toString();

    expect(toSql(TestModel.query().whereJsonSupersetOf('content:[""]', { a: 1 }))).to.equal(
      `select "Model".* from "Model" where ( "content"#>'{""}' )::jsonb @> '{"a":1}'::jsonb`,
    );
    expect(toSql(TestModel.query().whereJsonHasAny("content:a['']", ['b']))).to.equal(
      `select "Model".* from "Model" where "content"#>'{a,""}' ?| array['b']`,
    );
    expect(toSql(TestModel.query().whereJsonIsObject('content:[""]'))).to.equal(
      `select "Model".* from "Model" where ( "content"#>'{""}' )::jsonb @> '{}'::jsonb`,
    );
    expect(toSql(TestModel.query().where(ref('content:[""]').castText(), 'x'))).to.equal(
      `select "Model".* from "Model" where CAST("content"#>>'{""}' AS text) = 'x'`,
    );
    expect(toSql(TestModel.query().patch({ 'content:[""]': 1 }))).to.equal(
      `update "Model" set "content" = jsonb_set("content", '{""}', '1', true)`,
    );
  });

  describe('json field expressions on other databases (ditojs#113)', () => {
    const message =
      'JSON field expressions and the whereJson*() methods of objection are only supported ' +
      'on PostgreSQL. Use the JSON methods of knex like whereJsonPath() or jsonExtract() ' +
      'with other databases.';

    const knexes = {};
    const query = (client) => {
      knexes[client] = knexes[client] || Knex({ client, useNullAsDefault: true });
      return TestModel.query(knexes[client]);
    };
    const toSql = (builder) => builder.toKnexQuery().toString();

    let warnings;
    let originalWarn;

    beforeEach(() => {
      resetDeprecations();
      warnings = [];
      originalWarn = console.warn;
      console.warn = (message) => warnings.push(message);
    });

    afterEach(() => {
      console.warn = originalWarn;
      resetDeprecations();
    });

    it('should not change the json where methods on postgres', () => {
      expect(toSql(query('pg').whereJsonSupersetOf('content', { a: 1 }))).to.equal(
        `select "Model".* from "Model" where ( "content" )::jsonb @> '{"a":1}'::jsonb`,
      );
      expect(toSql(query('pg').orWhereJsonNotSubsetOf('content', [1]))).to.equal(
        `select "Model".* from "Model" where not ( "content" )::jsonb <@ '[1]'::jsonb`,
      );
    });

    it('should pass the simple json superset and subset methods on to knex on mysql', () => {
      expect(toSql(query('mysql').whereJsonSupersetOf('content', { a: 1 }))).to.equal(
        'select `Model`.* from `Model` where json_contains(`content`,\'{\\"a\\":1}\')',
      );
      expect(toSql(query('mysql').andWhereJsonSupersetOf('Model.content', [1]))).to.equal(
        "select `Model`.* from `Model` where json_contains(`Model`.`content`,'[1]')",
      );
      expect(toSql(query('mysql').whereJsonSubsetOf('content', [1]))).to.equal(
        "select `Model`.* from `Model` where json_contains('[1]',`content`)",
      );
      expect(
        toSql(
          query('mysql')
            .where('id', 1)
            .orWhereJsonSupersetOf('content', [1])
            .whereJsonNotSupersetOf('content', [2])
            .orWhereJsonNotSupersetOf('content', [3])
            .orWhereJsonSubsetOf('content', [4])
            .whereJsonNotSubsetOf('content', [5])
            .orWhereJsonNotSubsetOf('content', [6]),
        ),
      ).to.equal(
        'select `Model`.* from `Model` where `id` = 1' +
          " or (json_contains(`content`,'[1]'))" +
          " and not json_contains(`content`,'[2]')" +
          " or (not json_contains(`content`,'[3]'))" +
          " or (json_contains('[4]',`content`))" +
          " and not json_contains('[5]',`content`)" +
          " or (not json_contains('[6]',`content`))",
      );
      expect(warnings).to.eql([]);
    });

    it('andWhereJsonNotSupersetOf() should be an alias of whereJsonNotSupersetOf()', () => {
      expect(toSql(query('pg').andWhereJsonNotSupersetOf('content', { a: 1 }))).to.equal(
        toSql(query('pg').whereJsonNotSupersetOf('content', { a: 1 })),
      );
    });

    it('should only pass the json superset and subset methods on to knex on mysql', () => {
      expect(toSql(query('sqlite3').whereJsonSupersetOf('content', { a: 1 }))).to.equal(
        'select `Model`.* from `Model` where ( `content` )::jsonb @> \'{"a":1}\'::jsonb',
      );
      expect(warnings).to.eql([message]);
    });

    it('should not pass other forms of the json where methods on to knex', () => {
      expect(toSql(query('mysql').whereJsonSupersetOf('content:a', { a: 1 }))).to.equal(
        "select `Model`.* from `Model` where ( `content`#>'{a}' )::jsonb @> '{\\\"a\\\":1}'::jsonb",
      );
      expect(toSql(query('mysql').whereJsonSupersetOf('content', 'other'))).to.equal(
        'select `Model`.* from `Model` where ( `content` )::jsonb @> ( `other` )::jsonb',
      );
      expect(toSql(query('mysql').whereJsonSubsetOf('content', ref('other')))).to.equal(
        'select `Model`.* from `Model` where ( `content` )::jsonb <@ ( `other` )::jsonb',
      );
      expect(toSql(query('mysql').whereJsonSupersetOf('content', raw('?', '[1]')))).to.equal(
        "select `Model`.* from `Model` where ( `content` )::jsonb @> ( '[1]' )::jsonb",
      );
      // knex's version doesn't have the same semantics for empty objects and arrays.
      expect(toSql(query('mysql').whereJsonIsObject('content'))).to.equal(
        "select `Model`.* from `Model` where ( `content` )::jsonb @> '{}'::jsonb",
      );
      expect(toSql(query('mysql').orWhereJsonIsArray('content'))).to.equal(
        "select `Model`.* from `Model` where ( `content` )::jsonb @> '[]'::jsonb",
      );
      expect(warnings).to.eql([message]);
    });

    for (const client of ['mysql', 'sqlite3']) {
      it(`should warn once about json field expressions on ${client}`, () => {
        toSql(query(client).orderBy(ref('content:a.b'), 'desc'));
        expect(warnings).to.eql([message]);

        toSql(query(client).select(ref('content:a').castInt().as('a')));
        toSql(query(client).patch({ 'content:a': 1 }));
        toSql(query(client).whereJsonHasAny('content', ['a']));
        toSql(query(client).whereJsonNotObject('content'));
        expect(warnings).to.eql([message]);
      });

      for (const [title, createQuery] of Object.entries({
        'ref() with a field expression': (client) =>
          query(client).orderBy(ref('content:a.b'), 'desc'),
        'a field expression in a patch': (client) => query(client).patch({ 'content:a': 1 }),
        'whereJsonHasAny()': (client) => query(client).whereJsonHasAny('content', ['a']),
        'whereJsonNotArray()': (client) => query(client).whereJsonNotArray('content'),
      })) {
        it(`should warn about ${title} on ${client}`, () => {
          toSql(createQuery(client));
          expect(warnings).to.eql([message]);
        });
      }

      it(`should not warn about plain refs on ${client}`, () => {
        toSql(
          query(client)
            .select(ref('Model.content').as('c'), ref('id').castText())
            .where(ref('content'), 1)
            .orderBy(ref('Model.id')),
        );
        toSql(query(client).patch({ content: ref('other') }));
        expect(warnings).to.eql([]);
      });
    }

    it('should not warn on postgres', () => {
      toSql(query('pg').orderBy(ref('content:a.b'), 'desc'));
      toSql(query('pg').patch({ 'content:a': 1 }));
      toSql(query('pg').whereJsonSupersetOf('content:a', { a: 1 }));
      toSql(query('pg').whereJsonHasAny('content', ['a']));
      toSql(query('pg').whereJsonNotObject('content'));
      expect(warnings).to.eql([]);
    });
  });

  describe('json paths with special characters in keys', () => {
    const toSql = (builder) => builder.toKnexQuery().toString();
    // The native SQL that is sent to Postgres, with `$n` placeholders.
    const toSQL = (builder) => builder.toKnexQuery().toSQL().toNative();

    const keys = [
      // Breaking out of the string literal.
      "x') or 1=1 --",
      "x'}' or 1=1 --",
      // Binding placeholders.
      'a?b',
      '??',
      // Escape characters and double quotes.
      'a\\b',
      'a"b',
      '\\',
      // Everything at once (keys can't contain both kinds of quotes).
      "'?\\{},",
      '"?\\{},',
    ];

    function queries(key) {
      // Use the bracket notation with whichever quote doesn't appear in the key.
      const quote = key.includes("'") ? '"' : "'";
      const expr = `content:a[${quote}${key}${quote}]`;
      return [
        TestModel.query().where(ref(expr), 1),
        TestModel.query().where(ref(expr).castText(), 'x'),
        TestModel.query().select(ref(expr).as('val')),
        TestModel.query().whereJsonSupersetOf(expr, { a: 1 }),
        TestModel.query().whereJsonSubsetOf('content', expr),
        TestModel.query().whereJsonHasAny(expr, ['b']),
        TestModel.query().whereJsonHasAll(expr, ['b']),
        TestModel.query().whereJsonIsObject(expr),
        TestModel.query().whereJsonNotObject(expr),
        TestModel.query().patch({ [expr]: 1 }),
        TestModel.query().patch({ [expr]: ref(expr) }),
      ];
    }

    for (const key of keys) {
      it(`escapes the key ${JSON.stringify(key)} in SQL`, () => {
        // The json path `{a,<key>}` as an escaped Postgres string literal.
        const element = /[{}",\\\s]/.test(key) ? `"${key.replace(/["\\]/g, '\\$&')}"` : key;
        const literal = `'{a,${element.replace(/'/g, "''")}}'`;
        // Patch queries can only be built once, so create the queries twice.
        const strings = queries(key).map(toSql);
        for (const query of queries(key)) {
          const { sql, bindings } = toSQL(query);
          // The key only appears inside the escaped json path literal, and its
          // `?` characters aren't turned into binding placeholders.
          expect(sql).to.contain(literal);
          expect(sql.split(literal).join('')).not.to.contain(key);
          expect(bindings.some((it) => typeof it === 'string' && it.includes(key))).to.be(false);
        }
        // Interpolating the bindings doesn't throw (e.g. "Expected N bindings").
        for (const string of strings) {
          expect(string).to.contain(literal);
        }
      });
    }

    it('escapes keys correctly in the json path literal', () => {
      expect(toSql(TestModel.query().where(ref("content:x') or 1=1 --"), 1))).to.equal(
        `select "Model".* from "Model" where "content"#>'{"x'') or 1=1 --"}' = 1`,
      );
      expect(toSql(TestModel.query().whereJsonSupersetOf('content:a?b', { a: 1 }))).to.equal(
        `select "Model".* from "Model" where ( "content"#>'{a?b}' )::jsonb @> '{"a":1}'::jsonb`,
      );
      expect(toSql(TestModel.query().whereJsonHasAny('content:a?b', ['c?']))).to.equal(
        `select "Model".* from "Model" where "content"#>'{a?b}' ?| array['c?']`,
      );
      expect(toSql(TestModel.query().patch({ "content:x') or 1=1 --": 1 }))).to.equal(
        `update "Model" set "content" = jsonb_set("content", '{"x'') or 1=1 --"}', '1', true)`,
      );
    });

    it('binds string values containing `?` in json methods', () => {
      expect(toSql(TestModel.query().whereJsonHasAny('content:a', ['?', 'b?']))).to.equal(
        `select "Model".* from "Model" where "content"#>'{a}' ?| array['?','b?']`,
      );
      const { sql, bindings } = toSQL(
        TestModel.query().whereJsonHasAll('content', "x') or 1=1 --"),
      );
      expect(sql).to.equal('select "Model".* from "Model" where "content" ?& array[$1]');
      expect(bindings).to.eql(["x') or 1=1 --"]);
    });
  });

  describe('snake case mappers and field expressions', () => {
    const toSql = (builder) => builder.toKnexQuery().toString();

    function createModel(mappers) {
      return class SnakeModel extends Model {
        static get tableName() {
          return 'model';
        }

        static get jsonAttributes() {
          return ['jsonCol'];
        }

        static get columnNameMappers() {
          return mappers;
        }
      };
    }

    function testQueries(Model, knex, { col, patchPath }) {
      expect(toSql(Model.query(knex).where(ref('jsonCol:someKey.otherKey'), 1))).to.equal(
        `select "model".* from "model" where "${col}"#>'{someKey,otherKey}' = 1`,
      );
      expect(toSql(Model.query(knex).where(ref('jsonCol:[0][innerKey]').castText(), 'x'))).to.equal(
        `select "model".* from "model" where CAST("${col}"#>>'{0,innerKey}' AS text) = 'x'`,
      );
      expect(
        toSql(Model.query(knex).whereJsonSupersetOf('jsonCol:someKey', { innerKey: 1 })),
      ).to.equal(
        `select "model".* from "model" where ( "${col}"#>'{someKey}' )::jsonb @> '{"innerKey":1}'::jsonb`,
      );
      expect(toSql(Model.query(knex).whereJsonHasAny('jsonCol:someKey', 'fooBar'))).to.equal(
        `select "model".* from "model" where "${col}"#>'{someKey}' ?| array['fooBar']`,
      );
      expect(toSql(Model.query(knex).whereJsonIsObject('jsonCol:someKey'))).to.equal(
        `select "model".* from "model" where ( "${col}"#>'{someKey}' )::jsonb @> '{}'::jsonb`,
      );
      expect(toSql(Model.query(knex).whereJsonNotObject('model.jsonCol:someKey'))).to.equal(
        `select "model".* from "model" where (not ( "model"."${col}"#>'{someKey}' )::jsonb @> '{}'::jsonb or ("model"."${col}"#>>'{someKey}')::TEXT is NULL)`,
      );
      expect(toSql(Model.query(knex).whereJsonSubsetOf('jsonCol', 'model.jsonCol:a'))).to.equal(
        `select "model".* from "model" where ( "${col}" )::jsonb <@ ( "model"."${col}"#>'{a}' )::jsonb`,
      );
      expect(toSql(Model.query(knex).whereJsonHasAll('jsonCol', ['a', 'b']))).to.equal(
        `select "model".* from "model" where "${col}" ?& array['a','b']`,
      );
      expect(toSql(Model.query(knex).patch({ 'jsonCol:[0][innerKey]': 1, otherCol: 2 }))).to.equal(
        `update "model" set "json_col" = jsonb_set("json_col", '${patchPath}', '1', true), "other_col" = 2`,
      );
      expect(toSql(Model.query(knex).patch({ jsonCol: { innerKey: 1 } }))).to.equal(
        `update "model" set "json_col" = '{"innerKey":1}'`,
      );
    }

    it('snakeCaseMappers() maps json keys of field expressions in patch (default)', () => {
      testQueries(createModel(objection.snakeCaseMappers()), mockKnex, {
        col: 'jsonCol',
        patchPath: '{0,inner_key}',
      });
    });

    it('snakeCaseMappers({ preserveJsonKeys: true }) only maps the column part', () => {
      testQueries(createModel(objection.snakeCaseMappers({ preserveJsonKeys: true })), mockKnex, {
        col: 'jsonCol',
        patchPath: '{0,innerKey}',
      });
    });

    it('knexSnakeCaseMappers() never maps json keys of field expressions', () => {
      const knex = Knex({ client: 'pg', ...objection.knexSnakeCaseMappers() });

      testQueries(createModel(null), knex, {
        col: 'json_col',
        patchPath: '{0,innerKey}',
      });
    });
  });

  it('first should not add limit(1) by default', () => {
    return TestModel.query()
      .first()
      .then((model) => {
        expect(executedQueries[0]).to.equal('select "Model".* from "Model"');
      });
  });

  it('first should add limit(1) if Model.useLimitInFirst = true', () => {
    TestModel.useLimitInFirst = true;

    return TestModel.query()
      .first()
      .then((model) => {
        expect(executedQueries[0]).to.equal('select "Model".* from "Model" limit 1');
      });
  });

  it('tableNameFor should return the table name', () => {
    const query = TestModel.query();
    expect(query.tableNameFor(TestModel)).to.equal('Model');
  });

  it('tableNameFor should return the table name given in from', () => {
    const query = TestModel.query().from('Lol');
    expect(query.tableNameFor(TestModel)).to.equal('Lol');
  });

  it('tableRefFor should return the table name by default', () => {
    const query = TestModel.query();
    expect(query.tableRefFor(TestModel)).to.equal('Model');
  });

  it('tableRefFor should return the alias', () => {
    const query = TestModel.query().alias('Lyl');
    expect(query.tableRefFor(TestModel)).to.equal('Lyl');
  });

  it('should use Model.QueryBuilder in builder methods', () => {
    class CustomQueryBuilder extends TestModel.QueryBuilder {}

    TestModel.QueryBuilder = CustomQueryBuilder;
    const checks = [];

    return TestModel.query()
      .select('*', (builder) => {
        checks.push(builder instanceof CustomQueryBuilder);
      })
      .where((builder) => {
        checks.push(builder instanceof CustomQueryBuilder);

        builder.where((builder) => {
          checks.push(builder instanceof CustomQueryBuilder);
        });
      })
      .modify((builder) => {
        checks.push(builder instanceof CustomQueryBuilder);
      })
      .then(() => {
        expect(checks).to.have.length(4);
        expect(checks.every((it) => it)).to.equal(true);
      });
  });

  it('hasSelectionAs', () => {
    expect(TestModel.query().hasSelectionAs('foo', 'foo')).to.equal(true);
    expect(TestModel.query().hasSelectionAs('foo', 'bar')).to.equal(false);

    expect(TestModel.query().select('foo as bar').hasSelectionAs('foo', 'bar')).to.equal(true);

    expect(TestModel.query().select('foo').hasSelectionAs('foo', 'bar')).to.equal(false);

    expect(TestModel.query().select('*').hasSelectionAs('foo', 'foo')).to.equal(true);

    expect(TestModel.query().select('*').hasSelectionAs('foo', 'bar')).to.equal(false);

    expect(TestModel.query().select('foo.*').hasSelectionAs('foo.anything', 'anything')).to.equal(
      true,
    );

    expect(
      TestModel.query().select('foo.*').hasSelectionAs('foo.anything', 'somethingElse'),
    ).to.equal(false);

    expect(TestModel.query().select('foo.*').hasSelectionAs('bar.anything', 'anything')).to.equal(
      false,
    );
  });

  it('hasSelection', () => {
    expect(TestModel.query().hasSelection('foo')).to.equal(true);
    expect(TestModel.query().hasSelection(ref('foo'))).to.equal(true);
    expect(TestModel.query().hasSelection('Model.foo')).to.equal(true);
    expect(TestModel.query().hasSelection(ref('Model.foo'))).to.equal(true);
    expect(TestModel.query().hasSelection('DifferentTable.foo')).to.equal(false);
    expect(TestModel.query().hasSelection(ref('DifferentTable.foo'))).to.equal(false);

    expect(TestModel.query().select('*').hasSelection('DifferentTable.anything')).to.equal(true);

    expect(TestModel.query().select('foo.*').hasSelection('bar.anything')).to.equal(false);

    expect(TestModel.query().select('foo.*').hasSelection('foo.anything')).to.equal(true);

    expect(
      TestModel.query().select(ref('*')).hasSelection(ref('DifferentTable.anything')),
    ).to.equal(true);

    expect(TestModel.query().select('foo').hasSelection('foo')).to.equal(true);

    expect(TestModel.query().select(ref('foo')).hasSelection(ref('foo'))).to.equal(true);

    expect(TestModel.query().select('foo').hasSelection('Model.foo')).to.equal(true);

    expect(TestModel.query().select(ref('foo')).hasSelection(ref('Model.foo'))).to.equal(true);

    expect(TestModel.query().select('foo').hasSelection('DifferentTable.foo')).to.equal(false);

    expect(TestModel.query().select(ref('foo')).hasSelection(ref('DifferentTable.foo'))).to.equal(
      false,
    );

    expect(TestModel.query().select('foo').hasSelection('bar')).to.equal(false);

    expect(TestModel.query().select(ref('foo')).hasSelection(ref('bar'))).to.equal(false);

    expect(TestModel.query().select('Model.foo').hasSelection('foo')).to.equal(true);

    expect(TestModel.query().select(ref('Model.foo')).hasSelection(ref('foo'))).to.equal(true);

    expect(TestModel.query().select('Model.foo').hasSelection('Model.foo')).to.equal(true);

    expect(TestModel.query().select(ref('Model.foo')).hasSelection(ref('Model.foo'))).to.equal(
      true,
    );

    expect(TestModel.query().select('Model.foo').hasSelection('NotTestModel.foo')).to.equal(false);

    expect(
      TestModel.query().select(ref('Model.foo')).hasSelection(ref('NotTestModel.foo')),
    ).to.equal(false);

    expect(TestModel.query().select('Model.foo').hasSelection('bar')).to.equal(false);

    expect(TestModel.query().select(ref('Model.foo')).hasSelection(ref('bar'))).to.equal(false);

    expect(TestModel.query().alias('t').select('foo').hasSelection('t.foo')).to.equal(true);

    expect(TestModel.query().alias('t').select('t.foo').hasSelection('foo')).to.equal(true);

    expect(TestModel.query().alias('t').select('t.foo').hasSelection('t.foo')).to.equal(true);

    expect(TestModel.query().alias('t').select('foo').hasSelection('Model.foo')).to.equal(false);
  });

  it('aggregate selections (#2219)', () => {
    const aliases = (query) =>
      query.findOperation(/count|sum/).aggregateSelections.map((selection) => selection.name);

    expect(aliases(TestModel.query().count())).to.eql([]);
    expect(aliases(TestModel.query().count('id'))).to.eql([]);
    expect(aliases(TestModel.query().count('* as n'))).to.eql(['n']);
    expect(aliases(TestModel.query().count('Model.id AS n'))).to.eql(['n']);
    expect(aliases(TestModel.query().count('id', { as: 'n' }))).to.eql(['n']);
    expect(aliases(TestModel.query().count({ n: 'id', m: ['a', 'b'] }))).to.eql(['n', 'm']);
    expect(aliases(TestModel.query().sum('x as total'))).to.eql(['total']);
    expect(TestModel.query().select('id').findOperation('select').aggregateSelections).to.equal(
      null,
    );

    // The columns passed to aggregates still count as selected outside of
    // `withGraphJoined()`.
    expect(TestModel.query().count('id').hasSelection('id')).to.equal(true);
    expect(TestModel.query().count('* as n').hasSelection('foo')).to.equal(true);
  });

  it('parseRelationExpression', () => {
    expect(QueryBuilder.parseRelationExpression('[foo, bar.baz]')).to.eql({
      $name: null,
      $relation: null,
      $modify: [],
      $recursive: false,
      $allRecursive: false,
      $childNames: ['foo', 'bar'],
      foo: {
        $name: 'foo',
        $relation: 'foo',
        $modify: [],
        $recursive: false,
        $allRecursive: false,
        $childNames: [],
      },
      bar: {
        $name: 'bar',
        $relation: 'bar',
        $modify: [],
        $recursive: false,
        $allRecursive: false,
        $childNames: ['baz'],
        baz: {
          $name: 'baz',
          $relation: 'baz',
          $modify: [],
          $recursive: false,
          $allRecursive: false,
          $childNames: [],
        },
      },
    });
  });

  describe('eager, allowGraph, and allowGraph', () => {
    beforeEach(() => {
      const rel = {
        relation: TestModel.BelongsToOneRelation,
        modelClass: TestModel,
        join: {
          from: 'Model.foo',
          to: 'Model.id',
        },
      };

      TestModel.relationMappings = {
        a: rel,
        b: rel,
        c: rel,
        d: rel,
        e: rel,
      };
    });

    it("allowGraph('a').withGraphFetched('a(f1)') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('a')
        .withGraphFetched('a(f1)', { f1: () => {} })
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch((err) => {
          done(new Error('should not get here'));
        });
    });

    it("withGraphFetched('a(f1)').allowGraph('a') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .withGraphFetched('a(f1)', { f1: () => {} })
        .allowGraph('a')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch((err) => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a, b.c.[d, e]]').withGraphFetched('a') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[d, e]]')
        .withGraphFetched('a')
        .then(() => {
          done();
        });
    });

    it("allowGraph('[a, b.c.[d, e]]').withGraphFetched('b.c') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[d, e]]')
        .withGraphFetched('b.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a, b.c.[d, e]]').withGraphFetched('b.c.e') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[d, e]]')
        .withGraphFetched('b.c.e')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('a').withGraphFetched('a(f1)') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('a')
        .withGraphFetched('a(f1)', { f1: () => {} })
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch((err) => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a, b.c.[a, e]]').allowGraph('b.c.[b, d]').withGraphFetched('a') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[a, e]]')
        .allowGraph('b.c.[b, d]')
        .withGraphFetched('a')
        .then(() => {
          done();
        });
    });

    it("allowGraph('[a.[a, b], b.c.[a, e]]').allowGraph('[a.[c, d], b.c.[b, d]]').withGraphFetched('a.b') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a.[a, b], b.c.[a, e]]')
        .allowGraph('[a.[c, d], b.c.[b, d]]')
        .withGraphFetched('a.b')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a.[a, b], b.[a, c]]').allowGraph('[a.[c, d], b.c.[b, d]]').withGraphFetched('a.c') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a.[a, b], b.[a, c]]')
        .allowGraph('[a.[c, d], b.c.[b, d]]')
        .withGraphFetched('a.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a.[a, b], b.[a, c]]').allowGraph('[a.[c, d], b.c.[b, d]]').withGraphFetched('b.a') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a.[a, b], b.[a, c]]')
        .allowGraph('[a.[c, d], b.c.[b, d]]')
        .withGraphFetched('b.a')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a.[a, b], b.[a, c]]').allowGraph('[a.[c, d], b.c.[b, d]]').withGraphFetched('b.c') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a.[a, b], b.[a, c]]')
        .allowGraph('[a.[c, d], b.c.[b, d]]')
        .withGraphFetched('b.c')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a.[a, b], b.[a, c]]').allowGraph('[a.[c, d], b.c.[b, d]]').withGraphFetched('b.c.b') should be ok", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a.[a, b], b.[a, c]]')
        .allowGraph('[a.[c, d], b.c.[b, d]]')
        .withGraphFetched('b.c.b')
        .then(() => {
          expect(executedQueries).to.have.length(1);
          done();
        })
        .catch(() => {
          done(new Error('should not get here'));
        });
    });

    it("allowGraph('[a, b.c.[d, e]]').withGraphFetched('a.b') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[d, e]]')
        .withGraphFetched('a.b')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("allowGraph('[a, b.c.[d, e]]').allowGraph('a.[c, d]').withGraphFetched('a.b') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .allowGraph('[a, b.c.[d, e]]')
        .allowGraph('a.[c, d]')
        .withGraphFetched('a.b')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('a.b').allowGraph('[a, b.c.[d, e]]') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .withGraphFetched('a.b')
        .allowGraph('[a, b.c.[d, e]]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('a.b').allowGraph('[a, b.c.[d, e]]').allowGraph('a.[c, d]') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .withGraphFetched('a.b')
        .allowGraph('[a, b.c.[d, e]]')
        .allowGraph('a.[c, d]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('b.c.d.e').allowGraph('[a, b.c.[d, e]]') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .withGraphFetched('b.c.d.e')
        .allowGraph('[a, b.c.[d, e]]')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it("eager('b.c.d.e').allowGraph('[a, b.c.[d, e]]').allowGraph('b.c.a') should fail", (done) => {
      QueryBuilder.forClass(TestModel)
        .withGraphFetched('b.c.d.e')
        .allowGraph('[a, b.c.[d, e]]')
        .allowGraph('b.c.a')
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          expect(executedQueries).to.have.length(0);
          done();
        });
    });

    it('graphExpressionObject() should return the eager expression as an object', () => {
      const builder = QueryBuilder.forClass(TestModel).withGraphFetched('[a, b.c(foo)]');

      expect(builder.graphExpressionObject()).to.eql({
        $name: null,
        $relation: null,
        $modify: [],
        $recursive: false,
        $allRecursive: false,
        $childNames: ['a', 'b'],
        a: {
          $name: 'a',
          $relation: 'a',
          $modify: [],
          $recursive: false,
          $allRecursive: false,
          $childNames: [],
        },
        b: {
          $name: 'b',
          $relation: 'b',
          $modify: [],
          $recursive: false,
          $allRecursive: false,
          $childNames: ['c'],
          c: {
            $name: 'c',
            $relation: 'c',
            $modify: ['foo'],
            $recursive: false,
            $allRecursive: false,
            $childNames: [],
          },
        },
      });
    });

    it('graphExpressionObject() should be modifiable and passable back to withGraphFetched()', () => {
      const graph = QueryBuilder.forClass(TestModel)
        .withGraphFetched('[a, b.c]')
        .graphExpressionObject();

      graph.a = {
        ...graph.a,
        d: true,
      };
      graph.e = { f: true };
      delete graph.b;

      const expr = QueryBuilder.forClass(TestModel).withGraphFetched(graph).graphExpressionObject();

      expect(objection.RelationExpression.create(expr).toString()).to.equal('[a.d, e.f]');
      expect(expr.$childNames).to.eql(['a', 'e']);
      expect(expr.a.$childNames).to.eql(['d']);
      expect(expr.b).to.equal(undefined);
    });

    it("modifiers() should return the eager expression's modifiers as an object", () => {
      const foo = (builder) => builder.where('foo');
      const builder = QueryBuilder.forClass(TestModel).withGraphFetched('[a, b.c(foo)]').modifiers({
        foo,
      });

      expect(builder.modifiers()).to.eql({
        foo,
      });
    });

    it('should use correct query builders', (done) => {
      class M1QueryBuilder extends QueryBuilder {}
      class M2QueryBuilder extends QueryBuilder {}
      class M3QueryBuilder extends QueryBuilder {}

      class M1 extends Model {
        static get tableName() {
          return 'M1';
        }

        static get relationMappings() {
          return {
            m2: {
              relation: Model.HasManyRelation,
              modelClass: M2,
              join: {
                from: 'M1.id',
                to: 'M2.m1Id',
              },
            },
          };
        }

        static get QueryBuilder() {
          return M1QueryBuilder;
        }
      }

      class M2 extends Model {
        static get tableName() {
          return 'M2';
        }

        static get relationMappings() {
          return {
            m3: {
              relation: Model.BelongsToOneRelation,
              modelClass: M3,
              join: {
                from: 'M2.m3Id',
                to: 'M3.id',
              },
            },
          };
        }

        static get QueryBuilder() {
          return M2QueryBuilder;
        }
      }

      class M3 extends Model {
        static get tableName() {
          return 'M3';
        }

        static get QueryBuilder() {
          return M3QueryBuilder;
        }
      }

      M1.knex(mockKnex);
      M2.knex(mockKnex);
      M3.knex(mockKnex);

      mockKnexQueryResults = [
        [{ id: 1, m1Id: 2, m3Id: 3 }],
        [{ id: 1, m1Id: 2, m3Id: 3 }],
        [{ id: 1, m1Id: 2, m3Id: 3 }],
      ];

      let filter1Check = false;
      let filter2Check = false;

      QueryBuilder.forClass(M1)
        .withGraphFetched('m2.m3')
        .modifyGraph('m2', (builder) => {
          filter1Check = builder instanceof M2QueryBuilder;
        })
        .modifyGraph('m2.m3', (builder) => {
          filter2Check = builder instanceof M3QueryBuilder;
        })
        .then(() => {
          expect(executedQueries).to.eql([
            'select "M1".* from "M1"',
            'select "M2".* from "M2" where "M2"."m1Id" in (1)',
            'select "M3".* from "M3" where "M3"."id" in (3)',
          ]);

          expect(filter1Check).to.equal(true);
          expect(filter2Check).to.equal(true);

          done();
        })
        .catch(done);
    });

    it('$afterFind should be called after relations have been fetched', (done) => {
      class M1 extends Model {
        static get tableName() {
          return 'M1';
        }

        $afterFind() {
          this.ids = (this.someRel || []).map((it) => it.id);
        }

        static get relationMappings() {
          return {
            someRel: {
              relation: Model.HasManyRelation,
              modelClass: M1,
              join: {
                from: 'M1.id',
                to: 'M1.m1Id',
              },
            },
          };
        }
      }

      M1.knex(mockKnex);

      mockKnexQueryResults = [
        [{ id: 1 }, { id: 2 }],
        [
          { id: 3, m1Id: 1 },
          { id: 4, m1Id: 1 },
          { id: 5, m1Id: 2 },
          { id: 6, m1Id: 2 },
        ],
        [
          { id: 7, m1Id: 3 },
          { id: 8, m1Id: 3 },
          { id: 9, m1Id: 4 },
          { id: 10, m1Id: 4 },
          { id: 11, m1Id: 5 },
          { id: 12, m1Id: 5 },
          { id: 13, m1Id: 6 },
          { id: 14, m1Id: 6 },
        ],
      ];

      QueryBuilder.forClass(M1)
        .withGraphFetched('someRel.someRel')
        .then((x) => {
          expect(executedQueries).to.eql([
            'select "M1".* from "M1"',
            'select "M1".* from "M1" where "M1"."m1Id" in (1, 2)',
            'select "M1".* from "M1" where "M1"."m1Id" in (3, 4, 5, 6)',
          ]);

          expect(x).to.eql([
            {
              id: 1,
              ids: [3, 4],
              someRel: [
                {
                  id: 3,
                  m1Id: 1,
                  ids: [7, 8],
                  someRel: [
                    { id: 7, m1Id: 3, ids: [] },
                    { id: 8, m1Id: 3, ids: [] },
                  ],
                },
                {
                  id: 4,
                  m1Id: 1,
                  ids: [9, 10],
                  someRel: [
                    { id: 9, m1Id: 4, ids: [] },
                    { id: 10, m1Id: 4, ids: [] },
                  ],
                },
              ],
            },
            {
              id: 2,
              ids: [5, 6],
              someRel: [
                {
                  id: 5,
                  m1Id: 2,
                  ids: [11, 12],
                  someRel: [
                    { id: 11, m1Id: 5, ids: [] },
                    { id: 12, m1Id: 5, ids: [] },
                  ],
                },
                {
                  id: 6,
                  m1Id: 2,
                  ids: [13, 14],
                  someRel: [
                    { id: 13, m1Id: 6, ids: [] },
                    { id: 14, m1Id: 6, ids: [] },
                  ],
                },
              ],
            },
          ]);

          done();
        })
        .catch(done);
    });
  });

  describe('mixing withGraphJoined and withGraphFetched', () => {
    const {
      JoinEagerOperation,
    } = require('../../../lib/queryBuilder/operations/eager/JoinEagerOperation');
    const {
      WhereInEagerOperation,
    } = require('../../../lib/queryBuilder/operations/eager/WhereInEagerOperation');

    let Person;
    let Animal;
    let Movie;

    const joinQuery =
      'select "Person"."id" as "id", "Person"."name" as "name", "Person"."parentId" as "parentId", ' +
      '"pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" ' +
      'from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"';

    // `resultSize()` counts the distinct root models of the joined query.
    const countJoinQuery =
      'select distinct "Person"."id" ' +
      'from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"';

    const flatRows = () => [
      { id: 1, name: 'P1', parentId: null, 'pets:id': 10, 'pets:name': 'A10', 'pets:ownerId': 1 },
      { id: 1, name: 'P1', parentId: null, 'pets:id': 11, 'pets:name': 'A11', 'pets:ownerId': 1 },
      { id: 2, name: 'P2', parentId: 1, 'pets:id': null, 'pets:name': null, 'pets:ownerId': null },
    ];

    const movieRows = () => [
      { id: 100, name: 'M100', personId: 1 },
      { id: 101, name: 'M101', personId: 2 },
    ];

    const expectedGraph = [
      {
        id: 1,
        name: 'P1',
        parentId: null,
        pets: [
          { id: 10, name: 'A10', ownerId: 1 },
          { id: 11, name: 'A11', ownerId: 1 },
        ],
        movies: [{ id: 100, name: 'M100', personId: 1 }],
      },
      {
        id: 2,
        name: 'P2',
        parentId: 1,
        pets: [],
        movies: [{ id: 101, name: 'M101', personId: 2 }],
      },
    ];

    const toJson = (models) => models.map((it) => it.toJSON());

    const countOps = (builder, OperationClass) => {
      let count = 0;
      builder.forEachOperation(OperationClass, () => ++count);
      return count;
    };

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'parentId'] };
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: { from: 'Person.id', to: 'Animal.ownerId' },
            },
            movies: {
              relation: Model.HasManyRelation,
              modelClass: Movie,
              join: { from: 'Person.id', to: 'Movie.personId' },
            },
            parent: {
              relation: Model.BelongsToOneRelation,
              modelClass: Person,
              join: { from: 'Person.parentId', to: 'Person.id' },
            },
          };
        }
      };

      Animal = class Animal extends Model {
        static get tableName() {
          return 'Animal';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'ownerId'] };
        }
      };

      Movie = class Movie extends Model {
        static get tableName() {
          return 'Movie';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'personId'] };
        }
      };

      Person.knex(mockKnex);
    });

    it('should join the joined relations and fetch the fetched relations', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      return Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .where('pets.name', 'like', 'A%')
        .then((models) => {
          expect(executedQueries).to.eql([
            `${joinQuery} where "pets"."name" like 'A%'`,
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
          ]);

          expect(models[0]).to.be.a(Person);
          expect(models[0].pets[0]).to.be.a(Animal);
          expect(models[0].movies[0]).to.be.a(Movie);
          expect(toJson(models)).to.eql(expectedGraph);
        });
    });

    it('should not depend on the order of withGraphJoined and withGraphFetched', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      return Person.query()
        .withGraphFetched('movies')
        .withGraphJoined('pets')
        .then((models) => {
          expect(executedQueries).to.eql([
            joinQuery,
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
          ]);

          expect(toJson(models)).to.eql(expectedGraph);
        });
    });

    it('should keep the joined operation before the fetched one', () => {
      const builder = Person.query().withGraphFetched('movies').withGraphJoined('pets');
      const eagerOps = builder._operations.filter(
        (op) => op instanceof JoinEagerOperation || op instanceof WhereInEagerOperation,
      );

      expect(eagerOps).to.have.length(2);
      expect(eagerOps[0]).to.be.a(JoinEagerOperation);
      expect(eagerOps[1]).to.be.a(WhereInEagerOperation);
    });

    it('should work when withGraphJoined is called in a runBefore hook', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      return Person.query()
        .withGraphFetched('movies')
        .runBefore((_, builder) => {
          builder.withGraphJoined('pets');
        })
        .then((models) => {
          expect(executedQueries).to.eql([
            joinQuery,
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
          ]);

          expect(toJson(models)).to.eql(expectedGraph);
        });
    });

    it('should keep the joined operation first when it is added in a runBefore context hook', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      const builder = Person.query().select(raw('1 as one')).withGraphFetched('movies');

      // Unlike `runBefore()`, a context hook adds the operation to the root of
      // the builder. If the fetched operation built first, its selection of
      // `id` would stop the join from selecting all columns for the raw select.
      builder.internalContext().runBefore.push((_, builder) => {
        // The internal context is shared with the fetch queries.
        if (builder.modelClass() === Person) {
          builder.withGraphJoined('pets');
        }
      });

      return builder.then(() => {
        expect(executedQueries[0]).to.equal(joinQuery.replace('select ', 'select 1 as one, '));
      });
    });

    it('should fetch the relations of all models produced by the join', () => {
      mockKnexQueryResults = [flatRows(), [{ id: 1, name: 'P1', parentId: null }], movieRows()];

      return Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('[parent, movies]')
        .then((models) => {
          expect(executedQueries).to.eql([
            joinQuery,
            'select "Person".* from "Person" where "Person"."id" in (1)',
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
          ]);

          expect(models[0].parent).to.equal(null);
          expect(models[1].parent.toJSON()).to.eql({ id: 1, name: 'P1', parentId: null });
          expect(models[1].movies).to.have.length(1);
        });
    });

    it('should select and omit columns needed by the fetched relations when the user selects columns', () => {
      mockKnexQueryResults = [
        [
          { name: 'P1', id: 1, 'pets:id': 10, 'pets:name': 'A10', 'pets:ownerId': 1 },
          { name: 'P2', id: 2, 'pets:id': null, 'pets:name': null, 'pets:ownerId': null },
        ],
        movieRows(),
      ];

      return Person.query()
        .select('Person.name')
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .then((models) => {
          expect(executedQueries).to.eql([
            'select "Person"."name", "Person"."id" as "id", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"',
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
          ]);

          // `id` is selected internally by the join and needed by the fetch,
          // so it must survive the join but be omitted in the end.
          expect(toJson(models)).to.eql([
            {
              name: 'P1',
              pets: [{ id: 10, name: 'A10', ownerId: 1 }],
              movies: [{ id: 100, name: 'M100', personId: 1 }],
            },
            {
              name: 'P2',
              pets: [],
              movies: [{ id: 101, name: 'M101', personId: 2 }],
            },
          ]);
        });
    });

    it('should keep the id when the user selects it explicitly', () => {
      mockKnexQueryResults = [
        [{ id: 1, name: 'P1', 'pets:id': null, 'pets:name': null, 'pets:ownerId': null }],
        [],
      ];

      return Person.query()
        .select('Person.id', 'Person.name')
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .then((models) => {
          expect(executedQueries[1]).to.equal(
            'select "Movie".* from "Movie" where "Movie"."personId" in (1)',
          );
          expect(toJson(models)).to.eql([{ id: 1, name: 'P1', pets: [], movies: [] }]);
        });
    });

    ['withGraphJoined', 'withGraphFetched'].forEach((first) => {
      const second = first === 'withGraphJoined' ? 'withGraphFetched' : 'withGraphJoined';

      it(`should throw if the same relation is passed to ${first} and ${second}`, () => {
        const builder = Person.query()[first]('[pets, movies]');

        expect(() => builder[second]('pets')).to.throwException((err) => {
          expect(err.message).to.equal(
            'relation `pets` cannot be loaded with both withGraphJoined and withGraphFetched',
          );
        });
      });

      it(`should throw if a sub relation of a ${first} relation is passed to ${second}`, () => {
        const builder = Person.query()[first]('pets');

        expect(() => builder[second]('pets.owner')).to.throwException((err) => {
          expect(err.message).to.equal(
            'relation `pets` cannot be loaded with both withGraphJoined and withGraphFetched',
          );
        });
      });

      it(`should throw if \`*\` is used when mixing ${first} and ${second}`, () => {
        const builder = Person.query()[first]('*');

        expect(() => builder[second]('pets')).to.throwException(/relation expression `\*`/);
      });
    });

    it('should allow the same relation under different aliases', () => {
      expect(() =>
        Person.query()
          .withGraphJoined('pets as joinedPets')
          .withGraphFetched('pets as fetchedPets'),
      ).to.not.throwException();
    });

    it('should merge multiple calls of the same method into one operation', () => {
      mockKnexQueryResults = [[], []];

      const builder = Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .withGraphJoined('parent')
        .withGraphFetched('movies.foo', { maxBatchSize: 1 })
        .withGraphFetched('movies', { maxBatchSize: 5 });

      expect(countOps(builder, JoinEagerOperation)).to.equal(1);
      expect(countOps(builder, WhereInEagerOperation)).to.equal(1);
      expect(builder.findOperation(JoinEagerOperation).expression.toString()).to.equal(
        '[pets, parent]',
      );
      expect(builder.findOperation(WhereInEagerOperation).expression.toString()).to.equal(
        'movies.foo',
      );
      expect(builder.findOperation(WhereInEagerOperation).graphOptions.maxBatchSize).to.equal(5);
      expect(builder.findOperation(JoinEagerOperation).graphOptions.maxBatchSize).to.equal(
        undefined,
      );
    });

    it('graphExpressionObject() should merge both expressions', () => {
      const builder = Person.query().withGraphJoined('pets').withGraphFetched('movies');

      expect(builder.graphExpressionObject()).to.eql(
        objection.RelationExpression.create('[pets, movies]').toPojo(),
      );
    });

    it('hasWithGraph() should consider both operations', () => {
      expect(Person.query().withGraphJoined('pets').hasWithGraph()).to.equal(true);
      expect(Person.query().withGraphFetched('pets').hasWithGraph()).to.equal(true);
      expect(
        Person.query()
          .modifyGraph('pets', () => {})
          .hasWithGraph(),
      ).to.equal(false);
      expect(
        Person.query()
          .modifyGraph('pets', () => {})
          .withGraphJoined('pets')
          .hasWithGraph(),
      ).to.equal(true);
    });

    ['before', 'after'].forEach((when) => {
      it(`modifyGraph() called ${when} the graph methods should apply to both operations`, () => {
        mockKnexQueryResults = [flatRows(), movieRows()];

        const modifyGraph = (builder) =>
          builder
            .modifyGraph('pets', (qb) => qb.where('name', 'A10'))
            .modifyGraph('movies', (qb) => qb.where('name', 'M100'));

        const withGraph = (builder) => builder.withGraphFetched('movies').withGraphJoined('pets');

        let builder = Person.query();

        if (when === 'before') {
          builder = withGraph(modifyGraph(builder));
        } else {
          builder = modifyGraph(withGraph(builder));
        }

        return builder.then((models) => {
          expect(executedQueries).to.eql([
            'select "Person"."id" as "id", "Person"."name" as "name", "Person"."parentId" as "parentId", ' +
              '"pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" ' +
              'from "Person" left join (select "Animal".* from "Animal" where "name" = \'A10\') as "pets" on "pets"."ownerId" = "Person"."id"',
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2) and "name" = \'M100\'',
          ]);

          expect(models).to.have.length(2);
        });
      });
    });

    it('modifyGraph() between the graph methods should apply to both operations', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      return Person.query()
        .withGraphJoined('pets')
        .modifyGraph('pets', (qb) => qb.where('name', 'A10'))
        .modifyGraph('movies', (qb) => qb.where('name', 'M100'))
        .withGraphFetched('movies')
        .then(() => {
          expect(executedQueries[0]).to.contain(
            'left join (select "Animal".* from "Animal" where "name" = \'A10\') as "pets"',
          );
          expect(executedQueries[1]).to.equal(
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2) and "name" = \'M100\'',
          );
        });
    });

    it('graphModifiersAtPath() should return the modifiers once', () => {
      const builder = Person.query()
        .modifyGraph('pets', () => {})
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .modifyGraph('movies', () => {});

      expect(builder.graphModifiersAtPath().map((it) => it.path)).to.eql(['pets', 'movies']);
    });

    it('clone() should not share the graph modifiers', () => {
      const builder = Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .modifyGraph('pets', () => {});

      builder.clone().modifyGraph('movies', () => {});

      expect(builder.graphModifiersAtPath().map((it) => it.path)).to.eql(['pets']);
    });

    it('clearWithGraph() should drop the graph modifiers', () => {
      const builder = Person.query()
        .modifyGraph('pets', () => {})
        .withGraphJoined('pets')
        .clearWithGraph()
        .withGraphFetched('movies');

      expect(builder.graphModifiersAtPath()).to.eql([]);
    });

    it('clearWithGraph() should clear both operations', () => {
      mockKnexQueryResults = [[{ id: 1 }]];

      const builder = Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .clearWithGraph();

      expect(builder.findOperation(JoinEagerOperation)).to.equal(null);
      expect(builder.findOperation(WhereInEagerOperation)).to.equal(null);
      expect(builder.hasWithGraph()).to.equal(false);
      expect(builder.graphExpressionObject()).to.equal(null);

      return builder.then(() => {
        expect(executedQueries).to.eql(['select "Person".* from "Person"']);
      });
    });

    it('clearWithGraphFetched() should only clear the fetched operation', () => {
      mockKnexQueryResults = [flatRows()];

      const builder = Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .clearWithGraphFetched();

      expect(builder.findOperation(JoinEagerOperation)).to.not.equal(null);
      expect(builder.findOperation(WhereInEagerOperation)).to.equal(null);
      expect(builder.graphExpressionObject()).to.eql(
        objection.RelationExpression.create('pets').toPojo(),
      );

      return builder.then((models) => {
        expect(executedQueries).to.eql([joinQuery]);
        expect(models[0].pets).to.have.length(2);
        expect(models[0].movies).to.equal(undefined);
      });
    });

    it('clone() should keep both operations', () => {
      mockKnexQueryResults = [flatRows(), movieRows()];

      const builder = Person.query().withGraphJoined('pets').withGraphFetched('movies');
      const clone = builder.clone();

      expect(countOps(clone, JoinEagerOperation)).to.equal(1);
      expect(countOps(clone, WhereInEagerOperation)).to.equal(1);
      expect(clone.graphExpressionObject()).to.eql(builder.graphExpressionObject());

      // Modifying the clone should not affect the original.
      clone.withGraphFetched('parent');
      expect(builder.findOperation(WhereInEagerOperation).expression.toString()).to.equal('movies');

      return builder.then((models) => {
        expect(toJson(models)).to.eql(expectedGraph);
      });
    });

    it('allowGraph() should check the union of both expressions', () => {
      return Promise.all([
        Person.query()
          .allowGraph('[pets, movies]')
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .then(() => 'ok'),

        Person.query()
          .allowGraph('pets')
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .then(() => 'ok')
          .catch((err) => err),

        Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .allowGraph('movies')
          .then(() => 'ok')
          .catch((err) => err),
      ]).then(([ok, err1, err2]) => {
        expect(ok).to.equal('ok');
        expect(err1).to.be.a(objection.ValidationError);
        expect(err1.type).to.equal('UnallowedRelation');
        expect(err2).to.be.a(objection.ValidationError);
        expect(err2.type).to.equal('UnallowedRelation');
      });
    });

    it('page() should count with the joins and fetch the fetched relations', () => {
      mockKnexQueryResults = [flatRows(), movieRows(), [{ count: '2' }]];

      return Person.query()
        .withGraphFetched('movies')
        .withGraphJoined('pets')
        .where('pets.name', 'A10')
        .page(0, 10)
        .then((res) => {
          expect(executedQueries).to.eql([
            `${joinQuery} where "pets"."name" = 'A10' limit 10`,
            'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
            `select count(*) as "count" from (${countJoinQuery} where "pets"."name" = 'A10') as "temp"`,
          ]);

          expect(res.total).to.equal(2);
          expect(toJson(res.results)).to.eql(expectedGraph);
        });
    });

    it('resultSize() should not run the fetch queries', () => {
      mockKnexQueryResults = [[{ count: '2' }]];

      return Person.query()
        .withGraphJoined('pets')
        .withGraphFetched('movies')
        .resultSize()
        .then((count) => {
          expect(executedQueries).to.eql([
            `select count(*) as "count" from (${countJoinQuery}) as "temp"`,
          ]);
          expect(count).to.equal(2);
        });
    });

    describe('withGraph()', () => {
      // Returns the top-level relation names of the joined and fetched
      // operations of `builder`.
      const relationsOf = (builder) => {
        const names = (OperationClass) => {
          const op = builder.findOperation(OperationClass);
          return op ? op.expression.node.$childNames : [];
        };

        return { join: names(JoinEagerOperation), fetch: names(WhereInEagerOperation) };
      };

      it('should fetch relations if no algorithm was used before', () => {
        expect(relationsOf(Person.query().withGraph('[pets, movies]'))).to.eql({
          join: [],
          fetch: ['pets', 'movies'],
        });
      });

      it('should use the algorithm given in the options', () => {
        const builder = Person.query()
          .withGraph('pets', { algorithm: 'join' })
          .withGraph('movies', { algorithm: 'fetch' });

        expect(relationsOf(builder)).to.eql({ join: ['pets'], fetch: ['movies'] });
      });

      it('should throw for unknown algorithms', () => {
        expect(() => {
          Person.query().withGraph('pets', { algorithm: 'naive' });
        }).to.throwException((err) => {
          expect(err.message).to.equal(
            'unknown graph algorithm "naive", expected "fetch" or "join"',
          );
        });
      });

      it('should use the most recently used algorithm for new relations', () => {
        expect(relationsOf(Person.query().withGraphJoined('pets').withGraph('movies'))).to.eql({
          join: ['pets', 'movies'],
          fetch: [],
        });

        const builder = Person.query()
          .withGraphFetched('movies')
          .withGraphJoined('pets')
          .withGraph('parent');

        expect(relationsOf(builder)).to.eql({ join: ['pets', 'parent'], fetch: ['movies'] });
      });

      it('should merge existing relations into their operations without throwing', () => {
        const builder = Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .withGraph('[pets, movies, parent]');

        expect(relationsOf(builder)).to.eql({ join: ['pets'], fetch: ['movies', 'parent'] });
      });

      it('should not change the most recently used algorithm when merging', () => {
        const builder = Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .withGraph('pets')
          .withGraph('parent');

        expect(relationsOf(builder)).to.eql({ join: ['pets'], fetch: ['movies', 'parent'] });
      });

      it('should add nested relations to the operation of their top-level relation', () => {
        const builder = Person.query()
          .withGraphJoined('parent')
          .withGraphFetched('movies')
          .withGraph('[parent.pets, movies]');

        expect(relationsOf(builder)).to.eql({ join: ['parent'], fetch: ['movies'] });
        expect(builder.findOperation(JoinEagerOperation).expression.toString()).to.equal(
          'parent.pets',
        );
      });

      it('should not mistake inherited object properties for loaded relations', () => {
        const builder = Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .withGraph('constructor');

        expect(relationsOf(builder)).to.eql({ join: ['pets'], fetch: ['movies', 'constructor'] });
      });

      it('should still throw for contradicting explicit algorithms', () => {
        expect(() => {
          Person.query().withGraphJoined('pets').withGraph('pets', { algorithm: 'fetch' });
        }).to.throwException((err) => {
          expect(err.message).to.equal(
            'relation `pets` cannot be loaded with both withGraphJoined and withGraphFetched',
          );
        });
      });

      it('should keep the most recently used algorithm in clones', () => {
        const builder = Person.query().withGraphJoined('pets').clone().withGraph('movies');
        expect(relationsOf(builder)).to.eql({ join: ['pets', 'movies'], fetch: [] });
      });

      it('should forget the most recently used algorithm in clearWithGraph()', () => {
        const builder = Person.query().withGraphJoined('pets').clearWithGraph().withGraph('movies');
        expect(relationsOf(builder)).to.eql({ join: [], fetch: ['movies'] });
      });

      it('should inherit the most recently used algorithm in child queries', () => {
        const parent = Person.query().withGraphJoined('pets');
        const child = Person.query().childQueryOf(parent).withGraph('movies');
        expect(relationsOf(child)).to.eql({ join: ['movies'], fetch: [] });
      });

      it('should pass the other options to the operations', () => {
        const builder = Person.query()
          .withGraphFetched('parent')
          .withGraphJoined('movies')
          .withGraph('pets', { joinOperation: 'innerJoin' })
          .withGraph('parent', { maxBatchSize: 1 });

        expect(builder.toKnexQuery().toString()).to.contain(
          'inner join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"',
        );
        expect(builder.findOperation(WhereInEagerOperation).graphOptions.maxBatchSize).to.equal(1);
      });

      it('should warn and ignore joinOperation for fetched relations', () => {
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (message) => warnings.push(message);
        resetDeprecations();

        try {
          const builder = Person.query()
            .withGraphJoined('pets')
            .withGraphFetched('movies', { joinOperation: 'innerJoin' })
            .withGraph('[pets, parent]', { joinOperation: 'rightJoin' });

          expect(builder.findOperation(WhereInEagerOperation).joinOperations).to.eql([]);
          expect(builder.findOperation(JoinEagerOperation).joinOperations).to.have.length(1);
          expect(warnings).to.eql([
            'The joinOperation option only applies to withGraphJoined() and is ignored for the ' +
              'fetched relations "movies".',
            'The joinOperation option only applies to withGraphJoined() and is ignored for the ' +
              'fetched relations "parent".',
          ]);
        } finally {
          console.warn = originalWarn;
          resetDeprecations();
        }
      });

      it('should load the merged graph', () => {
        mockKnexQueryResults = [flatRows(), movieRows()];

        return Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .withGraph('[pets, movies]')
          .then((models) => {
            expect(executedQueries).to.eql([
              joinQuery,
              'select "Movie".* from "Movie" where "Movie"."personId" in (1, 2)',
            ]);

            expect(toJson(models)).to.eql(expectedGraph);
          });
      });

      it('should apply modifiers to both operations', () => {
        mockKnexQueryResults = [flatRows(), movieRows()];

        return Person.query()
          .withGraphJoined('pets')
          .withGraphFetched('movies')
          .withGraph('[pets(a10), movies(m100)]')
          .modifiers({
            a10: (builder) => builder.where('name', 'A10'),
            m100: (builder) => builder.where('name', 'M100'),
          })
          .then(() => {
            expect(executedQueries).to.have.length(2);
            expect(executedQueries[0]).to.contain(
              `left join (select "Animal".* from "Animal" where "name" = 'A10') as "pets"`,
            );
            expect(executedQueries[1]).to.equal(
              `select "Movie".* from "Movie" where "Movie"."personId" in (1, 2) and "name" = 'M100'`,
            );
          });
      });
    });

    describe('isJoinChildQuery()', () => {
      const orders = [
        ['withGraphJoined', 'withGraphFetched'],
        ['withGraphFetched', 'withGraphJoined'],
      ];

      for (const order of orders) {
        it(`should tell the child queries of joined and fetched relations apart (${order.join(
          ', ',
        )})`, () => {
          mockKnexQueryResults = [flatRows(), movieRows()];
          const childQueries = {};

          let builder = Person.query().modifiers({
            capture: (query) => {
              childQueries[query.modelClass().getTableName()] = query.isJoinChildQuery();
            },
          });

          for (const method of order) {
            builder = builder[method](
              method === 'withGraphJoined' ? 'pets(capture)' : 'movies(capture)',
            );
          }

          expect(builder.isJoinChildQuery()).to.equal(false);

          return builder.then(() => {
            expect(childQueries).to.eql({ Animal: true, Movie: false });
          });
        });
      }

      it('should be kept in clones', () => {
        const parent = Person.query();
        const child = Person.query().childQueryOf(parent, { isJoinChildQuery: true });

        expect(child.isJoinChildQuery()).to.equal(true);
        expect(child.clone().isJoinChildQuery()).to.equal(true);
        expect(parent.isJoinChildQuery()).to.equal(false);
      });
    });
  });

  describe('withGraphJoined with a different joinOperation per call (#2125)', () => {
    let Person;
    let Animal;
    let Movie;

    // Returns an object that maps each joined table alias to its join type.
    const joinTypes = (sql) => {
      const types = {};
      const regex = /(\w+(?: outer)?) join "\w+" as "([^"]+)"/g;
      let match;

      while ((match = regex.exec(sql))) {
        types[match[2]] = match[1];
      }

      return types;
    };

    const getJoinTypes = (builder) => joinTypes(builder.toKnexQuery().toString());

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'parentId'] };
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: { from: 'Person.id', to: 'Animal.ownerId' },
            },
            movies: {
              relation: Model.ManyToManyRelation,
              modelClass: Movie,
              join: {
                from: 'Person.id',
                through: { from: 'PersonMovie.personId', to: 'PersonMovie.movieId' },
                to: 'Movie.id',
              },
            },
            parent: {
              relation: Model.BelongsToOneRelation,
              modelClass: Person,
              join: { from: 'Person.parentId', to: 'Person.id' },
            },
          };
        }
      };

      Animal = class Animal extends Model {
        static get tableName() {
          return 'Animal';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'ownerId'] };
        }
      };

      Movie = class Movie extends Model {
        static get tableName() {
          return 'Movie';
        }

        static tableMetadata() {
          return { columns: ['id', 'name'] };
        }
      };

      Person.knex(mockKnex);
    });

    it('should use the joinOperation of each call for its relations', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets', { joinOperation: 'leftJoin' }),
        ),
      ).to.eql({ parent: 'inner', pets: 'left' });

      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('pets', { joinOperation: 'leftJoin' })
            .withGraphJoined('parent', { joinOperation: 'innerJoin' }),
        ),
      ).to.eql({ parent: 'inner', pets: 'left' });
    });

    it('should use the joinOperation for both joins of many-to-many relations', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('movies', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets'),
        ),
      ).to.eql({ movies_join: 'inner', movies: 'inner', pets: 'left' });
    });

    it('should use the default join operation for calls without a joinOperation', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets'),
        ),
      ).to.eql({ parent: 'inner', pets: 'left' });
    });

    it('should use the joinOperation of defaultGraphOptions as the default', () => {
      Person.defaultGraphOptions = { joinOperation: 'innerJoin' };

      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent')
            .withGraphJoined('pets', { joinOperation: 'leftJoin' }),
        ),
      ).to.eql({ parent: 'inner', pets: 'left' });
    });

    it('nested relations should inherit the joinOperation of the call that added them', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent.[pets, parent]', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets'),
        ),
      ).to.eql({
        parent: 'inner',
        'parent:pets': 'inner',
        'parent:parent': 'inner',
        pets: 'left',
      });
    });

    it('should support recursive expressions', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent.^3', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets'),
        ),
      ).to.eql({
        parent: 'inner',
        'parent:parent': 'inner',
        'parent:parent:parent': 'inner',
        pets: 'left',
      });
    });

    it('should use the last explicit joinOperation for relations passed to multiple calls', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent', { joinOperation: 'innerJoin' })
            .withGraphJoined('parent', { joinOperation: 'leftJoin' }),
        ),
      ).to.eql({ parent: 'left' });

      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent.pets', { joinOperation: 'leftJoin' })
            .withGraphJoined('parent', { joinOperation: 'innerJoin' }),
        ),
      ).to.eql({ parent: 'inner', 'parent:pets': 'left' });

      // A call without a joinOperation doesn't override the joinOperation of
      // the relations, but its new nested relations use the default.
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent', { joinOperation: 'innerJoin' })
            .withGraphJoined('parent.pets'),
        ),
      ).to.eql({ parent: 'inner', 'parent:pets': 'left' });
    });

    it('should support aliased relations', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('pets as dogs', { joinOperation: 'innerJoin' })
            .withGraphJoined('pets as cats'),
        ),
      ).to.eql({ dogs: 'inner', cats: 'left' });
    });

    it('should keep the joinOperations when cloning', () => {
      const builder = Person.query()
        .withGraphJoined('parent', { joinOperation: 'innerJoin' })
        .withGraphJoined('pets', { joinOperation: 'leftJoin' });

      expect(getJoinTypes(builder.clone().withGraphJoined('movies'))).to.eql({
        parent: 'inner',
        pets: 'left',
        movies_join: 'left',
        movies: 'left',
      });
    });

    it('should keep the joinOperations when mixed with withGraphFetched', () => {
      expect(
        getJoinTypes(
          Person.query()
            .withGraphJoined('parent', { joinOperation: 'innerJoin' })
            .withGraphFetched('movies')
            .withGraphJoined('pets'),
        ),
      ).to.eql({ parent: 'inner', pets: 'left' });
    });

    it('should run the query with the joinOperation of each call', () => {
      mockKnexQueryResults = [[]];

      return Person.query()
        .withGraphJoined('parent', { joinOperation: 'innerJoin' })
        .withGraphJoined('pets', { joinOperation: 'leftJoin' })
        .then(() => {
          expect(executedQueries).to.have.length(1);
          expect(joinTypes(executedQueries[0])).to.eql({ parent: 'inner', pets: 'left' });
        });
    });
  });

  describe('withGraphJoined without a usable primary key (#2748)', () => {
    let Person;
    let Animal;
    let personIdColumn;
    let personColumns;
    let animalColumns;

    beforeEach(() => {
      personIdColumn = 'id';
      personColumns = ['id', 'name'];
      animalColumns = ['id', 'name', 'ownerId'];

      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static get idColumn() {
          return personIdColumn;
        }

        static tableMetadata() {
          return { columns: personColumns };
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: { from: 'Person.name', to: 'Animal.ownerId' },
            },
          };
        }
      };

      Animal = class Animal extends Model {
        static get tableName() {
          return 'Animal';
        }

        static tableMetadata() {
          return { columns: animalColumns };
        }
      };

      Person.knex(mockKnex);
    });

    const expectError = (promise, modelName) =>
      promise.then(
        () => {
          throw new Error('should not get here');
        },
        (err) => {
          expect(err.message).to.contain('withGraphJoined');
          expect(err.message).to.contain(`model ${modelName}`);
          expect(err.message).to.contain('withGraphFetched');
        },
      );

    it('should throw if the id column of the root model is missing from the result', () => {
      personColumns = ['name'];
      mockKnexQueryResults = [
        [
          { name: 'P1', 'pets:id': 1, 'pets:name': 'A1', 'pets:ownerId': 'P1' },
          { name: 'P2', 'pets:id': 2, 'pets:name': 'A2', 'pets:ownerId': 'P2' },
        ],
      ];

      return expectError(Person.query().withGraphJoined('pets'), 'Person');
    });

    it('should throw if the id column of a related model is missing from the result', () => {
      animalColumns = ['name', 'ownerId'];
      mockKnexQueryResults = [
        [
          { id: 1, name: 'P1', 'pets:name': 'A1', 'pets:ownerId': 'P1' },
          { id: 1, name: 'P1', 'pets:name': 'A2', 'pets:ownerId': 'P1' },
        ],
      ];

      return expectError(Person.query().withGraphJoined('pets'), 'Animal');
    });

    it('should throw if idColumn is null', () => {
      personIdColumn = null;
      mockKnexQueryResults = [
        [
          { id: 1, name: 'P1', 'pets:id': 1, 'pets:name': 'A1', 'pets:ownerId': 'P1' },
          { id: 2, name: 'P2', 'pets:id': 2, 'pets:name': 'A2', 'pets:ownerId': 'P2' },
        ],
      ];

      return expectError(Person.query().withGraphJoined('pets'), 'Person');
    });

    it('should not throw for an empty result', () => {
      personColumns = ['name'];
      mockKnexQueryResults = [[]];

      return Person.query()
        .withGraphJoined('pets')
        .then((models) => {
          expect(models).to.eql([]);
        });
    });

    it('should not throw if the joined id columns are null (no match)', () => {
      mockKnexQueryResults = [
        [
          { id: 1, name: 'P1', 'pets:id': null, 'pets:name': null, 'pets:ownerId': null },
          { id: 2, name: 'P2', 'pets:id': 2, 'pets:name': 'A2', 'pets:ownerId': 'P2' },
        ],
      ];

      return Person.query()
        .withGraphJoined('pets')
        .then((models) => {
          expect(models.map((it) => it.toJSON())).to.eql([
            { id: 1, name: 'P1', pets: [] },
            { id: 2, name: 'P2', pets: [{ id: 2, name: 'A2', ownerId: 'P2' }] },
          ]);
        });
    });

    it('should not throw if the id columns are not explicitly selected', () => {
      mockKnexQueryResults = [
        [
          { name: 'P1', id: 1, 'pets:name': 'A1', 'pets:id': 1 },
          { name: 'P1', id: 1, 'pets:name': 'A2', 'pets:id': 2 },
        ],
      ];

      return Person.query()
        .select('name')
        .withGraphJoined('pets(selectName)')
        .modifiers({ selectName: (query) => query.select('name') })
        .then((models) => {
          expect(executedQueries).to.eql([
            'select "name", "Person"."id" as "id", ' +
              '"pets"."name" as "pets:name", "pets"."id" as "pets:id" ' +
              'from "Person" left join (select "name", "Animal"."id", "Animal"."ownerId" from "Animal") as "pets" ' +
              'on "pets"."ownerId" = "Person"."name"',
          ]);
          expect(models.map((it) => it.toJSON())).to.eql([
            { name: 'P1', pets: [{ name: 'A1' }, { name: 'A2' }] },
          ]);
        });
    });
  });

  describe('aliased selections in withGraphJoined modifiers (#2365)', () => {
    let Person;
    let Animal;

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static tableMetadata() {
          return { columns: ['id', 'name'] };
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: { from: 'Person.id', to: 'Animal.ownerId' },
            },
          };
        }
      };

      Animal = class Animal extends Model {
        static get tableName() {
          return 'Animal';
        }

        static tableMetadata() {
          return { columns: ['id', 'name', 'ownerId'] };
        }
      };

      Person.knex(mockKnex);
    });

    const buildSql = (...selections) =>
      Person.query()
        .withGraphJoined('pets(selectPet)')
        .modifiers({
          selectPet: (query) => query.select('name', ...selections),
        })
        .toKnexQuery()
        .toString();

    const petSelections = (...aliases) =>
      [
        'select "Person"."id" as "id", "Person"."name" as "name"',
        '"pets"."name" as "pets:name"',
        ...aliases.map((alias) => `"pets"."${alias}" as "pets:${alias}"`),
        '"pets"."id" as "pets:id" from "Person"',
      ].join(', ');

    it('should select an objection subquery aliased with as()', () => {
      const sql = buildSql(
        Animal.query().count().where('Animal.ownerId', ref('Person.id')).as('siblingCount'),
      );

      expect(sql).to.contain(petSelections('siblingCount'));
      expect(sql).to.contain(
        'select "name", (select count(*) from "Animal" where "Animal"."ownerId" = "Person"."id") as "siblingCount"',
      );
    });

    it('should select a knex subquery aliased with as()', () => {
      const sql = buildSql(mockKnex.count().from('Animal').as('animalCount'));

      expect(sql).to.contain(petSelections('animalCount'));
    });

    it('should select a raw with a quoted alias in the sql', () => {
      const sql = buildSql(
        raw('upper("name") AS "upperName"'),
        raw('lower("name") as `lowerName`'),
        raw('1 as [one]'),
      );

      expect(sql).to.contain(petSelections('upperName', 'lowerName', 'one'));
    });

    it('should select a knex raw with a quoted alias in the sql', () => {
      const sql = buildSql(mockKnex.raw('upper("name") as "upperName"'));

      expect(sql).to.contain(petSelections('upperName'));
    });

    it('should select a raw with an identifier binding as the alias', () => {
      const sql = buildSql(
        raw('upper(??) as ??', ['name', 'upperName']),
        raw('lower(:col:) as :alias:', { col: 'name', alias: 'lowerName' }),
      );

      expect(sql).to.contain(petSelections('upperName', 'lowerName'));
    });

    it('should select a raw with an unquoted lower case alias in the sql', () => {
      const sql = buildSql(raw('upper("name") as upper_name'));

      expect(sql).to.contain(petSelections('upper_name'));
    });

    it('should not select raws without a recognizable alias', () => {
      // Unquoted mixed case aliases are folded to lower case by some databases.
      const sql = buildSql(raw('upper("name") as upperName'), raw('cast("id" as text)'), raw('1'));

      expect(sql).to.contain(petSelections());
    });

    it('should still select all columns of a relation if a modifier only selects raws with an alias in the sql', () => {
      const sql = Person.query()
        .withGraphJoined('pets(selectPet)')
        .modifiers({
          selectPet: (query) => query.select(raw('upper("name") as "upperName"')),
        })
        .toKnexQuery()
        .toString();

      expect(sql).to.equal(
        'select "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId", "pets"."upperName" as "pets:upperName" ' +
          'from "Person" left join (select upper("name") as "upperName", "Animal".* from "Animal") as "pets" on "pets"."ownerId" = "Person"."id"',
      );
    });

    it('should still select all root columns if the root query only selects raws with an alias in the sql', () => {
      mockKnexQueryResults = [
        [{ one: 1, id: 1, name: 'P1', 'pets:id': 10, 'pets:name': 'A1', 'pets:ownerId': 1 }],
      ];

      return Person.query()
        .select(raw('1 as one'))
        .withGraphJoined('pets')
        .then((models) => {
          expect(executedQueries).to.eql([
            'select 1 as one, "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" ' +
              'from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"',
          ]);
          expect(models.map((it) => it.toJSON())).to.eql([
            { one: 1, id: 1, name: 'P1', pets: [{ id: 10, name: 'A1', ownerId: 1 }] },
          ]);
        });
    });

    it('should still select all columns of a relation if a modifier only selects aliased subqueries', () => {
      const sql = Person.query()
        .withGraphJoined('pets(selectPet)')
        .modifiers({
          selectPet: (query) => query.select(mockKnex.count().from('Animal').as('animalCount')),
        })
        .toKnexQuery()
        .toString();

      expect(sql).to.equal(
        'select "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId", "pets"."animalCount" as "pets:animalCount" ' +
          'from "Person" left join (select (select count(*) from "Animal") as "animalCount", "Animal".* from "Animal") as "pets" on "pets"."ownerId" = "Person"."id"',
      );
    });

    it('should still select all columns of a relation if a modifier selects * and aliased subqueries', () => {
      const sql = Person.query()
        .withGraphJoined('pets(selectPet)')
        .modifiers({
          selectPet: (query) =>
            query.select('*', mockKnex.count().from('Animal').as('animalCount')),
        })
        .toKnexQuery()
        .toString();

      expect(sql).to.equal(
        'select "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId", "pets"."animalCount" as "pets:animalCount" ' +
          'from "Person" left join (select *, (select count(*) from "Animal") as "animalCount" from "Animal") as "pets" on "pets"."ownerId" = "Person"."id"',
      );
    });

    it('should still select all root columns if the root query only selects aliased subqueries', () => {
      const sql = Person.query()
        .select(mockKnex.count().from('Animal').as('animalCount'))
        .withGraphJoined('pets')
        .toKnexQuery()
        .toString();

      expect(sql).to.equal(
        'select (select count(*) from "Animal") as "animalCount", "Person"."id" as "id", "Person"."name" as "name", "pets"."id" as "pets:id", "pets"."name" as "pets:name", "pets"."ownerId" as "pets:ownerId" ' +
          'from "Person" left join "Animal" as "pets" on "pets"."ownerId" = "Person"."id"',
      );
    });

    it('should return the aliased selections in the result', () => {
      mockKnexQueryResults = [
        [
          {
            id: 1,
            name: 'P1',
            'pets:name': 'A1',
            'pets:upperName': 'A1!',
            'pets:siblingCount': 2,
            'pets:id': 10,
          },
        ],
      ];

      return Person.query()
        .withGraphJoined('pets(selectPet)')
        .modifiers({
          selectPet: (query) =>
            query.select(
              'name',
              raw('upper("name") AS "upperName"'),
              Animal.query().count().where('Animal.ownerId', ref('Person.id')).as('siblingCount'),
            ),
        })
        .then((models) => {
          expect(executedQueries[0]).to.contain(petSelections('upperName', 'siblingCount'));
          expect(models.map((it) => it.toJSON())).to.eql([
            {
              id: 1,
              name: 'P1',
              pets: [{ name: 'A1', upperName: 'A1!', siblingCount: 2 }],
            },
          ]);
        });
    });
  });

  describe('onConflict() with graph inserts (#2156)', () => {
    let Person;

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Person,
              join: { from: 'Person.id', to: 'Person.ownerId' },
            },
          };
        }
      };

      Person.knex(mockKnex);
    });

    const graph = () => ({ name: 'Jennifer', pets: [{ name: 'Doggo' }] });

    // Each case: [method, query with onConflict, same query without onConflict].
    const cases = {
      'insertGraph().onConflict().ignore()': [
        'insertGraph',
        () => Person.query().insertGraph(graph()).onConflict('name').ignore(),
        () => Person.query().insertGraph(graph()),
      ],
      'insertGraph().onConflict().merge()': [
        'insertGraph',
        () => Person.query().insertGraph(graph()).onConflict('name').merge(),
        () => Person.query().insertGraph(graph()),
      ],
      'insertGraph().onConflict()': [
        'insertGraph',
        () => Person.query().insertGraph(graph()).onConflict('name'),
        () => Person.query().insertGraph(graph()),
      ],
      'insertGraphAndFetch().onConflict().ignore()': [
        'insertGraph',
        () => Person.query().insertGraphAndFetch(graph()).onConflict('name').ignore(),
        () => Person.query().insertGraphAndFetch(graph()),
      ],
      'onConflict().ignore().insertGraph()': [
        'insertGraph',
        () => Person.query().onConflict('name').ignore().insertGraph(graph()),
        () => Person.query().insertGraph(graph()),
      ],
      'relatedQuery().insertGraph().onConflict().ignore()': [
        'insertGraph',
        () => Person.relatedQuery('pets').for(1).insertGraph(graph()).onConflict('name').ignore(),
        () => Person.relatedQuery('pets').for(1).insertGraph(graph()),
      ],
      'upsertGraph().onConflict().merge()': [
        'upsertGraph',
        () => Person.query().upsertGraph(graph()).onConflict('name').merge(),
        () => Person.query().upsertGraph(graph()),
      ],
    };

    let warnings;
    let originalWarn;

    beforeEach(() => {
      resetDeprecations();
      warnings = [];
      originalWarn = console.warn;
      console.warn = (message) => warnings.push(message);
    });

    afterEach(() => {
      console.warn = originalWarn;
      resetDeprecations();
    });

    async function run(createQuery) {
      mockKnexQueryResults = [[{ id: 1 }], [{ id: 2 }]];
      mockKnexQueryResultIndex = 0;
      executedQueries = [];
      await createQuery();
      return executedQueries;
    }

    for (const [title, [method, withOnConflict, withoutOnConflict]] of Object.entries(cases)) {
      it(`${title} should warn once and ignore the clause`, async () => {
        const expectedQueries = await run(withoutOnConflict);
        expect(warnings).to.eql([]);

        expect(await run(withOnConflict)).to.eql(expectedQueries);
        expect(await run(withOnConflict)).to.eql(expectedQueries);

        expect(warnings).to.eql([
          `onConflict(), ignore() and merge() are not supported by ${method}(). ` +
            'Insert the conflicting rows with a separate insert() query instead. ' +
            'This will throw in objection 4.0.',
        ]);
      });
    }

    it('insertGraph().onConflict().ignore() should insert the graph without on conflict', async () => {
      expect(
        await run(() => Person.query().insertGraph(graph()).onConflict('name').ignore()),
      ).to.eql([
        'insert into "Person" ("name") values (\'Jennifer\') returning "id"',
        'insert into "Person" ("name", "ownerId") values (\'Doggo\', 1) returning "id"',
      ]);
    });

    it('should warn once per method', async () => {
      await run(() => Person.query().insertGraph(graph()).onConflict('name').ignore());
      await run(() => Person.query().upsertGraph(graph()).onConflict('name').merge());
      await run(() => Person.query().insertGraph(graph()).onConflict('name').merge());

      expect(warnings).to.have.length(2);
      expect(warnings[0]).to.contain('insertGraph()');
      expect(warnings[1]).to.contain('upsertGraph()');
    });
  });

  describe('unknown graph options (#84)', () => {
    let Person;
    let warnings;
    let originalWarn;

    beforeEach(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }
      };

      Person.knex(mockKnex);
      resetDeprecations();
      warnings = [];
      originalWarn = console.warn;
      console.warn = (message) => warnings.push(message);
      mockKnexQueryResults = [[{ id: 1 }]];
      mockKnexQueryResultIndex = 0;
    });

    afterEach(() => {
      console.warn = originalWarn;
      resetDeprecations();
    });

    it('insertGraph() should warn once about an unknown option', async () => {
      await Person.query().insertGraph({ name: 'Jennifer' }, { relat: true });
      await Person.query().insertGraph({ name: 'Jennifer' }, { relat: true });

      expect(warnings).to.have.length(1);
      expect(warnings[0]).to.contain('Unknown graph option "relat" is ignored.');
    });

    it('upsertGraph() should warn about an unknown option', async () => {
      await Person.query().upsertGraph({ name: 'Jennifer' }, { noInset: true });

      expect(warnings).to.have.length(1);
      expect(warnings[0]).to.contain('Unknown graph option "noInset" is ignored.');
    });

    it('should not warn about known options', async () => {
      await Person.query().insertGraph({ name: 'Jennifer' }, { relate: true, allowRefs: true });
      await Person.query().upsertGraph(
        { name: 'Jennifer' },
        { insertMissing: true, noDelete: true, fetchStrategy: 'OnlyNeeded' },
      );

      expect(warnings).to.eql([]);
    });
  });

  describe('context', () => {
    it('context() should merge context', () => {
      const builder = TestModel.query();

      builder.context({ a: 1 });

      expect(builder.context()).to.eql({
        a: 1,
      });

      builder.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('clearContext() should clear the context', () => {
      const builder = TestModel.query();

      builder.context({ a: 1 });

      expect(builder.context()).to.eql({
        a: 1,
      });

      const builder2 = builder.clearContext();

      expect(builder === builder2).to.equal(true);
      expect(builder.context()).to.eql({});
    });

    it('`context` should merge context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);
      builder.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(origContext).to.eql({
        a: 1,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('`context` can be called without `context` having been called', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);
      builder.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(origContext).to.eql({
        a: 1,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
    });

    it('cloning a query builder should clone the context also', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = builder.clone();
      builder2.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(origContext).to.eql({
        a: 1,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('calling `childQueryOf` should copy a reference of the context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = TestModel.query().childQueryOf(builder);
      builder2.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(origContext).to.eql({
        a: 1,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('calling `childQueryOf(builder, { fork: true })` should copy the context', () => {
      const builder = TestModel.query();
      const origContext = { a: 1 };

      builder.context(origContext);

      const builder2 = TestModel.query().childQueryOf(builder, { fork: true });
      builder2.context({ b: 2 });

      expect(builder.context()).to.eql({
        a: 1,
      });

      expect(builder2.context()).to.eql({
        a: 1,
        b: 2,
      });

      expect(origContext).to.eql({
        a: 1,
      });

      expect(builder.context().transaction === mockKnex).to.equal(true);
      expect(builder2.context().transaction === mockKnex).to.equal(true);
    });

    it('values saved to context in hooks should be available later', () => {
      let foo = null;

      TestModel = class extends TestModel {
        $beforeUpdate(opt, ctx) {
          ctx.foo = 100;
        }

        $afterUpdate(opt, ctx) {
          foo = ctx.foo;
        }
      };

      return TestModel.query()
        .patch({ a: 1 })
        .then(() => {
          expect(foo).to.equal(100);
        });
    });
  });

  describe('insert().onConflict() with ignored rows (#2320, #2597, #2661)', () => {
    it('should merge the returned rows to the matching models', async () => {
      mockKnexQueryResults = [
        [
          { id: 11, a: 1 },
          { id: 13, a: 3 },
        ],
      ];

      const models = [{ a: 1 }, { a: 2 }, { a: 3 }].map((it) => TestModel.fromJson(it));
      const result = await TestModel.query().insert(models).onConflict('a').ignore();

      expect(executedQueries).to.eql([
        'insert into "Model" ("a") values (1), (2), (3) on conflict ("a") do nothing returning "id", "a"',
      ]);
      expect(result).to.eql(models);
      expect(models.map((it) => it.id)).to.eql([11, undefined, 13]);
    });

    it('should match the returned rows by the conflict columns regardless of their order', async () => {
      mockKnexQueryResults = [
        [
          { id: 13, a: 3 },
          { id: 11, a: 1 },
        ],
      ];

      const models = [{ a: 1 }, { a: 2 }, { a: 3 }].map((it) => TestModel.fromJson(it));
      await TestModel.query().insert(models).onConflict(['a']).ignore();

      expect(models.map((it) => it.id)).to.eql([11, undefined, 13]);
    });

    it('should match the returned rows by the id if no conflict columns are given', async () => {
      mockKnexQueryResults = [[{ id: 2, b: 'db2' }]];

      const models = [{ id: 1 }, { id: 2 }].map((it) => TestModel.fromJson(it));
      await TestModel.query().insert(models).onConflict().ignore().returning('*');

      expect(models[0].b).to.equal(undefined);
      expect(models[1].b).to.equal('db2');
    });

    it('should match duplicate keys in insertion order', async () => {
      mockKnexQueryResults = [[{ id: 11, a: 1, b: 'first' }]];

      const models = [
        { a: 1, b: 'first' },
        { a: 1, b: 'second' },
      ].map((it) => TestModel.fromJson(it));
      await TestModel.query().insert(models).onConflict('a').ignore().returning('*');

      expect(models.map((it) => it.id)).to.eql([11, undefined]);
      expect(models.map((it) => it.b)).to.eql(['first', 'second']);
    });

    it('should leave the model untouched if the only row is ignored', async () => {
      mockKnexQueryResults = [[]];

      const model = TestModel.fromJson({ a: 1 });
      const result = await TestModel.query().insert(model).onConflict('a').ignore();

      expect(result).to.be(model);
      expect(model.id).to.equal(undefined);
    });

    it('should not crash with object properties in the jsonSchema', async () => {
      TestModel.jsonSchema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          a: { type: 'integer' },
          obj: { type: 'object' },
        },
      };

      mockKnexQueryResults = [[{ id: 12, a: 2, obj: { x: 2 } }]];

      const result = await TestModel.query()
        .insert([
          { a: 1, obj: { x: 1 } },
          { a: 2, obj: { x: 2 } },
        ])
        .onConflict('a')
        .ignore()
        .returning('*');

      expect(result.map((it) => it.id)).to.eql([undefined, 12]);
      expect(result.map((it) => it.obj)).to.eql([{ x: 1 }, { x: 2 }]);
    });

    it('should throw if the returned rows cannot be matched to the models', async () => {
      mockKnexQueryResults = [[{ id: 12 }]];

      const err = await TestModel.query()
        .insert([{ a: 1 }, { a: 2 }])
        .onConflict()
        .ignore()
        .catch((err) => err);

      expect(err).to.be.an(Error);
      expect(err.message).to.match(/^Could not match the rows returned by an insert/);
    });

    it('should merge the returned rows by position if all rows are returned', async () => {
      mockKnexQueryResults = [
        [
          { id: 11, a: 1 },
          { id: 12, a: 2 },
        ],
      ];

      const result = await TestModel.query()
        .insert([{ a: 1 }, { a: 2 }])
        .onConflict('a')
        .merge();

      expect(result.map((it) => it.id)).to.eql([11, 12]);
    });

    it('should not change the returning clause of inserts without onConflict()', async () => {
      mockKnexQueryResults = [[{ id: 11 }, { id: 12 }]];

      const result = await TestModel.query().insert([{ a: 1 }, { a: 2 }]);

      expect(executedQueries).to.eql(['insert into "Model" ("a") values (1), (2) returning "id"']);
      expect(result.map((it) => it.id)).to.eql([11, 12]);
    });

    it('insertAndFetch() should only fetch the models that have an id', async () => {
      mockKnexQueryResults = [[{ id: 13, a: 3 }], [{ id: 13, a: 3, b: 'fetched' }]];

      const result = await TestModel.query()
        .insertAndFetch([{ a: 1 }, { a: 3 }])
        .onConflict('a')
        .ignore();

      expect(executedQueries).to.eql([
        'insert into "Model" ("a") values (1), (3) on conflict ("a") do nothing returning "id", "a"',
        'select "Model".* from "Model" where "Model"."id" in (13)',
      ]);
      expect(result.map((it) => it.id)).to.eql([undefined, 13]);
      expect(result.map((it) => it.b)).to.eql([undefined, 'fetched']);
    });

    it('insertAndFetch() should not fetch anything if no model has an id', async () => {
      mockKnexQueryResults = [[]];

      const result = await TestModel.query().insertAndFetch({ a: 1 }).onConflict('a').ignore();

      expect(executedQueries).to.have.length(1);
      expect(result.a).to.equal(1);
      expect(result.id).to.equal(undefined);
    });
  });

  describe('toFindQuery', () => {
    class Person extends Model {
      static get tableName() {
        return 'person';
      }

      static get relationMappings() {
        return {
          pets: {
            relation: this.HasManyRelation,
            modelClass: Pet,
            join: {
              from: 'person.id',
              to: 'pet.owner_id',
            },
          },
          movies: {
            relation: this.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'person.id',
              through: {
                from: 'person_movie.person_id',
                to: 'person_movie.movie_id',
              },
              to: 'movie.id',
            },
          },
        };
      }
    }

    class Pet extends Model {
      static get tableName() {
        return 'pet';
      }

      static get relationMappings() {
        return {
          owner: {
            relation: this.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'pet.owner_id',
              to: 'person.id',
            },
          },
        };
      }
    }

    class Movie extends Model {
      static get tableName() {
        return 'movie';
      }
    }

    it('query().update()', () => {
      testToFindQuery(
        Person.query(mockKnex).update({ foo: 'bar' }).where('name', 'like', '%foo'),
        'select "person".* from "person" where "name" like ?',
      );
    });

    it('query().relatedQuery("hasMany").update()', () => {
      testToFindQuery(
        Person.fromJson({ id: 1 })
          .$relatedQuery('pets', mockKnex)
          .update({ foo: 'bar' })
          .where('name', 'like', '%foo'),
        'select "pet".* from "pet" where "pet"."owner_id" in (?) and "name" like ?',
      );
    });

    it('query().relatedQuery("belongsToOne").update()', () => {
      testToFindQuery(
        Pet.fromJson({ owner_id: 1 })
          .$relatedQuery('owner', mockKnex)
          .patch({ foo: 'bar' })
          .where('name', 'like', '%foo'),
        'select "person".* from "person" where "person"."id" in (?) and "name" like ?',
      );
    });

    function testToFindQuery(query, sql) {
      expect(query.toFindQuery().toKnexQuery().toSQL().sql).to.equal(sql);
    }
  });

  describe('withGraphJoined identifier length limit (#2242)', () => {
    const longColumn = 'c'.repeat(100);
    let Person;

    beforeEach(() => {
      class Pet extends Model {
        static get tableName() {
          return 'Pet';
        }

        static tableMetadata() {
          return { columns: ['id', 'ownerId', longColumn] };
        }
      }

      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static tableMetadata() {
          return { columns: ['id'] };
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Pet,
              join: { from: 'Person.id', to: 'Pet.ownerId' },
            },
          };
        }
      };
    });

    const build = (client) =>
      Person.query(Knex({ client, useNullAsDefault: true }))
        .withGraphJoined('pets')
        .toKnexQuery()
        .toString();

    it('should throw for aliases over the postgres limit, suggesting `minimize`', () => {
      expect(() => build('pg')).to.throwException((err) => {
        expect(err.message).to.equal(
          `identifier pets:${longColumn} is over 63 characters long and would be truncated by the database engine. Use the \`minimize\` option of withGraphJoined() to shorten the aliases.`,
        );
      });
    });

    it('should use the limit of the database', () => {
      expect(build('mysql')).to.contain(`pets:${longColumn}`);
      expect(build('mssql')).to.contain(`pets:${longColumn}`);
    });

    it('should still throw over the mssql limit', () => {
      Person.relationMappings.pets.modelClass.tableMetadata = () => ({
        columns: ['id', 'ownerId', 'c'.repeat(130)],
      });

      expect(() => build('mssql')).to.throwException(/is over 128 characters long/);
    });
  });

  describe('mssql constraint violations (#2688)', () => {
    // The shape of the errors of the `tedious` driver used by knex for mssql.
    const createMsSqlError = (number, message) => {
      const err = new Error(message);
      err.code = 'EREQUEST';
      err.originalError = Object.assign(new Error(message), { info: { number, class: 14 } });
      return err;
    };

    const insertWithError = (error) => {
      const knex = knexMocker(Knex({ client: 'mssql' }), (mock, oldImpl, args) => {
        const promise = Promise.reject(error);
        return promise.then.apply(promise, args);
      });
      return TestModel.query(knex).insert({ a: 1 });
    };

    const expectError = async (error, ErrorClass) => {
      let thrown;

      try {
        await insertWithError(error);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.be.a(ErrorClass);
      return thrown;
    };

    it('should throw a UniqueViolationError for primary key violations', async () => {
      const err = await expectError(
        createMsSqlError(
          2627,
          "Violation of PRIMARY KEY constraint 'user_pkey'. Cannot insert duplicate key in object 'dbo.user'. The duplicate key value is (1).",
        ),
        objection.UniqueViolationError,
      );

      expect(err.client).to.equal('mssql');
      expect(err.table).to.equal('user');
      expect(err.schema).to.equal('dbo');
      expect(err.constraint).to.equal('user_pkey');
    });

    it('should still throw a UniqueViolationError for unique key violations', async () => {
      const err = await expectError(
        createMsSqlError(
          2627,
          "Violation of UNIQUE KEY constraint 'user_email_unique'. Cannot insert duplicate key in object 'dbo.user'. The duplicate key value is (a@b.c).",
        ),
        objection.UniqueViolationError,
      );

      expect(err.constraint).to.equal('user_email_unique');
    });

    it('should throw a DBError for other errors', async () => {
      const err = await expectError(
        createMsSqlError(2627, 'Some other message.'),
        objection.DBError,
      );

      expect(err).to.not.be.a(objection.UniqueViolationError);
    });
  });
});

const operationBuilder = QueryBuilder.forClass(Model);

function createFindOperation(builder, whereObj) {
  const operation = operationBuilder._findOperationFactory(builder);
  const origClone = operation.clone;

  function clone() {
    const operation = origClone.call(this);

    operation.onBefore2 = operation.onAfter2 = () => {};

    operation.onBuildKnex = (knexBuilder) => {
      knexBuilder.where(whereObj);
    };

    operation.clone = clone;

    return operation;
  }

  operation.clone = clone;
  return operation.clone();
}

function createInsertOperation(builder, mergeWithModel) {
  const operation = operationBuilder._insertOperationFactory(builder);
  const origClone = operation.clone;

  function clone() {
    const operation = origClone.call(this);

    operation.onBefore2 = operation.onBefore3 = operation.onAfter2 = () => {};

    operation.onAdd = function (_, args) {
      this.models = [args[0]];
      return true;
    };

    operation.onBuildKnex = function (knexBuilder) {
      let json = Object.assign(this.models[0], mergeWithModel);
      knexBuilder.insert(json);
    };

    operation.clone = clone;
    return operation;
  }

  operation.clone = clone;
  return operation.clone();
}

function createUpdateOperation(builder, mergeWithModel) {
  const operation = operationBuilder._updateOperationFactory(builder);
  const origClone = operation.clone;

  function clone() {
    const operation = origClone.call(this);

    operation.onBefore2 = operation.onBefore3 = operation.onAfter2 = () => {};

    operation.onAdd = function (_, args) {
      this.model = args[0];
      return true;
    };

    operation.onBuildKnex = function (knexBuilder) {
      let json = Object.assign(this.model, mergeWithModel);
      knexBuilder.update(json);
    };

    operation.clone = clone;
    return operation;
  }

  operation.clone = clone;
  return operation.clone();
}

function createDeleteOperation(builder, whereObj) {
  const operation = operationBuilder._deleteOperationFactory(builder);
  const origClone = operation.clone;

  function clone() {
    const operation = origClone.call(this);

    operation.onBefore2 = operation.onAfter2 = () => {};

    operation.onBuildKnex = (knexBuilder) => {
      knexBuilder.delete().where(whereObj);
    };

    operation.clone = clone;
    return operation;
  }

  operation.clone = clone;
  return operation.clone();
}
