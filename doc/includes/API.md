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



#### extend

```js
QueryBuilder.extend(subclassConstructor);
```

> ES5:

```js
function MyQueryBuilder() {
  QueryBuilder.apply(this, arguments);
}

QueryBuilder.extend(MyQueryBuilder);
```

> ES6:

```js
class MyQueryBuilder extends QueryBuilder {

}
```

Makes the given constructor a subclass of [`QueryBuilder`](#querybuilder).

This method can be used to do ES5 inheritance. If you are using ES6 or newer, you can just use the `class` and `extend`
keywords and you don't need to call this method.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
subclassConstructor|function|The subclass's constructor.




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




### Query building methods



#### findById

```js
var builder = queryBuilder.findById(id);
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
var builder = queryBuilder.insert(modelsOrObjects);
```

```js
Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .then(function (jennifer) {
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
  .then(function (actors) {
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
  .then(function (jennifer) {

  });
```

Creates an insert query.

The inserted objects are validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [`returning('*')`](#returning) to the query to get all properties.
On other databases you can use the [`insertAndFetch`](#insertandfetch) method.

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
var builder = queryBuilder.insertAndFetch(modelsOrObjects);
```

Just like [`insert`](#insert) but also fetches the model afterwards.

Note that on postgresql you can just chain [`returning('*')`](#returning) to the normal insert method
to get the same result without an additional query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&#124;[`Model`](#model)&#124;Array.&lt;Object&gt;&#124;Array.&lt;[`Model`](#model)&gt;|Objects to insert

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### insertWithRelated

```js
var builder = queryBuilder.insertWithRelated(graph);
```

> You can insert any asyclic graph of models like this:

```js
Person
  .query()
  .insertWithRelated({
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
  .insertWithRelated([{
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

> You can refer to the properties of other models in the graph using expressions
> of format `#ref{<id>.<property>}` for example:

```js
Person
  .query()
  .insertWithRelated([{
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




#### update

```js
var builder = queryBuilder.update(modelOrObject);
```

```js
Person
  .query()
  .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .where('id', 134)
  .then(function (numberOfAffectedRows) {
    console.log(numberOfAffectedRows);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
Person
  .query()
  .update({
    firstName: Person.raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age')
  });
```

Creates an update query.

The update object is validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

This method is meant for updating _whole_ objects with all required properties. If you
want to update a subset of properties use the [`patch`](#patch) method.

NOTE: The return value of the query will be the number of affected rows. If you want
the updated row as a result, you may want to use the [`updateAndFetchById`](#updateandfetchbyid) method.

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
var builder = queryBuilder.updateAndFetchById(id, modelOrObject);
```

```js
Person
  .query()
  .updateAndFetchById(134, {firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .then(function (updatedModel) {
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

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|string&#124;number|Identifier of the model to update
modelOrObject|Object&#124;[`Model`](#model)|The update object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### patch

```js
var builder = queryBuilder.patch(modelOrObject);
```

```js
Person
  .query()
  .patch({age: 24})
  .where('id', 134)
  .then(function (numberOfAffectedRows) {
    console.log(numberOfAffectedRows);
  });
```

> You can also give raw expressions and subqueries as values like this:

```js
Person
  .query()
  .patch({
    age: Person.query().avg('age'),
    firstName: Person.raw("'Jenni' || 'fer'")
  });
```

Creates an patch query.

The patch object is validated against the model's [`jsonSchema`](#jsonschema) _but_ the `required` property
of the [`jsonSchema`](#jsonschema) is ignored. This way the properties in the patch object are still validated
but an error isn't thrown if the patch object doesn't contain all required properties.

If validation fails the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: The return value of the query will be the number of affected rows. If you want
the updated row as a result, you may want to use the [`patchAndFetchById`](#patchandfetchbyid) method.

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
var builder = queryBuilder.patchAndFetchById(id, modelOrObject);
```

```js
Person
  .query()
  .patchAndFetchById(134, {age: 24})
  .then(function (updatedModel) {
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

##### Arguments

Argument|Type|Description
--------|----|--------------------
id|string&#124;number|Identifier of the model to update
modelOrObject|Object&#124;[`Model`](#model)|The patch object

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### delete

```js
var builder = queryBuilder.delete();
```

```js
Person
  .query()
  .delete()
  .where('age', '>', 100)
  .then(function (numberOfDeletedRows) {
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
var builder = queryBuilder.deleteById(id);
```

```js
Person
  .query()
  .deleteById(1)
  .then(function (numberOfDeletedRows) {
    console.log('removed', numberOfDeletedRows, 'people');
  });
```

> Composite key:

```js
Person
  .query()
  .deleteById([10, '20', 46])
  .then(function (numberOfDeletedRows) {
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
var builder = queryBuilder.relate(ids);
```

```js
Person
  .query()
  .where('id', 123)
  .first()
  .then(function (person) {
    return person.$relatedQuery('movies').relate(50);
  })
  .then(function () {
    console.log('movie 50 is now related to person 123 through `movies` relation');
  });
```

> Relate multiple (only works with postgres)

```js
person
  .$relatedQuery('movies')
  .relate([50, 60, 70])
  .then(function () {

  });
```

> Composite key

```js
person
  .$relatedQuery('movies')
  .relate({foo: 50, bar: 20, baz: 10})
  .then(function () {

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
  .then(function () {

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
var builder = queryBuilder.unrelate();
```

```js
Person
  .query()
  .where('id', 123)
  .first()
  .then(function (person) {
    return person.$relatedQuery('movies').unrelate().where('id', 50);
  })
  .then(function () {
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

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.joinRelation(relationName, opt);
```

```js
Person
  .query()
  .joinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### innerJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.innerJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .innerJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### outerJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.outerJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .outerJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### leftJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.leftJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .leftJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### leftOuterJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.leftOuterJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .leftOuterJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### rightJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.rightJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .rightJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### rightOuterJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.rightOuterJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .rightOuterJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### fullOuterJoinRelation

Joins a relation. The joined table is aliased with the relation's name. You can change the alias by providing an
object `{alias: 'someAlias'}` as the second argument. Providing `{alias: false}` will use the original table name.

```js
var builder = queryBuilder.fullOuterJoinRelation(relationName, opt);
```

```js
Person
  .query()
  .fullOuterJoinRelation('pets')
  .where('pets.species', 'dog');
```

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation in [`relationMappings`](#relationmappings).
opt|object|Optional options.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.





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
var builder = queryBuilder.whereInComposite(columns, values);
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
var builder = queryBuilder.whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression);
```

```js
Person
  .query()
  .whereJsonEquals('additionalData:myDogs', 'additionalData:dogsAtHome')
  .then(function (people) {
    // oh joy! these people have all their dogs at home!
  });

Person
  .query()
  .whereJsonEquals('additionalData:myDogs[0]', { name: "peter"})
  .then(function (people) {
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
  .then(function (people) {
    // These people have all or some of their dogs at home. Person might have some
    // additional dogs in their custody since myDogs is supreset of dogsAtHome.
  });

Person
  .query()
  .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"})
  .then(function (people) {
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
var builder = queryBuilder.whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression);
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
var builder = queryBuilder.whereJsonIsArray(fieldExpression);
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
var builder = queryBuilder.whereJsonIsObject(fieldExpression);
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
var builder = queryBuilder.whereJsonHasAny(fieldExpression, keys);
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
var builder = queryBuilder.whereJsonHasAll(fieldExpression, keys);
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
var builder = queryBuilder.whereJsonField(fieldExpression, operator, value);
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
var builder = queryBuilder.context(queryContext);
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
    runBefore: function (builder) {},
    runAfter: function (builder) {},
    onBuild: function (builder) {}
  });
```

> For example the `eager` method causes multiple queries to be executed from a single query builder.
> If you wanted to make all of them use the same schema you could write this:

```js
Person
  .query()
  .eager('[movies, children.movies]')
  .context({
    onBuild: function (builder) {
      builder.withSchema('someSchema');
    }
  });
```

Sets/gets the query context.

Some query builder methods create more than one query. The query context is an object that is
shared with all queries started by a query builder. 

The context is also passed to [`$beforeInsert`](#_s_beforeinsert), [`$afterInsert`](#_s_afterinsert),
[`$beforeUpdate`](#_s_beforeupdate) and [`$afterUpdate`](#_s_afterupdate) calls that the query creates.

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




#### reject

```js
var builder = queryBuilder.reject(reason);
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
var builder = queryBuilder.resolve(value);
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
var executable = queryBuilder.isExecutable();
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
var builder = queryBuilder.runBefore(runBefore);
```

```js
var query = Person.query();

query
 .runBefore(function () {
   console.log('hello 1');

   return Promise.delay(10).then(function () {
     console.log('hello 2');
   });
 })
 .runBefore(function () {
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
runBefore|function(, [`QueryBuilder`](#querybuilder))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### onBuild

```js
var builder = queryBuilder.onBuild(onBuild);
```

```js
var query = Person.query();

query
 .onBuild(function (builder) {
   builder.where('id', 1);
 })
 .onBuild(function (builder) {
   builder.orWhere('id', 2);
 });
```

Functions registered with this method are called each time the query is built into an SQL string. This method is ran
after [`runBefore`](#runbefore) methods but before [`runAfter`](#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it. You shouldn't
modify the query in any of the `run` methods.

Unlike the runmethods these must be synchronous. Also you should not register any runmethods
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
var builder = queryBuilder.runAfter(runAfter);
```

```js
var query = Person.query();

query
 .runAfter(function (models, queryBuilder) {
   return models;
 })
 .runAfter(function (models, queryBuilder) {
   models.push(Person.fromJson({firstName: 'Jennifer'}));
 });

query.then(function (models) {
  var jennifer = models[models.length - 1];
});
```

Registers a function to be called when the builder is executed.

These functions are executed as the last thing before any promise handlers
registered using the [`then`](#then) method. Multiple functions can be chained like
[`then`](#then)  methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
runAfter|function(, [`QueryBuilder`](#querybuilder))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### eager

```js
var builder = queryBuilder.eager(relationExpression, filters);
```

```js
// Fetch `children` relation for each result Person and `pets` and `movies`
// relations for all the children.
Person
  .query()
  .eager('children.[pets, movies]')
  .then(function (persons) {
    console.log(persons[0].children[0].pets[0].name);
    console.log(persons[0].children[0].movies[0].id);
  });
```

> Relations can be filtered by giving named filter functions as arguments
> to the relations:

```js
Person
  .query()
  .eager('children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
    orderByAge: function (builder) {
      builder.orderBy('age');
    },
    orderByName: function (builder) {
      builder.orderBy('name');
    },
    onlyDogs: function (builder) {
      builder.where('species', 'dog');
    }
  })
  .then(function (persons) {
    console.log(persons[0].children[0].pets[0].name);
    console.log(persons[0].children[0].movies[0].id);
  });
```

> Filters can also be registered using the [`filterEager`](#filtereager) method:

```js
Person
  .query()
  .eager('children.[pets, movies]')
  .filterEager('children', function (builder) {
    // Order children by age.
    builder.orderBy('age');
  })
  .filterEager('children.[pets, movies]', function (builder) {
    // Only select `pets` and `movies` whose id > 10 for the children.
    builder.where('id', '>', 10);
  })
  .filterEager('children.movies]', function (builder) {
    // Only select 100 first movies for the children.
    builder.limit(100);
  })
  .then(function (persons) {
    console.log(persons[0].children[0].pets[0].name);
    console.log(persons[0].children[0].movies[0].id);
  });
```

> The eager queries are optimized to avoid the N + 1 query problem. Consider this query:

```js
Person
  .query()
  .where('id', 1)
  .eager('children.children')
  .then(function (persons) {
    console.log(persons[0].children.length); // --> 10
    console.log(persons[0].children[9].children.length); // --> 10
  });
```

> The person has 10 children and they all have 10 children. The query above will
> return 100 database rows but will generate only three database queries.

Fetch relations eagerly for the result rows.

See the [eager queries](#eager-queries) section for more examples and [`RelationExpression`](#relationexpression)
for more info on the relation expression language.

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
var builder = queryBuilder.allowEager(relationExpression);
```

```js
Person
  .query()
  .allowEager('[children.pets, movies]')
  .eager(req.query.eager)
  .then(function () {

  });
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




#### filterEager

```js
var builder = queryBuilder.filterEager(pathExpression, filterFunc);
```

Adds a filter to the eager query.

The `pathExpression` is a relation expression that specifies the queries for which the filter is given.

> The following query would filter out the children's pets that
> are <= 10 years old:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .filterEager('children.pets', builder => {
    builder.where('age', '>', 10);
  })
  .then(function () {

  });
```

> The path expression can have multiple targets. The next example sorts both the
> pets and movies of the children by id:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .filterEager('children.[pets, movies]', builder => {
    builder.orderBy('id');
  })
  .then(function () {

  });
```

> This example only selects movies whose name contains the word 'Predator':

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .filterEager('[children.movies, movies]', builder => {
    builder.where('name', 'like', '%Predator%');
  })
  .then(function () {

  });
```

##### Arguments

Argument|Type|Description
--------|----|-------|------------
pathExpression|string&#124;[`RelationExpression`](#relationexpression)|Expression that specifies the queries for which to give the filter.
filterFunc|function([`QueryBuilder`](#querybuilder)|The filter function.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining.




#### allowInsert

```js
var builder = queryBuilder.allowInsert(relationExpression);
```

```js
Person
  .query()
  .allowInsert('[children.pets, movies]')
  .insertWithRelated({
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
  .then(function () {

  });
```

Sets the allowed tree of relations to insert using [`insertWithRelated`](#insertwithrelated) method.

If the model tree given to the [`insertWithRelated`](#insertwithrelated) method isn't a subtree of the
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
var modelClass = queryBuilder.modelClass();
```

Gets the Model subclass this builder is bound to.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|The Model subclass this builder is bound to




#### toString

```js
var sql = queryBuilder.toString();
```

Returns the SQL string. If this query builder executes multiple queries, only the first query's SQL is returned.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build




#### toSql

```js
var sql = queryBuilder.toSql();
```

Returns the SQL string. If this query builder executes multiple queries, only the first query's SQL is returned.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build



#### dumpSql

```js
var builder = queryBuilder.dumpSql(logger);
```

> Handy for debugging:

```js
Person
  .query()
  .where('firstName', 'Jennifer')
  .where('age', 100)
  .dumpSql()
  .then(function () {
    ...
  });
```

Logs the SQL string.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
looger|function(string)|console.log|The logger function to use

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining




#### clone

```js
var clone = queryBuilder.clone();
```

Create a clone of this builder.

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|Clone of the query builder





#### execute

```js
var promise = queryBuilder.execute();
```

Executes the query and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|Promise the will be resolved with the result of the query.




#### then

```js
var promise = queryBuilder.then(successHandler, errorHandler);
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
var promise = queryBuilder.map(mapper);
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
var promise = queryBuilder.catch(errorHandler);
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
var promise = queryBuilder.return(returnValue);
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
var promise = queryBuilder.bind(returnValue);
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
var promise = queryBuilder.asCallback(callback);
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
var promise = queryBuilder.nodeify(callback);
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
var promise = queryBuilder.resultSize();
``` 

```js
var query = Person
  .query()
  .where('age', '>', 20);

Promise.all([
  query.resultSize(),
  query.offset(100).limit(50)
]).spread(function (total, models) {
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
var builder = queryBuilder.page(page, pageSize);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .page(5, 100)
  .then(function (result) {
    console.log(result.results.length); // --> 100
    console.log(result.total); // --> 3341
  });
```

Only returns the given page of results.

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
var builder = queryBuilder.range(start, end);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .range(0, 100)
  .then(function (result) {
    console.log(result.results.length); // --> 101
    console.log(result.total); // --> 3341
  });
```

Only returns the given range of results.

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
var builder = queryBuilder.pluck(propertyName);
```

```js
Person
  .query()
  .where('age', '>', 20)
  .pluck('firstName')
  .then(function (firstNames) {
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
var builder = queryBuilder.first();
```

```js
Person
  .query()
  .first()
  .then(function (firstPerson) {
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
  .traverse(function (model, parentModel, relationName) {
    delete model.id;
  })
  .then(function (persons) {
    console.log(persons[0].id); // --> undefined
    console.log(persons[0].pets[0].id); // --> undefined
  });
```

```js
Person
  .query()
  .eager('pets')
  .traverse(Animal, function (animal, parentModel, relationName) {
    delete animal.id;
  })
  .then(function (persons) {
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
var builder = queryBuilder.pick(modelClass, properties);
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
var builder = queryBuilder.omit(modelClass, properties);
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




#### call

```js
var builder = queryBuilder.call(func);
```

```js
Person
  .query()
  .call(function (builder) {
     if (someCondition) {
       builder.where('something', someValue);
     }
   });
```

Calls the given function immediatelyand passes `this` as an argument.

##### Arguments

Argument|Type|Description
--------|-------|------------
func|function|

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|`this` query builder for chaining





## Model

> Defining a model using ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
module.exports = Person;

// Table name is the only required property.
Person.tableName = 'Person';

// Optional JSON schema. This is not the database schema! 
// Nothing is generated based on this. This is only used 
// for validation. Whenever a model instance is created 
// it is checked against this schema. 
// http://json-schema.org/.
Person.jsonSchema = {
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

// This object defines the relations to other models.
Person.relationMappings = {
  pets: {
    relation: Model.HasManyRelation,
    // The related model. This can be either a Model 
    // subclass constructor or an absolute file path 
    // to a module that exports one. We use the file 
    // path version in this example to prevent require 
    // loops.
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
```

> Defining a model using ES6:

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

> Defining a model using ES7:

```js
class Person extends Model {
  // Table name is the only required property.
  static tableName = 'Person';

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for validation. Whenever a model instance is created
  // it is checked against this schema.
  // http://json-schema.org/.
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

  // This object defines the relations to other models.
  static relationMappings = {
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

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.tableName = 'Person';
```

> ES6:

```js
class Person extends Model {
  static get tableName() {
    return 'Person';
  }
}
```

> ES7:

```js
class Person extends Model {
  static tableName = 'Person';
}
```

Name of the database table for this model.

Each model must set this.



#### jsonSchema

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.jsonSchema = {
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
```

> ES6:

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

> ES7:

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

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.idColumn = 'some_column_name';
```

> ES6:

```js
class Person extends Model {
  static get idColumn() {
    return 'some_column_name';
  }
}
```

> ES7:

```js
class Person extends Model {
  static idColumn = 'some_column_name';
}
```

Name of the primary key column in the database table.

Composite id can be specified by giving an array of column names.

Defaults to 'id'.




#### relationMappings

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.relationMappings = {
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
```

> ES6:

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

> ES7:

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

relationMappings is an object whose keys are relation names and values are [`RelationMappings`](#relationmapping).
The `join` property in addition to the relation type define how the models are related to one 
another. The `from` and `to` properties of the `join` object define the database columns through which the
models are associated. Note that neither of these columns need to be primary keys. They can be any
columns. In the case of ManyToManyRelation also the join table needs to be defined. This is
done using the `through` object.

The `modelClass` passed to the relation mappings is the class of the related model. It can be either
a Model subclass constructor or an absolute path to a module that exports one. Using file paths
is a handy way to prevent require loops.

See [`RelationMapping`](#relationmapping)

##### RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation` and `Model.ManyToManyRelation`.
modelClass|[`Model`](#model)&#124;string|Constructor of the related model class or an absolute path to a module that exports one.
join|[`RelationJoin`](#relationjoin)|Describes how the models are related to each other. See [`RelationJoin`](#relationjoin).
filter|function([`QueryBuilder`](#querybuilder))|Optional filter for the relation. This is called each time the relation is fetched.

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
extra|Array.&lt;string&gt;|Columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert.



#### jsonAttributes

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.jsonAttributes = ['someProp', 'someOtherProp'];
```

> ES6:

```js
class Person extends Model {
  static get jsonAttributes() {
    return ['someProp', 'someOtherProp'];
  }
}
```

> ES7:

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




#### uidProp

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.uidProp = '#id';
```

> ES6:

```js
class Person extends Model {
  static get uidProp() {
    return '#id';
  }
}
```

> ES7:

```js
class Person extends Model {
  static uidProp = '#id';
}
```

Name of the property used to store a temporary non-db identifier for the model.

Defaults to '#id'.
   
    
    
    
#### uidRefProp

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.uidRefProp = '#ref';
```

> ES6:

```js
class Person extends Model {
  static get uidRefProp() {
    return '#ref';
  }
}
```

> ES7:

```js
class Person extends Model {
  static uidRefProp = '#ref';
}
```

Name of the property used to store a reference to a [`uidProp`](#uidprop)

Defaults to '#ref'.
   
    
    
    
#### propRefRegex

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;
```

> ES6:

```js
class Person extends Model {
  static get propRefRegex() {
    return /#ref{([^\.]+)\.([^}]+)}/g;
  }
}
```

> ES7:

```js
class Person extends Model {
  static propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;
}
```

Regular expression for parsing a reference to a property.

Defaults to `/#ref{([^\.]+)\.([^}]+)}/g`.
    
    
   

#### QueryBuilder

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.QueryBuilder = MyCustomQueryBuilder;
```

> ES6:

```js
class Person extends Model {
  static get QueryBuilder() {
    return MyCustomQueryBuilder;
  }
}
```

> ES7:

```js
class Person extends Model {
  static QueryBuilder = MyCustomQueryBuilder;
}
```

[`QueryBuilder`](#querybuilder) subclass to use in [`query`](#query) or [`$query`](#_s_query) methods.

This constructor is used whenever a query builder is created using [`query`](#query) or [`$query`](#_s_query) methods.
You can override this to use your own [`QueryBuilder`](#querybuilder) subclass.
    
[Usage example](#custom-query-builder).
        
   

#### RelatedQueryBuilder

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
Person.RelatedQueryBuilder = MyCustomQueryBuilder;
```

> ES6:

```js
class Person extends Model {
  static get RelatedQueryBuilder() {
    return MyCustomQueryBuilder;
  }
}
```

> ES7:

```js
class Person extends Model {
  static RelatedQueryBuilder = MyCustomQueryBuilder;
}
```

[`QueryBuilder`](#querybuilder) subclass to use in [`$_s_relatedQuery`](#relatedquery) method.

This constructor is used whenever a query builder is created using the [`$relatedQuery`](#_s_relatedquery)  method.
You can override this to use your own [`QueryBuilder`](#querybuilder) subclass.
   
[Usage example](#custom-query-builder).
   
  
   
   
    
### Static methods


#### query

> Read models from the database:

```js
// Get all rows.
Person.query().then(function(allPersons) {
  console.log('there are', allPersons.length, 'persons in the database');
});

// Example of a more complex WHERE clause. This generates:
// SELECTFROM "Person"
// WHERE ("firstName" = 'Jennifer' AND "age" < 30)
// OR ("firstName" = 'Mark' AND "age" > 30)
Person
  .query()
  .where(function (builder) {
    builder
      .where('firstName', 'Jennifer')
      .where('age', '<', 30);
  })
  .orWhere(function (builder) {
    builder
      .where('firstName', 'Mark')
      .where('age', '>', 30);
  })
  .then(function (marksAndJennifers) {
    console.log(marksAndJennifers);
  });

// Get a subset of rows and fetch related models
// for each row.
Person
  .query()
  .where('age', '>', 60)
  .eager('children.children.movies')
  .then(function (oldPeople) {
    console.log('some old person\'s grand child has appeared in',
      oldPeople[0].children[0].children[0].movies.length,
      'movies');
  });
```

> Insert models to the database:

```js
Person.query()
  .insert({firstName: 'Sylvester', lastName: 'Stallone'})
  .then(function (sylvester) {
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
  .then(function (inserted) {
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
  .then(function (updatedJennifer) {
    console.log('Jennifer is now', updatedJennifer.age, 'years old');
  });

// This will throw assuming that `firstName` or `lastName`
// is a required property for a Person.
Person.query().patch({age: 100});

// This will _not_ throw.
Person
  .query()
  .patch({age: 100})
  .then(function () {
    console.log('Everyone is now 100 years old');
  });
```

> Models can be deleted using the delete method. Naturally the delete query can be chained with
> anyknex* methods:

```js
Person
  .query()
  .delete()
  .where('age', '>', 90)
  .then(function () {
    console.log('anyone over 90 is now removed from the database');
  });
```

Creates a query builder for the model's table.

See the [query examples](#query-examples) section for more examples.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|The created query builder




#### knex

> Get:

```js
var knex = Person.knex();
```

> Set:

```js
var knex = require('knex')({
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
var knex1 = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database1.db'
  }
});

var knex2 = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database2.db'
  }
});

SomeModel.knex(null);

var BoundModel1 = SomeModel.bindKnex(knex1);
var BoundModel2 = SomeModel.bindKnex(knex2);

// Throws since the knex instance is null.
SomeModel.query().then();

// Works.
BoundModel1.query().then(function (models) {
 console.log(models[0] instanceof SomeModel); // --> true
 console.log(models[0] instanceof BoundModel1); // --> true
});

// Works.
BoundModel2.query().then(function (models) {
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
var Person = require('./models/Person');
var transaction;

objection.transaction.start(Person).then(function (trx) {
  transaction = trx;
  return Person
    .bindTransaction(transaction)
    .query()
    .insert({firstName: 'Jennifer'});
}).then(function (jennifer) {
  return Person
    .bindTransaction(transaction)
    .query()
    .patch({lastName: 'Lawrence'})
    .where('id', jennifer.id);
}).then(function () {
  return transaction.commit();
}).catch(function () {
  return transaction.rollback();
});
```

Alias for [`bindKnex`](#bindknex).




#### extend

```js
Model.extend(subclassConstructor);
```

> ES5:

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
```

> ES6:

```js
class Person extends Model {

}
```

Makes the given constructor a subclass of [`Model`](#querybuilder).

This method can be used to do ES5 inheritance. If you are using ES6 or newer, you can just use the `class` and `extend`
keywords and you don't need to call this method.

##### Arguments

Argument|Type|Description
--------|----|-------|------------
subclassConstructor|function|The subclass's constructor.



#### fromJson

```js
var person = Person.fromJson(json, opt);
```

Creates a model instance from a JSON object.

The object is checked against [`jsonSchema`](#jsonschema) and an exception is thrown on failure.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object from which to create the model.
opt|ModelOptions|Update options.

##### Return value

Type|Description
----|-----------------------------
[`Model`](#model)|The created model instance




#### fromDatabaseJson

```js
var person = Person.fromDatabaseJson(row);
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



#### omitImpl

```js
Person.omitImp = function (obj, prop) {
  delete obj[prop];
};
```

Omit implementation to use.

The default just sets the property to undefined for performance reasons.
If the slight performance drop is not an issue for you, you can override
this method to delete the property instead.



#### loadRelated

```js
var promise = Person.loadRelated(models, expression, filters);
```

> Examples:

```js
Person.loadRelated([person1, person2], 'children.pets').then(function (persons) {
  var person1 = persons[0];
  var person2 = persons[1];
});
```

> Relations can be filtered by giving named filter functions as arguments to the relations:

```js
Person
  .loadRelated([person1, person2], 'children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
    orderByAge: function (builder) {
      builder.orderBy('age');
    },
    orderByName: function (builder) {
      builder.orderBy('name');
    },
    onlyDogs: function (builder) {
      builder.where('species', 'dog');
    }
  })
  .then(function (persons) {
    console.log(persons[1].children.pets[0]);
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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|




#### traverse

> There are two ways to call this method:

```js
Model.traverse(models, function (model, parentModel, relationName) {
  doSomething(model);
});
```

and

```js
Model.traverse(Person, models, function (person, parentModel, relationName) {
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
Person.prototype.$beforeValidate = function (jsonSchema, json, opt) {
  return jsonSchema;
}
```

This is called before validation.

You can add any additional validation to this method. If validation fails, simply throw an exception and
the query will be rejected. If you modify the `jsonSchema` argument and return it, that one will be used
to validate the model.

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
var row = modelInstance.$toDatabaseJson();
```

Exports this model as a database JSON object.

This method is called internally to convert a model into a database row.

##### Return value

Type|Description
----|-----------------------------
Object|Database row.




#### $toJson

```js
var jsonObj = modelInstance.$toJson();
```

Exports this model as a JSON object.

##### Return value

Type|Description
----|-----------------------------
Object|Model as a JSON object.




#### toJSON

```js
var jsonObj = modelInstance.toJSON();
```

Exports this model as a JSON object.

##### Return value

Type|Description
----|-----------------------------
Object|Model as a JSON object.




#### $afterValidate

```js
Person.prototype.$afterValidate = function (json, opt) {

}
```

This is called after successful validation.

You can do further validation here and throw a [`ValidationError`](#validationerror) if something goes wrong.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object to be validated
opt|[`ModelOptions`](#modeloptions)|Optional options




#### $parseDatabaseJson

```js
Person.prototype.$parseDatabaseJson = function (json) {
  // Remember to call the super class's implementation.
  json = Model.prototype.$parseDatabaseJson.call(this, json);
  return json;
}
```

This is called when a [`Model`](#model) is created from a database JSON object.

Converts the JSON object from the database format to the internal format.

This function must be able to handle any subset of model's properties coming in.
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
Person.prototype.$formatDatabaseJson = function (json) {
  // Remember to call the super class's implementation.
  json = Model.prototype.$formatDatabaseJson.call(this, json);
  return json;
}
```

This is called when a [`Model`](#model) is converted to database format.

Converts the JSON object from the internal format to the database format.

This function must be able to handle any subset of model's properties coming in.
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
Person.prototype.$parseJson = function (json, opt) {
  // Remember to call the super class's implementation.
  json = Model.prototype.$parseJson.call(this, json, opt);
  return json;
}
```

This is called when a [`Model`](#model) is created from a JSON object.

Converts the JSON object from the external format to the internal format.

This function must be able to handle any subset of model's properties coming in.
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
Person.prototype.$formatJson = function (json) {
  // Remember to call the super class's implementation.
  json = Model.prototype.$formatJson.call(this, json);
  return json;
}
```

This is called when a [`Model`](#model) is converted to JSON.

Converts the JSON object from the internal format to the external format.

This function must be able to handle any subset of model's properties coming in.
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
var json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$omit('lastName')
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
var json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$omit(['lastName'])
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
var json = person
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
var json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$pick('firstName', 'age')
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
var json = person
  .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
  .$pick(['firstName', 'age'])
  .toJSON();

console.log(_.has(json, 'lastName')); // --> false
```

```js
var json = person
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
var clone = modelInstance.$clone;
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
person.$query().then(function (person) {
  console.log(person);
});
```

> Insert a new model to database:

```js
Person.fromJson({firstName: 'Jennifer'}).$query().insert().then(function (jennifer) {
  console.log(jennifer.id);
});
```

> Patch a model:

```js
person.$query().patch({lastName: 'Cooper'}).then(function (person) {
  console.log(person.lastName); // --> 'Cooper'.
});
```

> Delete a model.

```js
person.$query().delete().then(function () {
  console.log('person deleted');
});
```

Creates a query builder for this model instance.

All queries built using the returned builder only affect this instance.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|query builder




#### $relatedQuery

```js
var builder = model.$relatedQuery(relationName);
```

> Fetch all models related to a model through a relation. The fetched models are
> also stored to the owner model's property named after the relation:

```js
jennifer.$relatedQuery('pets').then(function (pets) {
  console.log('jennifer has', pets.length, 'pets');
  console.log(jennifer.pets === pets); // --> true
});
```

> The related query is just like any other query. Allknex* methods are available:

```js
jennifer
  .$relatedQuery('pets')
  .select('Animal.*', 'Person.name as ownerName')
  .where('species', '=', 'dog')
  .orWhere('breed', '=', 'cat')
  .innerJoin('Person', 'Person.id', 'Animal.ownerId')
  .orderBy('Animal.name')
  .then(function (dogsAndCats) {
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
  .then(function (waldo) {
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
  .then(function () {
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
  .then(function () {
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
  .then(function () {
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
  .then(function (updatedFluffy) {
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
  .then(function () {
    console.log('jennifer just got all her dogs vaccinated');
  });
```

Use this to build a query that only affects the models related to this instance through a relation.

##### Arguments

Argument|Type|Description
--------|----|-------------------
relationName|string|The name of the relation to query.

##### Return value

Type|Description
----|-----------------------------
[`QueryBuilder`](#querybuilder)|A query builder




#### $loadRelated

```js
var builder = modelInstance.$loadRelated(expression, filters);
```

> Examples:

```js
jennifer.$loadRelated('[pets, children.[pets, father]]').then(function (jennifer) {
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
    orderByAge: function (builder) {
      builder.orderBy('age');
    },
    orderByName: function (builder) {
      builder.orderBy('name');
    },
    onlyDogs: function (builder) {
      builder.where('species', 'dog');
    }
  })
  .then(function (jennifer) {
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
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)|




#### $traverse

Shortcut for [`Model.traverse(filterConstructor, this, callback)`](#traverse-2212).




#### $beforeInsert

```js
Person.prototype.$beforeInsert = function (queryContext) {

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
Person.prototype.$afterInsert = function (queryContext) {

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
Person.prototype.$beforeUpdate = function (opt, queryContext) {

}
```

Called before a model is updated.

You can return a promise from this function if you need to do asynchronous stuff. You can
also throw an exception to abort the update and reject the query. This can be useful if
you need to do update specific validation.

This method is also called before a model is patched. Therefore all the model's properties
may not exist. You can check if the update operation is a patch by checking the `opt.patch`
boolean.

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
Person.prototype.$afterUpdate = function (opt, queryContext) {

}
```

Called after a model is updated.

You can return a promise from this function if you need to do asynchronous stuff.

This method is also called after a model is patched. Therefore all the model's properties
may not exist. You can check if the update operation is a patch by checking the `opt.patch`
boolean.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|ModelOptions|Update options.
queryContext|Object|The context object of the update query. See [`context`](#context).

##### Return value

Type|Description
----|-----------------------------
[`Promise`](http://bluebirdjs.com/docs/getting-started.html)&#124;*|




#### $afterGet

```js
Person.prototype.$afterGet = function (queryContext) {

}
```

> ES6

```js
class Person extends Model {
  $afterGet(queryContext) {

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
  .then(function (persons) {
    // All persons have the given relation tree fetched.
    console.log(persons[0].children[0].movies[0].actors[0].pets[0].name);
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




## ValidationError

```js
throw new ValidationError('any string or object');
```

Error of this class is thrown if a model validation fails.

Property|Type|Description
--------|----|-----------
statusCode|number|HTTP status code for interop with express error handlers and other libraries that search for status code from errors.
data|*|Any data passed to the constructor.




## ModelOptions

Property|Type|Description
--------|----|-----------
patch|boolean|If true the json is treated as a patch and the `required` field of the json schema is ignored in the validation. This allows us to create models with a subset of required properties for patch operations.
skipValidation|boolean|If true the json schema validation is skipped