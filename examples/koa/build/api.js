'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objection = require('objection');

var _Person = require('./Person');

var _Person2 = _interopRequireDefault(_Person);

var _Movie = require('./Movie');

var _Movie2 = _interopRequireDefault(_Movie);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } // built from examples/build/models/Person


// build from examples/build/models/Movie

exports.default = router => {
  // Create a new Person. Because we use `insertGraph` you can pass relations
  // with the person and they also get inserted and related to the person. If
  // all you want to do is insert a single person, `insertGraph` and `allowInsert`
  // can be replaced by `insert(req.body)`.
  router.post('/persons', (() => {
    var _ref = _asyncToGenerator(function* (ctx) {
      const graph = ctx.request.body;

      // It's a good idea to wrap `insertGraph` call in a transaction since it
      // may create multiple queries.
      const insertedGraph = yield (0, _objection.transaction)(_Person2.default.knex(), function (trx) {
        return _Person2.default.query(trx)
        // For security reasons, limit the relations that can be inserted.
        .allowInsert('[pets, children.[pets, movies], movies, parent]').insertGraph(graph);
      });

      ctx.body = insertedGraph;
    });

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  })());

  // Patch a Person.
  router.patch('/persons/:id', (() => {
    var _ref2 = _asyncToGenerator(function* (ctx) {
      const person = yield _Person2.default.query().patchAndFetchById(ctx.params.id, ctx.request.body);

      ctx.body = person;
    });

    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  })());

  // Patch a person and upsert its relations.
  router.patch('/persons/:id/upsert', (() => {
    var _ref3 = _asyncToGenerator(function* (ctx) {
      const graph = ctx.request.body;

      // Make sure only one person was sent.
      if (Array.isArray(graph)) {
        throw createStatusCodeError(400);
      }

      // Make sure the person has the correct id because `upsertGraph` uses the id fields
      // to determine which models need to be updated and which inserted.
      graph.id = parseInt(ctx.params.id, 10);

      // It's a good idea to wrap `upsertGraph` call in a transaction since it
      // may create multiple queries.
      const upsertedGraph = yield (0, _objection.transaction)(_Person2.default.knex(), function (trx) {
        return _Person2.default.query(trx)
        // For security reasons, limit the relations that can be upserted.
        .allowUpsert('[pets, children.[pets, movies], movies, parent]').upsertGraph(graph);
      });

      ctx.body = upsertedGraph;
    });

    return function (_x3) {
      return _ref3.apply(this, arguments);
    };
  })());

  // Get multiple Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  router.get('/persons', (() => {
    var _ref4 = _asyncToGenerator(function* (ctx) {
      // We don't need to check for the existence of the query parameters because
      // we call the `skipUndefined` method. It causes the query builder methods
      // to do nothing if one of the values is undefined.
      const persons = yield _Person2.default.query().skipUndefined()
      // For security reasons, limit the relations that can be fetched.
      .allowEager('[pets, parent, children.[pets, movies.actors], movies.actors.pets]').eager(ctx.query.eager).where('age', '>=', ctx.query.minAge).where('age', '<', ctx.query.maxAge).where('firstName', 'like', ctx.query.firstName).orderBy('firstName')
      // Order eagerly loaded pets by name.
      .modifyEager('[pets, children.pets]', function (qb) {
        return qb.orderBy('name');
      });

      ctx.body = persons;
    });

    return function (_x4) {
      return _ref4.apply(this, arguments);
    };
  })());

  // Delete a person.
  router.delete('/persons/:id', (() => {
    var _ref5 = _asyncToGenerator(function* (ctx) {
      yield _Person2.default.query().deleteById(ctx.params.id);

      ctx.body = {};
    });

    return function (_x5) {
      return _ref5.apply(this, arguments);
    };
  })());

  // Add a child for a Person.
  router.post('/persons/:id/children', (() => {
    var _ref6 = _asyncToGenerator(function* (ctx) {
      const person = yield _Person2.default.query().findById(ctx.params.id);

      if (!person) {
        throw createStatusCodeError(404);
      }

      const child = yield person.$relatedQuery('children').insert(ctx.request.body);

      ctx.body = child;
    });

    return function (_x6) {
      return _ref6.apply(this, arguments);
    };
  })());

  // Add a pet for a Person.
  router.post('/persons/:id/pets', (() => {
    var _ref7 = _asyncToGenerator(function* (ctx) {
      const person = yield _Person2.default.query().findById(ctx.params.id);

      if (!person) {
        throw createStatusCodeError(404);
      }

      const pet = yield person.$relatedQuery('pets').insert(ctx.request.body);

      ctx.body = pet;
    });

    return function (_x7) {
      return _ref7.apply(this, arguments);
    };
  })());

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  router.get('/persons/:id/pets', (() => {
    var _ref8 = _asyncToGenerator(function* (ctx) {
      const person = yield _Person2.default.query().findById(ctx.params.id);

      if (!person) {
        throw createStatusCodeError(404);
      }

      // We don't need to check for the existence of the query parameters because
      // we call the `skipUndefined` method. It causes the query builder methods
      // to do nothing if one of the values is undefined.
      const pets = yield person.$relatedQuery('pets').skipUndefined().where('name', 'like', ctx.request.body.name).where('species', ctx.request.body.species);

      ctx.body = pets;
    });

    return function (_x8) {
      return _ref8.apply(this, arguments);
    };
  })());

  // Add a movie for a Person.
  router.post('/persons/:id/movies', (() => {
    var _ref9 = _asyncToGenerator(function* (ctx) {
      // Inserting a movie for a person creates two queries: the movie insert query
      // and the join table row insert query. It is wise to use a transaction here.
      const movie = yield (0, _objection.transaction)(_Person2.default.knex(), (() => {
        var _ref10 = _asyncToGenerator(function* (trx) {
          const person = yield _Person2.default.query(trx).findById(ctx.params.id);

          if (!person) {
            throw createStatusCodeError(404);
          }

          return person.$relatedQuery('movies', trx).insert(ctx.request.body);
        });

        return function (_x10) {
          return _ref10.apply(this, arguments);
        };
      })());

      ctx.body = movie;
    });

    return function (_x9) {
      return _ref9.apply(this, arguments);
    };
  })());

  // Add existing Person as an actor to a movie.
  router.post('/movies/:id/actors', (() => {
    var _ref11 = _asyncToGenerator(function* (ctx) {
      const movie = yield _Movie2.default.query().findById(ctx.params.id);

      if (!movie) {
        throw createStatusCodeError(404);
      }

      yield movie.$relatedQuery('actors').relate(ctx.request.body.id);

      ctx.body = ctx.request.body;
    });

    return function (_x11) {
      return _ref11.apply(this, arguments);
    };
  })());

  // Get Movie's actors.
  router.get('/movies/:id/actors', (() => {
    var _ref12 = _asyncToGenerator(function* (ctx) {
      const movie = yield _Movie2.default.query().findById(ctx.params.id);

      if (!movie) {
        throw createStatusCodeError(404);
      }

      const actors = yield movie.$relatedQuery('actors');

      ctx.body = actors;
    });

    return function (_x12) {
      return _ref12.apply(this, arguments);
    };
  })());
};

// The error returned by this function is handled in the error handler middleware in app.js.


function createStatusCodeError(statusCode) {
  return Object.assign(new Error(), {
    statusCode
  });
}