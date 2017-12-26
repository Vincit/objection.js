'use strict';

/**
 * This file contains a bunch of HTTP requests that use the
 * API defined in api.js.
 */

const axios = require('axios');

const req = axios.create({
  baseURL: 'http://localhost:8641/'
});

(async () => {
  ////////////////////////////////////////////////
  // Insert some people
  ////////////////////////////////////////////////

  let sylvester = await req.post('persons', {
    firstName: 'Sylvester',
    lastName: 'Stallone',
    age: 68
  });

  console.log('inserted', sylvester.data);

  let ben = await req.post('persons', {
    firstName: 'Ben',
    lastName: 'Affleck',
    age: 40
  });

  console.log('inserted', ben.data);

  ////////////////////////////////////////////////
  // Insert a person with relations
  ////////////////////////////////////////////////

  let matt = await req.post('persons', {
    firstName: 'Matt',
    lastName: 'Damon',
    age: 43,

    parent: {
      firstName: 'Kent',
      lastName: 'Damon',
      age: 70
    },

    pets: [
      {
        name: 'Doggo',
        species: 'dog'
      },
      {
        name: 'Kat',
        species: 'cat'
      }
    ],

    movies: [
      {
        name: 'The Martian'
      },
      {
        name: 'Good Will Hunting'
      }
    ]
  });

  console.log('inserted', matt.data);

  ////////////////////////////////////////////////
  // Patch a person
  ////////////////////////////////////////////////

  // Patch Matt Damon's father's age.
  let kent = await req.patch(`persons/${matt.data.parent.id}`, {
    age: 71
  });

  console.log('patched', kent.data);

  ////////////////////////////////////////////////
  // Upsert a graph
  ////////////////////////////////////////////////

  // This updates kent and his relations to match the graph we send. The relations
  // that are not mentioned at all, are left alone.
  //
  // What happens is:
  //    - `Kat` gets deleted since it is not in the sent graph
  //    - `Doggo`'s name gest updated
  //    - `Kitty` gets inserted since it didn't previously exist.
  kent = await req.patch(`persons/${matt.data.id}/upsert`, {
    id: matt.data.id,

    pets: [
      {
        id: matt.data.pets[0].id,
        name: 'The dog'
      },
      {
        name: 'Kitty',
        species: 'cat'
      }
    ]
  });

  console.log('upserted', kent.data);

  ////////////////////////////////////////////////
  // Add existing person as an actorn in a movie
  ////////////////////////////////////////////////

  // Add Ben Affleck to Good Will Hunting.
  let actor = await req.post(`movies/${matt.data.movies[1].id}/actors`, {
    id: ben.data.id
  });

  console.log('added actor', actor.data);

  ////////////////////////////////////////////////
  // Add a pet for a person
  ////////////////////////////////////////////////

  let theHound = await req.post(`persons/${ben.data.id}/pets`, {
    name: 'The Hound',
    species: 'dog'
  });

  console.log('added pet', theHound.data);

  ////////////////////////////////////////////////
  // Fetch Persons
  ////////////////////////////////////////////////

  let people = await req.get('persons', {
    params: {
      minAge: 41,
      eager: `[
        parent,
        children,
        pets,

        movies.[
          actors.[
            pets
          ]
        ]
      ]`
    }
  });

  console.dir(people.data, { depth: null });
})().catch(err => {
  console.error(err.response.data);
});
