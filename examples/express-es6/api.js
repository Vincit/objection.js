'use strict';

const transaction = require('objection').transaction;
const Person = require('./models/Person');
const Movie = require('./models/Movie');

module.exports = function (app) {

  // Create a new Person.
  app.post('/persons', function* (req, res) {
    const person = yield Person
      .query()
      .insertAndFetch(req.body);

    res.send(person);
  });


  // Patch a Person.
  app.patch('/persons/:id', function* (req, res) {
    const person = yield Person
      .query()
      .patchAndFetchById(req.params.id, req.body);
      
    res.send(person);
  });


  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', function* (req, res) {
    // We don't need to check for the existence of the query parameters.
    // The query builder methods do nothing if one of the values is undefined.
    const persons = yield Person
      .query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName)
      .orderBy('firstName')
      .filterEager('pets', function (builder) {
        // Order eagerly loaded pets by name.
        builder.orderBy('name')
      })
      .filterEager('children.pets', function (builder) {
        // Only fetch dogs for children.
        builder.where('species', 'dog')
      })
      .then(function (persons) { res.send(persons); })
      
    res.send(persons);
  });


  // Delete a person.
  app.delete('/persons/:id', function* (req, res) {
    yield Person
      .query()
      .deleteById(req.params.id);
      
    res.send({});
  });


  // Add a child for a Person.
  app.post('/persons/:id/children', function* (req, res) {
    const person = yield Person
      .query()
      .findById(req.params.id);
    
    if (!person) { 
      throwNotFound(); 
    }

    const child = yield person
      .$relatedQuery('children')
      .insert(req.body);
      
    res.send(child);
  });


  // Add a pet for a Person.
  app.post('/persons/:id/pets', function* (req, res) {
    const person = yield Person
      .query()
      .findById(req.params.id);
      
    if (!person) { 
      throwNotFound(); 
    }

    const pet = yield person
      .$relatedQuery('pets')
      .insert(req.body);
      
    res.send(pet);
  });


  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', function* (req, res) {
    const person = yield Person
      .query()
      .findById(req.params.id);
      
    if (!person) {
      throwNotFound(); 
    }
    
    // We don't need to check for the existence of the query parameters.
    // The query builder methods do nothing if one of the values is undefined.
    const pets = yield person
      .$relatedQuery('pets')
      .where('name', 'like', req.query.name)
      .where('species', req.query.species);
      
    res.send(pets);
  });


  // Add a movie for a Person.
  app.post('/persons/:id/movies', function* (req, res) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    const movie = yield transaction(Person, function* (Person) {
      const person = yield Person
        .query()
        .findById(req.params.id);

      if (!person) {
        throwNotFound();
      }
       
      return yield person
        .$relatedQuery('movies')
        .insert(req.body); 
    });
    
    res.send(movie);
  });


  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', function* (req, res) {
    const movie = yield Movie
      .query()
      .findById(req.params.id);
      
    if (!movie) {
      throwNotFound();
    }
    
    yield movie
      .$relatedQuery('actors')
      .relate(req.body.id);

    res.send(req.body);
  });


  // Get Movie's actors.
  app.get('/movies/:id/actors', function* (req, res) {
    const movie = yield Movie
      .query()
      .findById(req.params.id);
    
    if (!movie) {
      throwNotFound();
    }

    const actors = yield movie.$relatedQuery('actors');
    
    res.send(actors);
  });
};

// The error thrown by this function is handled in the error handler middleware in app.js.
function throwNotFound() {
  const error = new Error();
  error.statusCode = 404;
  throw error;
}
