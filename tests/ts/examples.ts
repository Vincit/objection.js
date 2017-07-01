// tslint:disable:no-unused-variable
import * as knex from 'knex';
import * as objection from '../../typings/objection';

// This file exercises the Objection.js typings.

// These calls are WHOLLY NONSENSICAL and are for TypeScript testing only.

// This "test" passes if the TypeScript compiler is satisfied.

class Person extends objection.Model {
  firstName: string;
  lastName: string;
  examplePersonMethod = (arg: string) => 1;

  static async truncate(): Promise<void> {
    await this.query().truncate()
  }

  static async withLastName(lastName: string): Promise<Person[]> {
    return this.query().where('lastName', lastName)
  }

  static async firstWithLastName(lastName: string): Promise<Person | undefined> {
    return this.query().where('lastName', lastName).first()
  }

  static async findById(id: number): Promise<Person | undefined> {
    return this.query().findById(id)
  }

  async loadMovies(): Promise<this> {
    return this.$loadRelated('movies')
  }

  async reload(): Promise<this> {
    return this.$query();
  }

  async petsWithId(petId: number): Promise<Animal[]> {
    // Types can't look at strings and give strong types, so this must be a Model[] promise:
    const pets: objection.Model[] = await this.$relatedQuery('pets').where('id', petId)
    // that we can subsequently cast to Animal:
    return pets as Animal[]
  }
}

class Movie extends objection.Model {
  title: string;
}

class Animal extends objection.Model {
  species: string;
}

class Comment extends objection.Model {
  comment: string;
}

// !!! see examples/express-ts/src/app.ts for a valid knex setup. The following is bogus:

const k: knex = knex({});

// bindKnex returns the proper Model subclass:

const BoundPerson: typeof Person = Person.bindKnex(k);

// With expected static methods:
Person.bindKnex(k).truncate();

// The Model subclass is interpreted correctly to be constructable 

const examplePerson: Person = new BoundPerson();

// and to have expected sublcass fields 

examplePerson.firstName = 'example';
examplePerson.lastName = 'person';

// and methods

const exampleResult: number = examplePerson.examplePersonMethod('hello');

// and inherited methods from Model

const personId = examplePerson.$id();
const exampleJsonPerson: Person = examplePerson.$setJson({ id: 'hello' });
const exampleDatabaseJsonPerson: Person = examplePerson.$setDatabaseJson({ id: 'hello' });
const omitPersonFromKey: Person = examplePerson.$omit('lastName');
const omitPersonFromObj: Person = examplePerson.$omit({ firstName: true });
const pickPersonFromKey: Person = examplePerson.$pick('lastName');
const pickPersonFromObj: Person = examplePerson.$pick({ firstName: true });
const clonePerson: Person = examplePerson.$clone();

// static methods from Model should return the subclass type

Person.loadRelated([new Person()], 'movies').then((people: Person[]) => { });

class Actor {
  canAct: boolean
}

// test .extend:
const PersonActor = Person.extend(Actor);

const pa = new PersonActor()
pa.firstName = 'chuck'
pa.canAct = false

// Optional<Person> typing for findById():

function byId(id: number): Promise<Person | undefined> {
  return Person.query().findById(id);
}

// Person[] typing for where():

function whereSpecies(species: string): Promise<Animal[]> {
  return Animal.query().where('species', species);
}

const personPromise: Promise<Person> = objection.QueryBuilder.forClass(Person).findById(1);

// QueryBuilder.findById accepts single and array values:

let qb: objection.QueryBuilder<Person> = BoundPerson.query().where('name', 'foo');

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

// signature-changing QueryBuilder methods:

const rowInserted: Promise<Person> = qb.insert({ firstName: 'bob' })
const rowsInserted: Promise<Person[]> = qb.insert([{ firstName: 'alice' }, { firstName: 'bob' }])
const rowsInsertedWithRelated: Promise<Person> = qb.insertWithRelated({})
const rowsUpdated: Promise<number> = qb.update({})
const rowsPatched: Promise<number> = qb.patch({})
const rowsDeleted: Promise<number> = qb.deleteById(123)
const rowsDeleted2: Promise<number> = qb.deleteById([123, 456])

const insertedModel: Promise<Person> = Person.query().insertAndFetch({})
const insertedModels: Promise<Person[]> = Person.query().insertGraphAndFetch([new Person(), new Person()])

const insertedGraphAndFetchOne: Promise<Person> = Person.query().insertGraphAndFetch(new Person())
const insertedGraphAndFetchSome: Promise<Person[]> = Person.query().insertGraphAndFetch([new Person(), new Person()])
const insertedRelatedAndFetch: Promise<Person> = Person.query().insertWithRelatedAndFetch(new Person())
const updatedModel: Promise<Person> = Person.query().updateAndFetch({})
const updatedModelById: Promise<Person> = Person.query().updateAndFetchById(123, {})
const patchedModel: Promise<Person> = Person.query().patchAndFetch({})
const patchedModelById: Promise<Person> = Person.query().patchAndFetchById(123, {})

// non-wrapped methods:

const modelFromQuery: typeof objection.Model = qb.modelClass();

const sql: string = qb.toSql();

qb = qb.whereJsonEquals(
  'Person.jsonColumnName:details.names[1]',
  { details: { names: ['First', 'Second', 'Last'] } }
);
qb = qb.whereJsonEquals('additionalData:myDogs', 'additionalData:dogsAtHome');
qb = qb.whereJsonEquals('additionalData:myDogs[0]', { name: 'peter' });
qb = qb.whereJsonNotEquals('jsonObject:a', 'jsonObject:b');
qb = qb.whereJsonField('column:field', 'IS', null);

function noop() {
  // no-op
}

const qbcb = (qb: objection.QueryBuilder<Person>) => noop()

qb = qb.context({
  runBefore: qbcb,
  runAfter: qbcb,
  onBuild: qbcb
});

qb = qb.runBefore(qbcb);

qb = qb.reject('fail');
qb = qb.resolve('success');

objection.transaction(Person, (TxPerson) => {
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

objection.transaction(Movie, Person, Animal, Comment, async (TxMovie, TxPerson, TxAnimal, TxComment) => {
  const t: string = new TxMovie().title;
  const n: number = new TxPerson().examplePersonMethod('hello');
  const s: string = new TxAnimal().species;
  const c: string = new TxComment().comment
});

objection.transaction(Movie, Person, Animal, Comment, PersonActor, async (TxMovie, TxPerson, TxAnimal, TxComment, TxPersonActor) => {
  const t: string = new TxMovie().title;
  const n: number = new TxPerson().examplePersonMethod('hello');
  const s: string = new TxAnimal().species;
  const c: string = new TxComment().comment
  const pa = new TxPersonActor()
  if (pa.canAct) {
    const n: number = pa.examplePersonMethod('arg')
  }
});

objection.transaction.start(Person).then(trx => {
  const TxPerson: typeof Person = Person.bindTransaction(trx)
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
  .then((p: Person) => {
    console.log(`Inserted ${p}`);
    p.$loadRelated('movies')
      .relate<Movie>({ title: 'Total Recall' })
      .then((pWithMovie: Person) => {
        console.log(`Related ${pWithMovie}`);
      });
  });

// Verify we can call `.insert` with a Partial<Person>:

Person
  .query()
  .insert({ firstName: 'Chuck' })

// Verify we can call `.insert` via $relatedQuery 
// (albeit with a cast to Movie):

new Person()
  .$relatedQuery<Movie>('movies')
  .insert({ title: 'Total Recall' })

