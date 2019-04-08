---
sidebarDepth: 3
---

# Instance Methods

## Query Building Methods

### findById()

```js
queryBuilder = queryBuilder.findById(id);
```

Finds a single item by id.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any&nbsp;&#124;&nbsp;any[]|The identifier.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const person = await Person.query().findById(1);
```

Composite key:

```js
const person = await Person.query().findById([1, '10']);
```

`findById` can be used together with `patch`, `delete` and any other query method. All it does is adds the needed `where` clauses to the query.

```js
await Person.findById(someId).patch({ firstName: 'Jennifer' })
```

### findByIds()

```js
queryBuilder = queryBuilder.findByIds(ids);
```

Finds a list of items. The order of the returned items is not guaranteed to be the same as the order of the inputs.

##### Arguments

Argument|Type|Description
--------|----|--------------------
ids|any[]|A List of identifiers.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const [person1, person2] = await Person.query().findByIds([1, 2]);
```

Composite key:

```js
const [person1, person2] = await Person.query().findByIds([[1, '10'], [2, '10']]);
```

### findOne()

```js
queryBuilder = queryBuilder.findOne(...whereArgs);
```

Shorthand for `where(...whereArgs).first()`.

##### Arguments

Argument|Type|Description
--------|----|--------------------
whereArgs|...any|Anything the [where](/api/query-builder/instance-methods.html#where) method accepts.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const person = await Person.query().findOne({
  firstName: 'Jennifer',
  lastName: 'Lawrence'
});
```

```js
const person = await Person.query().findOne('age', '>', 20);
```

```js
const person = await Person.query().findOne(raw('random() < 0.5'));
```

### insert()

```js
queryBuilder = queryBuilder.insert(modelsOrObjects);
```

Creates an insert query.

The inserted objects are validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema). If validation fails
the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [returning('*')](/api/query-builder/instance-methods.html#returning) to the query to get all
properties - see [this recipe](/recipes/returning-tricks.html) for some examples. If you use
`returning(['only', 'some', 'props'])` note that the result object will still contain the input properies
__plus__ the properties listed in `returning`. On other databases you can use the [insertAndFetch](/api/query-builder/instance-methods.html#insertandfetch) method.

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
to the join table if the `extra` array of the relation mapping contains the string `'someExtra'`.

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

### insertAndFetch()

```js
queryBuilder = queryBuilder.insertAndFetch(modelsOrObjects);
```

Just like [insert](/api/query-builder/instance-methods.html#insert) but also fetches the item afterwards.

Note that on postgresql you can just chain [returning('*')](/api/query-builder/instance-methods.html#returning) to the normal insert query to get the same result without an additional query. See [this recipe](/recipes/returning-tricks.html) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&nbsp;&#124;&nbsp;[Model](/api/model/)&nbsp;&#124;&nbsp;Object[]&nbsp;&#124;&nbsp;[Model](/api/model/)[]|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### insertGraph()

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

### insertGraphAndFetch()

Exactly like [insertGraph](/api/query-builder/instance-methods.html#insertgraph) but also fetches the graph from the db after insert. Note that on postgres, you can simply chain [returning('*')](/api/query-builder/instance-methods.html#returning) to the normal `insertGraph` query to get the same result without additional queries.

### insertWithRelated()

::: warning
Deprecated! Will be removed in version 2.0.
:::

Alias for [insertGraph](/api/query-builder/instance-methods.html#insertgraph).

### insertWithRelatedAndFetch()

::: warning
Deprecated! Will be removed in version 2.0.
:::

Alias for [insertGraphAndFetch](/api/query-builder/instance-methods.html#insertgraphandfetch).

### patch()

```js
queryBuilder = queryBuilder.patch(modelOrObject);
```

Creates a patch query.

The patch object is validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema) (if one is defined) _but_ the `required` property of the [jsonSchema](/api/model/static-properties.html#static-jsonschema) is ignored. This way the properties in the patch object are still validated but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

The return value of the query will be the number of affected rows. If you want to update a single row and retrieve the updated row as a result, you may want to use the [patchAndFetchById](/api/query-builder/instance-methods.html#patchandfetchbyid) method or *take a look at [this recipe](/recipes/returning-tricks.html) if you're using Postgres*.

::: tip
This generates an SQL `update` query. While there's also the [update](/api/query-builder/instance-methods.html#update) method, `patch` is what you want to use most of the time for updates. Read both methods' documentation carefully. If unsure or hate reading, use `patch` to update stuff :smile:
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

### patchAndFetchById()

```js
queryBuilder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

