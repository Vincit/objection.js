// tslint:disable:no-unused-variable
import * as knex from 'knex';
import * as objection from '../../typings/objection';

const { lit, raw, ref } = objection;

// This file exercises the Objection.js typings.

// These calls are WHOLLY NONSENSICAL and are for TypeScript testing only.

// This "test" passes if the TypeScript compiler is satisfied.

class CustomValidationError extends Error {}

class Person extends objection.Model {
  firstName: string;
  lastName: string;
  mom: Person;
  comments: Comment[];

  static columnNameMappers = objection.snakeCaseMappers();

  examplePersonMethod = (arg: string) => 1;

  // $relatedQuery can either take a cast, if you don't want to add the field
  // to your model:
  petsWithId(petId: number): Promise<Animal[]> {
    return this.$relatedQuery<Animal>('pets').where('id', petId);
  }

  // Or, if you add the field, this.$relatedQuery just works:
  fetchMom(): Promise<Person> {
    return this.$relatedQuery('mom');
  }

  async $beforeInsert(queryContext: objection.QueryContext) {
    console.log(queryContext.someCustomValue);
  }

  $formatDatabaseJson(json: objection.Pojo) {
    // Test that any property can be accessed and set.
    json.bar = json.foo;
    return json;
  }

  $parseDatabaseJson(json: objection.Pojo) {
    // Test that any property can be accessed and set.
    json.foo = json.bar;
    return json;
  }

  static createValidationError(args: objection.CreateValidationErrorArgs) {
    const { message, type, data } = args;
    const errorItem: objection.ValidationErrorItem = data['someProp'];
    const itemMessage: string = errorItem.message;
    return new CustomValidationError('my custom error: ' + message + ' ' + itemMessage);
  }
}

function takesModelSubclass<M extends objection.Model>(m: M) {}
function takesModel(m: objection.Model) {}
function takesModelClass(m: objection.ModelClass<any>) {}

const takesPerson = (person: Person) => {
  person.examplePersonMethod('');
};
const takesMaybePerson = (_: Person | undefined) => 1;
const takesPeople = (_: Person[]) => 1;

async function takesPersonClass(PersonClass: typeof Person) {
  takesPerson(new PersonClass());
  takesMaybePerson(await PersonClass.query().findById(123));
}

const lastName = 'Lawrence';

// Note that at least with TypeScript 2.3 or earlier, type assertions made
// on an instance will coerce the assignment to the instance type, which
// means `const p: Person = somethingThatReturnsAny()` will compile.

// It also seems that Promise types are not as rigorously asserted as their
// resolved types, hence these async/await blocks:

async () => {
  takesPeople(await Person.query().where('lastName', lastName));
  takesPeople(await Person.query().where({ lastName }));
  takesMaybePerson(await Person.query().findById(123));
  takesMaybePerson(await Person.query().findById('uid'));
};

// .where().first is equivalent to .findOne:
async () => {
  takesMaybePerson(
    await Person.query()
      .where('raw SQL constraint')
      .first()
  );
  takesMaybePerson(
    await Person.query()
      .where('lastName', lastName)
      .first()
  );
  takesMaybePerson(
    await Person.query()
      .where('lastName', '>', lastName)
      .first()
  );
  takesMaybePerson(
    await Person.query()
      .where({ lastName })
      .first()
  );

  takesMaybePerson(await Person.query().findOne('raw SQL constraint'));
  takesMaybePerson(await Person.query().findOne('lastName', lastName));
  takesMaybePerson(await Person.query().findOne('lastName', '>', lastName));
  takesMaybePerson(await Person.query().findOne({ lastName }));
};

// instance methods:
async () => {
  takesPerson(await new Person().$loadRelated('movies'));
  takesPerson(await new Person().$query());
};

class Movie extends objection.Model {
  title: string;
  actors: Person[];

  /**
   * This static field instructs Objection how to hydrate and persist
   * relations. By making relationMappings a thunk, we avoid require loops
   * caused by other class references.
   */
  static relationMappings = () => ({
    actors: {
      relation: objection.Model.ManyToManyRelation,
      modelClass: Person,
      join: {
        from: ['Movie.id1', 'Model.id2'],
        through: {
          from: 'Actors.movieId',
          to: ref('Actors.personId').castInt()
        },
        to: [ref('Person.id1'), 'Person.id2']
      }
    }
  });
}

