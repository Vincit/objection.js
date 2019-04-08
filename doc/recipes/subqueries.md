# Subqueries

Subqueries can be written just like in knex: by passing a function in place of a value. A bunch of query building methods accept a function. See the knex.js documentation or just try it out. A function is accepted in most places you would expect. You can also pass [QueryBuilder](/api/query-builder/) instances or knex queries instead of functions.

Using a function:

```js
const peopleOlderThanAverage = await Person
  .query()
  .where('age', '>', builder => {
    builder.avg('age').from('persons');
  });

console.log(peopleOlderThanAverage);
```

Using a [QueryBuilder](/api/query-builder/):

```js
const peopleOlderThanAverage = await Person
  .query()
  .where('age', '>', Person.query().avg('age'));

console.log(peopleOlderThanAverage);
```

You can use [ref](/api/objection.js#ref) to reference the parent query  in subqueries:

```js
const { ref } = require('objection');

const peopleWithPetCount = await Person
  .query()
  .select([
    'persons.*',
    Pet.query().where('ownerId', ref('persons.id')).count().as('petCount')
  ]);

console.log(peopleWithPetCount[4].petCount);
```

The above query can also be written using the [relatedQuery](/api/model/static-properties.html#static-relatedquery) (assuming a relation `pets` has been defined for `Person`):

```js

const peopleWithPetCount = await Person
  .query()
  .select([
    'persons.*',
    Person.relatedQuery('pets').count().as('petCount')
  ]);

console.log(peopleWithPetCount[4].petCount);
```
