# Raw queries

To mix raw SQL with queries, use the [raw](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#raw) function from the main module. [raw](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#raw) works just like the [knex's raw method](http://knexjs.org/#Raw) but in addition, supports objection queries, [raw](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#raw), [ref](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#ref), [lit](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#lit) and all other objection types. You can also use [knex.raw()](http://knexjs.org/#Raw).

[raw](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#raw) is handy when you want to mix SQL in objection queries, but if you want to fire off a completely custom query, you need to use [knex.raw](http://knexjs.org/#Raw).

There are also some helper methods such as [whereRaw](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#whereraw) and [selectRaw](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#selectraw) in the [QueryBuilder](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/).

## Examples

```js
const { raw } = require('objection');
const ageToAdd = 10;

await Person
  .query()
  .patch({
    age: raw('age + ?', ageToAdd)
  })
```

```js
const { raw } = require('objection');

const childAgeSums = await Person
  .query()
  .select(raw('coalesce(sum(??), 0) as ??', 'age').as('childAgeSum'))
  .where(raw(`?? || ' ' || ??`, 'firstName', 'lastName'), 'Arnold Schwarzenegger')
  .orderBy(raw('random()'));

console.log(childAgeSums[0].childAgeSum);
```

```js
const childAgeSums = await Person
  .query()
  .select(raw('coalesce(sum(??), 0) as ??', ['age', 'childAgeSum']))
  .groupBy('parentId');

console.log(childAgeSums[0].childAgeSum);
```

Binding arguments can be other [raw](https://github.com/Vincit/objection.js/tree/v1/doc/api/objection/#raw) instances, [QueryBuilders](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/) or pretty much anything you can think of.

```js
const { raw, ref } = require('objection');

const people = await Person
  .query()
  .alias('p')
  .select(raw('array(?) as childIds', [
    Person.query()
      .select('id')
      .where('id', ref('p.parentId'))
  ]);

console.log('child identifiers:', people[0].childIds)
```

Completely custom raw query using knex:

```js
const knex = Person.knex();
await knex.raw('SELECT 1');
```
