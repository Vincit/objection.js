// Type tests for the narrowing of `withGraphFetched()` / `withGraphJoined()`
// results: fetched relations become required on the result type.
//
// Positive cases are plain property accesses or `Expect<Equal<...>>`
// assertions, negative cases use `@ts-expect-error`.

import { AnyQueryBuilder, Model, Page, QueryBuilder } from '../../../';
import { Animal, CustomPerson, CustomPet, CustomQueryBuilder, Person, Program } from './models';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const person: Person;
declare const persons: Person[];

async function stringExpressions() {
  // A single relation.
  const a = await Person.query().withGraphFetched('pets');
  type _a1 = Expect<Equal<(typeof a)[number]['pets'], Animal[]>>;
  a[0].pets.length;
  // Relations that are not fetched remain optional.
  // @ts-expect-error
  a[0].children.length;
  // @ts-expect-error
  a[0].pets[0].owner.id;
  // Columns and methods are unaffected.
  type _a2 = Expect<Equal<(typeof a)[number]['lastName'], string | undefined>>;
  a[0].fullName();

  // Nested relations and lists.
  const b = await Person.query().withGraphFetched('[pets.owner, children.[pets, program]]');
  type _b1 = Expect<Equal<(typeof b)[number]['pets'][number]['owner'], Person>>;
  type _b2 = Expect<Equal<(typeof b)[number]['children'][number]['program'], Program>>;
  b[0].pets[0].owner.firstName;
  b[0].children[0].pets.length;
  b[0].children[0].program.name;
  // @ts-expect-error
  b[0].parent.id;
  // @ts-expect-error
  b[0].pets[0].owner.pets.length;
  // @ts-expect-error
  b[0].children[0].children.length;

  // Array methods see the narrowed items.
  b[0].pets.map((pet) => pet.owner.firstName);
  b[0].pets.find((pet) => pet.owner.id === 1)?.owner.id;
  for (const pet of b[0].pets) {
    pet.owner.id;
  }
  const [firstPet] = b[0].pets;
  firstPet.owner.id;

  // Deep paths.
  const c = await Person.query().withGraphFetched('children.children.pets.owner');
  c[0].children[0].children[0].pets[0].owner.id;
  // @ts-expect-error
  c[0].children[0].pets.length;

  // Whitespace and line breaks.
  const d = await Person.query().withGraphFetched(`[
    pets . owner ,
    children
  ]`);
  d[0].pets[0].owner.id;
  d[0].children.length;

  // Modifiers don't change which relations are fetched.
  const e = await Person.query().withGraphFetched(
    '[pets(selectName, orderByName).owner, children(onlyAdults)]',
  );
  e[0].pets[0].owner.id;
  e[0].children.length;
  // @ts-expect-error
  e[0].parent.id;

  // A list of paths into the same relation is merged.
  const f = await Person.query().withGraphFetched('[pets.owner, pets.owner.pets]');
  f[0].pets[0].owner.pets.length;
  // @ts-expect-error
  f[0].pets[0].owner.children.length;
}

async function nullableRelations() {
  // `parent` is declared as `Person | null`: `undefined` is removed, but `null`
  // is kept, as to-one relations are `null` when there is no related row.
  const a = await Person.query().withGraphFetched('parent.pets');
  type _a = Expect<Equal<null extends (typeof a)[number]['parent'] ? true : false, true>>;
  type _b = Expect<Equal<undefined extends (typeof a)[number]['parent'] ? true : false, false>>;
  a[0].parent?.pets.length;
  // @ts-expect-error
  a[0].parent.id;

  // Fetching only removes `undefined`, and never adds or removes `null`: the
  // declaration decides. `parent?: Person | null` becomes `Person | null`,
  // `program?: Program` becomes `Program`.
  const b = await Person.query().withGraphFetched('[parent, program]');
  type _b1 = Expect<Equal<(typeof b)[number]['parent'], Person | null>>;
  type _b2 = Expect<Equal<(typeof b)[number]['program'], Program>>;
  const c = await Person.query().findById(1).throwIfNotFound().withGraphFetched('parent');
  type _c = Expect<Equal<(typeof c)['parent'], Person | null>>;
  const d = await person.$fetchGraph({ parent: true, program: true });
  type _d1 = Expect<Equal<(typeof d)['parent'], Person | null>>;
  type _d2 = Expect<Equal<(typeof d)['program'], Program>>;
}

