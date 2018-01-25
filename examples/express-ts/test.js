const axios = require('axios');
const assert = require('chai').assert;
const Knex = require('knex');

const knexConfig = require('./knexfile');
const knex = Knex(knexConfig['development']);

before(() => {
  return clearDatabase(knex);
});

after(() => {
  knex.destroy();
});

const req = axios.create({
  baseURL: 'http://localhost:8641/'
});

const bradley = {
  firstName: 'Bradley',
  lastName: 'Cooper',
  age: 40
};
const jennifer = {
  firstName: 'Jennifer',
  lastName: 'Lawrence',
  age: 24
};
const kent = {
  firstName: 'Kent',
  lastName: 'Damon',
  age: 70
};
const matt = {
  firstName: 'Matt',
  lastName: 'Damon',
  age: 42
};
const sage = {
  firstName: 'Sage',
  lastName: 'Stallone',
  age: 36
};
const sylvester = {
  firstName: 'Sylvester',
  lastName: 'Stallone',
  age: 68
};

const allPersons = [bradley, jennifer, kent, matt, sage, sylvester];

const coco = {
  name: 'Coco',
  species: 'dog'
};
const fluffy = {
  name: 'Fluffy',
  species: 'dog'
};
const kitty = {
  name: 'Kitty',
  species: 'cat'
};
const scrappy = {
  name: 'Scrappy',
  species: 'dog'
};

const hungerGames = {
  name: 'The Hunger Games'
};
const rockyV = {
  name: 'Rocky V'
};
const silverLinings = {
  name: 'Silver Linings Playbook'
};

describe('adding persons', async () => {
  it('creates individual persons', async () => {
    const createdAt = new Date();

    let output = await req.post('persons', jennifer);
    checkSubset(output.data, jennifer, createdAt, createdAt);
    jennifer.id = output.data.id;
    output = await req.get(`persons/${output.data.id}`);
    checkSubset(output.data, jennifer, createdAt, createdAt);

    output = await req.post('persons', bradley);
    checkSubset(output.data, bradley, createdAt, createdAt);
    bradley.id = output.data.id;

    output = await req.post('persons', sylvester);
    checkSubset(output.data, sylvester, createdAt, createdAt);
    sylvester.id = output.data.id;
  });

  it('creates person with relations', async () => {
    const createdAt = new Date();
    const graph = Object.assign({}, matt, { parent: kent });

    let output = await req.post('persons', graph);
    const kentOut = output.data.parent;
    const mattOut = output.data;

    checkSubset(mattOut, matt, createdAt, createdAt);
    matt.id = mattOut.id;
    output = await req.get(`persons/${matt.id}`);
    checkSubset(output.data, matt, createdAt, createdAt);

    checkSubset(kentOut, kent, createdAt, createdAt);
    kent.id = kentOut.id;
    output = await req.get(`persons/${kent.id}`);
    checkSubset(output.data, kent, createdAt, createdAt);
  });
});

describe('modifying persons', () => {
  it('adds child to a person', async () => {
    const createdAt = new Date();

    let output = await req.post(`persons/${sylvester.id}/children`, sage);
    checkSubset(output.data, sage, createdAt, createdAt);
    sage.id = output.data.id;
    output = await req.get(`persons/${sage.id}`);
    checkSubset(output.data, sage, createdAt, createdAt);
  });

  it('adds pets to a person', async () => {
    let output = await req.post(`persons/${jennifer.id}/pets`, fluffy);
    checkSubset(output.data, fluffy);
    fluffy.id = output.data.id;
    fluffy.ownerId = jennifer.id;
    output = await req.get(`pets/${fluffy.id}`);
    checkSubset(output.data, fluffy);

    output = await req.post(`persons/${jennifer.id}/pets`, scrappy);
    checkSubset(output.data, scrappy);
    scrappy.id = output.data.id;
    scrappy.ownerId = jennifer.id;

    output = await req.post(`persons/${jennifer.id}/pets`, kitty);
    checkSubset(output.data, kitty);
    kitty.id = output.data.id;
    kitty.ownerId = jennifer.id;

    output = await req.post(`persons/${kent.id}/pets`, coco);
    checkSubset(output.data, coco);
    coco.id = output.data.id;
    coco.ownerId = kent.id;
  });

  it('adds movies to a person', async () => {
    let output = await req.post(`persons/${jennifer.id}/movies`, silverLinings);
    checkSubset(output.data, silverLinings);
    silverLinings.id = output.data.id;
    output = await req.get(`movies/${silverLinings.id}`);
    checkSubset(output.data, silverLinings);

    output = await req.post(`persons/${jennifer.id}/movies`, hungerGames);
    checkSubset(output.data, hungerGames);
    hungerGames.id = output.data.id;

    output = await req.post(`persons/${sage.id}/movies`, rockyV);
    checkSubset(output.data, rockyV);
    rockyV.id = output.data.id;
  });

  it('adds an actor to a movie', async () => {
    await req.post(`movies/${silverLinings.id}/actors`, { id: bradley.id });
    let output = await req.get(`movies/${silverLinings.id}/actors`);
    const actors = output.data;
    assert.isArray(actors);
    checkSubset(actors[0], jennifer);
    checkSubset(actors[1], bradley);
  });

  it('updates a person', async () => {
    const updatedAt = new Date();
    const patch = {
      address: {
        street: 'Somestreet 10',
        city: 'Tampere'
      },
      age: 25
    };
    Object.assign(jennifer, patch);

    let output = await req.patch(`persons/${jennifer.id}`, patch);
    checkSubset(output.data, jennifer, updatedAt);
    output = await req.get(`persons/${jennifer.id}`);
    checkSubset(output.data, jennifer, updatedAt);
  });
});

