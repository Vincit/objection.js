# API reference

## QueryBuilder

Query builder for Models.

This class is a wrapper around [knex QueryBuilder](http://knexjs.org#Builder). QueryBuilder has all the methods a
knex QueryBuilder has and more. While knex QueryBuilder returns plain javascript objects, QueryBuilder returns Model
subclass instances.

QueryBuilder is thenable, meaning that it can be used like a promise. You can
return query builder from a [`then`](#then) method of a promise and it gets chained just like
a normal promise would.

The query is executed when one of its promise methods [`then()`](#then), [`catch()`](#catch), [`map()`](#map),
[`bind()`](#bind) or [`return()`](#return) is called.




### Static methods




#### forClass

```js
var builder = QueryBuilder.forClass(modelClass);
```

Create QueryBuilder for a Model subclass. You rarely need to call this. Query builders are created using the
[`Model.query()`](#query) and other query methods.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
modelClass|[`Model`](#model)|A Model class constructor

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|The created query builder




### Global query building helpers

#### ref

```js
const ref = require('objection').ref;
```

Factory function that returns `ReferenceBuilder` instance, which makes it easier to refer
tables, columns, json attributes and add casting to referred columns wihtout need to use
Model.raw() directly.

`ref()` can be passed to all `QueryBuilder` APIs which supports `Model.raw()` arguments.

```js
import { ref } from 'objection';

Model.query()
  .select([
    'id',
    ref('Model.jsonColumn:details.name').castText().as('name'),
    ref('Model.jsonColumn:details.age').castInt().as('age')
  ])
  .join('OtherModel', ref('Model.jsonColumn:details.name').castText(), '=', ref('OtherModel.name'))
  .where('age', '>', ref('OtherModel.ageLimit'));
```

#### ReferenceBuilder methods

##### castText()

Cast reference to sql type `text`.

##### castInt()

Cast reference to sql type `integer`.

##### castBigInt()

Cast reference to sql type `bigint`.

##### castFloat()

Cast reference to sql type `float`.

##### castDecimal()

Cast reference to sql type `decimal`.

##### castReal()

Cast reference to sql type `real`.

##### castBool()

Cast reference to sql type `boolean`.

##### castType(sqlType)

Give custom casting type to which referenced value is casted to.

`.castType('mytype') => CAST(?? as mytype)`

##### castJson()

In addition to other casts wrap reference to_jsonb() function so that final value
reference will be json type.

##### as(as)

As format to tell which name will be used for reference for example in `.select(ref('age').as('yougness'))`

#### lit() (Not implemented yet)

The same as `ref()` but allows one to tell in which format certain javascript literal
should be passed to database engine.

#### raw() (Not implemented yet)

Wrapper for raw, which will be evaluated lazily in stage where `Model` or query is
already bound to knex connection. Also understands `ref()` and `lit()` instances as
bound parameters.



### Query building methods



#### findById

```js
const builder = queryBuilder.findById(id);
```

```js
Person.query().findById(1);
```

> Composite key:

```js
Person.query().findById([1, '10']);
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any&#124; Array.&lt;any&gt;|

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### insert

```js
const builder = queryBuilder.insert(modelsOrObjects);
```

```js
Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .then(jennifer => {
    console.log(jennifer.id);
  });
```

> Batch insert (Only works on Postgres):

```js
someMovie
  .$relatedQuery('actors')
  .insert([
    {firstName: 'Jennifer', lastName: 'Lawrence'},
    {firstName: 'Bradley', lastName: 'Cooper'}
  ])
  .then(actors => {
    console.log(actors[0].firstName);
    console.log(actors[1].firstName);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
Person
  .query()
  .insert({
    age: Person.query().avg('age'),
    firstName: Person.raw("'Jenni' || 'fer'")
  });
```

> Fields marked as `extras` for many-to-many relations in [`relationMappings`](#relationmappings) are automatically
> written to the join table instead of the target table. The `someExtra` field in the following example is written
> to the join table if the `extra` array of the relation mapping contains the string `'someExtra'`.

```js
someMovie
  .$relatedQuery('actors')
  .insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    someExtra: "I'll be written to the join table"
  })
  .then(jennifer => {
    console.log(jennifer.someExtra);
  });
```

Creates an insert query.

The inserted objects are validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [`returning('*')`](#returning) to the query to get all
properties - see [this recipe](#postgresql-returning-tricks) for some examples. On other databases you
can use the [`insertAndFetch`](#insertandfetch) method.

The batch insert only works on Postgres because Postgres is the only database engine
that returns the identifiers of _all_ inserted rows. knex supports batch inserts on
other databases also, but you only get the id of the first (or last) inserted object
as a result. If you need batch insert on other databases you can use knex directly
through [`YourModel.knexQuery()`](#knexquery).

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&#124;[`Model`](#model)&#124;Array.&lt;Object&gt;&#124;Array.&lt;[`Model`](#model)&gt;|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### insertAndFetch

```js
const builder = queryBuilder.insertAndFetch(modelsOrObjects);
```

Just like [`insert`](#insert) but also fetches the model afterwards.

Note that on postgresql you can just chain [`returning('*')`](#returning) to the normal insert method
to get the same result without an additional query. See [this recipe](#postgresql-returning-tricks) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&#124;[`Model`](#model)&#124;Array.&lt;Object&gt;&#124;Array.&lt;[`Model`](#model)&gt;|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### insertGraph

```js
const builder = queryBuilder.insertGraph(graph);
```

> You can insert any asyclic graph of models like this:

```js
Person
  .query()
  .insertGraph({
    firstName: 'Sylvester',
    lastName: 'Stallone',

    children: [{
      firstName: 'Sage',
      lastName: 'Stallone',

      pets: [{
        name: 'Fluffy',
        species: 'dog'
      }]
    }]
  });
```

> The query above will insert 'Sylvester', 'Sage' and 'Fluffy' into db and create
> relationships between them as defined in the `relationMappings` of the models.

> If you need to refer to the same model in multiple places you can use the
> special properties `#id` and `#ref` like this:

```js
Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#id": 'Silver Linings Playbook'
      name: 'Silver Linings Playbook',
      duration: 122
    }]
  }, {
    firstName: 'Bradley',
    lastName: 'Cooper',

    movies: [{
      "#ref": 'Silver Linings Playbook'
    }]
  }]);
```

> The query above will insert only one movie (the 'Silver Linings Playbook') but
> both 'Jennifer' and 'Bradley' will have the movie related to them through the
> many-to-many relation `movies`.

> If you need to refer to a model already in the database from a many-to-many relation
> you can use special properties `#dbRef` like this:

```js
Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#id": 'Silver Linings Playbook'
      name: 'Silver Linings Playbook',
      duration: 122
    }]
  }, {
    firstName: 'Bradley',
    lastName: 'Cooper',

    movies: [{
      "#dbRef": 1536
    }, {
      "#dbRef": 6527
    }]
  }]);
```

> You can refer to the properties of other models in the graph using expressions
> of format `#ref{<id>.<property>}` for example:

```js
Person
  .query()
  .insertGraph([{
    "#id": 'jenniLaw',
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    pets: [{
      name: "I am the dog of #ref{jenniLaw.firstName} #ref{jenniLaw.lastName}",
      species: 'dog'
    }]
  }]);
```

> The query above will insert a pet named `I am the dog of Jennifer Lawrence` for Jennifer.

Insert models with relations. This method is best explained with examples ➔

See the [`allowInsert`](#allowinsert) method if you need to limit which relations can be inserted using
this method to avoid security issues.

By the way, if you are using Postgres the inserts are done in batches for maximum performance.

##### Arguments

Argument|Type|Description
--------|----|--------------------
graph|Object&#124;[`Model`](#model)&#124;Array.&lt;Object&gt;&#124;Array.&lt;[`Model`](#model)&gt;|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### insertGraphAndFetch

Exactly like [insertGraph](#insertgraph) but also fetches the graph from the db after insert.




#### insertWithRelated

Alias for [insertGraph](#insertgraph).



#### insertWithRelatedAndFetch

Alias for [insertGraphAndFetch](#insertgraphandfetch).




#### update

```js
const builder = queryBuilder.update(modelOrObject);
```

```js
Person
  .query()
  .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .where('id', 134)
  .then(numberOfAffectedRows => {
    console.log(numberOfAffectedRows);
  });
```

> You can also give raw expressions, subqueries and `ref()` as values like this:

```js
Person
  .query()
  .update({
    firstName: Person.raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age'),
    oldLastName: ref('lastName') // same as knex.raw('??', ['lastName'])
  });
```

> Updating single value inside json column and referring attributes inside json columns (only with postgres) etc.:

```js
Person
  .query()
  .update({
    lastName: ref('someJsonColumn:mother.lastName').castText(),
    'detailsJsonColumn:address.street': 'Elm street'
  });
```

Creates an update query.

The update object is validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

This method is meant for updating _whole_ objects with all required properties. If you
want to update a subset of properties use the [`patch`](#patch) method.

NOTE: The return value of the query will be the number of affected rows. If you want to update a single row and
retrieve the updated row as a result, you may want to use the [`updateAndFetchById`](#updateandfetchbyid) method
or *take a look at [this recipe](#postgresql-returning-tricks) if you're using Postgres*.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&#124;[`Model`](#model)|The update object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### updateAndFetchById

```js
const builder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

```js
Person
  .query()
  .updateAndFetchById(134, {firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .then(updatedModel => {
    console.log(updatedModel.firstName);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
Person
  .query()
  .updateAndFetchById(134, {
    firstName: Person.raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age')
  });
```

Updates a single model by id and fetches it from the database afterwards.

The update object is validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

This method is meant for updating _whole_ objects with all required properties. If you
want to update a subset of properties use the [`patchAndFetchById`](#patchandfetchbyid) method.

NOTE: On postgresql you can just chain [`first()`](#first) and [`returning('*')`](#returning) to the normal [`update`](#update) method
to get the same result without an additional query. See [this recipe](#postgresql-returning-tricks) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|string&#124;number|Identifier of the model to update
modelOrObject|Object&#124;[`Model`](#model)|The update object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### updateAndFetch

```js
const builder = queryBuilder.updateAndFetch(modelOrObject);
```

```js
person
  .$query()
  .updateAndFetch({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .then(updatedModel => {
    console.log(updatedModel.firstName);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
person
  .$query()
  .updateAndFetch({
    firstName: Person.raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age')
  });
```

Updates a single model and fetches it from the database afterwards. This only works with instance queries
started with [`$query()`](#_s_query) method.

The update object is validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

This method is meant for updating _whole_ objects with all required properties. If you
want to update a subset of properties use the [`patchAndFetch`](#patchandfetch) method.

NOTE: On postgresql you can just chain [`first()`](#first) and [`returning('*')`](#returning) to the normal [`update`](#update) method
to get the same result without an additional query. See [this recipe](#postgresql-returning-tricks) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&#124;[`Model`](#model)|The update object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### patch

```js
const builder = queryBuilder.patch(modelOrObject);
```

```js
Person
  .query()
  .patch({age: 24})
  .where('id', 134)
  .then(numberOfAffectedRows => {
    console.log(numberOfAffectedRows);
  });
```

> You can also give raw expressions, subqueries and `ref()` as values like this:

```js
Person
  .query()
  .patch({
    age: Person.query().avg('age'),
    firstName: Person.raw("'Jenni' || 'fer'"),
    oldLastName: ref('lastName')
  });
```

Creates a patch query.

The patch object is validated against the model's [`jsonSchema`](#jsonschema) _but_ the `required` property
of the [`jsonSchema`](#jsonschema) is ignored. This way the properties in the patch object are still validated
but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: The return value of the query will be the number of affected rows. If you want to patch a single row and
retrieve the patched row as a result, you may want to use the [`patchAndFetchById`](#patchandfetchbyid) method
or *take a look at [this recipe](#postgresql-returning-tricks) if you're using Postgres*.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&#124;[`Model`](#model)|The patch object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### patchAndFetchById

```js
const builder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

```js
Person
  .query()
  .patchAndFetchById(134, {age: 24})
  .then(updatedModel => {
    console.log(updatedModel.firstName);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
Person
  .query()
  .patchAndFetchById(134, {
    age: Person.query().avg('age'),
    firstName: Person.raw("'Jenni' || 'fer'")
  });
```

Patches a single model by id and fetches it from the database afterwards.

The patch object is validated against the model's [`jsonSchema`](#jsonschema) _but_ the `required` property
of the [`jsonSchema`](#jsonschema) is ignored. This way the properties in the patch object are still validated
but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: On postgresql you can just chain [`first()`](#first) and [`returning('*')`](#returning) to the normal [`patch`](#patch) method
to get the same result without an additional query. See [this recipe](#postgresql-returning-tricks) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|string&#124;number|Identifier of the model to update
modelOrObject|Object&#124;[`Model`](#model)|The patch object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### patchAndFetch

```js
const builder = queryBuilder.patchAndFetch(modelOrObject);
```

```js
person
  .$query()
  .patchAndFetch({age: 24})
  .then(updatedModel => {
    console.log(updatedModel.firstName);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
person
  .$query()
  .patchAndFetch({
    age: Person.query().avg('age'),
    firstName: Person.raw("'Jenni' || 'fer'")
  });
```

Patches a single model and fetches it from the database afterwards. This only works with instance queries
started with [`$query()`](#_s_query) method.

The patch object is validated against the model's [`jsonSchema`](#jsonschema) _but_ the `required` property
of the [`jsonSchema`](#jsonschema) is ignored. This way the properties in the patch object are still validated
but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: On postgresql you can just chain [`first()`](#first) and [`returning('*')`](#returning) to the normal [`patch`](#patch) method
to get the same result without an additional query. See [this recipe](#postgresql-returning-tricks) for some examples.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelOrObject|Object&#124;[`Model`](#model)|The patch object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### delete

```js
const builder = queryBuilder.delete();
```

```js
Person
  .query()
  .delete()
  .where('age', '>', 100)
  .then(numberOfDeletedRows => {
    console.log('removed', numberOfDeletedRows, 'people');
  });
```

Creates a delete query.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### deleteById

```js
const builder = queryBuilder.deleteById(id);
```

```js
Person
  .query()
  .deleteById(1)
  .then(numberOfDeletedRows => {
    console.log('removed', numberOfDeletedRows, 'people');
  });
```

> Composite key:

```js
Person
  .query()
  .deleteById([10, '20', 46])
  .then(numberOfDeletedRows => {
    console.log('removed', numberOfDeletedRows, 'people');
  });
```

Deletes a model by id.

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|any&#124;Array.&lt;any&gt;|

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### relate

```js
const builder = queryBuilder.relate(ids);
```

```js
Person
  .query()
  .where('id', 123)
  .first()
  .then(person => {
    return person.$relatedQuery('movies').relate(50);
  })
  .then(() => {
    console.log('movie 50 is now related to person 123 through `movies` relation');
  });
```

> Relate multiple (only works with postgres)

```js
person
  .$relatedQuery('movies')
  .relate([50, 60, 70])
  .then(() => {

  });
```

> Composite key

```js
person
  .$relatedQuery('movies')
  .relate({foo: 50, bar: 20, baz: 10})
  .then(() => {

  });
```

> Fields marked as `extras` for many-to-many relations in [`relationMappings`](#relationmappings) are automatically
> written to the join table. The `someExtra` field in the following example is written to the join table if the
> `extra` array of the relation mapping contains the string `'someExtra'`.

```js
someMovie
  .$relatedQuery('actors')
  .relate({
    id: 50,
    someExtra: "I'll be written to the join table"
  })
  .then(() => {

  });
```

Relates an existing model to another model.

This method doesn't create a new instance but only updates the foreign keys and in
the case of many-to-many relation, creates a join row to the join table.

On Postgres multiple models can be related by giving an array of identifiers.

##### Arguments

Argument|Type|Description
--------|----|--------------------
ids|number&#124;string&#124;Array&#124;Object|Identifier(s) of the model(s) to relate

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### unrelate

```js
const builder = queryBuilder.unrelate();
```

```js
Person
  .query()
  .where('id', 123)
  .first()
  .then(person => {
    return person.$relatedQuery('movies').unrelate().where('id', 50);
  })
  .then(() => {
    console.log('movie 50 is no longer related to person 123 through `movies` relation');
  });
```

Removes a connection between two models.

Doesn't delete the models. Only removes the connection. For ManyToMany relations this
deletes the join column from the join table. For other relation types this sets the
join columns to null.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### increment

See [knex documentation](http://knexjs.org/#Builder-increment)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### decrement

See [knex documentation](http://knexjs.org/#Builder-decrement)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### select

See [knex documentation](http://knexjs.org/#Builder-select)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### forUpdate

See [knex documentation](http://knexjs.org/#Builder-forUpdate)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### forShare

See [knex documentation](http://knexjs.org/#Builder-forShare)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### as

See [knex documentation](http://knexjs.org/#Builder-as)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### columns

See [knex documentation](http://knexjs.org/#Builder-columns)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### column

See [knex documentation](http://knexjs.org/#Builder-column)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### from

See [knex documentation](http://knexjs.org/#Builder-from)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### fromJS

See [knex documentation](http://knexjs.org/#Builder-fromJS)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### into

See [knex documentation](http://knexjs.org/#Builder-into)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### withSchema

See [knex documentation](http://knexjs.org/#Builder-withSchema)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### table

See [knex documentation](http://knexjs.org/#Builder-table)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### distinct

See [knex documentation](http://knexjs.org/#Builder-distinct)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### join

See [knex documentation](http://knexjs.org/#Builder-join)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### joinRaw

See [knex documentation](http://knexjs.org/#Builder-joinRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### innerJoin

See [knex documentation](http://knexjs.org/#Builder-innerJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### leftJoin

See [knex documentation](http://knexjs.org/#Builder-leftJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### leftOuterJoin

See [knex documentation](http://knexjs.org/#Builder-leftOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### rightJoin

See [knex documentation](http://knexjs.org/#Builder-rightJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### rightOuterJoin

See [knex documentation](http://knexjs.org/#Builder-rightOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### outerJoin

See [knex documentation](http://knexjs.org/#Builder-outerJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### fullOuterJoin

See [knex documentation](http://knexjs.org/#Builder-fullOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### crossJoin

See [knex documentation](http://knexjs.org/#Builder-crossJoin)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### joinRelation

Joins a set of relations described by `relationExpression`. See the examples for more info.

```js
const builder = queryBuilder.joinRelation(relationExpression, opt);
```

> Join one relation:

```js
Person
  .query()
  .joinRelation('pets')
  .where('pets.species', 'dog');
```

> Give an alias for a single relation:

```js
Person
  .query()
  .joinRelation('pets', {alias: 'p'})
  .where('p.species', 'dog');
```

> Join two relations:

```js
Person
  .query()
  .joinRelation('[pets, parent]')
  .where('pets.species', 'dog');
  .where('parent.name', 'Arnold')
```

> Join two multiple and nested relations. Note that when referring to nested relations
> `:` must be used as a separator instead of `.`. This limitation comes from the way
> knex parses table references.

```js
Person
  .query()
  .select('Person.id', 'parent:parent.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]')
  .where('parent:pets.species', 'dog');
```

> Give aliases for a bunch of relations:

```js
Person
  .query()
  .select('Person.id', 'pr:pr.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]', {
    aliases: {
      parent: 'pr',
      pets: 'pt'
    }
  })
  .where('pr:pt.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[`RelationExpression`](#relationexpression)|An expression describing which relations to join.
opt|object|Optional options. See the examples.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### innerJoinRelation

Alias for [`joinRelation`](#joinrelation).




#### outerJoinRelation

Outer join version of the [`joinRelation`](#joinrelation) method.




#### leftJoinRelation

Left join version of the [`joinRelation`](#joinrelation) method.




#### leftOuterJoinRelation

Left outer join version of the [`joinRelation`](#joinrelation) method.




#### rightJoinRelation

Right join version of the [`joinRelation`](#joinrelation) method.




#### rightOuterJoinRelation

Left outer join version of the [`joinRelation`](#joinrelation) method.




#### fullOuterJoinRelation

Full outer join version of the [`joinRelation`](#joinrelation) method.





#### where

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### andWhere

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhere

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNot

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereNot

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereRaw

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereWrapped

See [knex documentation](http://knexjs.org/#Builder-wheres)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### havingWrapped

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereRaw

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereExists

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereExists

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNotExists

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.



#### orWhereNotExists

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereIn

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereIn

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNotIn

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereNotIn

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNull

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereNull

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNotNull

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereNotNull

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereBetween

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereNotBetween

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereBetween

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereNotBetween

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### groupBy

See [knex documentation](http://knexjs.org/#Builder-groupBy)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### groupByRaw

See [knex documentation](http://knexjs.org/#Builder-groupByRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orderBy

See [knex documentation](http://knexjs.org/#Builder-orderBy)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orderByRaw

See [knex documentation](http://knexjs.org/#Builder-orderByRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### union

See [knex documentation](http://knexjs.org/#Builder-union)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### unionAll

See [knex documentation](http://knexjs.org/#Builder-unionAll)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### having

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### havingRaw

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orHaving

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orHavingRaw

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### offset

See [knex documentation](http://knexjs.org/#Builder-offset)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### limit

See [knex documentation](http://knexjs.org/#Builder-limit)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### count

See [knex documentation](http://knexjs.org/#Builder-count)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### countDistinct

See [knex documentation](http://knexjs.org/#Builder-count)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### min

See [knex documentation](http://knexjs.org/#Builder-min)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### max

See [knex documentation](http://knexjs.org/#Builder-max)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### sum

See [knex documentation](http://knexjs.org/#Builder-sum)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### avg

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### avgDistinct

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### debug

See [knex documentation](http://knexjs.org/#Builder-debug)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### returning

See [knex documentation](http://knexjs.org/#Builder-returning)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### truncate

See [knex documentation](http://knexjs.org/#Builder-truncate)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### connection

See [knex documentation](http://knexjs.org/#Builder-connection)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### modify

See [knex documentation](http://knexjs.org/#Builder-modify)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### columnInfo

See [knex documentation](http://knexjs.org/#Builder-columnInfo)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereRef

```js
var builder = queryBuilder.whereRef(leftRef, operator, rightRef);
```

```js
builder.whereRef('Person.id', '=', 'Animal.ownerId');
```

Compares a column reference to another

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereRef

```js
var builder = queryBuilder.orWhereRef(leftRef, operator, rightRef);
```

```js
builder.orWhereRef('Person.id', '=', 'Animal.ownerId');
```

Compares a column reference to another

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereComposite

```js
var builder = queryBuilder.whereComposite(columns, operator, values);
```

```js
builder.whereComposite(['id', 'name'], '=', [1, 'Jennifer']);
```

> This method also works with a single column - value pair:

```js
builder.whereComposite('id', 1);
```

[`where`](#where) for (possibly) composite keys.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereInComposite

```js
const builder = queryBuilder.whereInComposite(columns, values);
```

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

[`whereIn`](#wherein) for (possibly) composite keys.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### whereJsonEquals

```js
const builder = queryBuilder.whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression);
```

```js
Person
  .query()
  .whereJsonEquals('additionalData:myDogs', 'additionalData:dogsAtHome')
  .then(people => {
    // oh joy! these people have all their dogs at home!
  });

Person
  .query()
  .whereJsonEquals('additionalData:myDogs[0]', { name: "peter"})
  .then(people => {
    // these people's first dog name is "peter" and the dog has no other
    // attributes, but its name
  });
```

Where jsonb field reference equals jsonb object or other field reference.

Also supports having field expression in both sides of equality.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|Reference to column / json field
jsonObjectOrFieldExpression|Object&#124;Array&#124;[`FieldExpression`](#fieldexpression)|Reference to column / json field or json object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonEquals

See [`whereJsonEquals`](#wherejsonequals)




#### whereJsonNotEquals

See [`whereJsonEquals`](#wherejsonequals)




#### orWhereJsonNotEquals

See [`whereJsonEquals`](#wherejsonequals)




#### whereJsonSupersetOf

```js
var builder = queryBuilder.whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression);
```

```js
Person
  .query()
  .whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome')
  .then(people => {
    // These people have all or some of their dogs at home. Person might have some
    // additional dogs in their custody since myDogs is supreset of dogsAtHome.
  });

Person
  .query()
  .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"})
  .then(people => {
    // These people's first dog name is "peter", but the dog might have
    // additional attributes as well.
  });
```

> Object and array are always their own supersets.

> For arrays this means that left side matches if it has all the elements
> listed in the right hand side. e.g.

```
[1,2,3] isSuperSetOf [2] => true
[1,2,3] isSuperSetOf [2,1,3] => true
[1,2,3] isSuperSetOf [2,null] => false
[1,2,3] isSuperSetOf [] => true
```

> The `not` variants with jsonb operators behave in a way that they won't match rows, which don't have
> the referred json key referred in field expression. e.g. for table

```
 id |    jsonObject
----+--------------------------
  1 | {}
  2 | NULL
  3 | {"a": 1}
  4 | {"a": 1, "b": 2}
  5 | {"a": ['3'], "b": ['3']}
```

> query:

```js
builder.whereJsonNotEquals("jsonObject:a", "jsonObject:b")
```

> Returns only the row `4` which has keys `a` and `b` and `a` != `b`, but it won't return any rows which
> does not have `jsonObject.a` or `jsonObject.b`.

Where left hand json field reference is a superset of the right hand json value or reference.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|Reference to column / json field, which is tested for being a superset
jsonObjectOrFieldExpression|Object&#124;Array&#124;[`FieldExpression`](#fieldexpression)|To which to compare

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonSupersetOf

See [`whereJsonSupersetOf`](#wherejsonsupersetof)




#### whereJsonNotSupersetOf

See [`whereJsonSupersetOf`](#wherejsonsupersetof)




#### orWhereJsonNotSupersetOf

See [`whereJsonSupersetOf`](#wherejsonsupersetof)




#### whereJsonSubsetOf

```js
const builder = queryBuilder.whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression);
```

Where left hand json field reference is a subset of the right hand json value or reference.

Object and array are always their own subsets.

See [`whereJsonSupersetOf`](#wherejsonsupersetof)

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|Reference to column / json field, which is tested for being a superset
jsonObjectOrFieldExpression|Object&#124;Array&#124;[`FieldExpression`](#fieldexpression)|To which to compare

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonSubsetOf

See [`whereJsonSubsetOf`](#wherejsonsubsetof)




#### whereJsonNotSubsetOf

See [`whereJsonSubsetOf`](#wherejsonsubsetof)




#### orWhereJsonNotSubsetOf

See [`whereJsonSubsetOf`](#wherejsonsubsetof)




#### whereJsonIsArray

```js
const builder = queryBuilder.whereJsonIsArray(fieldExpression);
```

Where json field reference is an array.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonIsArray

See [`whereJsonIsArray`](#wherejsonisarray)




#### whereJsonNotArray

See [`whereJsonIsArray`](#wherejsonisarray)




#### orWhereJsonNotArray

See [`whereJsonIsArray`](#wherejsonisarray)




#### whereJsonIsObject

```js
const builder = queryBuilder.whereJsonIsObject(fieldExpression);
```

Where json field reference is an object.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonIsObject

See [`whereJsonIsObject`](#wherejsonisobject)



#### whereJsonNotObject

See [`whereJsonIsObject`](#wherejsonisobject)




#### orWhereJsonNotObject

See [`whereJsonIsObject`](#wherejsonisobject)



#### whereJsonHasAny

```js
const builder = queryBuilder.whereJsonHasAny(fieldExpression, keys);
```

Where any of given strings is found from json object key(s) or array items.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|
keys|string&#124;Array.&lt;string&gt;|Strings that are looked from object or array

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonHasAny

See [`whereJsonHasAny`](#wherejsonhasany)




#### whereJsonHasAll

```js
const builder = queryBuilder.whereJsonHasAll(fieldExpression, keys);
```

Where all of given strings are found from json object key(s) or array items.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|
keys|string&#124;Array.&lt;string&gt;|Strings that are looked from object or array

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonHasAll

See [`whereJsonHasAll`](#wherejsonhasall)




#### whereJsonField

```js
const builder = queryBuilder.whereJsonField(fieldExpression, operator, value);
```

Where referred json field value casted to same type with value fulfill given operand.

Value may be number, string, null, boolean and referred json field is converted
to TEXT, NUMERIC or BOOLEAN sql type for comparison.

If left hand field does not exist rows appear IS null so if one needs to get only
rows, which has key and it's value is null one may use e.g.
[`.whereJsonSupersetOf("column", { field: null })`](#wherejsonsupersetof) or check is key exist and
then [`.whereJsonField('column:field', 'IS', null)`](#wherejsonfield)

For testing against objects or arrays one should see tested with [`whereJsonEqual`](#wherejsonequal),
[`whereJsonSupersetOf`](#wherejsonsupersetof) and [`whereJsonSubsetOf`](#wherejsonsubsetof) methods.

##### Arguments

Argument|Type|Description
--------|----|--------------------
fieldExpression|[`FieldExpression`](#fieldexpression)|Expression pointing to certain value
operator|string|SQL comparator usually `<`, `>`, `<>`, `=` or `!=`
value|boolean&#124;number&#124;string&#124;null|Value to which field is compared to

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### orWhereJsonField

See [`whereJsonField`](#wherejsonfield)





### Other instance methods





#### context

```js
const builder = queryBuilder.context(queryContext);
```

> You can set the context like this:

```js
Person
  .query()
  .context({something: 'hello'});
```

> and access the context like this:

```js
var context = builder.context();
```

> You can set any data to the context object. You can also register QueryBuilder lifecycle methods
> for _all_ queries that share the context:

```js
Person
  .query()
  .context({
    runBefore: (builder) => {},
    runAfter: (builder) => {},
    onBuild: (builder) => {}
  });
```

> For example the `eager` method causes multiple queries to be executed from a single query builder.
> If you wanted to make all of them use the same schema you could write this:

```js
Person
  .query()
  .eager('[movies, children.movies]')
  .context({
    onBuild: (builder) => {
      builder.withSchema('someSchema');
    }
  });
```

Sets/gets the query context.

Some query builder methods create more than one query. The query context is an object that is
shared with all queries started by a query builder.

The context is also passed to [`$beforeInsert`](#_s_beforeinsert), [`$afterInsert`](#_s_afterinsert),
[`$beforeUpdate`](#_s_beforeupdate), [`$afterUpdate`](#_s_afterupdate), [`$beforeDelete`](#_s_beforeidelete),
[`$afterDelete`](#_s_afterdelete) and [`$afterGet`](#_s_afterget) calls that the query creates.

In addition to properties added using this method (and [`mergeContext`](#mergecontext)) the query context
object always has a `transaction` property that holds the active transaction. If there is no active transaction
the `transaction` property contains the normal knex instance. In both cases the value can be passed anywhere
where a transaction object can be passed so you never need to check for the existence of the `transaction`
property.

See the methods [`runBefore`](#runbefore), [`onBuild`](#onbuild) and [`runAfter`](#runafter)
for more information about the hooks.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
queryContext|Object|The query context object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### mergeContext

```js
const builder = queryBuilder.mergeContext(queryContext);
```

Merges values into the query context.

This method is like [`context`](#context) but instead of replacing the whole context
this method merges the objects.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
queryContext|Object|The object to merge into the query context.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### reject

```js
const builder = queryBuilder.reject(reason);
```

Skips the database query and "fakes" an error result.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
reson||The rejection reason

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### resolve

```js
const builder = queryBuilder.resolve(value);
```

Skips the database query and "fakes" a result.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
value||The resolve value

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### isExecutable

```js
const executable = queryBuilder.isExecutable();
```

Returns false if this query will never be executed.

This may be true in multiple cases:

1. The query is explicitly resolved or rejected using the [`resolve`](#resolve) or [`reject`](#reject) methods.
2. The query starts a different query when it is executed.

##### Return value

Type|Description
----|-----------------------------
boolean|false if the query will never be executed.




#### runBefore

```js
const builder = queryBuilder.runBefore(runBefore);
```

```js
const query = Person.query();

query
 .runBefore(() => {
   console.log('hello 1');

   return Promise.delay(10).then(() => {
     console.log('hello 2');
   });
 })
 .runBefore(() => {
   console.log('hello 3');
 });

query.then();
// --> hello 1
// --> hello 2
// --> hello 3
```

Registers a function to be called before the database query when the builder is executed. Multiple functions can be
chained like [`then`](#then) methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
runBefore|function(any, [`QueryBuilder`](#querybuilder))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### onBuild

```js
const builder = queryBuilder.onBuild(onBuild);
```

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

Functions registered with this method are called each time the query is built into an SQL string. This method is ran
after [`runBefore`](#runbefore) methods but before [`runAfter`](#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it. You shouldn't
modify the query in any of the `run` methods.

Unlike the run methods these must be synchronous. Also you should not register any run methods
from these. You should _only_ call the query building methods of the builder provided as a parameter.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
onBuild|function([`QueryBuilder`](#querybuilder))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### runAfter

```js
const builder = queryBuilder.runAfter(runAfter);
```

```js
const query = Person.query();

query
 .runAfter((models, queryBuilder) => {
   return models;
 })
 .runAfter((models, queryBuilder) => {
   models.push(Person.fromJson({firstName: 'Jennifer'}));
 });

query.then(models => {
  const jennifer = models[models.length - 1];
});
```

Registers a function to be called when the builder is executed.

These functions are executed as the last thing before any promise handlers
registered using the [`then`](#then) method. Multiple functions can be chained like
[`then`](#then)  methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
runAfter|function(*, [`QueryBuilder`](#querybuilder))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### eagerAlgorithm

```js
const builder = queryBuilder.eagerAlgorithm(algo);
```

```js
Person
  .query()
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[pets, children]')
```

Select the eager loading algorithm for the query. See comparison between
the available algorithms [here](#eager).

##### Arguments

Argument|Type|Description
--------|----|-------|------------
algo|EagerAlgorithm|The eager loading algorithm to use. Either `Model.JoinEagerAlgorithm` or `Model.WhereInEagerAlgorithm`.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### eager

```js
const builder = queryBuilder.eager(relationExpression, filters);
```

```js
// Fetch `children` relation for each result Person and `pets` and `movies`
// relations for all the children.
Person
  .query()
  .eager('children.[pets, movies]')
  .then(people => {
    console.log(people[0].children[0].pets[0].name);
    console.log(people[0].children[0].movies[0].id);
  });
```

> Relations can be filtered by giving named filter functions as arguments
> to the relations:

```js
Person
  .query()
  .eager('children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
    orderByAge: (builder) => {
      builder.orderBy('age');
    },
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  })
  .then(people => {
    console.log(people[0].children[0].pets[0].name);
    console.log(people[0].children[0].movies[0].id);
  });
```

> Filters can also be registered using the [`modifyEager`](#modifyeager) method:

```js
Person
  .query()
  .eager('children.[pets, movies]')
  .modifyEager('children', builder => {
    // Order children by age.
    builder.orderBy('age');
  })
  .modifyEager('children.[pets, movies]', builder => {
    // Only select `pets` and `movies` whose id > 10 for the children.
    builder.where('id', '>', 10);
  })
  .modifyEager('children.movies]', builder => {
    // Only select 100 first movies for the children.
    builder.limit(100);
  })
  .then(people => {
    console.log(people[0].children[0].pets[0].name);
    console.log(people[0].children[0].movies[0].id);
  });
```

> The eager queries are optimized to avoid the N + 1 query problem. Consider this query:

```js
Person
  .query()
  .where('id', 1)
  .eager('children.children')
  .then(people => {
    console.log(people[0].children.length); // --> 10
    console.log(people[0].children[9].children.length); // --> 10
  });
```

> The person has 10 children and they all have 10 children. The query above will
> return 100 database rows but will generate only three database queries when using
> `WhereInEagerAlgorithm` and only one query when using `JoinEagerAlgorithm`.

> The loading algorithm can be changed using the [`eagerAlgorithm`](#eageralgorithm) method:

```js
Person
  .query()
  .where('id', 1)
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[movies, children.pets]')
  .where('movies.name', 'like', '%terminator%')
  .where('children:pets.species', 'dog')
  .then(people => {
    console.log(people);
  });
```


Fetch relations eagerly for the result rows.

See the [eager queries](#eager-queries) section for more examples and [`RelationExpression`](#relationexpression)
for more info on the relation expression language.

You can choose the way objection performs the eager loading by using [`eagerAlgorithm`](#eageralgorithm) method
on a query builder or by setting the [`defaultEagerAlgorithm`](#defaulteageralgorithm) property of a model. The
two algorithms currently available are `Model.WhereInEagerAlgorithm` (the default) and `Model.JoinEagerAlgorithm`.
Both have their strengths and weaknesses. We will go through the main differences below. You can always see the
executed SQL by calling the [`debug`](#debug) method for the query builder.

<b>WhereInEagerAlgorithm</b>

This algorithm uses multiple queries to fetch the related objects. Objection performs one query per level
in the eager tree. For example only two additional queries will be created for eager expression `children.children`
no matter how many children the model has or how many children each of the children have. This algorithm is explained
in detail in [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

Limitations:

 * Relations cannot be referred in the query because they are not joined.
 * `limit` and `page` methods will work incorrectly when applied to a relation using `filterEager`,
   because they will be applied on a query that fetches relations for multiple parents. You can use
   `limit` and `page` for the root query.

<b>JoinEagerAlgorithm</b>

This algorithm uses joins to fetch the whole eager tree using one single query. This allows you to reference the relations
in the root query (see the last example). The related tables can be referred using the relation name. Nested relations
must be separated by `:` character (dot is not used because of the way knex parses identifiers).

Limitations:

 * `limit` and `page` methods will work incorrectly because the will limit the result set which contains all the result
   rows in a flattened format. For example the result set of the eager expression `children.children` will have
   `10 * 10 * 10` rows assuming the you fetched 10 models that all had 10 children that all had 10 children.

<b>Performance differences</b>

`WhereInEagerAlgorithm` performs more queries than `JoinEagerAlgorithm` which can cause a significant delay especially if
the round trip time to the database server is significant. On the other hand the result from `WhereInEagerAlgorithm` is
trivial to parse into a tree structure while the result of `JoinEagerAlgorithm` needs some complex parsing which
can lead to a significant performance decrease. Which method is faster depends heavily on the query and the environment.
You should select the algorithm that makes your code cleaner and only consider performance if you have an actual measured
real-life problem. Don't optimize prematurely!

##### Arguments

Argument|Type|Description
--------|----|-------|------------
relationExpression|string&#124;[`RelationExpression`](#relationexpression)|The eager expression
filters|Object&lt;string, function([`QueryBuilder`](#querybuilder))&gt;|The named filter functions for the expression

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### mergeEager

> The following queries are equivalent

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

Just like [eager](#eager) but instead of replacing query builder's eager expression this method merges the given
expression to the existing expression.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
relationExpression|string&#124;[`RelationExpression`](#relationexpression)|The eager expression
filters|Object&lt;string, function([`QueryBuilder`](#querybuilder))&gt;|The named filter functions for the expression

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### allowEager

```js
const builder = queryBuilder.allowEager(relationExpression);
```

```js
Person
  .query()
  .allowEager('[children.pets, movies]')
  .eager(req.query.eager)
```

Sets the allowed eager expression.

Any subset of the allowed expression is accepted by [`eager`](#eager) method. For example setting
the allowed expression to `a.b.c` expressions `a`, `a.b` and `a.b.c` are accepted by [`eager`](#eager)
method. Setting any other expression will reject the query and cause the promise error handlers
to be called.

This method is useful when the eager expression comes from an untrusted source like query
parameters of a http request.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
relationExpression|string&#124;[`RelationExpression`](#relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### modifyEager

```js
const builder = queryBuilder.modifyEager(pathExpression, modifier);
```

Can be used to modify the eager queries.

The `pathExpression` is a relation expression that specifies the queries for which the modifier is given.

> The following query would filter out the children's pets that
> are <= 10 years old:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    builder.where('age', '>', 10);
  })
```

> The path expression can have multiple targets. The next example sorts both the
> pets and movies of the children by id:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.[pets, movies]', builder => {
    builder.orderBy('id');
  })
```

> This example only selects movies whose name contains the word 'Predator':

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('[children.movies, movies]', builder => {
    builder.where('name', 'like', '%Predator%');
  })
```

##### Arguments

Argument|Type|Description
--------|----|-------|------------
pathExpression|string&#124;[`RelationExpression`](#relationexpression)|Expression that specifies the queries for which to give the filter.
modifier|function([`QueryBuilder`](#querybuilder)|The modifier function.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### filterEager

Alias for [modifyEager](#modifyeager).



#### allowInsert

```js
const builder = queryBuilder.allowInsert(relationExpression);
```

```js
Person
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

Sets the allowed tree of relations to insert using [`insertGraph`](#insertgraph) method.

If the model tree given to the [`insertGraph`](#insertgraph) method isn't a subtree of the
given expression, the query is rejected.

See methods [`eager`](#eager), [`allowEager`](#alloweager), [`RelationExpression`](#relationexpression) and the
section about [eager queries](#eager-queries) for more information on relation expressions.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
relationExpression|string&#124;[`RelationExpression`](#relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.





#### modelClass

```js
const modelClass = queryBuilder.modelClass();
```

Gets the Model subclass this builder is bound to.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|The Model subclass this builder is bound to




#### toString

```js
const sql = queryBuilder.toString();
```

Returns the SQL string. If this query builder executes multiple queries, only the first query's SQL is returned.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build




#### toSql

```js
const sql = queryBuilder.toSql();
```

Returns the SQL string. If this query builder executes multiple queries, only the first query's SQL is returned.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build




#### skipUndefined

```js
const builder = queryBuilder.skipUndefined();
```

If this method is called for a builder then undefined values passed to the query builder methods don't cause
an exception but are ignored instead.

> For example the following query will return all `Person` rows if `req.query.firstName` is `undefined`.

```js
Person
  .query()
  .skipUndefined()
  .where('firstName', req.query.firstName)
```

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining




#### transacting

```js
const builder = queryBuilder.transacting(transaction);
```

Sets the transaction for a query.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
transaction|object|A transaction object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining




#### clone

```js
const clone = queryBuilder.clone();
```

Create a clone of this builder.

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|Clone of the query builder





#### execute

```js
const promise = queryBuilder.execute();
```

Executes the query and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.




#### then

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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### map

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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### catch

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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### return

```js
const promise = queryBuilder.return(returnValue);
```

Executes the query and calls `return(returnValue)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
returnValue||undefined|Return value

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### bind

```js
const promise = queryBuilder.bind(returnValue);
```

Executes the query and calls `bind(context)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
context||undefined|Bind context

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### asCallback

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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.





#### nodeify

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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.




#### resultSize

```js
const promise = queryBuilder.resultSize();
```

```js
const query = Person
  .query()
  .where('age', '>', 20);

Promise.all([
  query.resultSize(),
  query.offset(100).limit(50)
]).spread((total, models) => {
  ...
});
```

Returns the amount of rows the current query would produce without [`limit`](#limit) and [`offset`](#offset) applied.
Note that this executes a query (not the one we are building) and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result size.





#### page

```js
const builder = queryBuilder.page(page, pageSize);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .page(5, 100)
  .then(result => {
    console.log(result.results.length); // --> 100
    console.log(result.total); // --> 3341
  });
```

Two queries queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size,
but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the
performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`.
The problem with this is that if the result set is empty, we don't get the total count either.
(If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|-------|------------
page|number|The index of the page to return
pageSize|number|The page size

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





#### range

```js
const builder = queryBuilder.range(start, end);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .range(0, 100)
  .then(result => {
    console.log(result.results.length); // --> 101
    console.log(result.total); // --> 3341
  });
```

> `range` can be called without arguments if you want to specify the limit and offset explicitly:

```js
Person
  .query()
  .where('age', '>', 20)
  .limit(10)
  .range()
  .then(result => {
    console.log(result.results.length); // --> 101
    console.log(result.total); // --> 3341
  });
```

Only returns the given range of results.

Two queries queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size,
but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the
performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`.
The problem with this is that if the result set is empty, we don't get the total count either.
(If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|-------|------------
start|number|The index of the first result (inclusive)
end|number|The index of the last result (inclusive)

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





#### pluck

```js
const builder = queryBuilder.pluck(propertyName);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .pluck('firstName')
  .then(firstNames => {
    console.log(typeof firstNames[0]); // --> string
  });
```

If the result is an array, plucks a property from each object.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
propertyName|string|The name of the property to pluck

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





#### first

```js
const builder = queryBuilder.first();
```

```js
Person
  .query()
  .first()
  .then(firstPerson => {
    console.log(person.age);
  });
```

If the result is an array, selects the first item.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





#### traverse

```js
var builder = queryBuilder.traverse(modelClass, traverser);
```

```js
Person
  .query()
  .eager('pets')
  .traverse((model, parentModel, relationName) => {
    delete model.id;
  })
  .then(people => {
    console.log(people[0].id); // --> undefined
    console.log(people[0].pets[0].id); // --> undefined
  });
```

```js
Person
  .query()
  .eager('pets')
  .traverse(Animal, (animal, parentModel, relationName) => {
    delete animal.id;
  })
  .then(persons => {
    console.log(persons[0].id); // --> 1
    console.log(persons[0].pets[0].id); // --> undefined
  });
```

Traverses through all models in the result, including the eagerly loaded relations.

The optional first parameter can be a constructor. If given, the traverser
function is only called for the models of that class.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
modelClass|[`Model`](#model)|The optional model class filter. If given, the traverser function is only called for models of this class.
traverser|function([`Model`](#model), [`Model`](#model), string)|The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





#### pick

```js
const builder = queryBuilder.pick(modelClass, properties);
```

> There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .pick(['id', 'name']);
```

> and

```js
Person
  .query()
  .eager('pets')
  .pick(Person, ['id', 'firstName'])
  .pick(Animal, ['id', 'name']);
```

Pick properties from result models.

The first example goes through all models (including relations) and discards all
properties but `id` and `name`. The second example also traverses the whole model
tree and discards all but `id` and `firstName` properties of all `Person`
instances and `id` and `name` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
modelClass|[`Model`](#model)|The optional model class filter
properties|Array.&lt;string&gt;|The properties to pick

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining




#### omit

```js
const builder = queryBuilder.omit(modelClass, properties);
```

> There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .omit(['parentId', 'ownerId']);
```

> and

```js
Person
  .query()
  .eager('pets')
  .omit(Person, ['parentId', 'age'])
  .omit(Animal, ['ownerId', 'species']);
```

Omit properties of result models.

The first example goes through all models (including relations) and omits the properties
`parentId` and `ownerId`. The second example also traverses the whole model tree and
omits the properties `parentId` and `age` from all `Person` instances and `ownerId`
and `species` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
modelClass|[`Model`](#model)|The optional model class filter
properties|Array.&lt;string&gt;|The properties to omit

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





## Model

```js
class Person extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'Person';
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for validation. Whenever a model instance is created
  // it is checked against this schema.
  // http://json-schema.org/.
  static get jsonSchema () {
    return {
      type: 'object',
      required: ['firstName', 'lastName'],

      properties: {
        id: {type: 'integer'},
        parentId: {type: ['integer', 'null']},
        firstName: {type: 'string', minLength: 1, maxLength: 255},
        lastName: {type: 'string', minLength: 1, maxLength: 255},
        age: {type: 'number'},

        // Properties defined as objects or arrays are
        // automatically converted to JSON strings when
        // writing to database and back to objects and arrays
        // when reading from database. To override this
        // behaviour, you can override the
        // Person.jsonAttributes property.
        address: {
          type: 'object',
          properties: {
            street: {type: 'string'},
            city: {type: 'string'},
            zipCode: {type: 'string'}
          }
        }
      }
    };
  }

  // This object defines the relations to other models.
  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model
        // subclass constructor or an absolute file path
        // to a module that exports one. We use the file
        // path version here to prevent require loops.
        modelClass: __dirname + '/Animal',
        join: {
          from: 'Person.id',
          to: 'Animal.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/Movie',
        join: {
          from: 'Person.id',
          // ManyToMany relation needs the `through` object
          // to describe the join table.
          through: {
            from: 'Person_Movie.actorId',
            to: 'Person_Movie.movieId'

            // If you have a model class for the join table
            // you can specify it like this:
            //
            // modelClass: PersonMovie,

            // Columns listed here are automatically joined
            // to the related models on read and written to
            // the join table instead of the related table
            // on insert.
            //
            // extra: ['someExtra']
          },
          to: 'Movie.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'Person.id',
          to: 'Person.parentId'
        }
      },

      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Person.parentId',
          to: 'Person.id'
        }
      }
    };
  }
}
```

Subclasses of this class represent database tables.

##### Model lifecycle

For the purposes of this explanation, let's define three data layouts:

1. `database`: The data layout returned by the database.
2. `internal`: The data layout of a model instance.
3. `external`: The data layout after calling `model.toJSON()`.

Whenever data is converted from on layout to another, converter methods are called:

1. `database` -> [`$parseDatabaseJson`](#_s_parsedatabasejson) -> `internal`
2. `internal` -> [`$formatDatabaseJson`](#_s_formatdatabasejson) -> `database`
3. `external` -> [`$parseJson`](#_s_parsejson) -> `internal`
4. `internal` -> [`$formatJson`](#_s_formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the
[`$parseDatabaseJson`](#_s_parsedatabasejson) method. When data is written to database it goes through
the [`$formatDatabaseJson`](#_s_formatdatabasejson) method.

Similarly when you give data for a query (for example [`query().insert(req.body)`](#insert)) or create a model
explicitly using [`Model.fromJson(obj)`](#fromjson) the [`$parseJson`](#_s_parsejson) method is invoked. When you call
[`model.toJSON()`](#tojson) or [`model.$toJson()`](#_s_tojson) the [`$formatJson`](#_s_formatjson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) automatically call the [`toJSON`](#tojson)
method when you pass the model to methods like `response.json(model)`. You rarely need to call
[`toJSON()`](#tojson)  or [`$toJson()`](#_s_tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the
outside world. See [this recipe](#map-column-names-to-different-property-names) for an example usage of the lifecycle
methods.

All instance methods of models are prefixed with `$` letter so that they won't overlap with database
properties. All properties that start with `$` are also removed from `database` and `external` layouts.

### Static properties

#### tableName

```js
class Person extends Model {
  static get tableName() {
    return 'Person';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static tableName = 'Person';
}
```

Name of the database table for this model.

Each model must set this.



#### jsonSchema

```js
class Person extends Model {
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['firstName', 'lastName'],

      properties: {
        id: {type: 'integer'},
        parentId: {type: ['integer', 'null']},
        firstName: {type: 'string', minLength: 1, maxLength: 255},
        lastName: {type: 'string', minLength: 1, maxLength: 255},
        age: {type: 'number'},

        // Properties defined as objects or arrays are
        // automatically converted to JSON strings when
        // writing to database and back to objects and arrays
        // when reading from database. To override this
        // behaviour, you can override the
        // Person.jsonAttributes property.
        address: {
          type: 'object',
          properties: {
            street: {type: 'string'},
            city: {type: 'string'},
            zipCode: {type: 'string'}
          }
        }
      }
    };
  }
}
```

> ESNext:

```js
class Person extends Model {
  static jsonSchema = {
    type: 'object',
    required: ['firstName', 'lastName'],

    properties: {
      id: {type: 'integer'},
      parentId: {type: ['integer', 'null']},
      firstName: {type: 'string', minLength: 1, maxLength: 255},
      lastName: {type: 'string', minLength: 1, maxLength: 255},
      age: {type: 'number'},

      // Properties defined as objects or arrays are
      // automatically converted to JSON strings when
      // writing to database and back to objects and arrays
      // when reading from database. To override this
      // behaviour, you can override the
      // Person.jsonAttributes property.
      address: {
        type: 'object',
        properties: {
          street: {type: 'string'},
          city: {type: 'string'},
          zipCode: {type: 'string'}
        }
      }
    }
  };
}
```

The optional schema against which the JSON is validated.

The jsonSchema can be dynamically modified in the [`$beforeValidate`](#_s_beforevalidate) method.

Must follow http://json-schema.org specification. If null no validation is done.

Read more:

* [`$beforeValidate`](#_s_beforevalidate)
* [`$validate`](#_s_validate)
* [`$afterValidate`](#_s_aftervalidate)
* [`jsonAttributes`](#jsonattributes)
* [custom validation recipe](#custom-validation)




#### idColumn

```js
class Person extends Model {
  static get idColumn() {
    return 'some_column_name';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static idColumn = 'some_column_name';
}
```

Name of the primary key column in the database table.

Composite id can be specified by giving an array of column names.

Defaults to 'id'.





#### modelPaths

```js
class Person extends Model {
  static get modelPaths() {
    return [__dirname];
  }
}
```

> ESNext:

```js
class Person extends Model {
  static modelPaths = [__dirname];
}
```

A list of paths from which to search for models for relations.

A model class can be defined for a relation in [`relationMappings`](#relationmappings) as

1. A model class constructor
2. An absolute path to a module that exports a model class
3. A path relative to one of the paths in `modelPaths` array.




#### relationMappings

```js
class Person extends Model {
  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'Person.id',
          to: 'Animal.ownerId'
        }
      },

      father: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Person.fatherId',
          to: 'Person.id'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'Person.id',
          through: {
            from: 'Person_Movie.actorId',
            to: 'Person_Movie.movieId'

            // If you have a model class for the join table
            // you can specify it like this:
            //
            // modelClass: PersonMovie,

            // Columns listed here are automatically joined
            // to the related models on read and written to
            // the join table instead of the related table
            // on insert.
            //
            // extra: ['someExtra']
          },
          to: 'Movie.id'
        }
      }
    };
  }
}
```

> ESNext:

```js
class Person extends Model {
  static relationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    },

    father: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Person.fatherId',
        to: 'Person.id'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'Person.id',
        through: {
          from: 'Person_Movie.actorId',
          to: 'Person_Movie.movieId'

          // If you have a model class for the join table
          // you can specify it like this:
          //
          // modelClass: PersonMovie,

          // Columns listed here are automatically joined
          // to the related models on read and written to
          // the join table instead of the related table
          // on insert.
          //
          // extra: ['someExtra']
        },
        to: 'Movie.id'
      }
    }
  };
}
```

This property defines the relations to other models.

relationMappings is an object (or a function that returns an object) whose keys are relation names and values are [`RelationMapping`](#relationmapping) instances.
The `join` property in addition to the relation type define how the models are related to one
another. The `from` and `to` properties of the `join` object define the database columns through which the
models are associated. Note that neither of these columns need to be primary keys. They can be any
columns. In the case of ManyToManyRelation also the join table needs to be defined. This is
done using the `through` object.

The `modelClass` passed to the relation mappings is the class of the related model. It can be one of the following:

1. A model class constructor
2. An absolute path to a module that exports a model class
3. A path relative to one of the paths in [`modelPaths`](#modelpaths) array.

The file path versions are handy for avoiding require loops.

See [`RelationMapping`](#relationmapping)

##### RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation` and `Model.ManyToManyRelation`.
modelClass|[`Model`](#model)&#124;string|Constructor of the related model class, an absolute path to a module that exports one or a path relative to [`modelPaths`](#modelpaths) that exports a model class.
join|[`RelationJoin`](#relationjoin)|Describes how the models are related to each other. See [`RelationJoin`](#relationjoin).
modify|function([`QueryBuilder`](#querybuilder))|Optional modifier for the relation query. This is called each time the relation is fetched.
filter|function([`QueryBuilder`](#querybuilder))|Alias for modify.

##### RelationJoin

Property|Type|Description
--------|----|-----------
from|string&#124;Array.&lt;string&gt;|The relation column in the owner table. Must be given with the table name. For example `Person.id`. Composite key can be specified using an array of columns e.g. `['Person.a', 'Person.b']`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column.
to|string&#124;Array.&lt;string&gt;|The relation column in the related table. Must be given with the table name. For example `Movie.id`. Composite key can be specified using an array of columns e.g. `['Movie.a', 'Movie.b']`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column.
through|[`RelationThrough`](#relationthrough)|Describes the join table if the models are related through one.

##### RelationThrough

Property|Type|Description
--------|----|-----------
from|string&#124;Array.&lt;string&gt;|The column that is joined to `from` property of the `RelationJoin`. For example `Person_Movie.actorId` where `Person_Movie` is the join table. Composite key can be specified using an array of columns e.g. `['Person_Movie.a', 'Person_Movie.b']`.
to|string&#124;Array.&lt;string&gt;|The column that is joined to `to` property of the `RelationJoin`. For example `Person_Movie.movieId` where `Person_Movie` is the join table. Composite key can be specified using an array of columns e.g. `['Person_Movie.a', 'Person_Movie.b']`.
modelClass|string&#124;ModelClass|If you have a model class for the join table, you should specify it here. This is optional so you don't need to create a model class if you don't want to.
extra|Array.&lt;string&gt;&#124;Object|Columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert. The values can be aliased by providing an object `{propertyName: 'columnName', otherPropertyName: 'otherColumnName'} instead of array`



#### jsonAttributes

```js
class Person extends Model {
  static get jsonAttributes() {
    return ['someProp', 'someOtherProp'];
  }
}
```

> ESNext:

```js
class Person extends Model {
  static jsonAttributes = ['someProp', 'someOtherProp'];
}
```

Properties that should be saved to database as JSON strings.

The properties listed here are serialized to JSON strings upon insertion/update to the database
and parsed back to objects when models are read from the database. Combined with the
postgresql's json or jsonb data type, this is a powerful way of representing documents
as single database rows.

If this property is left unset all properties declared as objects or arrays in the
[`jsonSchema`](#jsonschema) are implicitly added to this list.



#### virtualAttributes

```js
class Person extends Model {
  static get virtualAttributes() {
    return ['fullName', 'isFemale'];
  }

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get isFemale() {
    return this.gender === 'female';
  }
}

const person = Person.fromJson({
  firstName: 'Jennifer',
  lastName: 'Aniston',
  gender: 'female'
});

console.log(person.toJSON());
// --> {"firstName": "Jennifer", "lastName": "Aniston", "isFemale": true, "fullName": "Jennifer Aniston"}
```

> ESNext:

```js
class Person extends Model {
  static virtualAttributes = ['fullName', 'isFemale'];

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get isFemale() {
    return this.gender === 'female';
  }
}

const person = Person.fromJson({
  firstName: 'Jennifer',
  lastName: 'Aniston',
  gender: 'female'
});

console.log(person.toJSON());
// --> {"firstName": "Jennifer", "lastName": "Aniston", "isFemale": true, "fullName": "Jennifer Aniston"}
```

Getters and methods listed here are serialized with real properties when `toJSON` is called.

The virtual values are not written to database. Only the "external" JSON format will contain them.




#### uidProp

```js
class Person extends Model {
  static get uidProp() {
    return '#id';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static uidProp = '#id';
}
```

Name of the property used to store a temporary non-db identifier for the model.

Defaults to '#id'.




#### uidRefProp

```js
class Person extends Model {
  static get uidRefProp() {
    return '#ref';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static uidRefProp = '#ref';
}
```

Name of the property used to store a reference to a [`uidProp`](#uidprop)

Defaults to '#ref'.




#### dbRefProp

```js
class Person extends Model {
  static get dbRefProp() {
    return '#dbRef';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static dbRefProp = '#dbRef';
}
```

Name of the property used to point to an existing database row from an `insertGraph` graph.

Defaults to '#dbRef'.




#### propRefRegex

```js
class Person extends Model {
  static get propRefRegex() {
    return /#ref{([^\.]+)\.([^}]+)}/g;
  }
}
```

> ESNext:

```js
class Person extends Model {
  static propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;
}
```

Regular expression for parsing a reference to a property.

Defaults to `/#ref{([^\.]+)\.([^}]+)}/g`.



#### pickJsonSchemaProperties

```js
class Person extends Model {
  static get pickJsonSchemaProperties() {
    return true;
  }
}
```

> ESNext:

```js
class Person extends Model {
  static pickJsonSchemaProperties = true;
}
```

If this is true only properties in `jsonSchema` are picked when inserting or updating a row
in the database.

Defaults to false.




#### defaultEagerAlgorithm

```js
class Person extends Model {
  static get defaultEagerAlgorithm() {
    return Model.WhereInEagerAlgorithm;
  }
}
```

> ESNext:

```js
class Person extends Model {
  static defaultEagerAlgorithm = Model.WhereInEagerAlgorithm;
}
```

Sets the default eager loading algorithm for this model. Must be either
`Model.WhereInEagerAlgorithm` or `Model.JoinEagerAlgorithm`.

Defaults to `Model.WhereInEagerAlgorithm`.




#### defaultEagerOptions

```js
class Person extends Model {
  static get defaultEagerOptions() {
    return {minimize: true};
  }
}
```

> ESNext:

```js
class Person extends Model {
  static defaultEagerOptions = {minimize: true};
}
```

Sets the default options for eager loading algorithm. See the possible
fields [here](#eageroptions).

Defaults to `null`.




#### QueryBuilder

```js
class Person extends Model {
  static get QueryBuilder() {
    return MyCustomQueryBuilder;
  }
}
```

> ESNext:

```js
class Person extends Model {
  static QueryBuilder = MyCustomQueryBuilder;
}
```

[`QueryBuilder`](#querybuilder) subclass to use in [`query`](#query) or [`$query`](#_s_query) methods.

This constructor is used whenever a query builder is created using [`query`](#query) or [`$query`](#_s_query) methods.
You can override this to use your own [`QueryBuilder`](#querybuilder) subclass.

[Usage example](#custom-query-builder).




### Static methods


#### query

> Read models from the database:

```js
// Get all rows.
Person.query().then(people => {
  console.log('there are', people.length, 'people in the database');
});

// Example of a more complex WHERE clause. This generates:
// SELECT FROM "Person"
// WHERE ("firstName" = 'Jennifer' AND "age" < 30)
// OR ("firstName" = 'Mark' AND "age" > 30)
Person
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
  })
  .then(marksAndJennifers => {
    console.log(marksAndJennifers);
  });

// Get a subset of rows and fetch related models
// for each row.
Person
  .query()
  .where('age', '>', 60)
  .eager('children.children.movies')
  .then(oldPeople => {
    console.log('some old person\'s grand child has appeared in',
      oldPeople[0].children[0].children[0].movies.length,
      'movies');
  });
```

> Insert models to the database:

```js
Person.query()
  .insert({firstName: 'Sylvester', lastName: 'Stallone'})
  .then(sylvester => {
    console.log(sylvester.fullName());
    // --> 'Sylvester Stallone'.
  });

// Batch insert. This only works on Postgresql as it is
// the only database that returns the identifiers of
// _all_ inserted rows. If you need to do batch inserts
// on other databases useknex* directly.
// (See .knexQuery() method).
Person
  .query()
  .insert([
    {firstName: 'Arnold', lastName: 'Schwarzenegger'},
    {firstName: 'Sylvester', lastName: 'Stallone'}
  ])
  .then(inserted => {
    console.log(inserted[0].fullName()); // --> 'Arnold Schwarzenegger'
  });
```

> `update` and `patch` can be used to update models. Only difference between the mentioned methods
> is that `update` validates the input objects using the model class's full jsonSchema and `patch`
> ignores the `required` property of the schema. Use `update` when you want to update _all_ properties
> of a model and `patch` when only a subset should be updated.

```js
Person
  .query()
  .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 35})
  .where('id', jennifer.id)
  .then(numUpdatedRows => {
    console.log(numUpdatedRows);
  });

// This will throw assuming that `firstName` or `lastName`
// is a required property for a Person.
Person.query().update({age: 100});

// This will _not_ throw.
Person
  .query()
  .patch({age: 100})
  .then(() => {
    console.log('Everyone is now 100 years old');
  });
```

> Models can be deleted using the delete method. Naturally the delete query can be chained with
> any knex* methods:

```js
Person
  .query()
  .delete()
  .where('age', '>', 90)
  .then(() => {
    console.log('anyone over 90 is now removed from the database');
  });
```

Creates a query builder for the model's table.

See the [query examples](#query-examples) section for more examples.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
transaction|object|Optional transaction for the query.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|The created query builder




#### knex

> Get:

```js
const knex = Person.knex();
```

> Set:

```js
let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database.db'
  }
});

Model.knex(knex);
knex = Model.knex();
```

Get/Set the knex instance for this model class.

Subclasses inherit the connection. A system-wide knex instance can thus be set by calling
`objection.Model.knex(knex)`. This works even after subclasses have been created.

See [`bindKnex`](#bindknex) method if you want to use multiple databases in the same
application.



#### raw

Shortcut for `Person.knex().raw(...args)`



#### fn

Shortcut for `Person.knex().fn`



#### formatter

Shortcut for `Person.knex().client.formatter()`



#### knexQuery

Shortcut for `Person.knex().table(Person.tableName)`




#### bindKnex

> Example:

```js
const knex1 = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database1.db'
  }
});

const knex2 = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database2.db'
  }
});

SomeModel.knex(null);

const BoundModel1 = SomeModel.bindKnex(knex1);
const BoundModel2 = SomeModel.bindKnex(knex2);

// Throws since the knex instance is null.
SomeModel.query().then();

// Works.
BoundModel1.query().then(models => {
 console.log(models[0] instanceof SomeModel); // --> true
 console.log(models[0] instanceof BoundModel1); // --> true
});

// Works.
BoundModel2.query().then(models => {
 console.log(models[0] instanceof SomeModel); // --> true
 console.log(models[0] instanceof BoundModel2); // --> true
});
```

Creates an anonymous subclass of this class that is bound to the given knex.

This method can be used to bind a Model subclass to multiple databases for example in
a multi-tenant system. See the [multi tenancy recipe](#multi-tenancy) for more info.

##### Arguments

Argument|Type|Description
--------|----|-------------------
knex|Knex|knex connection to bind to

##### Return value

Type|Description
----|-----------------------------
function|The create model subclass constructor




#### bindTransaction

```js
cons Person = require('./models/Person');
let transaction;

objection.transaction.start(Person).then(trx => {
  transaction = trx;
  return Person
    .bindTransaction(transaction)
    .query()
    .insert({firstName: 'Jennifer'});
}).then(jennifer => {
  return Person
    .bindTransaction(transaction)
    .query()
    .patch({lastName: 'Lawrence'})
    .where('id', jennifer.id);
}).then(() => {
  return transaction.commit();
}).catch(() => {
  return transaction.rollback();
});
```

Alias for [`bindKnex`](#bindknex).




#### fromJson

```js
const person = Person.fromJson(json, opt);
```

Creates a model instance from a JSON object.

The object is checked against [`jsonSchema`](#jsonschema) and an exception is thrown on failure.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object from which to create the model.
opt|[ModelOptions](#modeloptions)|Update options.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|The created model instance




#### fromDatabaseJson

```js
const person = Person.fromDatabaseJson(row);
```

Creates a model instance from a JSON object in database format.

##### Arguments

Argument|Type|Description
--------|----|-------------------
row|Object|A database row.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|The created model instance




#### createValidator

```js
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```

> The default implementation:

```js
const AjvValidator = require('objection').AjvValidator;

class Model {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => {
        // Here you can modify the `Ajv` instance.
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }
}
```

Creates an instance of a [`Validator`](#validator) that is used to do
all validation related stuff. This method is called only once per
model class.

You can override this method to return an instance of your custom
validator. The custom validator doesn't need to be based on the
`jsonSchema`. It can be anything at all as long as it implements the
[`Validator`](#validator) interface.

If you want to use the default json schema based [`AjvValidator`](#ajvvalidator) but
want to modify it, you can use the `objection.AjvValidator` constructor. See
the default implementation example.

##### Return value

Type|Description
----|-----------------------------
[`Validator`](#validator)|The created validator instance




#### omitImpl

```js
class Person extends Model {
  omitImpl(obj, prop) {
    delete obj[prop];
  }
}
```

Omit implementation to use.

The default implementation `delete`s the property.



#### loadRelated

```js
const promise = Person.loadRelated(models, expression, filters);
```

> Examples:

```js
Person.loadRelated([person1, person2], 'children.pets').then(people => {
  var person1 = people[0];
  var person2 = people[1];
});
```

> Relations can be filtered by giving named filter functions as arguments to the relations:

```js
Person
  .loadRelated([person1, person2], 'children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
    orderByAge: (builder) => {
      builder.orderBy('age');
    },
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  })
  .then(people => {
    console.log(people[1].children.pets[0]);
  });
```

Load related models for a set of models using a [`RelationExpression`](#relationexpression).

##### Arguments

Argument|Type|Description
--------|----|-------------------
models|Array.&lt;[`Model`](#model)&#124;Object&gt;|
expression|string&#124;[`RelationExpression`](#relationexpression)|The relation expression
filters|Object.&lt;string, function([`QueryBuilder`](#querybuilder))&gt;|Optional named filters

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|The created query builder




#### traverse

> There are two ways to call this method:

```js
Model.traverse(models, (model, parentModel, relationName) => {
  doSomething(model);
});
```

and

```js
Model.traverse(Person, models, (person, parentModel, relationName) => {
  doSomethingForPerson(person);
});
```

Traverses the relation tree of a list of models.

Calls the callback for each related model recursively. The callback is called
also for the input models themselves.

In the second example the traverser function is only called for `Person` instances.

##### Arguments

Argument|Type|Description
--------|----|-------------------
filterConstructor|function|If this optional constructor is given, the `traverser` is only called for models for which `model instanceof filterConstructor` returns true.
models|[`Model`](#model)&#124;Array.&lt;[`Model`](#model)&gt;|The model(s) whose relation trees to traverse.
traverser|function([`Model`](#model), string, string)|The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation.



### Instance methods




#### $id

```js
console.log(model.$id()); // -> 100
// Sets the id.
model.$id(100);
```

> Composite key

```js
console.log(model.$id()); // -> [100, 20, 30]
// Sets the id.
model.$id([100, 20, 30]);
```

Returns or sets the identifier of a model instance.

The identifier property does not have to be accessed or set using this method.
If the identifier property is known it can be accessed or set just like any
other property.




#### $beforeValidate

```js
class Person extends Model {
  $beforeValidate(jsonSchema, json, opt) {
    return jsonSchema;
  }
}
```

This is called before validation.

You can add any additional validation to this method. If validation fails, simply throw an exception and
the query will be rejected. If you modify the `jsonSchema` argument and return it, that one will be used
to validate the model.

`opt.old` object contains the old values while `json` contains the new values if validation is being done
for an existing object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
jsonSchema|Object|A deep clone of this class's jsonSchema
json|Object|The JSON object to be validated
opt|[`ModelOptions`](#modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Object|The modified jsonSchema or the input jsonSchema.




#### $validate

```js
modelInstance.$validate();
```

Validates the model instance.

Calls [`$beforeValidate`](#_s_beforevalidate) and [`$afterValidate`](#_s_aftervalidate) methods. This method is called
automatically from [`fromJson`](#fromjson) and [`$setJson`](#_s_setjson) methods. This method can also be
called explicitly when needed.

##### Throws

Type|Description
----|-----------------------------
[`ValidationError`](#validationerror)|If validation fails.




#### $toDatabaseJson

```js
const row = modelInstance.$toDatabaseJson();
```

Exports this model as a database JSON object.

This method is called internally to convert a model into a database row.

##### Return value

Type|Description
----|-----------------------------
Object|Database row.




#### $toJson

```js
const jsonObj = modelInstance.$toJson();
```

Exports this model as a JSON object.

##### Return value

Type|Description
----|-----------------------------
Object|Model as a JSON object.




#### toJSON

```js
const jsonObj = modelInstance.toJSON();
```

Exports this model as a JSON object.

##### Return value

Type|Description
----|-----------------------------
Object|Model as a JSON object.




#### $afterValidate

```js
class Person extends Model {
  $afterValidate(json, opt) {

  }
}
```

This is called after successful validation.

You can do further validation here and throw a [`ValidationError`](#validationerror) if something goes wrong.

`opt.old` object contains the old values while `json` contains the new values if validation is being done
for an existing object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object to be validated
opt|[`ModelOptions`](#modeloptions)|Optional options




#### $parseDatabaseJson

```js
class Person extends Model {
  $parseDatabaseJson(json) {
    // Remember to call the super class's implementation.
    json = super.$parseDatabaseJson(json);
    // Do your conversion here.
    return json;
  }
}
```

This is called when a [`Model`](#model) is created from a database JSON object.

Converts the JSON object from the database format to the internal format.

There are a couple of requirements for the implementation:

    1. This function must be pure. It should't have any side effects because it is called
       from "unexpected" places (for example to determine if your model somehow transforms
       column names between db and code).

    2. This function must be able to handle any subset of model's properties coming in.
       You cannot assume that some column is present in the `json` object as it depends
       on the select statement. There can also be additional columns because of joins,
       aliases etc. This method must also be prepared for null values in _any_ property
       of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object in database format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON object in internal format




#### $formatDatabaseJson

```js
class Person extends Model {
  $formatDatabaseJson(json) {
    // Remember to call the super class's implementation.
    json = super.$formatDatabaseJson(json);
    // Do your conversion here.
    return json;
  }
}
```

This is called when a [`Model`](#model) is converted to database format.

Converts the JSON object from the internal format to the database format.

There are a couple of requirements for the implementation:

    1. This function must be pure. It should't have any side effects because it is called
       from "unexpected" places (for example to determine if your model somehow transforms
       column names between db and code).

    2. This function must be able to handle any subset of model's properties coming in.
       You cannot assume that some property is present in the `json` object. There can
       also be additional properties. This method must also be prepared for null values
       in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object in internal format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON object in database format




#### $parseJson

```js
class Person extends Model {
  $parseJson(json, opt) {
    // Remember to call the super class's implementation.
    json = super.$parseJson(json, opt);
    // Do your conversion here.
    return json;
  }
}
```

This is called when a [`Model`](#model) is created from a JSON object.

Converts the JSON object from the external format to the internal format.

There are a couple of requirements for the implementation:

    1. This function must be pure. It should't have any side effects because it is called
       from "unexpected" places (for example to determine if your model somehow transforms
       column names between db and code).

    2. This function must be able to handle any subset of model's properties coming in.
       You cannot assume that some property is present in the `json` object. There can
       also be additional properties. This method must also be prepared for null values
       in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object in external format
opt|[`ModelOptions`](#modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Object|The JSON object in internal format




#### $formatJson

```js
class Person extends Model {
  $formatJson(json) {
    // Remember to call the super class's implementation.
    json = super.$formatJson(json);
    // Do your conversion here.
    return json;
  }
}
```

This is called when a [`Model`](#model) is converted to JSON.

Converts the JSON object from the internal format to the external format.

There are a couple of requirements for the implementation:

    1. This function must be pure. It should't have any side effects because it is called
       from "unexpected" places (for example to determine if your model somehow transforms
       column names between db and code).

    2. This function must be able to handle any subset of model's properties coming in.
       You cannot assume that some column is present in the `json` object as it depends
       on the select statement. There can also be additional columns because of joins,
       aliases etc. This method must also be prepared for null values in _any_ property
       of the `json` object.


##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object in internal format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON object in external format




#### $setJson

```js
modelInstance.$setJson(json, opt);
```

Sets the values from a JSON object.

Validates the JSON before setting values.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object to set
opt|[`ModelOptions`](#modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|`this` for chaining




#### $setDatabaseJson

```js
modelInstance.$setDatabaseJson(json);
```

Sets the values from a JSON object in database format.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object in database format

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|`this` for chaining




#### $set

```js
modelInstance.$set(json);
```

Sets the values from another model or object.

Unlike [`$setJson`](#_s_setjson), this doesn't call any [`$parseJson`](#_s_parsejson) methods or validate the input.
This simply sets each value in the object to this object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
obj|Object|

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|`this` for chaining




#### $omit

```js
modelInstance.$omit(keys);
```

> Omits a set of properties.

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$omit('lastName')
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$omit(['lastName'])
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$omit({lastName: true})
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

Omits a set of properties.

The selected properties are set to `undefined`. Note that this is done in-place.
Properties are set to undefined instead of deleting them for performance reasons
(V8 doesn't like delete).

If you want to use `delete` instead of undefining, you can override the
[`omitImpl`](#omitimpl) method.

##### Arguments

Argument|Type|Description
--------|----|-------------------
keys|string&#124;Array.&lt;string&gt;&#124;Object.&lt;string, boolean&gt;|keys to omit

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|`this` for chaining




#### $pick

```js
modelInstance.$pick(keys);
```

> Omits a set of properties.

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$pick('firstName', 'age')
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$pick(['firstName', 'age'])
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
const json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$pick({firstName: true, age: true})
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

Picks a set of properties.

All other properties but the selected ones are set to `undefined`. Note that
this is done in-place. Properties are set to undefined instead of deleting
them for performance reasons (V8 doesn't like delete).

If you want to use `delete` instead of undefining, you can override the
[`omitImpl`](#omitimpl) method.

##### Arguments

Argument|Type|Description
--------|----|-------------------
keys|string&#124;Array.&lt;string&gt;&#124;Object.&lt;string, boolean&gt;|keys to pick

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|`this` for chaining




#### $clone

```js
const clone = modelInstance.$clone;
```

Returns a deep copy of this model.

If this object has instances of [`Model`](#model) as properties (or arrays of them)
they are cloned using their `$clone()` method.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|Deep clone of `this`




#### $query

> Re-fetch the instance from the database:

```js
person.$query().then(person => {
  console.log(person);
});
```

> Insert a new model to database:

```js
Person.fromJson({firstName: 'Jennifer'}).$query().insert().then(jennifer => {
  console.log(jennifer.id);
});
```

> Patch a model:

```js
person.$query().patch({lastName: 'Cooper'}).then(() => {
  console.log('person updated');
});
```

> Delete a model.

```js
person.$query().delete().then(() => {
  console.log('person deleted');
});
```

Creates a query builder for this model instance.

All queries built using the returned builder only affect this instance.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
transaction|object|Optional transaction for the query.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|query builder




#### $relatedQuery

```js
const builder = model.$relatedQuery(relationName);
```

> Fetch all models related to a model through a relation. The fetched models are
> also stored to the owner model's property named after the relation:

```js
jennifer.$relatedQuery('pets').then(pets => {
  console.log('jennifer has', pets.length, 'pets');
  console.log(jennifer.pets === pets); // --> true
});
```

> The related query is just like any other query. All knex methods are available:

```js
jennifer
  .$relatedQuery('pets')
  .select('Animal.*', 'Person.name as ownerName')
  .where('species', '=', 'dog')
  .orWhere('breed', '=', 'cat')
  .innerJoin('Person', 'Person.id', 'Animal.ownerId')
  .orderBy('Animal.name')
  .then(dogsAndCats => {
    // All the dogs and cats have the owner's name "Jennifer"
    // joined as the `ownerName` property.
    console.log(dogsAndCats);
  });
```

> This inserts a new model to the database and binds it to the owner model as defined
> by the relation:

```js
jennifer
  .$relatedQuery('pets')
  .insert({species: 'dog', name: 'Fluffy'})
  .then(waldo => {
    console.log(waldo.id);
  });
```

> To add an existing model to a relation the `relate` method can be used. In this example
> the dog `fluffy` already exists in the database but it isn't related to `jennifer` through
> the `pets` relation. We can make the connection like this:

```js
jennifer
  .$relatedQuery('pets')
  .relate(fluffy.id)
  .then(() => {
    console.log('fluffy is now related to jennifer through pets relation');
  });
```

> The connection can be removed using the `unrelate` method. Again, this doesn't delete the
> related model. Only the connection is removed. For example in the case of ManyToMany relation
> the join table entries are deleted.

```js
jennifer
  .$relatedQuery('pets')
  .unrelate()
  .where('id', fluffy.id)
  .then(() => {
    console.log('jennifer no longer has fluffy as a pet');
  });
```

> Related models can be deleted using the delete method. Note that in the case of ManyToManyRelation
> the join table entries are not deleted. Naturally the delete query can be chained with anyknex*
> methods.

```js
jennifer
  .$relatedQuery('pets')
  .delete()
  .where('species', 'cat')
  .then(() => {
    console.log('jennifer no longer has any cats');
  });
```

> `update` and `patch` can be used to update related models. Only difference between the mentioned
> methods is that `update` validates the input objects using the related model class's full schema
> and `patch` ignores the `required` property of the schema. Use `update` when you want to update
> _all_ properties of a model and `patch` when only a subset should be updated.

```js
jennifer
  .$relatedQuery('pets')
  .update({species: 'dog', name: 'Fluffy the great', vaccinated: false})
  .where('id', fluffy.id)
  .then(updatedFluffy => {
    console.log('fluffy\'s new name is', updatedFluffy.name);
  });

// This query will be rejected assuming that `name` or `species`
// is a required property for an Animal.
jennifer
  .$relatedQuery('pets')
  .update({vaccinated: true})
  .where('species', 'dog');

// This query will succeed.
jennifer
  .$relatedQuery('pets')
  .patch({vaccinated: true})
  .where('species', 'dog')
  .then(() => {
    console.log('jennifer just got all her dogs vaccinated');
  });
```

Use this to build a query that only affects the models related to this instance through a relation.

##### Arguments

Argument|Type|Description
--------|----|-------------------
relationName|string|The name of the relation to query.
transaction|object|Optional transaction for the query.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|A query builder




#### $loadRelated

```js
const builder = modelInstance.$loadRelated(expression, filters);
```

> Examples:

```js
jennifer.$loadRelated('[pets, children.[pets, father]]').then(jennifer => {
  console.log('Jennifer has', jennifer.pets.length, 'pets');
  console.log('Jennifer has', jennifer.children.length, 'children');
  console.log('Jennifer\'s first child has', jennifer.children[0].pets.length, 'pets');
  console.log('Jennifer had her first child with', jennifer.children[0].father.name);
});
```

> Relations can be filtered by giving named filter functions as arguments
> to the relations:

```js
jennifer
  .$loadRelated('children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
    orderByAge: (builder) => {
      builder.orderBy('age');
    },
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  })
  .then(jennifer => {
    console.log(jennifer.children.pets[0]);
  });
```

Loads related models using a [`RelationExpression`](#relationexpression).

##### Arguments

Argument|Type|Description
--------|----|-------------------
expression|string&#124;[`RelationExpression`](#relationexpression)|The relation expression
filters|Object.&lt;string, function([`QueryBuilder`](#querybuilder))&gt;|Optional named filters

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|The created query builder




#### $traverse

Shortcut for [`Model.traverse(filterConstructor, this, callback)`](#traverse-2212).




#### $knex

Shortcut for [`return this.constructor.knex()`](#knex).




#### $transaction

Shortcut for [`return this.constructor.knex()`](#knex).




#### $beforeInsert

```js
class Person extends Model {
  $beforeInsert(queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

Called before a model is inserted into the database.

You can return a promise from this function if you need to do asynchronous stuff. You can
also throw an exception to abort the insert and reject the query. This can be useful if
you need to do insert specific validation.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the insert query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $afterInsert

```js
class Person extends Model {
  $afterInsert(queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

Called after a model has been inserted into the database.

You can return a promise from this function if you need to do asynchronous stuff.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the insert query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $beforeUpdate

```js
class Person extends Model {
  $beforeUpdate(opt, queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

> Note that the the `opt.old` object is only populated for instance queries started with `$query`:

```js
somePerson
  .$query()
  .update(newValues);
```

> For the following query `opt.old` is `undefined` because there is no old object in the javascript
> side. objection.js doesn't fetch the old values even if they existed in the database
> for performance and simplicity reasons.

```js
Person
  .query()
  .update(newValues)
  .where('foo', 'bar');
```

Called before a model is updated.

You can return a promise from this function if you need to do asynchronous stuff. You can
also throw an exception to abort the update and reject the query. This can be useful if
you need to do update specific validation.

This method is also called before a model is patched. Therefore all the model's properties
may not exist. You can check if the update operation is a patch by checking the `opt.patch`
boolean.

`opt.old` object contains the old values while `this` contains the updated values. The old
values are never fetched from the database implicitly. For non-instance queries the `opt.old`
object is `undefined`. See the examples -->.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|ModelOptions|Update options.
queryContext|Object|The context object of the update query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $afterUpdate

```js
class Person extends Model {
  $afterUpdate(opt, queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

> Note that the the `opt.old` object is only populated for instance queries started with `$query`:

```js
somePerson
  .$query()
  .update(newValues);
```

> For the following query `opt.old` is `undefined` because there is no old object in the javascript
> side. objection.js doesn't fetch the old values even if they existed in the database
> for performance and simplicity reasons.

```js
Person
  .query()
  .update(newValues)
  .where('foo', 'bar');
```

Called after a model is updated.

You can return a promise from this function if you need to do asynchronous stuff.

This method is also called after a model is patched. Therefore all the model's properties
may not exist. You can check if the update operation is a patch by checking the `opt.patch`
boolean.

`opt.old` object contains the old values while `this` contains the updated values. The old
values are never fetched from the database implicitly. For non-instance queries the `opt.old`
object is `undefined`. See the examples -->.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|ModelOptions|Update options.
queryContext|Object|The context object of the update query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|



#### $beforeDelete

```js
class Person extends Model {
  $beforeDelete(queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

Called before a model is deleted.

You can return a promise from this function if you need to do asynchronous stuff.

Note that this method is only called for instance deletes started with `$query()` method.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the delete query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $afterDelete

```js
class Person extends Model {
  $afterDelete(queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

Called after a model is deleted.

You can return a promise from this function if you need to do asynchronous stuff.

Note that this method is only called for instance deletes started with `$query()` method.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the delete query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $afterGet

```js
class Person extends Model {
  $afterGet(queryContext) {
    return doPossiblyAsyncStuff();
  }
}
```

Called after a model is fetched.

This method is _not_ called for insert, update or delete operations.

You can return a promise from this function if you need to do asynchronous stuff.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the get query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




## transaction

See the section on [transaction callback](#transaction-callback)

### Methods

#### start

See the section on [transaction object](#transaction-object)




## TransactionObject

See the section on [transaction object](#transaction-object)

### Instance methods

#### commit

Call this method to commit the transaction.

#### rollback

Call this method to rollback the transaction.



## FieldExpression

Field expressions allow one to refer to separate JSONB fields inside columns.

Syntax: `<column reference>[:<json field reference>]`

e.g. `Person.jsonColumnName:details.names[1]` would refer to value `'Second'`
in column `Person.jsonColumnName` which has
`{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.

First part `<column reference>` is compatible with column references used in
knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.

Second part describes a path to an attribute inside the referred column.
It is optional and it always starts with colon which follows directly with
first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or
`Table.jsonArrayColumn:[321]`.

Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference
to json keys / array indexes:

e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly
both of the following objects `[null, [null,null,null, "I was accessed"]]` and
`{ "1": { "3" : "I was accessed" } }`

Caveats when using special characters in keys:

1. `objectColumn.key` This is the most common syntax, good if you are not using dots or square brackets `[]` in your json object key name.
2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
4. Keys containing square brackets and quotes `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]` Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
99. Keys containing dots, square brackets, single quotes and double quotes in one json key is not currently supported



## RelationExpression

> For example an expression `children.[movies.actors.[pets, children], pets]` represents a tree:

```
              children
              (Person)
                 |
         -----------------
         |               |
       movies           pets
      (Movie)         (Animal)
         |
       actors
      (Person)
         |
    -----------
    |         |
   pets    children
 (Animal)  (Person)

```

> The model classes are shown in parenthesis.

> This class rarely needs to be used directly. The relation expression can be given to a bunch
> of functions in objection.js. For example:

```js
Person
  .query()
  .eager('children.[movies.actors.[pets, children], pets]')
  .then(people => {
    // All persons have the given relation tree fetched.
    console.log(people[0].children[0].movies[0].actors[0].pets[0].name);
  });
```

> Relation expressions can have arguments. Arguments are listed in parenthesis after the relation names
> like this:

```js
children(arg1, arg2).[movies.actors(arg3), pets]
```

> In this example `children` relation had arguments `arg1` and `arg2` and `actors` relation had
> the argument `arg3`.

Relation expression is a simple DSL for expressing relation trees.

These are all valid relation expressions:

 * `children`
 * `children.movies`
 * `[children, pets]`
 * `[children.movies, pets]`
 * `[children.[movies, pets], pets]`
 * `[children.[movies.actors.[children, pets], pets], pets]`

There are two tokens that have special meaning: `*` and `^`. `*` means "all relations recursively" and
`^` means "this relation recursively".

For example `children.*` means "relation `children` and all its relations, and all their relations and ...".
The `*` token must be used with caution or you will end up fetching your entire database.

Expression `parent.^` is equivalent to `parent.parent.parent.parent...` up to the point a relation no longer
has results for the `parent` relation. The recursion can be limited to certain depth by giving the depth after
the `^` character. For example `parent.^3` is equal to `parent.parent.parent`.




## Validator

```js
const Validator = require('objection').Validator;
```

> Usage example:

```js
const Validator = require('objection').Validator;

class MyCustomValidator extends Validator {
  validate(args) {
    // The model instance. May be empty at this point.
    const model = args.model;

    // The properties to validate. After validation these values will
    // be merged into `model` by objection.
    const json = args.json;

    // `ModelOptions` object. If your custom validator sets default
    // values, you need to check the `opt.patch` boolean. If it is true
    // we are validating a patch object and the defaults should not be set.
    const opt = args.options;

    // A context object shared between the validation methods. A new
    // object is created for each validation operation. You can store
    // any data here.
    const ctx = args.ctx;

    // Do your validation here and throw any exception if the
    // validation fails.
    doSomeValidationAndThrowIfFails(json);

    // You need to return the (possibly modified) json.
    return json;
  }

  beforeValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.beforeValidate(args);
  }

  afterValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.afterValidate(args);
  }
}

const Model = require('objection').Model;

// Override the `createValidator` method of a `Model` to use the
// custom validator.
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```

Abstract class from which model validators must be inherited. See the
example for explanation. Also check out the [`createValidator`](#createvalidator)
method.




## AjvValidator

```js
const AjvValidator = require('objection').AjvValidator;
```

> Usage example:

```js
const Model = require('objection').Model;
const AjvValidator = require('objection').AjvValidator;

class BaseModel extends Model {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => {
        // Here you can modify the `Ajv` instance.
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }
}
```

The default [Ajv](https://github.com/epoberezkin/ajv) based json schema
validator. You can override the [`createValidator`](#createvalidator)
method of [`Model`](#model) like in the example to modify the validator.




## ValidationError

```js
const ValidationError = require('objection').ValidationError;

throw new ValidationError({ /* see `data` object below */ });
```

Error of this class is thrown if a model validation fails.

Property|Type|Description
--------|----|-----------
statusCode|number|HTTP status code for interop with express error handlers and other libraries that search for status code from errors.
data|Object|Dictionary of errors.

The `data` object should follow this pattern:

```js
{
  key1: [{
    message: '...',
    keyword: 'required',
    params: null
  }, {
    message: '...',
    keyword: '...',
    params: {
      ...
    }
  }, ...],

  key2: [{
    message: '...',
    keyword: 'minLength',
    params: {
      limit: 1,
      ...
    }
  }, ...],

  ...
}
```

For each `key`, a list of errors is given. Each error contains the default `message` (as returned by the validator), an optional `keyword` string to identify the validation rule which didn't pass and a `param` object which optionally contains more details about the context of the validation error.



## ModelOptions

Property|Type|Description
--------|----|-----------
patch|boolean|If true the json is treated as a patch and the `required` field of the json schema is ignored in the validation. This allows us to create models with a subset of required properties for patch operations.
skipValidation|boolean|If true the json schema validation is skipped
old|object|The old values for methods like `$beforeUpdate` and `$beforeValidate`.



## EagerOptions

Property|Type|Description
--------|----|-----------
minimize|boolean|If true the aliases of the joined tables and columns in a join based eager loading are minimized. This is sometimes needed because of identifier length limitations of some database engines. objection throws an exception when a query exceeds the length limit. You need to use this only in those cases.
separator|string|Separator between relations in nested join based eager query. Defaults to `:`. Dot (`.`) cannot be used at the moment because of the way knex parses the identifiers.
aliases|Object.&lt;string, string&gt;|Aliases for relations in a join based eager query. Defaults to an empty object.