async function objectExpressions() {
  const a = await Person.query().withGraphFetched({
    pets: { owner: true },
    children: { pets: true },
    program: true,
  });
  a[0].pets[0].owner.id;
  a[0].children[0].pets.length;
  a[0].program.name;
  // @ts-expect-error
  a[0].children[0].program.name;
  // @ts-expect-error
  a[0].parent.id;

  // `false` doesn't fetch a relation, and `$` keys are options.
  const b = await Person.query().withGraphFetched({
    pets: { $modify: ['selectName'], owner: true },
    children: false,
    $recursive: true,
  });
  b[0].pets[0].owner.id;
  // @ts-expect-error
  b[0].children.length;

  // Aliased nodes are skipped.
  const c = await Person.query().withGraphFetched({
    dogs: { $relation: 'pets' },
    children: true,
  });
  c[0].children.length;
  // @ts-expect-error
  c[0].pets.length;

  // Non-literal objects don't narrow, unless their properties are `true`.
  const maybe: { pets: boolean } = { pets: true };
  const d = await Person.query().withGraphFetched(maybe);
  // @ts-expect-error
  d[0].pets.length;
  const record: Record<string, boolean> = { pets: true };
  const e = await Person.query().withGraphFetched(record);
  type _e = Expect<Equal<typeof e, Person[]>>;
  const obj: object = { pets: true };
  const f = await Person.query().withGraphFetched(obj);
  type _f = Expect<Equal<typeof f, Person[]>>;
}

async function unsupportedExpressions() {
  // Dynamic strings don't narrow, and the types are exactly as before.
  const expr: string = 'pets';
  const a = await Person.query().withGraphFetched(expr);
  type _a = Expect<Equal<typeof a, Person[]>>;
  const b = await Person.query().findById(1).withGraphFetched(expr);
  type _b = Expect<Equal<typeof b, Person | undefined>>;

  // Unions of literals only narrow the relations they have in common.
  const union = Math.random() > 0.5 ? 'pets' : '[pets, children]';
  const c = await Person.query().withGraphFetched(union);
  c[0].pets.length;
  // @ts-expect-error
  c[0].children.length;

  // Template literal types narrow the known part.
  const d = await Person.query().withGraphFetched(`pets.${expr}`);
  d[0].pets.length;

  // Unknown relation names are ignored rather than reported.
  const e = await Person.query().withGraphFetched('[petz, children]');
  e[0].children.length;
  // @ts-expect-error
  e[0].pets.length;
  // Columns aren't relations and stay as they are.
  const f = await Person.query().withGraphFetched('lastName');
  type _f = Expect<Equal<typeof f, Person[]>>;

  // Aliases are skipped.
  const g = await Person.query().withGraphFetched('[pets as dogs, children]');
  g[0].children.length;
  // @ts-expect-error
  g[0].pets.length;
  const g2 = await Person.query().withGraphFetched(`[
    children(orderByAge) as kids .[pets(onlyDogs) as dogs, movies],
    pets(onlyCats)
  ]`);
  g2[0].pets.length;
  // @ts-expect-error
  g2[0].children.length;

  // Recursion and `*` narrow up to the recursive node.
  const h = await Person.query().withGraphFetched('children.^');
  h[0].children.length;
  // @ts-expect-error
  h[0].children[0].children.length;
  const i = await Person.query().withGraphFetched('[pets.*, children.^3]');
  i[0].pets.length;
  i[0].children.length;
  const j = await Person.query().withGraphFetched('*');
  type _j = Expect<Equal<typeof j, Person[]>>;

  // Empty and malformed expressions don't narrow (they fail at runtime).
  const k = await Person.query().withGraphFetched('');
  type _k = Expect<Equal<typeof k, Person[]>>;
  const l = await Person.query().withGraphFetched('[pets');
  type _l = Expect<Equal<typeof l, Person[]>>;
}