Just like [patch](/api/query-builder/instance-methods.html#patch) for a single item, but also fetches the updated row from the database afterwards.

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

### patchAndFetch()

```js
queryBuilder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

Just like [patchAndFetchById](/api/query-builder/instance-methods.html#patchandfetchbyid) but can be used in an instance [$query](/api/model/instance-methods.html#query) without the need to specify the id.

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

### update()

```js
queryBuilder = queryBuilder.update(modelOrObject);
```

Creates an update query.

The update object is validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema). If validation fails the Promise is rejected with a [ValidationError](/api/types/#class-validationerror).

Use `update` if you update the whole row with all it's columns. Otherwise, using the [patch](/api/query-builder/instance-methods.html#patch) method is recommended. When `update` method is used, the validation respects the schema's `required` properties and throws a [ValidationError](/api/types/#class-validationerror) if any of them are missing. [patch](/api/query-builder/instance-methods.html#patch) ignores the `required` properties and only validates the ones thate are found.

The return value of the query will be the number of affected rows. If you want to update a single row and retrieve the updated row as a result, you may want to use the [updateAndFetchById](/api/query-builder/instance-methods.html#updateandfetchbyid) method or *take a look at [this recipe](/recipes/returning-tricks.html) if you're using Postgres*.

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

### updateAndFetchById()

```js
queryBuilder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

Just like [update](/api/query-builder/instance-methods.html#update) for a single item, but also fetches the updated row from the database afterwards.

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

### updateAndFetch()

```js
queryBuilder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

Just like [updateAndFetchById](/api/query-builder/instance-methods.html#updateandfetchbyid) but can be used in an instance [$query](/api/model/instance-methods.html#query) without the need to specify the id.

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

### upsertGraph()

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

### upsertGraphAndFetch()

Exactly like [upsertGraph](/api/query-builder/instance-methods.html#upsertgraph) but also fetches the graph from the db after the upsert operation.

### delete()

```js
queryBuilder = queryBuilder.delete();
```

Creates a delete query.

The return value of the query will be the number of deleted rows. if you're using Postgres
and want to get the deleted rows, *take a look at [this recipe](/recipes/returning-tricks.html)*.

Also see [deleteById](/api/query-builder/instance-methods.html#deletebyid).

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

Delete can of course be used in with [$relatedQuery](/api/model/instance-methods.html#relatedquery) and [$query](/api/model/instance-methods.html#query).

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

### deleteById()

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

### relate()

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

### unrelate()

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

### alias()

```js
queryBuilder = queryBuilder.alias(alias);
```

Give an alias for the table to be used in the query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
alias|string|Table alias for the query.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
await Person
  .query()
  .alias('p')
  .where('p.id', 1)
  .join('persons as parent', 'parent.id', 'p.parentId')
```

### aliasFor()

```js
queryBuilder = queryBuilder.aliasFor(tableNameOrModelClass, alias);
```

Give an alias for any table in the query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
tableNameOrModelClass|string&nbsp;&#124;&nbsp;ModelClass|The table or model class to alias.
alias|string|The alias.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
// This query uses joinRelation to join a many-to-many relation which also joins
// the join table `persons_movies`. We specify that the `persons_movies` table
// should be called `pm` instead of the default `movies_join`.
await person
  .query()
  .aliasFor('persons_movies', 'pm')
  .joinRelation('movies')
  .where('pm.someProp', 100)
```

Model class can be used instead of table name

```js
await Person
  .query()
  .aliasFor(Movie, 'm')
  .joinRelation('movies')
  .where('m.name', 'The Room')
```

### increment()

See [knex documentation](http://knexjs.org/#Builder-increment)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### decrement()

See [knex documentation](http://knexjs.org/#Builder-decrement)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### select()

See [knex documentation](http://knexjs.org/#Builder-select)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### forUpdate()

See [knex documentation](http://knexjs.org/#Builder-forUpdate)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### forShare()

See [knex documentation](http://knexjs.org/#Builder-forShare)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### timeout()

See [knex documentation](http://knexjs.org/#Builder-timeout)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### as()

See [knex documentation](http://knexjs.org/#Builder-as)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### columns()

See [knex documentation](http://knexjs.org/#Builder-columns)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### column()

See [knex documentation](http://knexjs.org/#Builder-column)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### from()

See [knex documentation](http://knexjs.org/#Builder-from)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### into()

See [knex documentation](http://knexjs.org/#Builder-into)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### with()

See [knex documentation](http://knexjs.org/#Builder-with)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### withSchema()

See [knex documentation](http://knexjs.org/#Builder-withSchema)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### table()

See [knex documentation](http://knexjs.org/#Builder-table)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### distinct()

See [knex documentation](http://knexjs.org/#Builder-distinct)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### join()

See [knex documentation](http://knexjs.org/#Builder-join)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### joinRaw()

See [knex documentation](http://knexjs.org/#Builder-joinRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### innerJoin()

See [knex documentation](http://knexjs.org/#Builder-innerJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### leftJoin()

See [knex documentation](http://knexjs.org/#Builder-leftJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### leftOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-leftOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### rightJoin()

See [knex documentation](http://knexjs.org/#Builder-rightJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### rightOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-rightOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### outerJoin()

See [knex documentation](http://knexjs.org/#Builder-outerJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### fullOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-fullOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### crossJoin()

See [knex documentation](http://knexjs.org/#Builder-crossJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### joinRelation()

```js
queryBuilder = queryBuilder.joinRelation(relationExpression, opt);
```

Joins a set of relations described by `relationExpression`. See the examples for more info.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|An expression describing which relations to join.
opt|object|Optional options. See the examples.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

Join one relation:

```js
await Person
  .query()
  .joinRelation('pets')
  .where('pets.species', 'dog');
```

Give an alias for a single relation:

```js
await Person
  .query()
  .joinRelation('pets', { alias: 'p' })
  .where('p.species', 'dog');
```

Join two relations:

```js
await Person
  .query()
  .joinRelation('[pets, parent]')
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

You can also use the [object notation](/api/types/#relationexpression-object-notation)

```js
await Person
  .query()
  .joinRelation({
    pets: true,
    parent: true
  })
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

Join two multiple and nested relations. Note that when referring to nested relations `:` must be used as a separator instead of `.`. This limitation comes from the way knex parses table references.

```js
await Person
  .query()
  .select('persons.id', 'parent:parent.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]')
  .where('parent:pets.species', 'dog');
```

Give aliases for a bunch of relations:

```js
await Person
  .query()
  .select('persons.id', 'pr:pr.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]', {
    aliases: {
      parent: 'pr',
      pets: 'pt'
    }
  })
  .where('pr:pt.species', 'dog');
```

### innerJoinRelation()

Alias for [joinRelation](/api/query-builder/instance-methods.html#joinrelation).

### outerJoinRelation()

Outer join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### leftJoinRelation()

Left join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### leftOuterJoinRelation()

Left outer join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### rightJoinRelation()

Right join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### rightOuterJoinRelation()

Left outer join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### fullOuterJoinRelation()

Full outer join version of the [joinRelation](/api/query-builder/instance-methods.html#joinrelation) method.

### where()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.


### andWhere()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhere()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNot()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNot()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereRaw()

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereWrapped()

See [knex documentation](http://knexjs.org/#Builder-wheres)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### havingWrapped()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereRaw()

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereExists()

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereExists()

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNotExists()

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNotExists()

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereIn()

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereIn()

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNotIn()

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNotIn()

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNull()

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNull()

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNotNull()

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNotNull()

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereBetween()

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNotBetween()

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereBetween()

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNotBetween()

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### andWhereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### andWhereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### groupBy()

See [knex documentation](http://knexjs.org/#Builder-groupBy)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### groupByRaw()

See [knex documentation](http://knexjs.org/#Builder-groupByRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orderBy()

See [knex documentation](http://knexjs.org/#Builder-orderBy)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orderByRaw()

See [knex documentation](http://knexjs.org/#Builder-orderByRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### union()

See [knex documentation](http://knexjs.org/#Builder-union)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### unionAll()

See [knex documentation](http://knexjs.org/#Builder-unionAll)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### having()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### havingRaw()

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orHaving()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orHavingRaw()

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### offset()

See [knex documentation](http://knexjs.org/#Builder-offset)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### limit()

See [knex documentation](http://knexjs.org/#Builder-limit)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### count()

See [knex documentation](http://knexjs.org/#Builder-count)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### countDistinct()

See [knex documentation](http://knexjs.org/#Builder-count)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### min()

See [knex documentation](http://knexjs.org/#Builder-min)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### max()

See [knex documentation](http://knexjs.org/#Builder-max)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### sum()

See [knex documentation](http://knexjs.org/#Builder-sum)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### avg()

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### avgDistinct()

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### debug()

See [knex documentation](http://knexjs.org/#Builder-debug)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### returning()

See [knex documentation](http://knexjs.org/#Builder-returning)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### truncate()

See [knex documentation](http://knexjs.org/#Builder-truncate)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### connection()

See [knex documentation](http://knexjs.org/#Builder-connection)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### modify()

Works like `knex`'s [modify](http://knexjs.org/#Builder-modify) function but in addition you can specify model [modifier](/api/model/static-properties.html#static-modifiers) by providing modifier names.

See [knex documentation](http://knexjs.org/#Builder-modify)

##### Arguments

Argument|Type|Description
--------|----|--------------------
modifier|function([QueryBuilder](/api/query-builder/))&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;string[]|The modify callback function, receiving the builder as its first argument, followed by the optional arguments. If a string is provided, the corresponding [modifier](/api/model/static-properties.html#static-modifiers) is executed instead.
*arguments|...any|The optional arguments passed to the modify function

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### applyModifier()

Applies modifiers to the query builder.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modifier|string|The name of the modifier, as found in [modifier](/api/model/static-properties.html#static-modifiers).
*arguments| |When providing multiple arguments, all provided modifiers will be applied.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### applyFilter()

An alias for [applyModifier](/api/query-builder/instance-methods.html#applymodifier)

### columnInfo()

See [knex documentation](http://knexjs.org/#Builder-columnInfo)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### whereComposite()

```js
queryBuilder = queryBuilder.whereComposite(columns, operator, values);
```

[where](/api/query-builder/instance-methods.html#where) for (possibly) composite keys.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
builder.whereComposite(['id', 'name'], '=', [1, 'Jennifer']);
```

This method also works with a single column - value pair:

```js
builder.whereComposite('id', 1);
```

### whereInComposite()

```js
queryBuilder = queryBuilder.whereInComposite(columns, values);
```

[whereIn](/api/query-builder/instance-methods.html#wherein) for (possibly) composite keys.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
builder.whereInComposite(['a', 'b'], [[1, 2], [3, 4], [1, 4]]);
```

```js
builder.whereInComposite('a', [[1], [3], [1]]);
```

```js
builder.whereInComposite('a', [1, 3, 1]);
```

```js
builder.whereInComposite(['a', 'b'], SomeModel.query().select('a', 'b'));
```

### whereJsonSupersetOf()

```js
queryBuilder = queryBuilder.whereJsonSupersetOf(
  fieldExpression,
  jsonObjectOrFieldExpression
);
```

Where left hand json field reference is a superset of the right hand json value or reference.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|Reference to column / json field, which is tested for being a superset
jsonObjectOrFieldExpression|Object&nbsp;&#124;&nbsp;Array&nbsp;&#124;&nbsp;[FieldExpression](/api/types/#type-fieldexpression)|To which to compare

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const people = await Person
  .query()
  .whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome');

// These people have all or some of their dogs at home. Person might have some
// additional dogs in their custody since myDogs is supreset of dogsAtHome.

const people = await Person
  .query()
  .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"});

// These people's first dog name is "peter", but the dog might have
// additional attributes as well.
```

Object and array are always their own supersets.

For arrays this means that left side matches if it has all the elements listed in the right hand side. e.g.

```
[1,2,3] isSuperSetOf [2] => true
[1,2,3] isSuperSetOf [2,1,3] => true
[1,2,3] isSuperSetOf [2,null] => false
[1,2,3] isSuperSetOf [] => true
```

The `not` variants with jsonb operators behave in a way that they won't match rows, which don't have the referred json key referred in field expression. e.g. for table

```
 id |    jsonObject
----+--------------------------
  1 | {}
  2 | NULL
  3 | {"a": 1}
  4 | {"a": 1, "b": 2}
  5 | {"a": ['3'], "b": ['3']}
```

this query:

```js
builder.whereJsonNotEquals("jsonObject:a", "jsonObject:b")
```

Returns only the row `4` which has keys `a` and `b` and `a` != `b`, but it won't return any rows that don't have `jsonObject.a` or `jsonObject.b`.

### orWhereJsonSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof)

### whereJsonNotSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof)

### orWhereJsonNotSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof)

### whereJsonSubsetOf()

```js
queryBuilder = queryBuilder.whereJsonSubsetOf(
  fieldExpression,
  jsonObjectOrFieldExpression
);
```

Where left hand json field reference is a subset of the right hand json value or reference.

Object and array are always their own subsets.

See [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof)

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|Reference to column / json field, which is tested for being a superset
jsonObjectOrFieldExpression|Object&nbsp;&#124;&nbsp;Array&nbsp;&#124;&nbsp;[FieldExpression](/api/types/#type-fieldexpression)|To which to compare

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereJsonSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/instance-methods.html#wherejsonsubsetof)

### whereJsonNotSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/instance-methods.html#wherejsonsubsetof)

### orWhereJsonNotSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/instance-methods.html#wherejsonsubsetof)

### whereJsonIsArray()

```js
queryBuilder = queryBuilder.whereJsonIsArray(fieldExpression);
```

Where json field reference is an array.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereJsonIsArray()

See [whereJsonIsArray](/api/query-builder/instance-methods.html#wherejsonisarray)

### whereJsonNotArray()

See [whereJsonIsArray](/api/query-builder/instance-methods.html#wherejsonisarray)

### orWhereJsonNotArray()

See [whereJsonIsArray](/api/query-builder/instance-methods.html#wherejsonisarray)

### whereJsonIsObject()

```js
queryBuilder = queryBuilder.whereJsonIsObject(fieldExpression);
```

Where json field reference is an object.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereJsonIsObject()

See [whereJsonIsObject](/api/query-builder/instance-methods.html#wherejsonisobject)

### whereJsonNotObject()

See [whereJsonIsObject](/api/query-builder/instance-methods.html#wherejsonisobject)

### orWhereJsonNotObject()

See [whereJsonIsObject](/api/query-builder/instance-methods.html#wherejsonisobject)

### whereJsonHasAny()

```js
queryBuilder = queryBuilder.whereJsonHasAny(fieldExpression, keys);
```

Where any of given strings is found from json object key(s) or array items.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|
keys|string&nbsp;&#124;&nbsp;string[]|Strings that are looked from object or array

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereJsonHasAny()

See [whereJsonHasAny](/api/query-builder/instance-methods.html#wherejsonhasany)

### whereJsonHasAll()

```js
queryBuilder= queryBuilder.whereJsonHasAll(fieldExpression, keys);
```

Where all of given strings are found from json object key(s) or array items.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[FieldExpression](/api/types/#type-fieldexpression)|
keys|string&nbsp;&#124;&nbsp;string[]|Strings that are looked from object or array

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### orWhereJsonHasAll()

See [whereJsonHasAll](/api/query-builder/instance-methods.html#wherejsonhasall)

## Other instance methods

### context()

```js
queryBuilder = queryBuilder.context(queryContext);
```

Sets/gets the query context.

Some query builder methods create more than one query. The query context is an object that is shared with all queries started by a query builder.

The context is also passed to [$beforeInsert](/api/model/instance-methods.html#beforeinsert), [$afterInsert](/api/model/instance-methods.html#afterinsert), [$beforeUpdate](/api/model/instance-methods.html#beforeupdate), [$afterUpdate](/api/model/instance-methods.html#afterupdate), [$beforeDelete](/api/model/instance-methods.html#beforedelete), [$afterDelete](/api/model/instance-methods.html#afterdelete) and [$afterGet](/api/model/instance-methods.html#afterget) calls that the query creates.

In addition to properties added using this method (and [mergeContext](/api/query-builder/instance-methods.html#mergecontext)) the query context object always has a `transaction` property that holds the active transaction. If there is no active transaction the `transaction` property contains the normal knex instance. In both cases the value can be passed anywhere where a transaction object can be passed so you never need to check for the existence of the `transaction` property.

See the methods [runBefore](/api/query-builder/instance-methods.html#runbefore), [onBuild](/api/query-builder/instance-methods.html#onbuild) and [runAfter](/api/query-builder/instance-methods.html#runafter)
for more information about the hooks.

::: tip
Most of the time, you should be using [mergeContext](/api/query-builder/instance-methods.html#mergecontext) instead of this method. This method replaces the whole context, while `mergeContext` merges the values with the current ones.
:::

##### Arguments

Argument|Type|Description
--------|----|--------------------
queryContext|Object|The query context object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

You can set the context like this:

```js
await Person
  .query()
  .context({something: 'hello'});
```

and access the context like this:

```js
const context = builder.context();
```

You can set any data to the context object. You can also register QueryBuilder lifecycle methods for _all_ queries that share the context:

```js
Person
  .query()
  .context({
    runBefore(result, builder) {
      return result;
    },
    runAfter(result, builder) {
      return result;
    },
    onBuild(builder) {}
  });
```

For example the `eager` method causes multiple queries to be executed from a single query builder. If you wanted to make all of them use the same schema you could write this:

```js
Person
  .query()
  .eager('[movies, children.movies]')
  .context({
    onBuild(builder) {
      builder.withSchema('someSchema');
    }
  });
```

### mergeContext()

```js
queryBuilder = queryBuilder.mergeContext(queryContext);
```

Merges values into the query context.

This method is like [context](/api/query-builder/instance-methods.html#context) but instead of replacing the whole context this method merges the objects.

##### Arguments

Argument|Type|Description
--------|----|--------------------
queryContext|Object|The object to merge into the query context.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### tableNameFor()

```js
const tableName = queryBuilder.tableNameFor(modelClass);
```

Returns the table name for a given model class in the query. Usually the table name can be fetched through `Model.tableName` but if the source table has been changed for example using the [QueryBuilder#table](/api/query-builder/instance-methods.html#table) method `tableNameFor` will return the correct value.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|function|A model class.

##### Return value

Type|Description
----|-----------------------------
string|The source table (or view) name for `modelClass`.

### tableRefFor()

```js
const tableRef = queryBuilder.tableRefFor(modelClass);
```

Returns the name that should be used to refer to the `modelClass`'s table in the query.
Usually a table can be referred to using its name, but `tableRefFor` can return a different
value for example in case an alias has been given.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|function|A model class.

##### Return value

Type|Description
----|-----------------------------
string|The name that should be used to refer to a table in the query.

### reject()

```js
queryBuilder = queryBuilder.reject(reason);
```

Skips the database query and "fakes" an error result.

##### Arguments

Argument|Type|Description
--------|----|--------------------
reson| |The rejection reason

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### resolve()

```js
queryBuilder = queryBuilder.resolve(value);
```

Skips the database query and "fakes" a result.

##### Arguments

Argument|Type|Description
--------|----|--------------------
value| |The resolve value

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

### isExecutable()

```js
const isExecutable = queryBuilder.isExecutable();
```

Returns false if this query will never be executed.

This may be true in multiple cases:

1. The query is explicitly resolved or rejected using the [resolve](/api/query-builder/instance-methods.html#resolve) or [reject](/api/query-builder/instance-methods.html#reject) methods.
2. The query starts a different query when it is executed.

##### Return value

Type|Description
----|-----------------------------
boolean|false if the query will never be executed.

### isFind()

```js
const isFind = queryBuilder.isFind();
```

Returns true if the query is read-only.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query is read-only.

### isInsert()

```js
const isInsert = queryBuilder.isInsert();
```

Returns true if the query performs an insert operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an insert operation.

### isUpdate()

```js
const isUpdate = queryBuilder.isUpdate();
```

Returns true if the query performs an update or patch operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an update or patch operation.

### isDelete()

```js
const isDelete = queryBuilder.isDelete();
```

Returns true if the query performs a delete operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs a delete operation.

### isRelate()

```js
const isRelate = queryBuilder.isRelate();
```

Returns true if the query performs a relate operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs a relate operation.

### isUnrelate()

```js
const isUnrelate = queryBuilder.isUnrelate();
```

Returns true if the query performs an unrelate operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an unrelate operation.

### isInternal()

```js
const isInternal = queryBuilder.isInternal();
```

Returns true for internal "helper" queries that are not directly
part of the operation being executed. For example the `select` queries
performed by `upsertGraph` to get the current state of the graph are
internal queries.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an internal helper operation.

### hasWheres()

```js
const hasWheres = queryBuilder.hasWheres();
```

Returns true if the query contains where statements.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query contains where statements.

### hasSelects()

```js
const hasSelects = queryBuilder.hasSelects();
```

Returns true if the query contains any specific select staments, such as:
`'select'`, `'columns'`, `'column'`, `'distinct'`, `'count'`, `'countDistinct'`, `'min'`, `'max'`, `'sum'`, `'sumDistinct'`, `'avg'`, `'avgDistinct'`

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query contains any specific select staments.

### hasEager()

```js
const hasEager = queryBuilder.hasEager();
```

Returns true if the query defines any eager expressions.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query defines any eager expressions.

### has()

```js
const has = queryBuilder.has(selector);
```

```js
console.log(Person.query().range(0, 4).has('range'));
```

Returns true if the query defines an operation that matches the given selector.

##### Arguments

Argument|Type|Description
--------|----|--------------------
selector|string&nbsp;&#124;&nbsp;RegExp|A name or regular expression to match all defined operations against.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query defines an operation that matches the given selector.

### clear()

```js
queryBuilder = queryBuilder.clear(selector);
```

Removes all operations in the query that match the given selector.

##### Arguments

Argument|Type|Description
--------|----|--------------------
selector|string&nbsp;&#124;&nbsp;regexp|A name or regular expression to match all operations that are to be removed against.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
console.log(Person.query().orderBy('firstName').clear('orderBy').has('orderBy'));
```

### runBefore()

```js
queryBuilder = queryBuilder.runBefore(runBefore);
```

Registers a function to be called before just the database query when the builder is executed. Multiple functions can be chained like `then` methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|--------------------
runBefore|function(result,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed. This function can be async. Note that it needs to return the result used for further processing in the chain of calls.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
  .runBefore(async result => {
    console.log('hello 1');

    await Promise.delay(10);

    console.log('hello 2');
    return result
  })
  .runBefore(result => {
    console.log('hello 3');
    return result
  });

await query;
// --> hello 1
// --> hello 2
// --> hello 3
```

### onBuild()

```js
queryBuilder = queryBuilder.onBuild(onBuild);
```

Functions registered with this method are called each time the query is built into an SQL string. This method is ran after [runBefore](/api/query-builder/instance-methods.html#runbefore) methods but before [runAfter](/api/query-builder/instance-methods.html#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it. You shouldn't modify the query in any of the `run` methods.

Unlike the `run` methods (`runAfter`, `runBefore` etc.) these must be synchronous. Also you should not register any `run` methods from these. You should _only_ call the query building methods of the builder provided as a parameter.

##### Arguments

Argument|Type|Description
--------|----|--------------------
onBuild|function([QueryBuilder](/api/query-builder/))|The **synchronous** function to be executed.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Eamples

```js
const query = Person.query();

query
 .onBuild(builder => {
   builder.where('id', 1);
 })
 .onBuild(builder => {
   builder.orWhere('id', 2);
 });
```

### onBuildKnex()

```js
queryBuilder = queryBuilder.onBuildKnex(onBuildKnex);
```

Functions registered with this method are called each time the query is built into an SQL string. This method is ran after [onBuild](/api/query-builder/instance-methods.html#onbuild) methods but before [runAfter](/api/query-builder/instance-methods.html#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it in addition to `onBuild`. The only difference between `onBuildKnex` and `onBuild` is that in `onBuild` you can modify the objection's query builder. In `onBuildKnex` the objection builder has been compiled into a knex query builder and any modifications to the objection builder will be ignored.

Unlike the `run`  methods (`runAfter`, `runBefore` etc.) these must be synchronous. Also you should not register any `run` methods from these. You should _only_ call the query building methods of the __knexBuilder__ provided as a parameter.

::: warning
You should never call any query building (or any other mutating) method on the `objectionBuilder` in this function. If you do, those calls will get ignored. At this point the query builder has been compiled into a knex query builder and you should only modify that. You can call non mutating methods like `hasSelects`, `hasWheres` etc. on the objection builder.
:::

##### Arguments

Argument|Type|Description
--------|----|--------------------
onBuildKnex|function(`KnexQueryBuilder`,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .onBuildKnex((knexBuilder, objectionBuilder) => {
   knexBuilder.where('id', 1);
 });
```

### runAfter()

```js
queryBuilder = queryBuilder.runAfter(runAfter);
```

Registers a function to be called when the builder is executed.

These functions are executed as the last thing before any promise handlers registered using the [then](/api/query-builder/instance-methods.html#then) method. Multiple functions can be chained like [then](/api/query-builder/instance-methods.html#then)  methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|--------------------
runAfter|function(result,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed. This function can be async. Note that it needs to return the result used for further processing in the chain of calls.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .runAfter(async (models, queryBuilder) => {
   return models;
 })
 .runAfter(async (models, queryBuilder) => {
   models.push(Person.fromJson({firstName: 'Jennifer'}));
   return models;
 });

const models = await query;
```

### onError()

```js
queryBuilder = queryBuilder.onError(onError);
```

Registers an error handler. Just like `catch` but doesn't execute the query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
onError|function(Error,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed on error.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .onError(async (error, queryBuilder) => {
   // Handle `SomeError` but let other errors go through.
   if (error instanceof SomeError) {
     // This will cause the query to be resolved with an object
     // instead of throwing an error.
     return {error: 'some error occurred'};
   } else {
     return Promise.reject(error);
   }
 })
 .where('age', > 30);
```

### eagerAlgorithm()

```js
queryBuilder = queryBuilder.eagerAlgorithm(algo);
```

Select the eager loading algorithm for the query. See comparison between
the available algorithms [here](/api/query-builder/instance-methods.html#eager).

##### Arguments

Argument|Type|Description
--------|----|--------------------
algo|EagerAlgorithm|The eager loading algorithm to use. One of `Model.JoinEagerAlgorithm`, `Model.WhereInEagerAlgorithm` and `Model.NaiveEagerAlgorithm`.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const people = await Person
  .query()
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[pets, children]')
```

### eagerOptions()

```js
queryBuilder = queryBuilder.eagerOptions(options);
```

Sets [options](/api/types/#type-eageroptions) for the eager query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
options|[EagerOptions](/api/types/#type-eageroptions)|Options to set.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const people = await Person
  .query()
  .eagerOptions({joinOperation: 'innerJoin'})
  .eager('[pets, children]')
```

### eager()

```js
queryBuilder = queryBuilder.eager(relationExpression, filters);
```

Fetch relations eagerly for the result rows.

See the [eager loading](/guide/query-examples.html#eager-loading) section for more examples and [RelationExpression](/api/types/#type-relationexpression) for more info on the relation expression language.

You can choose the way objection performs the eager loading by using [eagerAlgorithm](/api/query-builder/instance-methods.html#eageralgorithm) method on a query builder or by setting the [defaultEagerAlgorithm](/api/model/static-properties.html#static-defaulteageralgorithm) property of a model. The three algorithms currently available are `Model.WhereInEagerAlgorithm` (the default) `Model.JoinEagerAlgorithm` and `Model.NaiveEagerAlgorithm`. All three have their strengths and weaknesses. We will go through the main differences below. You can always see the executed SQL by calling the [debug](/api/query-builder/instance-methods.html#debug) method for the query builder.

<b>WhereInEagerAlgorithm</b>

This algorithm uses multiple queries to fetch the related objects. Objection performs one query per level in the eager tree. For example only two additional queries will be created for eager expression `children.children` no matter how many children the model has or how many children each of the children have. This algorithm is explained in detail in [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

Limitations:

 * Relations cannot be referred in the query because they are not joined.
 * `limit` and `page` methods will work incorrectly when applied to a relation using `modifyEager`, because they will be applied on a query that fetches relations for multiple parents. You can use `limit` and `page` for the root query.

<b>JoinEagerAlgorithm</b>

This algorithm uses joins to fetch the whole eager tree using one single query. This allows you to reference the relations in the root query (see the last example). The related tables can be referred using the relation name. Nested relations must be separated by `:` character (dot is not used because of the way knex parses identifiers).

When this algorithm is used, information schema queries are executed to get table column names. They are done only once for each table during the lifetime of the process and then cached.

Limitations:

 * `limit` and `page` methods will work incorrectly because they will limit the result set that contains all the result rows in a flattened format. For example the result set of the eager expression `children.children` will have `10 * 10 * 10` rows assuming the you fetched 10 models that all had 10 children that all had 10 children.

<b>NaiveEagerAlgorithm</b>

This algorithm naively fetches the relations using a separate query for each model. For example relation expression `children.children` will cause 111 queries to be performed assuming a result set of 10 each having 10 children each having 10 children. For small result sets this doesn't matter. The clear benefit of this algorithm is that there are no limitations. You can use `offset`, `limit`, `min`, `max` etc. in `modifyEager`. You can for example fetch only the youngest child for each parent.

<b>Performance differences</b>

`WhereInEagerAlgorithm` performs more queries than `JoinEagerAlgorithm` which can cause a significant delay especially if the round trip time to the database server is significant. On the other hand the result from `WhereInEagerAlgorithm` is trivial to parse into a tree structure while the result of `JoinEagerAlgorithm` needs some complex parsing which can lead to a significant performance decrease. Which method is faster depends heavily on the query and the environment. You should select the algorithm that makes your code cleaner and only consider performance if you have an actual measured real-life problem. Don't optimize prematurely! `NaiveEagerAlgorithm` is by far the slowest. It should only be used for
cases where performance doesn't matter and when it is the only option to get the job done.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The eager expression
modifiers|Object&lt;string,&nbsp;function([QueryBuilder](/api/query-builder/))&gt;|The modifier functions for the expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
// Fetch `children` relation for each result Person and `pets` and `movies`
// relations for all the children.
const people = await Person
  .query()
  .eager('children.[pets, movies]');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be modified by giving modifier functions as arguments to the relations:

```js
const people = await Person
  .query()
  .eager('children(selectNameAndId).[pets(onlyDogs, orderByName), movies]', {
    selectNameAndId: (builder) => {
      builder.select('name', 'id');
    },
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  });

console.log(people[0].children[0].pets[0].name);
cconsole.log(people[0].children[0].movies[0].id);
```

Reusable modifiers can be defined for a model class using [modifiers](/api/model/static-properties.html#static-modifiers)

```js
class Person extends Model {
  static get modifiers() {
    return {
      defaultSelects(builder) {
        builder.select('id', 'firstName', 'lastName')
      },

      orderByAge(builder) {
        builder.orderBy('age');
      }
    };
  }
}

class Animal extends Model {
  static get modifiers() {
    return {
      orderByName(builder) {
        builder.orderBy('name');
      },

      onlyDogs(builder) {
        builder.where('species', 'dog');
      }
    };
  }
}

const people = await Person
  .query()
  .eager('children(defaultSelects, orderByAge).[pets(onlyDogs, orderByName), movies]');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Filters can also be registered using the [modifyEager](/api/query-builder/instance-methods.html#modifyeager) method:

```js
const people = await Person
  .query()
  .eager('children.[pets, movies]')
  .modifyEager('children', builder => {
    // Order children by age and only select id.
    builder.orderBy('age').select('id');
  })
  .modifyEager('children.[pets, movies]', builder => {
    // Only select `pets` and `movies` whose id > 10 for the children.
    builder.where('id', '>', 10);
  })
  .modifyEager('children.movies]', builder => {
    // Only select 100 first movies for the children.
    builder.limit(100);
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be given aliases using the `as` keyword:

```js
const people = await Person
  .query()
  .eager(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

console.log(people[0].kids[0].dogs[0].name);
console.log(people[0].kids[0].movies[0].id);
```

The eager queries are optimized to avoid the N + 1 query problem. Consider this query:

```js
const people = await Person
  .query()
  .where('id', 1)
  .eager('children.children');

console.log(people[0].children.length); // --> 10
console.log(people[0].children[9].children.length); // --> 10
```

The person has 10 children and they all have 10 children. The query above will return 100 database rows but will generate only three database queries when using `WhereInEagerAlgorithm` and only one query when using `JoinEagerAlgorithm`.

The loading algorithm can be changed using the [eagerAlgorithm](/api/query-builder/instance-methods.html#eageralgorithm) method:

```js
const people = await Person
  .query()
  .where('id', 1)
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[movies, children.pets]')
  .where('movies.name', 'like', '%terminator%')
  .where('children:pets.species', 'dog');

console.log(people);
```

### joinEager()

Shorthand for `eagerAlgorithm(Model.JoinEagerAlgorithm).eager(expr)`.

When this algorithm is used, information schema queries are executed to get table column names. They are done only once for each table during the lifetime of the process and then cached.

### naiveEager()

Shorthand for `eagerAlgorithm(Model.NaiveEagerAlgorithm).eager(expr)`.

### mergeEager()

Just like [eager](/api/query-builder/instance-methods.html#eager) but instead of replacing query builder's eager expression this method merges the given expression to the existing expression.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The eager expression
modifiers|Object&lt;string,&nbsp;function([QueryBuilder](/api/query-builder/))&gt;|The modifier functions for the expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following queries are equivalent

```js
Person
  .query()
  .eager('[children.pets, movies]')
```

```js
Person
  .query()
  .eager('children')
  .mergeEager('children.pets')
  .mergeEager('movies')
```

```js
Person
  .query()
  .eager('children.pets')
  .mergeEager('movies')
```

```js
Person
  .query()
  .mergeEager('children.pets')
  .mergeEager('movies')
```

### mergeJoinEager()

Shorthand for `eagerAlgorithm(Model.JoinEagerAlgorithm).mergeEager(expr)`.

### mergeNaiveEager()

Shorthand for `eagerAlgorithm(Model.NaiveEagerAlgorithm).mergeEager(expr)`.

### eagerObject()

```js
const builder = Person.query()
  .eager('children.pets(onlyId)')

const eagerObject = builder.eagerObject();
console.log(eagerObject.children.pets.modify);
// prints ["onlyId"]

eagerObject.children.movies = true
// You can modify the object and pass it back to the `eager` method.
builder.eager(eagerObject)
```

Returns the object representation of the current eager expression.

See [this section](/api/types/#relationexpression-object-notation) for more examples and information about the structure of the returned object.

##### Return value

Type|Description
----|-----------------------------
object|Object representation of the current eager expression.

### eagerModifiers()

```js
const builder = Person.query()
  .eager('children.pets(onlyId)', {
    onlyId: builder.select('id')
  })

const modifiers = builder.eagerModifiers();
console.log(modifiers.onlyId.toString());
// prints 'builder => builder.select("id")'
```

Returns the current eager modifiers of the query.

##### Return value

Type|Description
----|-----------------------------
object|Eager modifiers of the query.

### allowEager()

```js
queryBuilder = queryBuilder.allowEager(relationExpression);
```

Sets the allowed eager expression.

Any subset of the allowed expression is accepted by [eager](/api/query-builder/instance-methods.html#eager) method. For example setting the allowed expression to `a.b.c` expressions `a`, `a.b` and `a.b.c` are accepted by [eager](/api/query-builder/instance-methods.html#eager) method. Setting any other expression will reject the query and cause the promise error handlers to be called.

This method is useful when the eager expression comes from an untrusted source like query parameters of a http request.

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
Person
  .query()
  .allowEager('[children.pets, movies]')
  .eager(req.query.eager)
```

### mergeAllowEager()

Just like [allowEager](/api/query-builder/instance-methods.html#alloweager) but instead of replacing query builder's allowEager expression this method merges the given expression to the existing expression.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following queries are equivalent

```js
Person
  .query()
  .allowEager('[children.pets, movies]')
```

```js
Person
  .query()
  .allowEager('children')
  .mergeAllowEager('children.pets')
  .mergeAllowEager('movies')
```

```js
Person
  .query()
  .allowEager('children.pets')
  .mergeAllowEager('movies')
```

```js
Person
  .query()
  .mergeAllowEager('children.pets')
  .mergeAllowEager('movies')
```

### modifyEager()

```js
queryBuilder = queryBuilder.modifyEager(pathExpression, modifier);
```

Can be used to modify eager queries.

The `pathExpression` is a relation expression that specifies the queries for which the modifier is given.

The following query would filter out the children's pets that are <= 10 years old:

##### Arguments

Argument|Type|Description
--------|----|--------------------
pathExpression|[RelationExpression](/api/types/#type-relationexpression)|Expression that specifies the queries for which to give the filter.
modifier|function([QueryBuilder](/api/query-builder/)&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;string[]|A modifier function, [model modifier](/api/model/static-properties.html#static-modifiers) name or an array of model modifier names.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    builder.where('age', '>', 10);
  })
```

The path expression can have multiple targets. The next example sorts both the pets and movies of the children by id:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.[pets, movies]', builder => {
    builder.orderBy('id');
  })
```

This example only selects movies whose name contains the word 'Predator':

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('[children.movies, movies]', builder => {
    builder.where('name', 'like', '%Predator%');
  })
```

The modifier can also be a [Model modifier](/api/model/static-properties.html#static-modifiers) name, or an array of them:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.movies', 'selectId')
```

### filterEager()

Alias for [modifyEager](/api/query-builder/instance-methods.html#modifyeager).

### allowInsert()

```js
queryBuilder = queryBuilder.allowInsert(relationExpression);
```

Sets the allowed tree of relations to insert using [insertGraph](/api/query-builder/instance-methods.html#insertgraph) method.

If the model tree given to the [insertGraph](/api/query-builder/instance-methods.html#insertgraph) method isn't a subtree of the given expression, the query is rejected.

See methods [eager](/api/query-builder/instance-methods.html#eager), [allowEager](/api/query-builder/instance-methods.html#alloweager), [RelationExpression](/api/types/#type-relationexpression) and the guide section about [eager loading](/guide/query-examples.html#eager-loading) for more information on relation expressions.

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

### allowUpsert()

Just like [allowInsert](/api/query-builder/instance-methods.html#allowinsert) but this one works with [upsertGraph](/api/query-builder/instance-methods.html#upsertgraph).

### castTo()

```js
queryBuilder = queryBuilder.castTo(ModelClass);
```

Sets the model class of the result rows.

##### Return value

Type|Description
----|-----------------------------
[ModelClass](/api/model/)|The model class of the result rows.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following example creates a query through `Person`, joins a bunch of relations, selects
only the related `Animal`'s columns and returns the results as `Animal` instances instead
of `Person` instances.

```js
const animals = await Person
  .query()
  .joinRelation('children.children.pets')
  .select('children:children:pets.*')
  .castTo(Animal);
```

If your result rows represent no actual model, you can use `objection.Model`

```js
const { Model } = require('objection');

const models = await Person
  .query()
  .joinRelation('children.pets')
  .select([
    'children:pets.id as animalId',
    'children.firstName as childFirstName'
  ])
  .castTo(Model);
```

### modelClass()

```js
const modelClass = queryBuilder.modelClass();
```

Gets the Model subclass this builder is bound to.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|The Model subclass this builder is bound to

### toString()

```js
const sql = queryBuilder.toString();
```

Returns the SQL string suitable for logging input _but not for execution_, via Knex's `toString()`. This method should not be used to create queries for database execution because it makes no guarantees about escaping bindings properly.

Note: In the current release, if the query builder attempts to execute multiple queries or throw any exception whatsoever, **no error will throw** and instead the following string is returned:

```
This query cannot be built synchronously. Consider using debug() method instead.
```

Later versions of Objection may introduce a native way to retrieve an executable SQL statement, or handle this behavior differently. If you need executable SQL, you can consider the unstable/private API `this.build().toSQL()`, which is the native Knex method that can [provide formatted bindings](http://knexjs.org/#Interfaces-toSQL).

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build, or `This query cannot be built synchronously. Consider using debug() method instead.` if an exception is thrown

### toSql()

```js
const sql = queryBuilder.toSql();
```

An alias for `toSql()`.

Note: The behavior of Objection's `toSql()` is different from Knex's `toSql()` (see above). This method may be deprecated soon.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build, or `This query cannot be built synchronously. Consider using debug() method instead.` if an exception is thrown

### skipUndefined()

```js
queryBuilder = queryBuilder.skipUndefined();
```

If this method is called for a builder then undefined values passed to the query builder methods don't cause an exception but are ignored instead.

For example the following query will return all `Person` rows if `req.query.firstName` is `undefined`.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
Person
  .query()
  .skipUndefined()
  .where('firstName', req.query.firstName)
```

### transacting()

```js
queryBuilder = queryBuilder.transacting(transaction);
```

Sets the transaction for a query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
transaction|object|A transaction object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

### clone()

```js
const clone = queryBuilder.clone();
```

Create a clone of this builder.

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|Clone of the query builder

### execute()

```js
const promise = queryBuilder.execute();
```

Executes the query and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### then()

```js
const promise = queryBuilder.then(successHandler, errorHandler);
```

Executes the query and returns a Promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
successHandler|function|identity|Promise success handler
errorHandler|function|identity|Promise error handler

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### map()

```js
const promise = queryBuilder.map(mapper);
```

Executes the query and calls `map(mapper)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
mapper|function|identity|Mapper function

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### reduce()

```js
const promise = queryBuilder.reduce(reducer, initialValue);
```

Executes the query and calls `reduce(reducer, initialValue)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
reducer|function|undefined|Reducer function
initialValue|any|first element of the reduced collection|First arg for the
reducer function

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### catch()

```js
const promise = queryBuilder.catch(errorHandler);
```

Executes the query and calls `catch(errorHandler)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
errorHandler|function|identity|Error handler

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### return()

```js
const promise = queryBuilder.return(returnValue);
```

Executes the query and calls `return(returnValue)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
returnValue| |undefined|Return value

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### bind()

```js
const promise = queryBuilder.bind(returnValue);
```

Executes the query and calls `bind(context)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
context| |undefined|Bind context

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### asCallback()

```js
const promise = queryBuilder.asCallback(callback);
```

Executes the query and calls `asCallback(callback)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
callback|function|undefined|Node style callback

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### nodeify()

```js
const promise = queryBuilder.nodeify(callback);
```

Executes the query and calls `nodeify(callback)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
callback|function|undefined|Node style callback

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

### resultSize()

```js
const promise = queryBuilder.resultSize();
```

Returns the amount of rows the current query would produce without [limit](/api/query-builder/instance-methods.html#limit) and [offset](/api/query-builder/instance-methods.html#offset) applied. Note that this executes a query (not the one we are building) and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result size.

##### Examples

```js
const query = Person
  .query()
  .where('age', '>', 20);

const [total, models] = await Promise.all([
  query.resultSize(),
  query.offset(100).limit(50)
]);
```

### page()

```js
queryBuilder = queryBuilder.page(page, pageSize);
```

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .page(5, 100);

console.log(result.results.length); // --> 100
console.log(result.total); // --> 3341
```

Two queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size, but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`. The problem with this is that if the result set is empty, we don't get the total count either. (If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|-------------------
page|number|The index of the page to return. The index of the first page is 0.
pageSize|number|The page size

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

### range()

```js
queryBuilder = queryBuilder.range(start, end);
```

Only returns the given range of results.

Two queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size, but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`. The problem with this is that if the result set is empty, we don't get the total count either. (If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|--------------------
start|number|The index of the first result (inclusive)
end|number|The index of the last result (inclusive)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .range(0, 100);

console.log(result.results.length); // --> 101
console.log(result.total); // --> 3341
```

`range` can be called without arguments if you want to specify the limit and offset explicitly:

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .limit(10)
  .range();

console.log(result.results.length); // --> 101
console.log(result.total); // --> 3341
```

### pluck()

```js
queryBuilder = queryBuilder.pluck(propertyName);
```

If the result is an array, plucks a property from each object.

##### Arguments

Argument|Type|Description
--------|----|--------------------
propertyName|string|The name of the property to pluck

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const firstNames = await Person
  .query()
  .where('age', '>', 20)
  .pluck('firstName');

console.log(typeof firstNames[0]); // --> string
```

### first()

```js
queryBuilder = queryBuilder.first();
```

If the result is an array, selects the first item.

NOTE: This doesn't add `limit 1` to the query by default. You can override the [Model.useLimitInFirst](/api/model/static-properties.html#static-uselimitinfirst) property to change this behaviour.

Also see [findById](/api/query-builder/instance-methods.html#findbyid) and [findOne](/api/query-builder/instance-methods.html#findone) shorthand methods.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const firstPerson = await Person
  .query()
  .first()

console.log(firstPerson.age);
```

### throwIfNotFound()

```js
queryBuilder = queryBuilder.throwIfNotFound();
```

Causes a [Model.NotFoundError](/api/types/#class-notfounderror) to be thrown if the query result is empty.

You can replace `Model.NotFoundError` with your own error by implementing the static [Model.createNotFoundError(ctx)](/api/model/static-methods.html#static-createnotfounderror) method.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
try {
  await Language
    .query()
    .where('name', 'Java')
    .andWhere('isModern', true)
    .throwIfNotFound()
} catch (err) {
  // No results found.
  console.log(err instanceof Language.NotFoundError); // --> true
}
```

### traverse()

```js
queryBuilder = queryBuilder.traverse(modelClass, traverser);
```

Traverses through all models in the result, including the eagerly loaded relations.

The optional first parameter can be a constructor. If given, the traverser function is only called for the models of that class.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter. If given, the traverser function is only called for models of this class.
traverser|function([Model](/api/model/), [Model](/api/model/), string)|The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const people = await Person
  .query()
  .eager('pets')
  .traverse((model, parentModel, relationName) => {
    delete model.id;
  });

console.log(people[0].id); // --> undefined
console.log(people[0].pets[0].id); // --> undefined
```

```js
const persons = await Person
  .query()
  .eager('pets')
  .traverse(Animal, (animal, parentModel, relationName) => {
    delete animal.id;
  });

console.log(persons[0].id); // --> 1
console.log(persons[0].pets[0].id); // --> undefined
```

### pick()

```js
queryBuilder = queryBuilder.pick(modelClass, properties);
```

Pick properties from result models.

The first example goes through all models (including relations) and discards all
properties but `id` and `name`. The second example also traverses the whole model
tree and discards all but `id` and `firstName` properties of all `Person`
instances and `id` and `name` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter
properties|string[]|The properties to pick

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .pick(['id', 'name']);
```

and

```js
Person
  .query()
  .eager('pets')
  .pick(Person, ['id', 'firstName'])
  .pick(Animal, ['id', 'name']);
```

### omit()

```js
queryBuilder = queryBuilder.omit(modelClass, properties);
```

Omit properties of result models.

The first example goes through all models (including relations) and omits the properties
`parentId` and `ownerId`. The second example also traverses the whole model tree and
omits the properties `parentId` and `age` from all `Person` instances and `ownerId`
and `species` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter
properties|string[]|The properties to omit

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .omit(['parentId', 'ownerId']);
```

and

```js
Person
  .query()
  .eager('pets')
  .omit(Person, ['parentId', 'age'])
  .omit(Animal, ['ownerId', 'species']);
```
