# Raw queries

To mix raw SQL with queries, use the [raw](/api/objection/#raw) function from the main module. [raw](/api/objection/#raw) works just like the [knex's raw method](http://knexjs.org/#Raw) but in addition, supports objection queries, [raw](/api/objection/#raw), [ref](/api/objection/#ref), [val](/api/objection/#val) and all other objection types. You can also use [knex.raw()](http://knexjs.org/#Raw).

[raw](/api/objection/#raw) is handy when you want to mix SQL in objection queries, but if you want to fire off a completely custom query, you need to use [knex.raw](http://knexjs.org/#Raw).

There are also some helper methods such as [whereRaw](/api/query-builder/find-methods.html#whereraw) in the [QueryBuilder](/api/query-builder/).

## Examples

```js
const { raw } = require('objection');
const ageToAdd = 10;

await Person.query().patch({
  age: raw('age + ?', ageToAdd),
});
```

```js
const { raw } = require('objection');

const childAgeSums = await Person.query()
  .select(raw('coalesce(sum(??), 0)', 'age').as('childAgeSum'))
  .where(
    raw(`?? || ' ' || ??`, 'firstName', 'lastName'),
    'Arnold Schwarzenegger'
  )
  .orderBy(raw('random()'));

console.log(childAgeSums[0].childAgeSum);
```

Also see the [fn](/api/objection/#fn) helper for calling SQL functions. The following example is equivalent the previous one.

```js
const { fn, ref } = require('objection');

const childAgeSums = await Person.query()
  .select(fn.coalesce(fn.sum(ref('age')), 0).as('childAgeSum'))
  .where(
    fn.concat(ref('firstName'), ' ', ref('lastName')),
    'Arnold Schwarzenegger'
  )
  .orderBy(fn('random'));

console.log(childAgeSums[0].childAgeSum);
```

Binding arguments can be other [raw](/api/objection/#raw) instances, [QueryBuilders](/api/query-builder/) or pretty much anything you can think of.

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
