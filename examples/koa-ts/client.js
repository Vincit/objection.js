'use strict'

/**
 * This file contains a bunch of HTTP requests that use the
 * API defined in api.js.
 */

const axios = require('axios')
const qs = require('querystring')

const req = axios.create({
  baseURL: 'http://localhost:8641/',
  paramsSerializer: qs.stringify,
})

;(async () => {
  const matt = await inserPersonWithRelations()
  await fetchPeople()

  await updatePerson(matt, { age: 41 })
  await deletePerson(matt.children[0])

  const isabella = await insertChildForPerson(matt, {
    firstName: 'Isabella',
    lastName: 'Damon',
    age: 13,
  })

  await insertChildForPerson(matt.parent, {
    firstName: 'Kyle',
    lastName: 'Damon',
    age: 52,
  })

  await fetchChildren(matt.parent)
  await insertPetForPerson(isabella, { name: 'Chewy', species: 'hamster' })
  await fetchPersonsHamsters(isabella)

  const departed = await insertMovie({ name: 'The Departed' })
  await addPersonToMovieAsActor(departed, matt)
  await removePersonFromMovie(departed, matt)
})().catch((err) => {
  console.error('error:', err.response.status, err.response.data)
})

async function inserPersonWithRelations() {
  console.log(`
    ////////////////////////////////////////////////
    //       Insert a person with relations       //
    ////////////////////////////////////////////////
  `)

  const { data: matt } = await req.post('persons', {
    firstName: 'Matt',
    lastName: 'Damon',
    age: 43,

    parent: {
      firstName: 'Kent',
      lastName: 'Damon',
      age: 70,
    },

    pets: [
      {
        name: 'Doggo',
        species: 'dog',
      },
      {
        name: 'Kat',
        species: 'cat',
      },
    ],

    movies: [
      {
        name: 'The Martian',
      },
      {
        name: 'Good Will Hunting',
      },
    ],

    children: [
      {
        firstName: 'Isabella',
        lastName: 'Damon',
        age: 13,
      },
    ],
  })

  console.dir(matt, { depth: null })
  return matt
}

async function fetchPeople() {
  console.log(`
    ////////////////////////////////////////////////
    //      Fetch people using some filters       //
    ////////////////////////////////////////////////
  `)

  const { data: allPeople } = await req.get('persons', {
    params: {
      select: ['firstName', 'lastName'],
      // Fuzzy name search. This should match to all the Damons.
      name: 'damo',
      withMovieCount: true,
      withGraph: '[pets, children]',
    },
  })

  console.dir(allPeople, { depth: null })
}

async function updatePerson(person, patch) {
  console.log(`
    ////////////////////////////////////////////////
    //              Update a person               //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.patch(`persons/${person.id}`, patch)

  console.dir(data)
}

async function deletePerson(person) {
  console.log(`
    ////////////////////////////////////////////////
    //              Delete a person               //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.delete(`persons/${person.id}`)

  console.dir(data)
}

async function insertChildForPerson(person, child) {
  console.log(`
    ////////////////////////////////////////////////
    //          Add a child for a person          //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.post(`persons/${person.id}/children`, child)

  console.dir(data)
  return data
}

async function fetchChildren(person) {
  console.log(`
    ////////////////////////////////////////////////
    //          Fetch a person's children         //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.get(`persons/${person.id}/children`, {
    params: {
      actorInMovie: 'Good Will Hunting',
    },
  })

  console.dir(data)
}

async function insertPetForPerson(person, pet) {
  console.log(`
    ////////////////////////////////////////////////
    //           Add a pet for a person           //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.post(`persons/${person.id}/pets`, pet)

  console.dir(data)
}

async function fetchPersonsHamsters(person) {
  console.log(`
    ////////////////////////////////////////////////
    //           Fetch a person's pets            //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.get(`persons/${person.id}/pets`, {
    params: {
      species: 'hamster',
    },
  })

  console.dir(data)
}

async function insertMovie(movie) {
  console.log(`
    ////////////////////////////////////////////////
    //             Insert a new movie             //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.post(`movies`, movie)

  console.dir(data)
  return data
}

async function addPersonToMovieAsActor(movie, actor) {
  console.log(`
    ////////////////////////////////////////////////
    //        Connect a movie and an actor        //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.post(`movies/${movie.id}/actors/${actor.id}`)

  console.dir(data)
}

async function removePersonFromMovie(movie, actor) {
  console.log(`
    ////////////////////////////////////////////////
    //      Disconnect a movie and an actor       //
    ////////////////////////////////////////////////
  `)

  const { data } = await req.delete(`movies/${movie.id}/actors/${actor.id}`)

  console.dir(data)
}
