import { Person } from '../fixtures/person';

(async () => {
  await Person.query().withGraphFetched('pets');

  await Person.query().withGraphFetched('[pets, children.[pets, children]]');

  await Person.query().withGraphFetched({
    pets: true,
    children: {
      pets: true,
      children: true,
    },
  });

  await Person.query().withGraphFetched('[pets, children.^]');

  await Person.query().withGraphFetched('[pets, children.^3]');

  await Person.query()
    .withGraphFetched('[children.[pets, movies], movies]')
    .modifyGraph('children.pets', (builder) => {
      // Only select pets older than 10 years old for children
      // and only return their names.
      builder.where('age', '>', 10).select('name');
    });

  await Person.query()
    .withGraphFetched('[pets(selectName, onlyDogs), children(orderByAge).[pets, children]]')
    .modifiers({
      selectName: (builder) => {
        builder.select('name');
      },
      orderByAge: (builder) => {
        builder.orderBy('age');
      },
      onlyDogs: (builder) => {
        builder.where('species', 'dog');
      },
    });

  await Person.query().withGraphFetched(`
    children(defaultSelects, orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `);

  await Person.query().withGraphFetched(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

  const eager = `[]`;
  await Person.query().allowGraph('[pets, children.pets]').withGraphFetched(eager);

  await Person.query().withGraphFetched('[pets, children.pets]');

  await Person.query().withGraphJoined('[pets, children.pets]');
})();
