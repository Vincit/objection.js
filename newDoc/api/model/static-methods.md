# Static Methods

## `static` query()

```js
const queryBuilder = Person.query(transactionOrKnex);
```
Creates a query builder for the model's table.

All query builders are created using this function, including `$query`, `$relatedQuery` and `relatedQuery`. That means you can modify each query by overriding this method for your model class.

See the [query examples](/guide/query-examples.html) section for more examples.

### Arguments

Argument|Type|Description
--------|----|--------------------
transactionOrKnex|object|Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database. for a query. Falsy values are ignored.

### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|The created query builder

### Examples

Read models from the database:

```js
// Get all rows.
const people = await Person.query();
console.log('there are', people.length, 'people in the database');

// Example of a more complex WHERE clause. This generates:
// SELECT "persons".*
// FROM "persons"
// WHERE ("firstName" = 'Jennifer' AND "age" < 30)
// OR ("firstName" = 'Mark' AND "age" > 30)
const marksAndJennifers = await Person
  .query()
  .where(builder => {
    builder
      .where('firstName', 'Jennifer')
      .where('age', '<', 30);
  })
  .orWhere(builder => {
    builder
      .where('firstName', 'Mark')
      .where('age', '>', 30);
  });

console.log(marksAndJennifers);


// Get a subset of rows and fetch related models
// for each row.
const oldPeople = await Person
  .query()
  .where('age', '>', 60)
  .eager('children.children.movies');

console.log('some old person\'s grand child has appeared in',
  oldPeople[0].children[0].children[0].movies.length,
  'movies');
```

Insert models to the database:

```js
const sylvester = await Person
  .query()
  .insert({firstName: 'Sylvester', lastName: 'Stallone'});

console.log(sylvester.fullName());
// --> 'Sylvester Stallone'.

// Batch insert. This only works on Postgresql as it is
// the only database that returns the identifiers of
// _all_ inserted rows. If you need to do batch inserts
// on other databases useknex* directly.
// (See .knexQuery() method).
const inserted = await Person
  .query()
  .insert([
    {firstName: 'Arnold', lastName: 'Schwarzenegger'},
    {firstName: 'Sylvester', lastName: 'Stallone'}
  ]);

console.log(inserted[0].fullName()); // --> 'Arnold Schwarzenegger'
```

`update` and `patch` can be used to update models. Only difference between the mentioned methods is that `update` validates the input objects using the model class's full jsonSchema and `patch` ignores the `required` property of the schema. Use `update` when you want to update _all_ properties of a model and `patch` when only a subset should be updated.

```js
const numUpdatedRows = await Person
  .query()
  .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 35})
  .where('id', jennifer.id);

console.log(numUpdatedRows);

// This will throw assuming that `firstName` or `lastName`
// is a required property for a Person.
await Person.query().update({age: 100});

// This will _not_ throw.
await Person
  .query()
  .patch({age: 100});

console.log('Everyone is now 100 years old');
```

Models can be deleted using the delete method. Naturally the delete query can be chained with any knex* methods:

```js
await Person
  .query()
  .delete()
  .where('age', '>', 90);

console.log('anyone over 90 is now removed from the database');
```

## `static` knex()
