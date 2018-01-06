import {transaction} from 'objection';
import Person from './Person'; // built from examples/build/models/Person
import Movie from './Movie'; // build from examples/build/models/Movie

export default router => {
  // Create a new Person. Because we use `insertGraph` you can pass relations
  // with the person and they also get inserted and related to the person. If
  // all you want to do is insert a single person, `insertGraph` and `allowInsert`
  // can be replaced by `insert(req.body)`.
  router.post('/persons', async (ctx) => {
    const graph = ctx.request.body;

    // It's a good idea to wrap `insertGraph` call in a transaction since it
    // may create multiple queries.
    const insertedGraph = await transaction(Person.knex(), trx => {
      return (
        Person.query(trx)
          // For security reasons, limit the relations that can be inserted.
          .allowInsert('[pets, children.[pets, movies], movies, parent]')
          .insertGraph(graph)
      );
    });

    ctx.body = insertedGraph;
  });

  // Patch a Person.
  router.patch('/persons/:id', async (ctx) => {
    const person = await Person.query().patchAndFetchById(ctx.params.id, ctx.request.body);

    ctx.body = person;
  });

  // Patch a person and upsert its relations.
  router.patch('/persons/:id/upsert', async (ctx) => {
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
    const upsertedGraph = await transaction(Person.knex(), trx => {
      return (
        Person.query(trx)
          // For security reasons, limit the relations that can be upserted.
          .allowUpsert('[pets, children.[pets, movies], movies, parent]')
          .upsertGraph(graph)
      );
    });

    ctx.body = upsertedGraph;
  });

  // Get multiple Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  router.get('/persons', async (ctx) => {
    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const persons = await Person.query()
      .skipUndefined()
      // For security reasons, limit the relations that can be fetched.
      .allowEager('[pets, parent, children.[pets, movies.actors], movies.actors.pets]')
      .eager(ctx.query.eager)
      .where('age', '>=', ctx.query.minAge)
      .where('age', '<', ctx.query.maxAge)
      .where('firstName', 'like', ctx.query.firstName)
      .orderBy('firstName')
      // Order eagerly loaded pets by name.
      .modifyEager('[pets, children.pets]', qb => qb.orderBy('name'));

    ctx.body = persons;
  });

  // Delete a person.
  router.delete('/persons/:id', async (ctx) => {
    await Person.query().deleteById(ctx.params.id);

    ctx.body = {};
  });

  // Add a child for a Person.
  router.post('/persons/:id/children', async (ctx) => {
    const person = await Person.query().findById(ctx.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    const child = await person.$relatedQuery('children').insert(ctx.request.body);

    ctx.body = child;
  });

  // Add a pet for a Person.
  router.post('/persons/:id/pets', async (ctx) => {
    const person = await Person.query().findById(ctx.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    const pet = await person.$relatedQuery('pets').insert(ctx.request.body);

    ctx.body = pet;
  });

  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  router.get('/persons/:id/pets', async (ctx) => {
    const person = await Person.query().findById(ctx.params.id);

    if (!person) {
      throw createStatusCodeError(404);
    }

    // We don't need to check for the existence of the query parameters because
    // we call the `skipUndefined` method. It causes the query builder methods
    // to do nothing if one of the values is undefined.
    const pets = await person
      .$relatedQuery('pets')
      .skipUndefined()
      .where('name', 'like', ctx.request.body.name)
      .where('species', ctx.request.body.species);

    ctx.body = pets;
  });

  // Add a movie for a Person.
  router.post('/persons/:id/movies', async (ctx) => {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    const movie = await transaction(Person.knex(), async function(trx) {
      const person = await Person.query(trx).findById(ctx.params.id);

      if (!person) {
        throw createStatusCodeError(404);
      }

      return person.$relatedQuery('movies', trx).insert(ctx.request.body);
    });

    ctx.body = movie;
  });

  // Add existing Person as an actor to a movie.
  router.post('/movies/:id/actors', async (ctx) => {
    const movie = await Movie.query().findById(ctx.params.id);

    if (!movie) {
      throw createStatusCodeError(404);
    }

    await movie.$relatedQuery('actors').relate(ctx.request.body.id);

    ctx.body = ctx.request.body;
  });

  // Get Movie's actors.
  router.get('/movies/:id/actors', async (ctx) => {
    const movie = await Movie.query().findById(ctx.params.id);

    if (!movie) {
      throw createStatusCodeError(404);
    }

    const actors = await movie.$relatedQuery('actors');

    ctx.body = actors;
  });
};

// The error returned by this function is handled in the error handler middleware in app.js.
function createStatusCodeError(statusCode) {
  return Object.assign(new Error(), {
    statusCode
  });
}