async function resultKinds() {
  // `first()`, `findById()`, `findOne()` and `throwIfNotFound()` keep the
  // narrowing, whether they are called before or after `withGraphFetched()`.
  const a = await Person.query().withGraphFetched('pets.owner').where('age', '>', 3).first();
  type _a = Expect<Equal<undefined extends typeof a ? true : false, true>>;
  a?.pets[0].owner.id;
  const b = await Person.query().first().withGraphFetched('pets.owner');
  b?.pets[0].owner.id;

  const c = await Person.query().withGraphFetched('pets').findById(1);
  c?.pets.length;
  const d = await Person.query().findById(1).withGraphFetched('pets');
  d?.pets.length;
  // @ts-expect-error
  d.pets.length;

  const e = await Person.query().withGraphFetched('pets').findOne({ firstName: 'Jennifer' });
  e?.pets.length;
  const f = await Person.query().findOne('firstName', 'Jennifer').withGraphJoined('pets');
  f?.pets.length;

  const g = await Person.query().withGraphFetched('pets').findById(1).throwIfNotFound();
  type _g = Expect<Equal<undefined extends typeof g ? true : false, false>>;
  g.pets.length;
  const h = await Person.query().findById(1).throwIfNotFound().withGraphFetched('pets');
  h.pets.length;
  const i = await Person.query()
    .findById(1)
    .withGraphFetched('pets')
    .throwIfNotFound({ message: 'not found' });
  i.pets.length;
  const j = await Person.query().withGraphFetched('pets').throwIfNotFound();
  j[0].pets.length;
  // `first()` on single results and `none()` keep the result kind.
  const j2 = await Person.query().findById(1).withGraphFetched('pets').first();
  type _j2 = Expect<Equal<undefined extends typeof j2 ? true : false, true>>;
  j2?.pets.length;
  const j3 = await Person.query().withGraphFetched('pets').none();
  j3[0].pets.length;
  const j4 = await Person.query().none().findById(1).withGraphFetched('pets');
  j4?.pets.length;

  // Pages.
  const k = await Person.query().withGraphFetched('pets').page(0, 10);
  k.results[0].pets.length;
  const l = await Person.query().page(0, 10).withGraphFetched('pets');
  l.results[0].pets.length;
  const m: Page<Person> = l;

  // Other result types are unaffected.
  const n = await Person.query().withGraphFetched('pets').resultSize();
  type _n = Expect<Equal<typeof n, number>>;
  const o = await Person.query().castTo<{ count: number }[]>().withGraphFetched('pets');
  type _o = Expect<Equal<typeof o, { count: number }[]>>;
}

async function chaining() {
  // Chained calls are merged, like objection merges the expressions.
  const a = await Person.query()
    .withGraphFetched('pets')
    .where('age', '>', 3)
    .withGraphFetched('children.pets')
    .orderBy('id')
    .withGraphJoined('pets.owner')
    .limit(10);
  a[0].pets[0].owner.id;
  a[0].children[0].pets.length;
  a[0].pets.map((pet) => pet.owner.id);
  // @ts-expect-error
  a[0].parent.id;

  // Query builder methods that return `this` keep the narrowing.
  const b = await Person.query()
    .withGraphFetched('pets')
    .modifyGraph('pets', (builder) => builder.select('name'))
    .select('id')
    .whereIn('id', [1, 2])
    .whereExists(Person.relatedQuery('pets'))
    .modify('someModifier')
    .context({ foo: 'bar' })
    .debug();
  b[0].pets.length;
}

