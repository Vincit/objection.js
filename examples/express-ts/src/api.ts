import * as objection from 'objection';
import * as express from 'express';

import Person from './models/Person';
import Movie from './models/Movie';

export default function (app: express.Application) {

  // Create a new Person.
  app.post('/persons', async function (req, res, next) {
    const person = await Person
      .query()
      .insert(req.body)
      .catch(next);

    res.send(person);
  });

  // Patch a Person.
  app.patch('/persons/:id', async function (req, res, next) {
    const person = await Person
      .query()
      .patchAndFetchById(req.params.id, req.body);

    res.send(person);
  });

  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', async function (req, res, next) {
    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const persons = await Person
      .query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .skipUndefined()
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName)
      .catch(next);

    res.send(persons);
  });

  // Delete a person.
  app.delete('/persons/:id', async function (req, res, next) {
    await Person
      .query()
      .delete()
      .where('id', req.params.id)
      .catch(next);

    res.send({});
  });

  // Add a child for a Person.
  app.post('/persons/:id/children', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      next(throwNotFound);
    }

    const child = await person
      .$relatedQuery('children')
      .insert(req.body)
      .catch(next);

    res.send(child);
  });

  // Add a pet for a Person.
  app.post('/persons/:id/pets', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      next(throwNotFound);
    }

    const pet = await person
      .$relatedQuery('pets')
      .insert(req.body)
      .catch(next);

    res.send(pet);
  });

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      next(throwNotFound);
    }

    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const pets = await person
      .$relatedQuery('pets')
      .skipUndefined()
      .where('name', 'like', req.query.name)
      .where('species', req.query.species)
      .catch(next);

    res.send(pets);
  });

  // Add a movie for a Person.
  app.post('/persons/:id/movies', async function (req, res, next) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    const movie = await objection.transaction(Person, async function (Person) {
      const person = await Person
        .query()
        .findById(req.params.id)
        .catch(next);

      if (!person) {
        next(throwNotFound);
      }

      return await person
        .$relatedQuery('movies')
        .insert(req.body)
        .catch(next);
    });

    res.send(movie);
  });

  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', async function (req, res, next) {
    const movie = await Movie
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!movie) {
      next(throwNotFound);
    }

    await movie
      .$relatedQuery('actors')
      .relate(req.body.id)
      .catch(next);

    res.send(req.body);
  });

  // Get Movie's actors.
  app.get('/movies/:id/actors', async function (req, res, next) {
    const movie = await Movie
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!movie) {
      next(throwNotFound);
    }

    const actors = await movie.$relatedQuery('actors');

    res.send(actors);
  });
};

// The error thrown by this function is handled in the error handler middleware in app.js.
function throwNotFound() {
  throw new Error('not found');
}