async () => {
  // Another example of strongly-typed $relatedQuery without a cast:
  takesPeople(await new Movie().$relatedQuery('actors'));
};

class Animal extends objection.Model {
  species: string;

  // Tests the ColumnNameMappers interface.
  static columnNameMappers = {
    parse(json: objection.Pojo) {
      return json;
    },

    format(json: objection.Pojo) {
      return json;
    }
  };
}

class Comment extends objection.Model {
  comment: string;
}

// !!! see examples/express-ts/src/app.ts for a valid knex setup. The following is bogus:

const k: knex = knex({});

// bindKnex returns the proper Model subclass:

const BoundPerson = Person.bindKnex(k);
takesPersonClass(BoundPerson);

// The Model subclass is interpreted correctly to be constructable

const examplePerson = new BoundPerson();
// and inherited methods from Model

const personId = examplePerson.$id();
const exampleJsonPerson1: Person = examplePerson.$setJson({ id: 'hello' });
const exampleJsonPerson2: Person = examplePerson.$set({ id: 'hello' });
const exampleDatabaseJsonPerson: Person = examplePerson.$setDatabaseJson({
  id: 'hello'
});
const omitPersonFromKey: Person = examplePerson.$omit('lastName');
const omitPersonFromObj: Person = examplePerson.$omit({ firstName: true });
const pickPersonFromKey: Person = examplePerson.$pick('lastName');
const pickPersonFromObj: Person = examplePerson.$pick({ firstName: true });
const clonePerson: Person = examplePerson.$clone();
const setRelatedPerson: Person = examplePerson.$setRelated(
  'parent',
  Person.fromJson({ firstName: 'parent' })
);
const appendRelatedPerson: Person = examplePerson.$appendRelated('pets', [
  Animal.fromJson({ firstName: 'pet 1' }),
  Animal.fromJson({ firstName: 'pet 2' })
]);

// static methods from Model should return the subclass type

const people: Promise<Person[]> = Person.loadRelated([new Person()], 'movies');

class Actor {
  canAct: boolean;
}

// Optional<Person> typing for findById():

function byId(id: number): Promise<Person | undefined> {
  return Person.query().findById(id);
}

// Person[] typing for findByIds():

function byIds(ids: number[] | number[][]): Promise<Person[]> {
  return Person.query().findByIds(ids);
}

// Person[] typing for where():

function whereSpecies(species: string): Promise<Animal[]> {
  return Animal.query().where('species', species);
}

const personPromise: Promise<Person> = objection.QueryBuilder.forClass(Person).findById(1);

// QueryBuilder.findById accepts single and array values:

let qb: objection.QueryBuilder<Person> = BoundPerson.query().where('name', 'foo');

// QueryBuilder.throwIfNotFound makes an option query return exactly one:

async () => {
  const q = () => Person.query().findOne({ lastName });
  takesMaybePerson(await q());
  takesPerson(await q().throwIfNotFound());
};

// QueryBuilder.throwIfNotFound does nothing for array results:

async () => {
  const q = () => Person.query().where({ lastName });
  takesPeople(await q());
  takesPeople(await q().throwIfNotFound());
};

// Note that the QueryBuilder chaining done in this file
// is done to verify that the return value is assignable to a QueryBuilder
// (fewer characters than having each line `const qbNNN: QueryBuilder =`):

const maybePerson: Promise<Person | undefined> = qb.findById(1);

const maybePeople: Promise<Person[]> = qb.findById([1, 2, 3]);

// query builder knex-wrapping methods:

qb = qb.increment('column_name');
qb = qb.increment('column_name', 2);
qb = qb.decrement('column_name', 1);
qb = qb.select('column1');
qb = qb.select('column1', 'column2', 'column3');
qb = qb.select(['column1', 'column2']);
qb = qb.forUpdate();
qb = qb.as('column_name');
qb = qb.column('column_name');
qb = qb.columns('column_name', 'column_name_2');
qb = qb.withSchema('schema_name');
qb = qb.distinct('column1', 'column2', 'column3');
qb = qb.join('tablename', 'column1', '=', 'column2');
qb = qb.outerJoin('tablename', 'column1', '=', 'column2');
qb = qb.joinRelation('table');
qb = qb.joinRelation('table', { alias: false });
qb = qb.where(raw('random()', 1, '2'));
qb = qb.where(Person.raw('random()', 1, '2', raw('3')));
qb = qb.alias('someAlias');

