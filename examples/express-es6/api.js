'use strict';

const transaction = require('objection').transaction;
const Person = require('./models/Person');
const Movie = require('./models/Movie');

module.exports = app => {
  // Create a new Person. Because we use `insertGraph` you can pass relations
  // with the person and they also get inserted and related to the person. If
  // all you want to do is insert a single person, `insertGraph` and `allowInsert`
  // can be replaced by `insert(req.body)`.
  app.post('/persons', function*(req, res) {
    const graph = req.body;

    // It's a good idea to wrap `insertGraph` call in a transaction since it
    // may create multiple queries.
    const insertedGraph = yield transaction(Person.knex(), trx => {
      return (
        Person.query(trx)
          // For security reasons, limit the relations that can be inserted.
          .allowInsert('[pets, children.[pets, movies], movies, parent]')
          .insertGraph(graph)
      );
    });

    res.send(insertedGraph);
  });

  // Patch a single Person.
  app.patch('/persons/:id', function*(req, res) {
    const person = yield Person.query().patchAndFetchById(req.params.id, req.body);

    res.send(person);
  });

  // Patch a person and upsert its relations.
  app.patch('/persons/:id/upsert', function*(req, res) {
    const graph = req.body;

    // Make sure only one person was sent.
    if (Array.isArray(graph)) {
      throw createStatusCodeError(400);
    }

    // Make sure the person has the correct id because `upsertGraph` uses the id fields
    // to determine which models need to be updated and which inserted.
    graph.id = parseInt(req.params.id, 10);

    // It's a good idea to wrap `upsertGraph` call in a transaction since it
    // may create multiple queries.
    const upsertedGraph = yield transaction(Person.knex(), trx => {
      return (
        Person.query(trx)
          // For security reasons, limit the relations that can be upserted.
          .allowUpsert('[pets, children.[pets, movies], movies, parent]')
          .upsertGraph(graph)
      );
    });

    res.send(upsertedGraph);
  });

  // Get multiple Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', function*(req, res) {
    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const persons = yield Person.query()
      .skipUndefined()
      // For security reasons, limit the relations that can be fetched.
      .allowEager('[pets, parent, children.[pets, movies.actors], movies.actors.pets]')
      .eager(req.query.eager)
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName)
      .orderBy('firstName')
      // Order eagerly loaded pets by name.
      .modifyEager('[pets, children.pets]', qb => qb.orderBy('name'));

    res.send(persons);
  });

  // Delete a person.
  app.delete('/persons/:id', function*(req, res) {
    yield Person.query().deleteById(req.params.id);

    res.send({});
  });

  // Add a child for a Person.
  app.post('/persons/:id/children', function*(req, res) {
    const person = yield Person.query().findById(req.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    const child = yield person.$relatedQuery('children').insert(req.body);

    res.send(child);
  });

  // Add a pet for a Person.
  app.post('/persons/:id/pets', function*(req, res) {
    const person = yield Person.query().findById(req.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    const pet = yield person.$relatedQuery('pets').insert(req.body);

    res.send(pet);
  });

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', function*(req, res) {
    const person = yield Person.query().findById(req.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const pets = yield person
      .$relatedQuery('pets')
      .skipUndefined()
      .where('name', 'like', req.query.name)
      .where('species', req.query.species);

    res.send(pets);
  });

  // Add a movie for a Person.
  app.post('/persons/:id/movies', function*(req, res) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    const movie = yield transaction(Person.knex(), function*(trx) {
      const person = yield Person.query(trx).findById(req.params.id);

      if (!person) {
        throw createStatusCodeError(404);
      }

      return yield person.$relatedQuery('movies', trx).insert(req.body);
    });

    res.send(movie);
  });

  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', function*(req, res) {
    const movie = yield Movie.query().findById(req.params.id);

    if (!movie) {
      throw createStatusCodeError(404);
    }

    yield movie.$relatedQuery('actors').relate(req.body.id);

    res.send(req.body);
  });

  // Get Movie's actors.
  app.get('/movies/:id/actors', function*(req, res) {
    const movie = yield Movie.query().findById(req.params.id);

    if (!movie) {
      throw createStatusCodeError(404);
    }

    const actors = yield movie.$relatedQuery('actors');
    res.send(actors);
  });
};

// The error returned by this function is handled in the error handler middleware in app.js.
function createStatusCodeError(statusCode) {
  return Object.assign(new Error(), {
    statusCode
  });
}
