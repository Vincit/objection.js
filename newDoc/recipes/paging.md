# Paging

Most of the queriescan be paged using the [page](/api/query-builder/instance-methods.html#page) or [range](/api/query-builder/instance-methods.html#range) method.

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .page(5, 100);

console.log(result.results.length); // --> 100
console.log(result.total); // --> 3341
```

There are some cases where [page](/api/query-builder/instance-methods.html#page) and [range](/api/query-builder/instance-methods.html#range) don't work.

1. In [modifyEager](/api/query-builder/instance-methods.html#modifyeager) or named filters:

```js
// This doesn't work because the query `qb` fetches the
// `children` for all parents at once. Paging that query
//  will have not fetch 10 results for all parents, but
// instead 10 results in total.
const result = await Person
  .query()
  .eager('children')
  .modifyEager('children', qb => qb.page(0, 10));
```

2. When `joinEager` is used:

```js
// This doesn't work because of the way SQL joins work.
// Databases return the nested relations as a flattened
// list of records. Paging the query will page the
// flattened results which has alot more rows than
// the root query.
const result = await Person
  .query()
  .joinEager('children')
  .page(0, 10)
```
