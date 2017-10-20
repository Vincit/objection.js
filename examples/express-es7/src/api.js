import {transaction} from 'objection';
import Person from './models/Person';
import Movie from './models/Movie';

export default function(router) {
  // Create a new Person. You can pass relations with the person
  // and they also get inserted.
  router.post('/persons', async (req, res) => {
    const person = await Person.query()
      .allowInsert('[pets, children.[pets, movies], movies, parent]')
      .insertGraph(req.body);

    res.send(person);
  });

  // Patch a Person.
  router.patch('/persons/:id', async (req, res) => {
    const person = await Person.query().patchAndFetchById(
      req.params.id,
      req.body
    );

    res.send(person);
  });

  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  router.get('/persons', async (req, res) => {
    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const persons = await Person.query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .skipUndefined()
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName);

    res.send(persons);
  });

  // Delete a person.
  router.delete('/persons/:id', async (req, res) => {
    await Person.query()
      .delete()
      .where('id', req.params.id);

    res.send({});
  });

  // Add a child for a Person.
  router.post('/persons/:id/children', async (req, res) => {
    const person = await Person.query().findById(req.params.id);

    if (!person) {
      throwNotFound();
    }

    const child = await person.$relatedQuery('children').insert(req.body);

    res.send(child);
  });

  // Add a pet for a Person.
  router.post('/persons/:id/pets', async (req, res) => {
    const person = await Person.query().findById(req.params.id);

    if (!person) {
      throwNotFound();
    }

    const pet = await person.$relatedQuery('pets').insert(req.body);

    res.send(pet);
  });

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  router.get('/persons/:id/pets', async (req, res) => {
    const person = await Person.query().findById(req.params.id);

    if (!person) {
      throwNotFound();
    }

    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const pets = await person
      .$relatedQuery('pets')
      .skipUndefined()
      .where('name', 'like', req.query.name)
      .where('species', req.query.species);

    res.send(pets);
  });

  // Add a movie for a Person.
  router.post('/persons/:id/movies', async (req, res) => {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    const movie = await transaction(Person.knex(), async function(trx) {
      const person = await Person.query(trx).findById(req.params.id);

      if (!person) {
        throwNotFound();
      }

      return person.$relatedQuery('movies', trx).insert(req.body);
    });

    res.send(movie);
  });

  // Add existing Person as an actor to a movie.
  router.post('/movies/:id/actors', async (req, res) => {
    const movie = await Movie.query().findById(req.params.id);

    if (!movie) {
      throwNotFound();
    }

    await movie.$relatedQuery('actors').relate(req.body.id);

    res.send(req.body);
  });

  // Get Movie's actors.
  router.get('/movies/:id/actors', async (req, res) => {
    const movie = await Movie.query().findById(req.params.id);

    if (!movie) {
      throwNotFound();
    }

    const actors = await movie.$relatedQuery('actors');

    res.send(actors);
  });
}

// The error thrown by this function is handled in the error handler middleware in router.js.
function throwNotFound() {
  const error = new Error();
  error.statusCode = 404;
  throw error;
}
