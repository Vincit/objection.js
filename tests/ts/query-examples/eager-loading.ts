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

// Type-level tests for withGraphFetched narrowing

// Borrowed helpers (duplicated locally for TS-only tests)
type TypeEqual<T, U> = Exclude<T, U> extends never
  ? Exclude<U, T> extends never
    ? true
    : false
  : false;
const expectsTrue = <T extends true>() => 1;
const expectsFalse = <T extends false>() => 1;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

(async () => {
  // Object expression: keep only `pets` relation; non-relational fields remain
  const r1 = await Person.query().withGraphFetched({ pets: true });
  type T1 = typeof r1[number];
  expectsTrue<TypeEqual<HasKey<T1, 'pets'>, true>>();
  expectsFalse<TypeEqual<HasKey<T1, 'children'>, false>>();
  expectsFalse<TypeEqual<HasKey<T1, 'mom'>, false>>();
  expectsFalse<TypeEqual<HasKey<T1, 'movies'>, false>>();
  // non-relational still present
  expectsTrue<TypeEqual<HasKey<T1, 'id'>, true>>();
  expectsTrue<TypeEqual<HasKey<T1, 'firstName'>, true>>();

  // Nested object expression: include children, but inside children only pets
  const r2 = await Person.query().withGraphFetched({ children: { pets: true } });
  type T2 = typeof r2[number];
  expectsTrue<TypeEqual<HasKey<T2, 'children'>, true>>();
  type C2 = NonNullable<T2['children']>[number];
  expectsTrue<TypeEqual<HasKey<C2, 'pets'>, true>>();
  expectsFalse<TypeEqual<HasKey<C2, 'children'>, false>>();
  expectsFalse<TypeEqual<HasKey<C2, 'mom'>, false>>();

  // Maybe-single: findById returns Person | undefined, narrowed to selected relation keys
  const p1 = await Person.query().findById(1).withGraphFetched({ mom: true });
  type P1 = typeof p1;
  // When defined, must have mom and not dad
  type P1Def = Exclude<P1, undefined>;
  expectsTrue<TypeEqual<HasKey<P1Def, 'mom'>, true>>();
  expectsFalse<TypeEqual<HasKey<P1Def, 'dad'>, false>>();

  // String expression overload stays non-narrowed (deprecated but supported)
  const r3 = await Person.query().withGraphFetched('[pets]');
  type T3 = typeof r3[number];
  // Original relations like 'mom' are still present in the type
  expectsTrue<TypeEqual<HasKey<T3, 'mom'>, true>>();
  expectsTrue<TypeEqual<HasKey<T3, 'children'>, true>>();
})();
