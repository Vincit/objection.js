# PostgreSQL "returning" tricks

Because PostgreSQL (and some others) support [returning('*')](/api/query-builder.html#returning) chaining, you can actually `insert` a row, or `update` / `patch` / `delete` existing rows, __and__ receive the affected rows as Model instances in a single query, thus improving efficiency. See the examples for more clarity.

# Examples

Insert and return a Model instance in 1 query:

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .returning('*');

console.log(jennifer.createdAt); // NOW()-ish
console.log(jennifer.id); // Sequence ID
```

Update a single row by ID and return the updated Model instance in 1 query:

```js
const jennifer = await Person
  .query()
  .patch({firstName: 'Jenn', lastName: 'Lawrence'})
  .where('id', 1234)
  .returning('*');

console.log(jennifer.updatedAt); // NOW()-ish
console.log(jennifer.firstName); // "Jenn"
```

Patch a Model instance and receive DB updates to Model instance in 1 query:

```js
const updateJennifer = await jennifer
  .$query()
  .patch({firstName: 'J.', lastName: 'Lawrence'})
  .returning('*');

console.log(updateJennifer.updatedAt); // NOW()-ish
console.log(updateJennifer.firstName); // "J."
```

Delete all Persons named Jennifer and return the deleted rows as Model instances in 1 query:

```js
const deletedJennifers = await Person
  .query()
  .delete()
  .where({firstName: 'Jennifer'})
  .returning('*');

console.log(deletedJennifers.length); // However many Jennifers there were
console.log(deletedJennifers[0].lastName); // Maybe "Lawrence"
```

Delete all of Jennifer's dogs and return the deleted Model instances in 1 query:

```js
const jennsDeletedDogs = await jennifer
  .$relatedQuery('pets')
  .delete()
  .where({'species': 'dog'})
  .returning('*');

console.log(jennsDeletedDogs.length); // However many dogs Jennifer had
console.log(jennsDeletedDogs[0].name); // Maybe "Fido"
```