// query builder hooks
qb = qb.runBefore(async (result: any, builder: objection.QueryBuilder<Person>) => {});
qb = qb.runAfter(async (result: Person[], builder: objection.QueryBuilder<Person>) => {});

// signature-changing QueryBuilder methods:

const rowInserted: Promise<Person> = qb.insert({ firstName: 'bob' });
const rowsInserted: Promise<Person[]> = qb.insert([{ firstName: 'alice' }, { firstName: 'bob' }]);
const rowsInsertedWithRelated: Promise<Person> = qb.insertWithRelated({});
const rowsInsertGraph1: Promise<Person> = qb.insertGraph({});
const rowsInsertGraph2: Promise<Person> = qb.insertGraph({}, { relate: true });
const rowsUpdated: Promise<number> = qb.update({});
const rowsPatched: Promise<number> = qb.patch({});
const rowsDeleted: Promise<number> = qb.delete();
const rowsDeletedById: Promise<number> = qb.deleteById(123);
const rowsDeletedByIds: Promise<number> = qb.deleteById([123, 456]);

const insertedModel: Promise<Person> = Person.query().insertAndFetch({});
const insertedModels1: Promise<Person[]> = Person.query().insertGraphAndFetch([
  new Person(),
  new Person()
]);
const insertedModels2: Promise<Person[]> = Person.query().insertGraphAndFetch(
  [new Person(), new Person()],
  {
    relate: true
  }
);

const upsertModel1: Promise<Person> = Person.query().upsertGraph({});
const upsertModel2: Promise<Person> = Person.query().upsertGraph({}, { relate: true });
const upsertModels1: Promise<Person[]> = Person.query().upsertGraph([]);
const upsertModels2: Promise<Person[]> = Person.query().upsertGraph([], {
  unrelate: true
});

const insertedGraphAndFetchOne: Promise<Person> = Person.query().insertGraphAndFetch(new Person());
const insertedGraphAndFetchSome: Promise<Person[]> = Person.query().insertGraphAndFetch([
  new Person(),
  new Person()
]);
const insertedRelatedAndFetch: Promise<Person> = Person.query().insertWithRelatedAndFetch(
  new Person()
);
const updatedModel: Promise<Person> = Person.query().updateAndFetch({});
const updatedModelById: Promise<Person> = Person.query().updateAndFetchById(123, {});
const patchedModel: Promise<Person> = Person.query().patchAndFetch({});
const patchedModelById: Promise<Person> = Person.query().patchAndFetchById(123, {});

const rowsEager: Promise<Person[]> = Person.query()
  .eagerAlgorithm(Person.NaiveEagerAlgorithm)
  .eager('foo.bar');

const children: Promise<Person[]> = Person.query()
  .skipUndefined()
  .allowEager('[pets, parent, children.[pets, movies.actors], movies.actors.pets]')
  .eager('children')
  .where('age', '>=', 42);

const childrenAndPets: Promise<Person[]> = Person.query()
  .eager('children')
  .where('age', '>=', 42)
  .modifyEager('[pets, children.pets]', qb => qb.orderBy('name'));

const rowsPage: Promise<{
  total: number;
  results: Person[];
}> = Person.query().page(1, 10);

const rowsRange: Promise<objection.Page<Person>> = Person.query().range(1, 10);

// `retuning` should change the return value from number to T[]
const rowsUpdateReturning: Promise<Person[]> = Person.query()
  .update({})
  .returning('*');

const rowPatchReturningFirst: Promise<Person | undefined> = Person.query()
  .patch({})
  .returning('*')
  .first();

// `retuning` should change the return value from number to T[]
const rowsDeleteReturning: Promise<Person[]> = Person.query()
  .delete()
  .returning('*');

const rowsDeleteReturningFirst: Promise<Person | undefined> = Person.query()
  .delete()
  .returning('*')
  .first();

const rowInsertReturning: Promise<Person | undefined> = Person.query()
  .insert({})
  .returning('*');

const rowsInsertReturning: Promise<Person[]> = Person.query()
  .insert([{}])
  .returning('*');

// Executing a query builder should be equivalent to treating it
// as a promise directly, regardless of query builder return type:

