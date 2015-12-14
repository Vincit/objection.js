var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Promise = require('bluebird')
  , Model = require('../lib/model/Model')
  , QueryBuilder = require('../lib/queryBuilder/QueryBuilder');

describe('Performance tests', function () {
  var mockKnexQueryResult = [];
  var executedQueries = [];
  var mockKnex = null;

  var Person = null;
  var Animal = null;
  var Movie = null;

  beforeEach(function () {
    mockKnexQueryResult = [];
    executedQueries = [];
  });

  before(function () {
    mockKnex = knex({client: 'pg'});

    mockKnex.client.QueryBuilder.prototype.then = function (cb, ecb) {
      executedQueries.push(this.toString());
      return Promise.resolve(mockKnexQueryResult).then(cb, ecb);
    };
  });

  before(function () {
    Person = function Person() {
      Model.apply(this, arguments);
    };

    Animal = function Animal() {
      Model.apply(this, arguments);
    };

    Movie = function Movie() {
      Model.apply(this, arguments);
    };

    Model.extend(Person);
    Model.extend(Animal);
    Model.extend(Movie);
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
        relation: Model.OneToManyRelation,
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
        relation: Model.OneToManyRelation,
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
        relation: Model.OneToOneRelation,
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

  describe('Model methods (85 models in the dataset)', function () {
    var data;

    beforeEach(function () {
      data = _.cloneDeep(require('./data.json'));
    });

    perfTest({
      name: '400 fromJson calls for the dataset (34000 individual models)',
      runCount: 400,
      runtimeGoal: 1000,
      test: function () {
        _.each(data, function (data) {
          Person.fromJson(data);
        });
      }
    });

    perfTest({
      name: '2000 $toJson calls for the dataset (160000 individual models)',
      runCount: 2000,
      runtimeGoal: 1000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invoke(persons, '$toJson');
      }
    });

    perfTest({
      name: '4000 $toDatabaseJson calls for the dataset (100000 individual models)',
      runCount: 4000,
      runtimeGoal: 1000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invoke(persons, '$toDatabaseJson');
      }
    });

    perfTest({
      name: '2000 $clone calls for the dataset (160000 individual models)',
      runCount: 2000,
      runtimeGoal: 1000,
      beforeTest: function () {
        return _.map(data, function (person) {
          return Person.fromJson(person);
        });
      },
      test: function (persons) {
        _.invoke(persons, '$clone');
      }
    });

    perfTest({
      name: '32000 traverse calls for the dataset',
      runCount: 32000,
      runtimeGoal: 1000,
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

    after(function () {
      return Promise.delay(500);
    })
  });

  function perfTest(opt) {
    it(opt.name + ' [goal ' + opt.runtimeGoal + ' ms]', function () {
      var beforeTest = opt.beforeTest || _.noop;

      var ctx = beforeTest();
      // warm up.
      runTest(opt, ctx);

      ctx = beforeTest();
      var t0 = Date.now();
      runTest(opt, ctx);
      var t1 = Date.now();
      var runtime = t1 - t0;

      if (runtime > opt.runtimeGoal) {
        throw new Error('runtime ' + runtime + ' ms exceeds the runtimeGoal ' + opt.runtimeGoal + " ms");
      }

      Promise.delay(100).then(function () {
        console.log('      runtime: ' + runtime + ' ms, ' + (runtime / opt.runCount).toFixed(3) + ' ms / run');
      });

      return Promise.delay(50);
    });
  }

  function runTest(opt, ctx) {
    for (var i = 0; i < opt.runCount; ++i) {
      opt.test(ctx);
    }
  }
});
