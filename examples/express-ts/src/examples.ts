// tslint:disable:no-unused-variable

import * as objection from 'objection';
import Person from './models/Person';
import { knex } from './app';

// This file exercises the Objection.js typings.
// These calls are WHOLLY NONSENSICAL and are for TypeScript testing only.

// This "test" passes if the TypeScript compiler is satisfied.

// bindKnex returns a typeof Model:
const BoundModel: typeof objection.Model = Person.bindKnex(knex);

// bindKnex also returns the proper Model subclass:
const BoundPerson: typeof Person = Person.bindKnex(knex);

// The Model subclass is interpretted correctly to be constructable 
const examplePerson: Person = new BoundPerson();

// and to have expected sublcass fields 
examplePerson.firstName = 'example';
examplePerson.lastName = 'person';

// and methods
const exampleResult: number = examplePerson.examplePersonMethod('hello');

// And inherited methods:
const personId = examplePerson.$id();
const exampleJsonPerson: Person = examplePerson.$setJson({ id: 'hello' });
const exampleDatabaseJsonPerson: Person = examplePerson.$setDatabaseJson({ id: 'hello' });
const omitPersonFromKey: Person = examplePerson.$omit('lastName');
const omitPersonFromObj: Person = examplePerson.$omit({ firstName: true });
const pickPersonFromKey: Person = examplePerson.$pick('lastName');
const pickPersonFromObj: Person = examplePerson.$pick({ firstName: true });
const clonePerson: Person = examplePerson.$clone();

// QueryBuilder.findById accepts single and array values:
let qb: objection.QueryBuilder = BoundPerson.query();

// Note that the QueryBuilder chaining done in this file
// is done to verify that the return value is assignable to a QueryBuilder
// (fewer characters than having each line `const qb: QueryBuilder =`):

qb = qb.findById(1);
qb = qb.findById([1, 2, 3]);

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

// non-wrapped methods:

const modelFromQuery: typeof objection.Model = qb.modelClass();

const sql = qb.toSql();

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

qb = qb.context({
  runBefore: (qb: objection.QueryBuilder) => noop(),
  runAfter: (qb: objection.QueryBuilder) => noop(),
  onBuild: (qb: objection.QueryBuilder) => noop()
});

qb = qb.runBefore((qb: objection.QueryBuilder) => noop());

qb = qb.reject('fail');
qb = qb.resolve('success');

objection.transaction(Person, (P: typeof Person) => {
  const n: number = new P().examplePersonMethod('hello');
  return Promise.resolve('yay');
});

objection.transaction.start(Person).then((trx: objection.Transaction) => {
  Person.bindTransaction(trx).query()
    .then(() => trx.commit())
    .catch(() => trx.rollback());
  Person.query(trx).where('age', '<', 90);
});

// Verify QueryBuilders are thenable:

const p: Promise<string> = qb.then(() => 'done');