const maybePersonQb = Person.query().findById(1);
let maybePersonPromise: Promise<Person | undefined> = maybePersonQb;
maybePersonPromise = maybePersonQb.execute();

const peopleQb = Person.query();
let peoplePromise: Promise<Person[]> = peopleQb;
peoplePromise = peopleQb.execute();

const insertQb = Person.query().insert({});
let insertPromise: Promise<Person> = insertQb;
insertPromise = insertQb.execute();

const deleteQb = Person.query().delete();
let deletePromise: Promise<number> = deleteQb;
deletePromise = deleteQb.execute();

const pageQb = Person.query().page(1, 10);
let pagePromise: Promise<objection.Page<Person>> = pageQb;
pagePromise = pageQb.execute();

// non-wrapped methods:

const modelFromQuery: typeof objection.Model = qb.modelClass();

const sql: string = qb.toSql();
const tableName: string = qb.tableNameFor(Person);
const tableRef: string = qb.tableRefFor(Person);

function noop() {
  // no-op
}

const qbcb = (ea: objection.QueryBuilder<Person>) => noop();

qb = qb.context({
  runAfter: qbcb,
  runBefore: qbcb,
  onBuild: qbcb
});

qb = qb.mergeContext({
  foo: 'bar'
});

qb = qb.runBefore(qbcb);

qb = qb.reject('fail');
qb = qb.resolve('success');

objection.transaction(Person, TxPerson => {
  const n: number = new TxPerson().examplePersonMethod('hello');
  return Promise.resolve('yay');
});

objection.transaction(Movie, Person, async (TxMovie, TxPerson) => {
  const s: string = new TxMovie().title;
  const n: number = new TxPerson().examplePersonMethod('hello');
});

objection.transaction(Movie, Person, Animal, async (TxMovie, TxPerson, TxAnimal) => {
  const t: string = new TxMovie().title;
  const n: number = new TxPerson().examplePersonMethod('hello');
  const s: string = new TxAnimal().species;
});

objection.transaction(
  Movie,
  Person,
  Animal,
  Comment,
  async (TxMovie, TxPerson, TxAnimal, TxComment) => {
    const t: string = new TxMovie().title;
    const n: number = new TxPerson().examplePersonMethod('hello');
    const s: string = new TxAnimal().species;
    const c: string = new TxComment().comment;
  }
);

objection.transaction(
  Movie,
  Person,
  Animal,
  Comment,
  async (TxMovie, TxPerson, TxAnimal, TxComment, trx) => {
    const t: string = new TxMovie().title;
    const n: number = new TxPerson().examplePersonMethod('hello');
    const s: string = new TxAnimal().species;
    const c: string = new TxComment().comment;
    Movie.query(trx);
  }
);

objection.transaction.start(Person).then(trx => {
  const TxPerson: typeof Person = Person.bindTransaction(trx);
  TxPerson.query()
    .then(() => trx.commit())
    .catch(() => trx.rollback());
  Person.query(trx).where('age', '<', 90);
});

// Verify QueryBuilders are thenable:

const p: Promise<string> = qb.then(() => 'done');

// Verify that we can insert a partial model and relate a partial movie
Person.query()
  .insertAndFetch({ firstName: 'Jim' })
  .then((ea: Person) => {
    console.log(`Inserted ${p}`);
    ea
      .$loadRelated('movies')
      .relate<Movie>({ title: 'Total Recall' })
      .then((pWithMovie: Person) => {
        console.log(`Related ${pWithMovie}`);
      });
  });

// Verify we can call `.insert` with a Partial<Person>:

Person.query().insert({ firstName: 'Chuck' });

// Verify we can call `.insert` via $relatedQuery
// (albeit with a cast to Movie):

const relatedQueryResult: Promise<Movie> = new Person()
  .$relatedQuery<Movie>('movies')
  .insert({ title: 'Total Recall' });

// Verify if is possible transaction class can be shared across models
objection.transaction(Person.knex(), async trx => {
  await Person.query(trx).insert({ firstName: 'Name' });
  await Movie.query(trx).insert({ title: 'Total Recall' });
});

objection.transaction<Person>(Person.knex(), async trx => {
  const person = await Person.query(trx).insert({ firstName: 'Name' });
  await Movie.query(trx).insert({ title: 'Total Recall' });
  await person.$loadRelated('movies', {}, trx);

  return person;
});

