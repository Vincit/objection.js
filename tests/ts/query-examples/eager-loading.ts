import { Person } from '../fixtures/person';

(async () => {
  await Person.query().eager('pets');

  await Person.query().eager('[pets, children.[pets, children]]');

  await Person.query().eager({
    pets: true,
    children: {
      pets: true,
      children: true
    }
  });

  await Person.query().eager('[pets, children.^]');

  await Person.query().eager('[pets, children.^3]');

  await Person.query()
    .eager('[children.[pets, movies], movies]')
    .modifyEager('children.pets', builder => {
      // Only select pets older than 10 years old for children
      // and only return their names.
      builder.where('age', '>', 10).select('name');
    });

  await Person.query().eager(
    '[pets(selectName, onlyDogs), children(orderByAge).[pets, children]]',
    {
      selectName: builder => {
        builder.select('name');
      },
      orderByAge: builder => {
        builder.orderBy('age');
      },
      onlyDogs: builder => {
        builder.where('species', 'dog');
      }
    }
  );

  await Person.query().eager(`
    children(defaultSelects, orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `);

  await Person.query().eager(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

  const eager = `[]`;
  await Person.query()
    .allowEager('[pets, children.pets]')
    .eager(eager);

  await Person.query()
    .eagerAlgorithm(Person.JoinEagerAlgorithm)
    .eager('[pets, children.pets]');

  await Person.query().joinEager('[pets, children.pets]');
})();