async function relatedQueries() {
  const a = await Person.relatedQuery('pets').for(1).withGraphFetched('owner').orderBy('id');
  a[0].owner.firstName;
  // @ts-expect-error
  a[0].owner.pets.length;

  const b = await person.$relatedQuery('pets').withGraphFetched('owner.children');
  b[0].owner.children.length;

  const c = await person.$relatedQuery('children').withGraphFetched('[pets, parent]');
  c[0].pets.length;
  c[0].parent?.id;

  const d = await person.$relatedQuery('parent').withGraphFetched('pets');
  type _d = Expect<Equal<(typeof d)['pets'], Animal[]>>;

  const e = await person.$query().withGraphFetched('pets');
  type _e = Expect<Equal<(typeof e)['pets'], Animal[]>>;

  // `$query()` and `$relatedQuery()` on a narrowed instance don't fetch the
  // relations that were fetched on that instance, so they aren't narrowed.
  const narrowed = await person.$fetchGraph('[pets.owner, children]');
  const f = await narrowed.$query();
  type _f = Expect<Equal<(typeof f)['pets'], Animal[] | undefined>>;
  // @ts-expect-error
  f.children.length;
  const g = await narrowed.$query().withGraphFetched('children');
  g.children.length;
  // @ts-expect-error
  g.pets.length;
  const h = await narrowed.$relatedQuery('pets');
  type _h = Expect<Equal<(typeof h)[number]['owner'], Person | undefined>>;
  const i = await narrowed.$relatedQuery('pets').withGraphFetched('owner');
  i[0].owner.id;
  const j = await (await Person.query().withGraphFetched('children.pets'))[0].$query();
  // @ts-expect-error
  j.children.length;
  const k = await (await narrowed.$fetchGraph('parent')).$query();
  // @ts-expect-error
  k.pets.length;
}

async function fetchGraph() {
  const a = await person.$fetchGraph('[pets.owner, children]');
  a.pets[0].owner.id;
  a.children.length;
  // @ts-expect-error
  a.parent.id;

  const b = await Person.fetchGraph(persons, 'pets.owner');
  b[0].pets[0].owner.id;
  const c = await Person.fetchGraph(person, { children: { pets: true } });
  c.children[0].pets.length;

  const expr: string = 'pets';
  const d = await person.$fetchGraph(expr);
  type _d = Expect<Equal<typeof d, Person>>;
  const e = await Person.fetchGraph(persons, expr, { skipFetched: true });
  type _e = Expect<Equal<typeof e, Person[]>>;

  // Passing the model type explicitly still compiles, but doesn't narrow.
  const f = await Person.fetchGraph<Person>(person, 'pets');
  type _f = Expect<Equal<typeof f, Person>>;
  const g = await Person.fetchGraph<Person>(persons, 'pets');
  type _g = Expect<Equal<typeof g, Person[]>>;
  const h = await Person.fetchGraph<Person, 'pets'>(persons, 'pets');
  h[0].pets.length;
}

async function customQueryBuilders() {
  // Custom query builders are kept, with their custom methods.
  const query = CustomPerson.query()
    .someCustomMethod()
    .withGraphFetched('pets.owner')
    .someCustomMethod();
  const qb: CustomQueryBuilder<CustomPerson, CustomPerson[]> = query;
  const a = await query;
  a[0].pets[0].owner.firstName;

  const b = await CustomPerson.query()
    .withGraphFetched('pets')
    .findById(1)
    .someCustomMethod()
    .throwIfNotFound()
    .someCustomMethod();
  b.pets.length;
  type _b = Expect<Equal<undefined extends typeof b ? true : false, false>>;

  const c = await CustomPerson.query().first().withGraphFetched('parent').someCustomMethod();
  c?.parent.id;

  const d = await CustomPerson.relatedQuery('pets')
    .for(1)
    .withGraphFetched('owner')
    .someCustomMethod();
  d[0].owner.id;

  const e = await CustomPet.query().withGraphFetched('owner.pets').page(0, 10).someCustomMethod();
  e.results[0].owner.pets.length;
  // @ts-expect-error
  e.results[0].owner.parent.id;

  // `$query()` on narrowed instances keeps the custom query builder.
  const f = await e.results[0].$query().someCustomMethod();
  type _f = Expect<Equal<(typeof f)['owner'], CustomPerson | undefined>>;
}