objection.transaction.start(Person).then(trx => {
  Movie.query(trx)
    .then(() => trx.commit())
    .catch(() => trx.rollback());
});

// Vefiry where methods take a queryBuilder of any.
const whereSubQuery = Movie.query().select('name');

Person.query().whereIn('firstName', whereSubQuery);
Person.query().where('foo', whereSubQuery);
Person.query().whereExists(whereSubQuery);
Person.query().whereExists(Person.relatedQuery('pets'));
Person.query().select([
  Person.relatedQuery('pets')
    .count()
    .as('petCount')
]);
Person.query().select(
  'id',
  Person.relatedQuery('pets')
    .count()
    .as('petCount')
);
Person.query().where(builder => {
  builder.whereBetween('age', [30, 40]).orWhereIn('lastName', whereSubQuery);
});

// RawBuilder:

Person.query()
  .select(raw('coalesce(sum(??), 0) as ??', ['age', 'childAgeSum']))
  .where(raw(`?? || ' ' || ??`, 'firstName', 'lastName'), 'Arnold Schwarzenegger')
  .orderBy(raw('random()'));

// ReferenceBuilder:
// @see http://vincit.github.io/objection.js/#ref75
// https://github.com/Vincit/objection.js/blob/master/doc/includes/API.md#global-query-building-helpers
Person.query()
  .select([
    'id',
    ref('Model.jsonColumn:details.name')
      .castText()
      .as('name'),
    ref('Model.jsonColumn:details.age')
      .castInt()
      .as('age')
  ])
  .join('OtherModel', ref('Model.jsonColumn:details.name').castText(), '=', ref('OtherModel.name'))
  .where('age', '>', ref('OtherModel.ageLimit'));

// LiteralBuilder:
Person.query().where(ref('Model.jsonColumn:details'), '=', lit({ name: 'Jennifer', age: 29 }));
Person.query().where('age', '>', lit(10));
Person.query().where('firstName', lit('Jennifer').castText());

// .query, .$query, and .$relatedQuery can take a Knex instance to support
// multitenancy

const peep123: Promise<Person | undefined> = BoundPerson.query(k).findById(123);

new Person().$query(k).execute();
new Person().$relatedQuery('pets', k).execute();

takesPerson(Person.fromJson({ firstName: 'jennifer', lastName: 'Lawrence' }));
takesPerson(Person.fromDatabaseJson({ firstName: 'jennifer', lastName: 'Lawrence' }));

// plugin tests for mixin and compose:

const plugin1 = ({} as any) as objection.Plugin;
const plugin2 = ({} as any) as objection.Plugin;

() => {
  const BaseModel = objection.mixin(objection.Model, [plugin1, plugin2]);
  takesModelClass(BaseModel);
  takesModelSubclass(new BaseModel());
  takesModel(new BaseModel());
};

() => {
  const BaseModel = objection.mixin(objection.Model, plugin1, plugin2);
  takesModelClass(BaseModel);
  takesModelSubclass(new BaseModel());
  takesModel(new BaseModel());
};

() => {
  const PersonModel = objection.mixin(Person, plugin1, plugin2);
  takesModelClass(PersonModel);
  takesPersonClass(PersonModel);
  takesModelSubclass(new PersonModel());
};

() => {
  const plugin = objection.compose([plugin1, plugin2]);
  const BaseModel = objection.mixin(objection.Model, plugin);
  takesModelClass(BaseModel);
  takesModelSubclass(new BaseModel());
  takesModel(new BaseModel());
};

() => {
  const plugin = objection.compose(plugin1, plugin2);
  const BaseModel = objection.mixin(objection.Model, plugin);
  takesModelClass(BaseModel);
  takesModelSubclass(new BaseModel());
  takesModel(new BaseModel());
};

// .mixin example with Model:

() => {
  class MyModel extends objection.mixin(objection.Model, plugin1) {
    readonly myModelMethod = true;
  }
  takesModelClass(MyModel);
  takesModelSubclass(new MyModel());
};

// Example with subclass of Model:
() => {
  class MyPerson extends objection.mixin(Person, plugin1) {}
  takesModelClass(MyPerson);
  takesPersonClass(MyPerson);
  takesModelSubclass(new MyPerson());
};
