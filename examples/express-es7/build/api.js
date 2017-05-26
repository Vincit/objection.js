'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (router) {

  // Create a new Person. You can pass relations with the person
  // and they also get inserted.
  router.post('/persons', function () {
    var _ref = _asyncToGenerator(function* (req, res) {
      var person = yield _Person2.default.query().allowInsert('[pets, children.[pets, movies], movies, parent]').insertGraph(req.body);

      res.send(person);
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());

  // Patch a Person.
  router.patch('/persons/:id', function () {
    var _ref2 = _asyncToGenerator(function* (req, res) {
      var person = yield _Person2.default.query().patchAndFetchById(req.params.id, req.body);

      res.send(person);
    });

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());

  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  router.get('/persons', function () {
    var _ref3 = _asyncToGenerator(function* (req, res) {
      // We don't need to check for the existence of the query parameters because
      // we call the `skipUndefined` method. It causes the query builder methods
      // to do nothing if one of the values is undefined.
      var persons = yield _Person2.default.query().allowEager('[pets, children.[pets, movies], movies]').eager(req.query.eager).skipUndefined().where('age', '>=', req.query.minAge).where('age', '<', req.query.maxAge).where('firstName', 'like', req.query.firstName);

      res.send(persons);
    });

    return function (_x5, _x6) {
      return _ref3.apply(this, arguments);
    };
  }());

  // Delete a person.
  router.delete('/persons/:id', function () {
    var _ref4 = _asyncToGenerator(function* (req, res) {
      yield _Person2.default.query().delete().where('id', req.params.id);

      res.send({});
    });

    return function (_x7, _x8) {
      return _ref4.apply(this, arguments);
    };
  }());

  // Add a child for a Person.
  router.post('/persons/:id/children', function () {
    var _ref5 = _asyncToGenerator(function* (req, res) {
      var person = yield _Person2.default.query().findById(req.params.id);

      if (!person) {
        throwNotFound();
      }

      var child = yield person.$relatedQuery('children').insert(req.body);

      res.send(child);
    });

    return function (_x9, _x10) {
      return _ref5.apply(this, arguments);
    };
  }());

  // Add a pet for a Person.
  router.post('/persons/:id/pets', function () {
    var _ref6 = _asyncToGenerator(function* (req, res) {
      var person = yield _Person2.default.query().findById(req.params.id);

      if (!person) {
        throwNotFound();
      }

      var pet = yield person.$relatedQuery('pets').insert(req.body);

      res.send(pet);
    });

    return function (_x11, _x12) {
      return _ref6.apply(this, arguments);
    };
  }());

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  router.get('/persons/:id/pets', function () {
    var _ref7 = _asyncToGenerator(function* (req, res) {
      var person = yield _Person2.default.query().findById(req.params.id);

      if (!person) {
        throwNotFound();
      }

      // We don't need to check for the existence of the query parameters because
      // we call the `skipUndefined` method. It causes the query builder methods
      // to do nothing if one of the values is undefined.
      var pets = yield person.$relatedQuery('pets').skipUndefined().where('name', 'like', req.query.name).where('species', req.query.species);

      res.send(pets);
    });

    return function (_x13, _x14) {
      return _ref7.apply(this, arguments);
    };
  }());

  // Add a movie for a Person.
  router.post('/persons/:id/movies', function () {
    var _ref8 = _asyncToGenerator(function* (req, res) {
      // Inserting a movie for a person creates two queries: the movie insert query
      // and the join table row insert query. It is wise to use a transaction here.
      var movie = yield (0, _objection.transaction)(_Person2.default.knex(), function () {
        var _ref9 = _asyncToGenerator(function* (trx) {
          var person = yield _Person2.default.query(trx).findById(req.params.id);

          if (!person) {
            throwNotFound();
          }

          return yield person.$relatedQuery('movies', trx).insert(req.body);
        });

        return function (_x17) {
          return _ref9.apply(this, arguments);
        };
      }());

      res.send(movie);
    });

    return function (_x15, _x16) {
      return _ref8.apply(this, arguments);
    };
  }());

  // Add existing Person as an actor to a movie.
  router.post('/movies/:id/actors', function () {
    var _ref10 = _asyncToGenerator(function* (req, res) {
      var movie = yield _Movie2.default.query().findById(req.params.id);

      if (!movie) {
        throwNotFound();
      }

      yield movie.$relatedQuery('actors').relate(req.body.id);

      res.send(req.body);
    });

    return function (_x18, _x19) {
      return _ref10.apply(this, arguments);
    };
  }());

  // Get Movie's actors.
  router.get('/movies/:id/actors', function () {
    var _ref11 = _asyncToGenerator(function* (req, res) {
      var movie = yield _Movie2.default.query().findById(req.params.id);

      if (!movie) {
        throwNotFound();
      }

      var actors = yield movie.$relatedQuery('actors');

      res.send(actors);
    });

    return function (_x20, _x21) {
      return _ref11.apply(this, arguments);
    };
  }());
};

var _objection = require('objection');

var _Person = require('./models/Person');

var _Person2 = _interopRequireDefault(_Person);

var _Movie = require('./models/Movie');

var _Movie2 = _interopRequireDefault(_Movie);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

;

// The error thrown by this function is handled in the error handler middleware in router.js.
function throwNotFound() {
  var error = new Error();
  error.statusCode = 404;
  throw error;
}