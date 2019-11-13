# Paging

Most of the queries can be paged using the [page](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/other-methods.md#page) or [range](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/other-methods.md#range) method.

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .page(5, 100);

console.log(result.results.length); // --> 100
console.log(result.total); // --> 3341
```

There are some cases where [page](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/other-methods.md#page) and [range](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/other-methods.md#range) don't work.

1. In [modifyEager](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/other-methods.md#modifyeager) or named filters:

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
