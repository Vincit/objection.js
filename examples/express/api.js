var objection = require('objection');
var Person = require('./models/Person');
var Movie = require('./models/Movie');

module.exports = function (app) {

  // Create a new Person.
  app.post('/persons', function (req, res, next) {
    Person
      .query()
      .insert(req.body)
      .then(function (person) { res.send(person); })
      .catch(next);
  });


  // Patch a Person.
  app.patch('/persons/:id', function (req, res, next) {
    Person
      .query()
      .where('id', req.params.id)
      .patch(req.body)
      .then(function (person) { res.send(person); })
      .catch(next);
  });


  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', function (req, res, next) {
    // We don't need to check for the existence of the query parameters.
    // The query builder methods do nothing if one of the values is undefined.
    Person
      .query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName)
      .then(function (persons) { res.send(persons); })
      .catch(next);
  });


  // Delete a person.
  app.delete('/persons/:id', function (req, res, next) {
    Person
      .query()
      .delete()
      .where('id', req.params.id)
      .then(function () { res.send({}); })
      .catch(next);
  });


  // Add a child for a Person.
  app.post('/persons/:id/children', function (req, res, next) {
    Person
      .query()
      .where('id', req.params.id)
      .first()
      .then(function (person) {
        if (!person) { throwNotFound(); }
        return person
          .$relatedQuery('children')
          .insert(req.body);
      })
      .then(function (child) { res.send(child); })
      .catch(next);
  });


  // Add a pet for a Person.
  app.post('/persons/:id/pets', function (req, res, next) {
    Person
      .query()
      .where('id', req.params.id)
      .first()
      .then(function (person) {
        if (!person) { throwNotFound(); }
        return person
          .$relatedQuery('pets')
          .insert(req.body);
      })
      .then(function (pet) { res.send(pet); })
      .catch(next);
  });


  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', function (req, res, next) {
    Person
      .query()
      .where('id', req.params.id)
      .first()
      .then(function (person) {
        if (!person) { throwNotFound(); }
        // We don't need to check for the existence of the query parameters.
        // The query builder methods do nothing if one of the values is undefined.
        return person
          .$relatedQuery('pets')
          .where('name', 'like', req.query.name)
          .where('species', req.query.species);
      })
      .then(function (pets) { res.send(pets); })
      .catch(next);
  });


  // Add a movie for a Person.
  app.post('/persons/:id/movies', function (req, res, next) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    objection.transaction(Person, function (Person) {
      return Person
        .query()
        .where('id', req.params.id)
        .first()
        .then(function (person) {
          if (!person) { throwNotFound(); }
          return person
            .$relatedQuery('movies')
            .insert(req.body);
        });
    }).then(function (movie) {
      res.send(movie);
    }).catch(next);
  });


  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', function (req, res, next) {
    Movie
      .query()
      .where('id', req.params.id)
      .first()
      .then(function (movie) {
        if (!movie) { throwNotFound(); }
        return movie
          .$relatedQuery('actors')
          .relate(req.body.id);
      })
      .then(function () { res.send(req.body); })
      .catch(next);
  });


  // Get Movie's actors.
  app.get('/movies/:id/actors', function (req, res, next) {
    Movie
      .query()
      .where('id', req.params.id)
      .first()
      .then(function (movie) {
        if (!movie) { throwNotFound(); }
        return movie.$relatedQuery('actors');
      })
      .then(function (actors) { res.send(actors); })
      .catch(next);
  });

};

function throwNotFound() {
  var error = new Error();
  error.statusCode = 404;
  throw error;
}
