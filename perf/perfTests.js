var _ = require('lodash')
  , Knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , knexMocker = require('../testUtils/mockKnex')
  , mockMochaFactory = require('./mockMocha')
  , Model = require('../').Model;

if (typeof describe == 'undefined') {
  global.mockMocha = mockMochaFactory();
  global.describe = global.mockMocha.describe;
  global.before = global.mockMocha.before;
  global.beforeEach = global.mockMocha.beforeEach;
  global.after = global.mockMocha.after;
  global.afterEach = global.mockMocha.afterEach;
  global.it = global.mockMocha.it;
}

describe('Performance tests', function () {
  var mockKnex = null;

  var Person = null;
  var Animal = null;
  var Movie = null;

  before(function () {
    var knex = Knex({client: 'pg'});

    mockKnex = knexMocker(knex, function (mock, origImpl, args) {
      mock.executedQueries.push(this.toString());

      var result = mock.nextResult();
      var promise = Promise.resolve(result);

      return promise.then.apply(promise, args);
    });

    mockKnex.reset = function () {
      mockKnex.executedQueries = [];
      mockKnex.nextResult = _.constant({});
    };

    mockKnex.reset();
  });

  before(function () {
    Person = class Person extends Model {}
    Animal = class Animal extends Model {}
    Movie = class Movie extends Model {}
  });

  before(function () {
    Person.tableName = 'Person';

    Person.jsonSchema = {
      type: 'object',
      required: ['firstName', 'lastName'],

      properties: {
        id: {type: 'integer'},
        parentId: {type: ['integer', 'null']},
        firstName: {type: 'string', minLength: 1, maxLength: 255},
        lastName: {type: 'string', minLength: 1, maxLength: 255},
        age: {type: 'number'},

        address: {
          type: ['object', 'null'],
          properties: {
            street: {type: 'string'},
            city: {type: 'string'},
            zipCode: {type: 'string'}
          }
        }
      }
    };

    Person.relationMappings = {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'Person.id',
          to: 'Animal.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'Person.id',
          through: {
            from: 'Person_Movie.personId',
            to: 'Person_Movie.movieId'
          },
          to: 'Movie.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'Person.id',
          to: 'Person.parentId'
        }
      }
    };
  });

  before(function () {
    Animal.tableName = 'Animal';

    Animal.jsonSchema = {
      type: 'object',
      required: ['name'],

      properties: {
        id: {type: 'integer'},
        ownerId: {type: ['integer', 'null']},
        name: {type: 'string', minLength: 1, maxLength: 255},
        species: {type: 'string', minLength: 1, maxLength: 255}
      }
    };

    Animal.relationMappings = {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Animal.ownerId',
          to: 'Person.id'
        }
      }
    };
  });

  before(function () {
    Movie.tableName = 'Movie';

    Movie.jsonSchema = {
      type: 'object',
      required: ['name'],

      properties: {
        id: {type: 'integer'},
        name: {type: 'string', minLength: 1, maxLength: 255}
      }
    };

    Movie.relationMappings = {
      actors: {
        relation: Model.ManyToManyRelation,
        modelClass: Person,
        join: {
          from: 'Movie.id',
          through: {
            from: 'Person_Movie.movieId',
            to: 'Person_Movie.personId'
          },
          to: 'Person.id'
        }
      }
    };
  });

  beforeEach(function () {
    mockKnex.reset();
  });

  describe('Model methods (85 models in the dataset)', function () {
    var data;

    beforeEach(function () {
      data = _.cloneDeep(require('./data.json'));
    });

    perfTest({
      name: `16000 fromJson calls for the dataset (${16000 * 85} individual models)`,
      runCount: 16000,
      runtimeGoal: 10000,
      test: function () {
        _.each(data, function (data) {
          Person.fromJson(data);
        });
      }
    });

    perfTest({
      name: `60000 $toJson calls for the dataset (${60000 * 85} individual models)`,
      runCount: 60000,
      runtimeGoal: 10000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invokeMap(persons, '$toJson');
      }
    });

    perfTest({
      name: `120000 $toDatabaseJson calls for the dataset (${120000 * 25} individual models)`,
      runCount: 120000,
      runtimeGoal: 10000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invokeMap(persons, '$toDatabaseJson');
      }
    });

    perfTest({
      name: `120000 $toDatabaseJson calls for the dataset with $omitFromDatabaseJson (${120000 * 25} individual models)`,
      runCount: 120000,
      runtimeGoal: 10000,
      beforeTest: function () {
        return _.map(data, function (json) {
          let person = Person.fromJson(json);
          person.$omitFromDatabaseJson(['address', 'age']);
          person.children.forEach(child => {
            child.$omitFromDatabaseJson(['address', 'age']);
            child.pets.forEach(pet => {
              pet.$omitFromDatabaseJson(['species']);
            });
          });
          return person;
        });
      },
      test: function (persons) {
        _.invokeMap(persons, '$toDatabaseJson');
      }
    });

    perfTest({
      name: `100000 $clone calls for the dataset (${100000 * 85} individual models)`,
      runCount: 100000,
      runtimeGoal: 10000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invokeMap(persons, '$clone');
      }
    });

    perfTest({
      name: '200000 traverse calls for the dataset',
      runCount: 200000,
      runtimeGoal: 10000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        var p = 0;
        var a = 0;
        var m = 0;

        Person.traverse(persons, function (model) {
          if (model instanceof Person) {
            ++p;
          } else if (model instanceof Movie) {
            ++m;
          } else if (model instanceof Animal) {
            ++a;
          }
        });

        if (p !== 45 || a !== 20 || m !== 20) {
          throw new Error();
        }
      }
    });

    perfTest({
      name: '120000 bindTransaction calls',
      runCount: 120000,
      runtimeGoal: 10000,
      test: function () {
        Person.bindTransaction({});
      }
    });
  });

  describe('queries', function () {
    const RESULT_SIZE = 10;

    perfTest({
      name: '50000 `Person.query()` queries',
      runCount: 50000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var result = _.map(_.range(RESULT_SIZE), function (idx) {
          return {
            firstName: 'Firstname ' + idx,
            lastName: 'Lastname ' + idx,
            age: idx
          };
        });

        mockKnex.nextResult = _.constant(result);
        return Person.bindKnex(mockKnex);
      },
      test: function (Person) {
        return Person.query().where('id', 10).then(function (models) {
          return models;
        });
      }
    });

    perfTest({
      name: '20000 complex `Person.query()` queries',
      runCount: 20000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var result = _.map(_.range(RESULT_SIZE), function (idx) {
          return {
            firstName: 'Firstname ' + idx,
            lastName: 'Lastname ' + idx,
            age: idx
          };
        });

        mockKnex.nextResult = _.constant(result);
        return Person.bindKnex(mockKnex);
      },
      test: function (Person) {
        var idx = 0;
        return Person
          .query()
          .select('Person.*', function (builder) {
            builder.avg('id').from('Animal').as('avgId');
          })
          .where(function (builder) {
            builder.where('id', 1).orWhere(function (builder) {
              builder.where('id', 2).andWhere('firstName', 'Jennifer');
            });
          })
          .joinRelation('pets')
          .where('pets.species', 'dog')
          .runBefore(function () {
            ++idx;
          })
          .runAfter(function () {
            ++idx;
          })
          .onBuild(function (builder) {
            builder.orderBy('pets.id');
          })
          .then(function (models) {
            return models;
          });
      }
    });

    perfTest({
      name: '40000 `person.$relatedQuery("children")` queries',
      runCount: 40000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var result = _.map(_.range(RESULT_SIZE), function (idx) {
          return {
            firstName: 'Firstname ' + idx,
            lastName: 'Lastname ' + idx,
            age: idx
          };
        });

        mockKnex.nextResult = _.constant(result);
        return Person.bindKnex(mockKnex).fromJson({
          id: 10,
          firstName: 'Parent',
          lastName: 'Testerson'
        });
      },
      test: function (person) {
        return person.$relatedQuery('children').then(function (models) {
          return models;
        });
      }
    });

    perfTest({
      name: '30000 `person.$relatedQuery("movies").unrelate()` queries',
      runCount: 30000,
      runtimeGoal: 10000,
      beforeTest: function () {
        mockKnex.nextResult = _.constant([1]);

        return Person.bindKnex(mockKnex).fromJson({
          id: 10,
          firstName: 'Parent',
          lastName: 'Testerson'
        });
      },
      test: function (person) {
        return person.$relatedQuery('movies').unrelate().then(function (result) {
          return result;
        });
      }
    });

    perfTest({
      name: '50000 `Person.query().insert()` queries',
      runCount: 50000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var idx = 0;

        mockKnex.nextResult = function () {
          return ++idx;
        };

        return Person.bindKnex(mockKnex);
      },
      test: function (Person) {
        return Person.query().insert([{
          firstName: 'Person 1',
          lastName: 'Person 1 Lastname',
          age: 50
        }]).then(function (models) {
          return models;
        });
      }
    });

    perfTest({
      name: '5000 `Person.query().eager("children.pets")` queries',
      runCount: 5000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var idx = 0;
        var petId = 1;

        var numPeople = 100;
        var numChildren = 3;
        var numPets = 2;

        var results = [
          // People
          _.range(numPeople).map(function (parentId) {
            return {
              id: parentId,
              firstName: 'Person' + parentId,
              lastLame: 'Person' + parentId + " Lastname",
              age: parentId
            };
          }),

          // Their children.
          _.flatten(_.range(numPeople).map(function (parentId) {
            return _.range(numChildren).map(function (childIdx) {
              var childId = parentId * numChildren + childIdx;

              return {
                id: childId,
                parentId: parentId,
                firstName: 'Child' + childIdx,
                lastLame: 'Child' + childIdx + " Lastname",
                age: childIdx
              };
            });
          })),

          // Children's pets.
          _.flatten(_.range(numPeople).map(function (parentId) {
            return _.flatten(_.range(numChildren).map(function (childIdx) {
              var childId = parentId * numChildren + childIdx;

              return _.range(numPets).map(function (i) {
                return {
                  id: ++petId,
                  name: 'Fluffy ' + childId,
                  ownerId: childId,
                  species: 'dogBreed ' + i
                };
              });
            }));
          }))
        ];

        mockKnex.nextResult = function () {
          return results[(idx++) % results.length];
        };

        return Person.bindKnex(mockKnex);
      },
      test: function (Person) {
        return Person.query().eager('children.pets');
      }
    });

    perfTest({
      name: '10000 `Person.query().insertWithRelated()` queries',
      runCount: 10000,
      runtimeGoal: 10000,
      beforeTest: function () {
        var idx = 0;

        mockKnex.nextResult = function () {
          var res = _.range(idx, idx + RESULT_SIZE);
          idx += RESULT_SIZE;
          return res;
        };

        return Person.bindKnex(mockKnex);
      },
      test: function (Person) {
        return Person.query().insertWithRelated([{
          "#id": 'person1',
          firstName: 'Person 1',
          lastName: 'Person 1 Lastname',
          age: 50,

          children: [{
            firstName: 'Child of #ref{person1.id}',
            lastName: 'Child 1 Lastname',
            age: 20
          }, {
            firstName: 'Child of #ref{person1.id}',
            lastName: 'Child 2 Lastname',
            age: 18
          }],

          movies: [{
            "#id": 'movie1',
            name: 'Movie 1'
          }, {
            name: 'Movie 2'
          }]
        }, {
          firstName: 'Person 1',
          lastName: 'Person 1 Lastname',
          age: 60,

          movies: [{
            "#ref": 'movie1'
          }]
        }]).then(function (models) {
          return models;
        });
      }
    });
  });

  function perfTest(opt) {
    (opt.only ? it.only : it)(opt.name + ' [goal ' + opt.runtimeGoal + ' ms]', function () {
      var beforeTest = opt.beforeTest || _.noop;

      var t0;
      var ctx = beforeTest();
      // warm up.
      return runTest(opt, ctx).then(function () {
        ctx = beforeTest();
        t0 = Date.now();

        return runTest(opt, ctx);
      }).then(function () {
        var t1 = Date.now();
        var runtime = t1 - t0;

        if (runtime > opt.runtimeGoal) {
          throw new Error('runtime ' + runtime + ' ms exceeds the runtimeGoal ' + opt.runtimeGoal + " ms");
        }

        console.log('      runtime: ' + runtime + ' ms, ' + (runtime / opt.runCount).toFixed(3) + ' ms / run');
      });
    });
  }

  function runTest(opt, ctx) {
    return Promise.map(_.range(opt.runCount), function () {
      return opt.test(ctx);
    }, {concurrency: 1});
  }
});

if (global.mockMocha) {
  global.mockMocha.run();
}


