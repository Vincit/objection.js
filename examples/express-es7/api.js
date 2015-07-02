import moron from 'moron';
import Person from './models/Person';
import Movie from './models/Movie';

module.exports = function (app) {

  // Create a new Person.
  app.post('/persons', async function (req, res) {
    let person = await Person
      .query()
      .insert(req.body);
      
    res.send(person);
  });


  // Patch a Person.
  app.patch('/persons/:id', async function (req, res, next) {
    let person = await Person
      .query()
      .where('id', req.params.id)
      .patch(req.body);
      
    res.send(person);
  });


  // Get all Persons. The result can be filtered using query parameters
  // `minAge`, `maxAge` and `firstName`. Relations can be fetched eagerly
  // by giving a relation expression as the `eager` query parameter.
  app.get('/persons', async function (req, res, next) {
    // We don't need to check for the existence of the query parameters.
    // The query builder methods do nothing if one of the values is undefined.
    let persons = await Person
      .query()
      .allowEager('[pets, children.[pets, movies], movies]')
      .eager(req.query.eager)
      .where('age', '>=', req.query.minAge)
      .where('age', '<', req.query.maxAge)
      .where('firstName', 'like', req.query.firstName);
      
    res.send(persons);
  });


  // Delete a person.
  app.delete('/persons/:id', async function (req, res, next) {
    await Person
      .query()
      .delete()
      .where('id', req.params.id);
      
    res.send({});
  });


  // Add a child for a Person.
  app.post('/persons/:id/children', async function (req, res, next) {
    let person = await Person
      .query()
      .where('id', req.params.id)
      .first();
    
    if (!person) { 
      throwNotFound(); 
    }
    
    let child = await person
      .$relatedQuery('children')
      .insert(req.body);
      
    res.send(child);
  });


  // Add a pet for a Person.
  app.post('/persons/:id/pets', async function (req, res, next) {
    let person = await Person
      .query()
      .where('id', req.params.id)
      .first();
      
    if (!person) { 
      throwNotFound(); 
    }
    
    let pet = await person
      .$relatedQuery('pets')
      .insert(req.body);
      
    res.send(pet);
  });


  // Get a Person's pets. The result can be filtered using query parameters
  // `name` and `species`.
  app.get('/persons/:id/pets', async function (req, res, next) {
    let person = await Person
      .query()
      .where('id', req.params.id)
      .first();
      
    if (!person) {
      throwNotFound(); 
    }
    
    // We don't need to check for the existence of the query parameters.
    // The query builder methods do nothing if one of the values is undefined.
    let pets = await person
      .$relatedQuery('pets')
      .where('name', 'like', req.query.name)
      .where('species', req.query.species);
      
    res.send(pets);
  });


  // Add a movie for a Person.
  app.post('/persons/:id/movies', async function (req, res, next) {
    // Inserting a movie for a person creates two queries: the movie insert query
    // and the join table row insert query. It is wise to use a transaction here.
    var movie = await moron.transaction(Person, async function (Person) {
      var person = await Person
        .query()
        .where('id', req.params.id)
        .first();

      if (!person) {
         throwNotFound();
       }
       
      return await person
        .$relatedQuery('movies')
        .insert(req.body); 
    });
    
    res.send(movie);
  });


  // Add existing Person as an actor to a movie.
  app.post('/movies/:id/actors', async function (req, res, next) {
    let movie = await Movie
      .query()
      .where('id', req.params.id)
      .first();
      
    if (!movie) {
      throwNotFound();
    }
    
    await movie
      .$relatedQuery('actors')
      .relate(req.body.id);

    res.send(req.body);
  });


  // Get Movie's actors.
  app.get('/movies/:id/actors', async function (req, res, next) {
    let movie = await Movie
      .query()
      .where('id', req.params.id)
      .first()
    
    if (!movie) {
      throwNotFound();
    }
    
    let actors = await movie.$relatedQuery('actors');
    
    res.send(actors);
  });
};

function throwNotFound() {
  var error = new Error();
  error.statusCode = 404;
  throw error;
}
