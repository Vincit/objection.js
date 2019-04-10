# Mutating Methods

## insert()

```js
queryBuilder = queryBuilder.insert(modelsOrObjects);
```

Creates an insert query.

The inserted objects are validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema). If validation fails
the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [returning('*')](/api/query-builder/find-methods.html#returning) to the query to get all
properties - see [this recipe](/recipes/returning-tricks.html) for some examples. If you use
`returning(['only', 'some', 'props'])` note that the result object will still contain the input properies
__plus__ the properties listed in `returning`. On other databases you can use the [insertAndFetch](/api/query-builder/mutate-methods.html#insertandfetch) method.

Batch inserts only work on Postgres because Postgres is the only database engine
that returns the identifiers of _all_ inserted rows. knex supports batch inserts on
other databases also, but you only get the id of the first (or last) inserted object
as a result. If you need batch insert on other databases you can use knex directly
through [knexQuery](/api/model/static-methods.html#static-knexquery).

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&nbsp;&#124;&nbsp;[Model](/api/model/)&nbsp;&#124;&nbsp;Object[]&nbsp;&#124;&nbsp;[Model](/api/model/)[]|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

console.log(jennifer.id);
```

Batch insert (Only works on Postgres):

```js
const actors = await someMovie
  .$relatedQuery('actors')
  .insert([
    {firstName: 'Jennifer', lastName: 'Lawrence'},
    {firstName: 'Bradley', lastName: 'Cooper'}
  ]);

console.log(actors[0].firstName);
console.log(actors[1].firstName);
```

You can also give raw expressions and subqueries as values like this:

```js
const { raw } = require('objection');

await Person
  .query()
  .insert({
    age: Person.query().avg('age'),
    firstName: raw("'Jenni' || 'fer'")
  });
```

Fields marked as `extras` for many-to-many relations in [relationMappings](/api/model/static-properties.html#static-relationmappings) are automatically
written to the join table instead of the target table. The `someExtra` field in the following example is written
to the join table if the `extra` array of the relation mapping contains the string `'someExtra'`. See [this recipe](/recipes/extra-properties.html) for more info.

```js
const jennifer = await someMovie
  .$relatedQuery('actors')
  .insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    someExtra: "I'll be written to the join table"
  });

console.log(jennifer.someExtra);
```

## insertAndFetch()

```js
queryBuilder = queryBuilder.insertAndFetch(modelsOrObjects);
```

Just like [insert](/api/query-builder/mutate-methods.html#insert) but also fetches the item afterwards.

Note that on postgresql you can just chain [returning('*')](/api/query-builder/find-methods.html#returning) to the normal insert query to get the same result without an additional query. See [this recipe](/recipes/returning-tricks.html) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&nbsp;&#124;&nbsp;[Model](/api/model/)&nbsp;&#124;&nbsp;Object[]&nbsp;&#124;&nbsp;[Model](/api/model/)[]|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## insertGraph()

```js
queryBuilder = queryBuilder.insertGraph(graph, options);
```

See the [section about graph inserts](/guide/query-examples.html#graph-inserts).

##### Arguments

Argument|Type|Description
--------|----|--------------------
graph|Object&nbsp;&#124;&nbsp;[Model](/api/model/)&nbsp;&#124;&nbsp;Object[]&nbsp;&#124;&nbsp;[Model](/api/model/)[]|Objects to insert
options|[InsertGraphOptions](/api/types/#type-insertgraphoptions)|Optional options.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## allowInsert()

```js
queryBuilder = queryBuilder.allowInsert(relationExpression);
```

Sets the allowed tree of relations to insert using [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method.

If the model tree given to the [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method isn't a subtree of the given expression, the query is rejected.

See methods [eager](/api/query-builder/eager-methods.html#eager), [allowEager](/api/query-builder/eager-methods.html#alloweager), [RelationExpression](/api/types/#type-relationexpression) and the guide section about [eager loading](/guide/query-examples.html#eager-loading) for more information on relation expressions.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const insertedPerson = await Person
  .query()
  .allowInsert('[children.pets, movies]')
  .insertGraph({
    firstName: 'Sylvester',
    children: [{
      firstName: 'Sage',
      pets: [{
        name: 'Fluffy'
        species: 'dog'
      }, {
        name: 'Scrappy',
        species: 'dog'
      }]
    }]
  })
```

## insertGraphAndFetch()

Exactly like [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) but also fetches the graph from the db after insert. Note that on postgres, you can simply chain [returning('*')](/api/query-builder/find-methods.html#returning) to the normal `insertGraph` query to get the same result without additional queries.

## insertWithRelated()

::: warning
Deprecated! Will be removed in version 2.0.
:::

Alias for [insertGraph](/api/query-builder/mutate-methods.html#insertgraph).

## insertWithRelatedAndFetch()

::: warning
Deprecated! Will be removed in version 2.0.
:::

Alias for [insertGraphAndFetch](/api/query-builder/mutate-methods.html#insertgraphandfetch).

## patch()

```js
queryBuilder = queryBuilder.patch(modelOrObject);
```

Creates a patch query.

The patch object is validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema) (if one is defined) _but_ the `required` property of the [jsonSchema](/api/model/static-properties.html#static-jsonschema) is ignored. This way the properties in the patch object are still validated but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

The return value of the query will be the number of affected rows. If you want to update a single row and retrieve the updated row as a result, you may want to use the [patchAndFetchById](/api/query-builder/mutate-methods.html#patchandfetchbyid) method or *take a look at [this recipe](/recipes/returning-tricks.html) if you're using Postgres*.

::: tip
This generates an SQL `update` query. While there's also the [update](/api/query-builder/mutate-methods.html#update) method, `patch` is what you want to use most of the time for updates. Read both methods' documentation carefully. If unsure or hate reading, use `patch` to update stuff :smile:
:::

::: warning
[raw](/api/objection/#raw), [lit](/api/objection/#lit), subqueries and other "query properties" in the patch object are not validated. Also fields specified using [FieldExpressions](/api/types/#type-fieldexpression) are not validated.
:::

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The patch object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

Patching a single row:

```js
const numberOfAffectedRows = await Person
  .query()
  .patch({ age: 24 })
  .findById(personId)

console.log(numberOfAffectedRows);
```

Patching multiple rows:

```js
const numberOfAffectedRows = await Person
  .query()
  .patch({ age: 20 })
  .where('age', '<', 50)
```

Increment a value atomically:

```js
const numberOfAffectedRows = await Person
  .query()
  .patch({ age: raw('age + 1') })
  .where('age', '<', 50)
```

You can also give raw expressions, subqueries and `ref()` as values and [FieldExpressions](/api/types/#type-fieldexpression) as keys. Note that none of these are validated. Objection cannot know what their values will be at the time the validation is done.

```js
const { ref, raw } = require('objection');

await Person
  .query()
  .patch({
    age: Person.query().avg('age'),
    // You can use knex.raw instead of `raw()` if
    // you prefer.
    firstName: raw("'Jenni' || 'fer'"),
    oldLastName: ref('lastName'),
    // This updates a value nested deep inside a
    // json column `detailsJsonColumn`.
    'detailsJsonColumn:address.street': 'Elm street'
  });
```

## patchAndFetchById()

```js
queryBuilder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

Just like [patch](/api/query-builder/mutate-methods.html#patch) for a single item, but also fetches the updated row from the database afterwards.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any|Identifier of the item to update. Can be a composite key.
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The patch object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const updatedPerson = await Person
  .query()
  .patchAndFetchById(134, { age: 24 });

console.log(updatedPerson.firstName);
```

## patchAndFetch()

```js
queryBuilder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

Just like [patchAndFetchById](/api/query-builder/mutate-methods.html#patchandfetchbyid) but can be used in an instance [$query](/api/model/instance-methods.html#query) without the need to specify the id.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The patch object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const jennifer = await Person.query().findOne({ firstName: 'Jennifer' })
const updatedJennifer = await jennifer.$query().patchAndFetch({ age: 24 });

console.log(updatedJennifer.firstName);
```

## update()

```js
queryBuilder = queryBuilder.update(modelOrObject);
```

Creates an update query.

The update object is validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema). If validation fails the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

Use `update` if you update the whole row with all it's columns. Otherwise, using the [patch](/api/query-builder/mutate-methods.html#patch) method is recommended. When `update` method is used, the validation respects the schema's `required` properties and throws a [ValidationError](/api/types/#class-validationerror) if any of them are missing. [patch](/api/query-builder/mutate-methods.html#patch) ignores the `required` properties and only validates the ones thate are found.

The return value of the query will be the number of affected rows. If you want to update a single row and retrieve the updated row as a result, you may want to use the [updateAndFetchById](/api/query-builder/mutate-methods.html#updateandfetchbyid) method or *take a look at [this recipe](/recipes/returning-tricks.html) if you're using Postgres*.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The update object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const numberOfAffectedRows = await Person
  .query()
  .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .where('id', 134);

console.log(numberOfAffectedRows);
```

You can also give raw expressions, subqueries and `ref()` as values like this:

```js
const { raw, ref } = require('objection');

await Person
  .query()
  .update({
    firstName: raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age'),
    oldLastName: ref('lastName') // same as knex.raw('??', ['lastName'])
  });
```

Updating single value inside json column and referring attributes inside json columns (only with postgres) etc.:

```js
await Person
  .query()
  .update({
    lastName: ref('someJsonColumn:mother.lastName').castText(),
    'detailsJsonColumn:address.street': 'Elm street'
  });
```

## updateAndFetchById()

```js
queryBuilder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

Just like [update](/api/query-builder/mutate-methods.html#update) for a single item, but also fetches the updated row from the database afterwards.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any|Identifier of the item to update. Can be a composite key.
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The update object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const updatedPerson = await Person
  .query()
  .updateAndFetchById(134, person);

console.log(updatedPerson.firstName);
```

## updateAndFetch()

```js
queryBuilder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

Just like [updateAndFetchById](/api/query-builder/mutate-methods.html#updateandfetchbyid) but can be used in an instance [$query](/api/model/instance-methods.html#query) without the need to specify the id.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&nbsp;&#124;&nbsp;[Model](/api/model/)|The update object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const jennifer = await Person.query().findOne({ firstName: 'Jennifer' })
const updatedJennifer = await jennifer.$query().updateAndFetch({ age: 24 });

console.log(updatedJennifer.firstName);
```

## upsertGraph()

```js
queryBuilder = queryBuilder.upsertGraph(graph, options);
```

See the [section about graph upserts](/guide/query-examples.html#graph-upserts)

##### Arguments

Argument|Type|Description
--------|----|--------------------
graph|Object&nbsp;&#124;&nbsp;[Model](/api/model/)&nbsp;&#124;&nbsp;Object[]&nbsp;&#124;&nbsp;[Model](/api/model/)[]|Objects to upsert
options|[UpsertGraphOptions](/api/types/#type-upsertgraphoptions)|Optional options.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## allowUpsert()

Just like [allowInsert](/api/query-builder/mutate-methods.html#allowinsert) but this one works with [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph).

## upsertGraphAndFetch()

Exactly like [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) but also fetches the graph from the db after the upsert operation.

## delete()

```js
queryBuilder = queryBuilder.delete();
```

Creates a delete query.

The return value of the query will be the number of deleted rows. if you're using Postgres
and want to get the deleted rows, *take a look at [this recipe](/recipes/returning-tricks.html)*.

Also see [deleteById](/api/query-builder/mutate-methods.html#deletebyid).

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const numberOfDeletedRows = await Person
  .query()
  .delete()
  .where('age', '>', 100)

console.log('removed', numberOfDeletedRows, 'people');
```

You can always use subqueries and all query building methods with `delete` queries, just like with every query in objection. With some databases, you cannot use joins with deletes (db restriction, not objection). You can replace joins with subqueries like this:

```js
// This query deletes all people that have a pet named "Fluffy".
await Person
  .query()
  .delete()
  .whereIn(
    'id',
    Person.query()
      .select('persons.id')
      .joinRelation('pets')
      .where('pets.name', 'Fluffy')
  );

// This is another way to implement the same query.
await Person
  .query()
  .delete()
  .whereExists(
    Person.relatedQuery('pets').where('pets.name', 'Fluffy')
  );
```

Delete can of course be used with [$relatedQuery](/api/model/instance-methods.html#relatedquery) and [$query](/api/model/instance-methods.html#query) too.

```js
const person = await Person.query().findById(personId);

// Delete all pets but cats and dogs of a person.
await person
  .$relatedQuery('pets')
  .delete()
  .whereNotIn('species', ['cat', 'dog']);

// Delete all pets of a person.
await person
  .$relatedQuery('pets')
  .delete();
```

## deleteById()

```js
queryBuilder = queryBuilder.deleteById(id);
```

Deletes an item by id.

The return value of the query will be the number of deleted rows. if you're using Postgres and want to get the deleted rows, *take a look at [this recipe](/recipes/returning-tricks.html)*.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any&nbsp;&#124;&nbsp;any[]|The id. Array for composite keys. This method doesn't accept multiple identifiers! See the examples below.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const numberOfDeletedRows = await Person
  .query()
  .deleteById(1)

console.log('removed', numberOfDeletedRows, 'people');
```

Delete single item with a composite key:

```js
const numberOfDeletedRows = await Person
  .query()
  .deleteById([10, '20', 46]);

console.log('removed', numberOfDeletedRows, 'people');
```

## relate()

```js
queryBuilder = queryBuilder.relate(ids);
```

Relate (attach) an existing item to another item.

This method doesn't create a new item but only updates the foreign keys. In
the case of a many-to-many relation, creates a join row to the join table.

On Postgres multiple items can be related by giving an array of identifiers.

##### Arguments

Argument|Type|Description
--------|----|--------------------
ids|number&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;Array&nbsp;&#124;&nbsp;Object|Identifier(s) of the model(s) to relate

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const person = await Person
  .query()
  .findById(123);

const numRelatedRows = await person.$relatedQuery('movies').relate(50);
console.log('movie 50 is now related to person 123 through `movies` relation');
```

Relate multiple (only works with postgres)

```js
const numRelatedRows = await person
  .$relatedQuery('movies')
  .relate([50, 60, 70]);

console.log(`${numRelatedRows} rows were related`);
```

Composite key

```js
const numRelatedRows = await person
  .$relatedQuery('movies')
  .relate({foo: 50, bar: 20, baz: 10});

console.log(`${numRelatedRows} rows were related`);
```

Fields marked as [extras](/api/types/#type-relationthrough) for many-to-many relations in [relationMappings](/api/model/static-properties.html#static-relationmappings) are automatically written to the join table. The `someExtra` field in the following example is written to the join table if the `extra` array of the relation mapping contains the string `'someExtra'`.

```js
const numRelatedRows = await someMovie
  .$relatedQuery('actors')
  .relate({
    id: 50,
    someExtra: "I'll be written to the join table"
  });

console.log(`${numRelatedRows} rows were related`);
```

## unrelate()

```js
queryBuilder = queryBuilder.unrelate();
```

Remove (detach) a connection between two rows.

Doesn't delete the rows. Only removes the connection. For ManyToMany relations this
deletes the join row from the join table. For other relation types this sets the
join columns to null.

Note that, unlike for `relate`, you shouldn't pass arguments for the `unrelate` method.
Use `unrelate` like `delete` and filter the rows using the returned query builder.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const person = await Person
  .query()
  .findById(123)

const numUnrelatedRows = await person.$relatedQuery('movies')
  .unrelate()
  .where('id', 50);

console.log(
  'movie 50 is no longer related to person 123 through `movies` relation'
);
```

## increment()

See [knex documentation](http://knexjs.org/#Builder-increment)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## decrement()

See [knex documentation](http://knexjs.org/#Builder-decrement)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## truncate()

See [knex documentation](http://knexjs.org/#Builder-truncate)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.
