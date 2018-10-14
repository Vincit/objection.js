# Raw queries

To mix raw SQL with queries, use the [raw](/api/objection.html#raw) function from the main module or the [Model.raw()](/api/model.html#static-raw) method of any [Model](/api/model.html) subclass. The only difference between these two is that the [raw](/api/objection.html#raw) function from the main module doesn't depend on knex where as [Model.raw()](/api/model.html#static-raw) will throw if the model doesn't have a knex instance installed. Both of these functions work just like the [knex's raw method](http://knexjs.org/#Raw). And of course you can just use [knex.raw()](http://knexjs.org/#Raw).

There are also some helper methods such as [whereRaw](/api/query-builder.html#whereraw) in the [QueryBuilder](/api/query-builder.html).

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

Binding arguments can be other [raw](/api/objection.html#raw) instances, [QueryBuilders](/api/query-builder.html) or pretty much anything you can think of.

```js
const { raw, ref } = require('objection');

const childAgeSums = await Person
  .query()
  .alias('p')
  .select(raw('array(?) as childIds', [
    Person.query()
      .select('id')
      .where('id', ref('p.parentId')).
  ]);
```
