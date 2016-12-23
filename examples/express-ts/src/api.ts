import * as objection from 'objection';
import * as express from 'express';

import Person from './models/Person';
import Movie from './models/Movie';

export default function (app: express.Application) {

  // Create a new Person.
  app.post('/persons', function (req, res, next) {
    return Person
      .query()
      .insert(req.body)
      .then(person => res.send(person))
      .catch(next);
  });

  // Patch a Person.
  app.patch('/persons/:id', function (req, res, next) {
    return Person
      .query()
      .patchAndFetchById(req.params.id, req.body)
      .then(person => res.send(person))
      .catch(next);
  });

  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', function (req, res, next) {
    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    return Person
      .query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .skipUndefined()
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName)
      .then(persons => res.send(persons))
      .catch(next);
  });

  // Delete a person.
  app.delete('/persons/:id', function (req, res, next) {
    return Person
      .query()
      .delete()
      .where('id', req.params.id)
      .then(() => res.send({}))
      .catch(next);
  });

  // Add a child for a Person.
  app.post('/persons/:id/children', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      res.sendStatus(404);
    } else {
      await person
        .$relatedQuery('children')
        .insert(req.body)
        .then(child => res.send(child))
        .catch(next);
    }
  });

  // Add a pet for a Person.
  app.post('/persons/:id/pets', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      res.sendStatus(404);
    } else {
      await person
        .$relatedQuery('pets')
        .insert(req.body)
        .then(pet => res.send(pet))
        .catch(next);
    }
  });

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', async function (req, res, next) {
    const person = await Person
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!person) {
      res.sendStatus(404);
    } else {

      // We don't need to check for the existence of the query parameters because
      // we call the `skipUndefined` method. It causes the query builder methods
      // to do nothing if one of the values is undefined.
      return person
        .$relatedQuery('pets')
        .skipUndefined()
        .where('name', 'like', req.query.name)
        .where('species', req.query.species)
        .then(pets => res.send(pets))
        .catch(next);
    }
  });

  // Add a movie for a Person.
  app.post('/persons/:id/movies', function (req, res, next) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    return objection.transaction(Person, async (Person) => {
      const person = await Person
        .query()
        .findById(req.params.id)
        .catch(next);

      if (!person) {
        res.sendStatus(404);
      } else {
        await person
          .$relatedQuery('movies')
          .insert(req.body)
          .then(movie => res.send(movie))
          .catch(next);
      }
    });
  });

  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', async function (req, res, next) {
    const movie = await Movie
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!movie) {
      res.sendStatus(404);
    } else {
      await movie
        .$relatedQuery('actors')
        .relate(req.body.id)
        .then(() => res.send(req.body))
        .catch(next);
    }
  });

  // Get Movie's actors.
  app.get('/movies/:id/actors', async function (req, res, next) {
    const movie = await Movie
      .query()
      .findById(req.params.id)
      .catch(next);

    if (!movie) {
      res.sendStatus(404);
    } else {
      await movie
        .$relatedQuery('actors')
        .then(movie => res.send(movie))
        .catch(next);
    }
  });
};