async function assignability() {
  // Results are still assignable to the plain model types.
  const a: Person[] = await Person.query().withGraphFetched('pets.owner');
  const b: Person | undefined = await Person.query().findById(1).withGraphFetched('pets.owner');
  const c: Person = await person.$fetchGraph('pets.owner');
  const d: Animal = (await Person.query().withGraphFetched('pets.owner'))[0].pets[0];

  // So are the query builders.
  const e: QueryBuilder<Person, Person[]> = Person.query().withGraphFetched('pets.owner');
  const f: QueryBuilder<Person, Person | undefined> = Person.query()
    .findById(1)
    .withGraphFetched('[pets.owner, children.pets]');
  let query = Person.query();
  if (Math.random() > 0.5) {
    query = query.withGraphFetched('pets.owner');
  }
  takesQueryBuilder(Person.query().withGraphFetched('children.pets.owner'));
  const g: PromiseLike<Person[]> = Person.query().withGraphFetched('pets');

  // `where()` with an object still works on narrowed query builders.
  await Person.query().withGraphFetched('pets.owner').where({ firstName: 'Jennifer' });
}

function takesQueryBuilder(query: QueryBuilder<Person>) {
  return query;
}

// Generic code still compiles, but the narrowing may not be resolved there.
function addPets<QB extends QueryBuilder<Person>>(query: QB) {
  return query.withGraphFetched('pets').where('id', 1);
}

async function generics() {
  const a: Person[] = await addPets(Person.query());
}

// But the narrowed query builder is a different type than QB. Passing `string`
// as the expression type opts out of the narrowing, and keeps QB.
function addPetsKeepType<QB extends QueryBuilder<Person>>(query: QB): QB {
  return query.withGraphFetched<string>('pets');
}

function addPetsNarrowed<QB extends QueryBuilder<Person>>(query: QB): QB {
  // @ts-expect-error
  return query.withGraphFetched('pets');
}

class Owner extends Model {
  id!: number;
  name!: string;
  pets?: Animal[];

  async loadPets() {
    const owner = await this.$fetchGraph('pets');
    owner.name;
    owner.pets.length;
    return owner;
  }

  async loadWithPets() {
    const owner = await this.$query().withGraphFetched('pets').where('id', this.id);
    owner.name;
    return owner;
  }

  static async findWithPets() {
    const owners = await this.query().withGraphFetched('pets');
    return owners[0].pets;
  }

  static modifiers = {
    withPets(query: QueryBuilder<Owner>) {
      query.withGraphFetched('pets');
    },

    withPetsAny(query: AnyQueryBuilder) {
      const narrowed = query.withGraphFetched('pets');
      type _n = Expect<Equal<typeof narrowed, AnyQueryBuilder>>;
    },
  };
}

async function modelMethods(owner: Owner) {
  const a = await owner.loadPets();
  a.pets.length;
  const b: Owner = await owner.loadWithPets();
  const c = await Owner.findWithPets();
  type _c = Expect<Equal<typeof c, Animal[]>>;
}

async function withGraph() {
  // `withGraph()` narrows like `withGraphFetched()` / `withGraphJoined()`,
  // with or without an algorithm.
  const a = await Person.query()
    .withGraphJoined('pets')
    .withGraph('children.pets')
    .withGraph('pets.owner', { algorithm: 'fetch', minimize: true });
  a[0].pets[0].owner.id;
  a[0].children[0].pets.length;
  // @ts-expect-error
  a[0].parent.id;

  const b = await Person.query().findById(1).withGraph('pets', { algorithm: 'join' });
  type _b = Expect<Equal<NonNullable<typeof b>['pets'], Animal[]>>;

  // @ts-expect-error
  Person.query().withGraph('pets', { algorithm: 'naive' });

  const isJoinChildQuery: boolean = Person.query().isJoinChildQuery();
}
