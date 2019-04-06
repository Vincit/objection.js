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

### where

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

#### columnInfo

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
const builder = queryBuilder.whereJsonIsArray(fieldExpression);
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

See [`whereJsonIsArray`](/api/query-builder/instance-methods.html#wherejsonisarray)

### whereJsonNotArray()

See [`whereJsonIsArray`](/api/query-builder/instance-methods.html#wherejsonisarray)

### orWhereJsonNotArray()

See [`whereJsonIsArray`](/api/query-builder/instance-methods.html#wherejsonisarray)

### whereJsonIsObject()

```js
const builder = queryBuilder.whereJsonIsObject(fieldExpression);
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

See [`whereJsonIsObject`](/api/query-builder/instance-methods.html#wherejsonisobject)

### whereJsonNotObject()

See [`whereJsonIsObject`](/api/query-builder/instance-methods.html#wherejsonisobject)

### orWhereJsonNotObject()

See [`whereJsonIsObject`](/api/query-builder/instance-methods.html#wherejsonisobject)

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
