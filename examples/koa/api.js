'use strict'

const Person = require('./models/Person')
const Movie = require('./models/Movie')

module.exports = router => {
  /**
   * Create a new Person.
   *
   * Because we use `insertGraph` you can pass relations with the person and they
   * also get inserted and related to the person. If all you want to do is insert
   * a single person, `insertGraph` and `allowGraph` can be replaced by
   * `insert(ctx.request.body)`.
   */
  router.post('/persons', async ctx => {
    // insertGraph can run multiple queries. It's a good idea to
    // run it inside a transaction.
    const insertedGraph = await Person.transaction(async trx => {
      const insertedGraph = await Person.query(trx)
        // For security reasons, limit the relations that can be inserted.
        .allowGraph('[pets, children.[pets, movies], movies, parent]')
        .insertGraph(ctx.request.body)

      return insertedGraph
    })

    ctx.body = insertedGraph
  })

  /**
   * Fetch multiple Persons.
   *
   * The result can be filtered using various query parameters:
   *
   *  select:          a list of fields to select for the Persons
   *  name:            fuzzy search by name
   *  hasPets:         only select Persons that have one or more pets
   *  isActor:         only select Persons that are actors in one or more movies
   *  withGraph:       return a graph of relations with the results
   *  orderBy:         sort the result using this field.
   *
   *  withPetCount:    return Persons with a `petCount` column that holds the
   *                   number of pets the person has.
   *
   *  withMovieCount:  return Persons with a `movieCount` column that holds the
   *                   number of movies the person has acted in.
   */
  router.get('/persons', async ctx => {
    const query = Person.query()

    if (ctx.query.select) {
      query.select(ctx.query.select)
    }

    if (ctx.query.name) {
      // The fuzzy name search has been defined as a reusable
      // modifier. See the Person model.
      query.modify('searchByName', ctx.query.name)
    }

    if (ctx.query.hasPets) {
      query.whereExists(Person.relatedQuery('pets'))
    }

    if (ctx.query.isActor) {
      query.whereExists(Person.relatedQuery('movies'))
    }

    if (ctx.query.withGraph) {
      query
        // For security reasons, limit the relations that can be fetched.
        .allowGraph('[pets, parent, children.[pets, movies.actors], movies.actors.pets]')
        .withGraphFetched(ctx.query.withGraph)
    }

    if (ctx.query.orderBy) {
      query.orderBy(ctx.query.orderBy)
    }

    if (ctx.query.withPetCount) {
      query.select(
        Person.relatedQuery('pets')
          .count()
          .as('petCount')
      )
    }

    if (ctx.query.withMovieCount) {
      query.select(
        Person.relatedQuery('movies')
          .count()
          .as('movieCount')
      )
    }

    // You can uncomment the next line to see the SQL that gets executed.
    // query.debug();

    ctx.body = await query
  })

  /**
   * Update a single Person.
   */
  router.patch('/persons/:id', async ctx => {
    const numUpdated = await Person.query()
      .findById(ctx.params.id)
      .patch(ctx.request.body)

    ctx.body = {
      success: numUpdated == 1
    }
  })

  /**
   * Delete a person.
   */
  router.delete('/persons/:id', async ctx => {
    const numDeleted = await Person.query()
      .findById(ctx.params.id)
      .delete()

    ctx.body = {
      success: numDeleted == 1
    }
  })

  /**
   * Insert a new child for a person.
   */
  router.post('/persons/:id/children', async ctx => {
    const personId = parseInt(ctx.params.id)

    const child = await Person.relatedQuery('children')
      .for(personId)
      .insert(ctx.request.body)

    ctx.body = child
  })

  /**
   * Get a Person's children.
   *
   * The result can be filtered using various query parameters:
   *
   *  select:          a list of fields to select for the children
   *  name:            fuzzy search by name
   *
   *  actorInMovie:    only return children that are actors in this movie.
   *                   Provide the name of the movie.
   */
  router.get('/persons/:id/children', async ctx => {
    const query = Person.relatedQuery('children').for(ctx.params.id)

    if (ctx.query.select) {
      query.select(ctx.query.select)
    }

    if (ctx.query.name) {
      // The fuzzy name search has been defined as a reusable
      // modifier. See the Person model.
      query.modify('searchByName', ctx.query.name)
    }

    if (ctx.query.actorInMovie) {
      // Here's an example of a more complex query. We only select children
      // that are actors in the movie with name `ctx.query.actorInMovie`.
      // We could also achieve this using joins, but subqueries are often
      // easier to deal with than joins since they don't interfere with
      // the rest of the query.
      const movieSubquery = Person.relatedQuery('movies').where('name', ctx.query.actorInMovie)

      query.whereExists(movieSubquery)
    }

    ctx.body = await query
  })

  /**
   * Insert a new pet for a Person.
   */
  router.post('/persons/:id/pets', async ctx => {
    const personId = parseInt(ctx.params.id)

    const pet = await Person.relatedQuery('pets')
      .for(personId)
      .insert(ctx.request.body)

    ctx.body = pet
  })

  /**
   * Get a Person's pets. The result can be filtered using query parameters
   *
   * The result can be filtered using the following query parameters:
   *
   *  name:       the name of the pets to fetch
   *  species:    the species of the pets to fetch
   */
  router.get('/persons/:id/pets', async ctx => {
    const query = Person.relatedQuery('pets').for(ctx.params.id)

    if (ctx.query.name) {
      query.where('name', 'like', ctx.query.name)
    }

    if (ctx.query.species) {
      query.where('species', ctx.query.species)
    }

    const pets = await query
    ctx.body = pets
  })

  /**
   * Insert a new movie.
   */
  router.post('/movies', async ctx => {
    const movie = await Movie.query().insert(ctx.request.body)
    ctx.body = movie
  })

  /**
   * Add existing Person as an actor to a movie.
   */
  router.post('/movies/:movieId/actors/:personId', async ctx => {
    const numRelated = await Movie.relatedQuery('actors')
      .for(ctx.params.movieId)
      .relate(ctx.params.personId)

    ctx.body = {
      success: numRelated == 1
    }
  })

  /**
   * Remove a connection between a movie and an actor. Doesn't delete
   * the movie or the actor. Just removes their connection.
   */
  router.delete('/movies/:movieId/actors/:personId', async ctx => {
    const numUnrelated = await Movie.relatedQuery('actors')
      .for(ctx.params.movieId)
      .unrelate()
      .where('persons.id', ctx.params.personId)

    ctx.body = {
      success: numUnrelated == 1
    }
  })

  /**
   * Get Movie's actors.
   */
  router.get('/movies/:id/actors', async ctx => {
    const actors = await Movie.relatedQuery('actors').for(ctx.params.id)
    ctx.body = actors
  })
}