describe('reading persons', () => {
  it('reads all persons', async () => {
    const personMap = new Map();
    allPersons.forEach(person => {
      personMap.set(person.id, person);
    });

    const output = await req.get('persons');
    const outputPersons = output.data;
    assert.isArray(outputPersons);
    outputPersons.forEach(person => {
      checkSubset(person, personMap.get(person.id));
    });
  });

  it('filters persons without eager', async () => {
    const minAge = 30,
      maxAge = 50;
    const personMap = new Map();
    allPersons.forEach(person => {
      if (person.age >= minAge && person.age <= maxAge) {
        personMap.set(person.id, person);
      }
    });

    const output = await req.get(`persons?minAge=${minAge}&maxAge=${maxAge}`);
    const personsOut = output.data;
    assert.isArray(personsOut);
    assert.equal(personsOut.length, personMap.size, 'person count');
    personsOut.forEach(person => {
      assert(personMap.has(person.id));
      checkSubset(person, personMap.get(person.id));
    });
  });

  it('filters persons with eager', async () => {
    const output = await req.get(`persons?minAge=60&eager=%5Bpets,children.%5Bmovies,pets%5D%5D`);
    const personsOut = output.data;
    assert.isArray(personsOut);
    assert.equal(personsOut.length, 2, 'person count');

    const kentOut = personsOut[personsOut[0].id === kent.id ? 0 : 1];
    const sylvesterOut = personsOut[personsOut[0].id === sylvester.id ? 0 : 1];

    checkSubset(kentOut, kent);
    assert.isArray(kentOut.children);
    assert.equal(kentOut.children.length, 1, 'child count');
    checkSubset(kentOut.children[0], matt);
    assert.deepEqual(kentOut.pets, [coco]);

    checkSubset(sylvesterOut, sylvester);
    assert.isArray(sylvesterOut.children);
    assert.equal(sylvesterOut.children.length, 1, 'child count');
    checkSubset(sylvesterOut.children[0], sage);
    assert.deepEqual(sylvesterOut.pets, []);
  });

  it("reads a person's pets", async () => {
    const output = await req.get(`persons/${jennifer.id}/pets?species=dog`);
    const petsOut = output.data;
    assert.isArray(petsOut);
    assert.equal(petsOut.length, 2, 'pet count');

    const fluffyOut = petsOut[petsOut[0].id === fluffy.id ? 0 : 1];
    const scrappyOut = petsOut[petsOut[0].id === scrappy.id ? 0 : 1];

    assert.deepEqual(fluffyOut, fluffy);
    assert.deepEqual(scrappyOut, scrappy);
  });

  it("reads a person's movies", async () => {
    const output = await req.get(`persons/${jennifer.id}/movies`);
    const moviesOut = output.data;
    assert.isArray(moviesOut);
    assert.equal(moviesOut.length, 2, 'pet count');

    const silverLiningsOut = moviesOut[moviesOut[0].id === silverLinings.id ? 0 : 1];
    const hungerGamesOut = moviesOut[moviesOut[0].id === hungerGames.id ? 0 : 1];

    assert.deepEqual(silverLiningsOut, silverLinings);
    assert.deepEqual(hungerGamesOut, hungerGames);
  });
});

describe('error handling', () => {
  it("declines an insert post that's missing a required field", async () => {
    try {
      let output = await req.post('persons', {
        lastName: 'Lawrence',
        age: 24
      });
      assert(false, 'should have errored');
    } catch (err) {
      const response = err.response;
      assert.strictEqual(response.status, 400);
      const firstNameData = response.data.firstName;
      assert.exists(firstNameData);
      assert.strictEqual(firstNameData[0].keyword, 'required');
    }
  });

  it("declines an eager insert post that's missing a required field", async () => {
    try {
      let output = await req.post(`persons/${jennifer.id}/pets`, {
        species: 'dog'
      });
      assert(false, 'should have errored');
    } catch (err) {
      const response = err.response;
      assert.strictEqual(response.status, 400);
      const nameData = response.data.name;
      assert.exists(nameData);
      assert.strictEqual(nameData[0].keyword, 'required');
    }
  });

  it('declines an eager insert post into an invalid model ID', async () => {
    try {
      let output = await req.post(`persons/9999/pets`, {
        name: 'Rex',
        species: 'dog'
      });
      assert(false, 'should have errored');
    } catch (err) {
      assert.strictEqual(err.response.status, 404);
    }
  });
});

describe('deleting objects', () => {
  it('deletes a person', async () => {
    let output = await req.delete(`persons/${bradley.id}`);
    assert.strictEqual(output.status, 200);
    assert(output.data.dropped, 'confirmed drop');
  });
});

function checkSubset(actual, expected, updatedAfter = null, createdAfter = null) {
  if (createdAfter) {
    assert.exists(actual.createdAt, 'creation time');
    const createdAt = new Date(actual.createdAt);
    assert.isAbove(createdAt.getTime(), createdAfter.getTime());
  }
  if (updatedAfter) {
    assert.exists(actual.updatedAt, 'update time');
    const updatedAt = new Date(actual.updatedAt);
    assert.isAbove(updatedAt.getTime(), updatedAfter.getTime());
  }
  for (const property in expected) {
    assert.deepEqual(actual[property], expected[property], `property ${property}`);
  }
}

function clearDatabase(knex) {
  const tables = ['Person', 'Movie', 'Animal', 'Person_Movie'];
  return Promise.all(tables.map(table => knex(table).del()));
}
