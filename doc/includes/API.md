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

Creates an insert query.

The inserted objects are validated against the model's [`jsonSchema`](#jsonschema). If validation fails
the Promise is rejected with a [`ValidationError`](#validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [`returning('')`](#returning) to the query to get all properties.
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

Note that on postgresql you can just chain [`returning('')`](#returning) to the normal insert method
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

Relates an existing model to another model.

This method doesn't create a new instance but only updates the foreign keys and in
the case of ManyToMany relation, creates a join row to the join table.

On Postgres multiple models can be related by giving an array of identifiers.

##### Arguments

Argument|Type|Description
--------|----|--------------------
ids|Array|Identifier(s) of the model(s) to relate

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




#### whereRef

```js
var builder = whereRef.whereRef(leftRef, operator, rightRef);
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
var builder = whereRef.orWhereRef(leftRef, operator, rightRef);
```

```js
builder.orWhereRef('Person.id', '=', 'Animal.ownerId');
```

Compares a column reference to another

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

The context is also passed to [`$beforeInsert`](#beforeinsert), [`$afterInsert`](#afterinsert), 
[`$beforeUpdate`](#beforeupdate) and [`$afterUpdate`](#afterupdate) calls that the query creates.

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

See the [eager queries](#eager-queries) section for more examples.

See the `hooks` of [`context`](#context) method for an alternative way to filter the relations.

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

> Creating models using ES5:

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
    relation: Model.OneToManyRelation,
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
        from: 'Person_Movie.personId',
        to: 'Person_Movie.movieId'
      },
      to: 'Movie.id'
    }
  },

  children: {
    relation: Model.OneToManyRelation,
    modelClass: Person,
    join: {
      from: 'Person.id',
      to: 'Person.parentId'
    }
  }
};
```

> Creating models using ES6:

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
        relation: Model.OneToManyRelation,
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
            from: 'Person_Movie.personId',
            to: 'Person_Movie.movieId'
          },
          to: 'Movie.id'
        }
      },

      children: {
        relation: Model.OneToManyRelation,
        modelClass: Person,
        join: {
          from: 'Person.id',
          to: 'Person.parentId'
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

1. `database` -> [`$parseDatabaseJson`](#parsedatabasejson) -> `internal`
2. `internal` -> [`$formatDatabaseJson`](#formatdatabasejson) -> `database`
3. `external` -> [`$parseJson`](#parsejson) -> `internal`
4. `internal` -> [`$formatJson`](#formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the 
[`$parseDatabaseJson`](#parsedatabasejson) method. When data is written to database it goes through
the [`$formatDatabaseJson`](#formatdatabasejson) method. 

Similarly when you give data for a query (for example [`query().insert(req.body)`](#insert)) or create a model 
explicitly using [`Model.fromJson(obj)`](#fromjson) the [`$parseJson`](#parsejson) method is invoked. When you call 
[`model.toJSON()`](#tojson) or [`model.$toJson()`](#tojson) the [`$formatJson`](#formatjson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) automatically call the [`toJSON`](#tojson)
method when you pass the model to methods like `response.json(model)`. You rarely need to call
[`toJSON()`](#tojson)  or [`$toJson()`](#tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the
outside world. See [this recipe](#map-column-names-to-different-property-names) for an example usage of the lifecycle 
methods.
    
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

The jsonSchema can be dynamically modified in the `$beforeValidate` method.

Must follow http://json-schema.org specification. If null no validation is done.

Read more:

* [`$beforeValidate`](#beforevalidate)
* [`$validate`](#validate)
* [`$afterValidate`](#aftervalidate)
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
    relation: Model.OneToManyRelation,
    modelClass: Animal,
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
    }
  },

  father: {
    relation: Model.OneToOneRelation,
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
        relation: Model.OneToManyRelation,
        modelClass: Animal,
        join: {
          from: 'Person.id',
          to: 'Animal.ownerId'
        }
      },
    
      father: {
        relation: Model.OneToOneRelation,
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
      relation: Model.OneToManyRelation,
      modelClass: Animal,
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    },
  
    father: {
      relation: Model.OneToOneRelation,
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
relation|function|The relation type. One of [`Model.OneToOneRelation`](#onetoonerelation), [`Model.OneToManyRelation`](#onetomanyrelation) and [`Model.ManyToManyRelation`](#manytomanyrelation).
modelClass|[`Model`](#model)&#124;string|Constructor of the related model class or an absolute path to a module that exports one.
join|[`RelationJoin`](#relationjoin)|Describes how the models are related to each other. See [`RelationJoin`](#relationjoin).
filter|function([`QueryBuilder`](#querybuilder))|Optional filter for the relation. This is called each time the relation is fetched.

##### RelationJoin

Property|Type|Description
--------|----|-----------
from|string|The relation column in the owner table. Must be given with the table name. For example `Person.id`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column.
to|string|The relation column in the related table. Must be given with the table name. For example `Movie.id`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column.
through|[`RelationThrough`](#relationthrough)|Describes the join table if the models are related through one.
    
##### RelationThrough

Property|Type|Description
--------|----|-----------
from|string|The column that is joined to `from` property of the `RelationJoin`. For example `Person_Movie.actorId` where `Person_Movie` is the join table.
to|string|The column that is joined to `to` property of the `RelationJoin`. For example `Person_Movie.movieId` where `Person_Movie` is the join table.




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

[`QueryBuilder`](#querybuilder) subclass to use in [`query()`](#query) or [`$query()`](#query) methods.

This constructor is used whenever a query builder is created using [`query()`](#query) or [`$query()`](#query) methods.
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

[`QueryBuilder`](#querybuilder) subclass to use in [`$relatedQuery`](#relatedquery) method.

This constructor is used whenever a query builder is created using the [`$relatedQuery`](#relatedquery)  method.
You can override this to use your own [`QueryBuilder`](#querybuilder) subclass.
   
[Usage example](#custom-query-builder).
   
  
   
   
    
### Static methods

### Instance methods

#### $beforeInsert

#### $afterInsert

#### query

## transaction

## FieldExpression

Json field expression to refer to jsonb columns or keys / objects inside columns.

e.g. `Person.jsonColumnName:details.names[1]` would refer to column
`Person.jsonColumnName` which has `{ details: { names: ['First', 'Second', 'Last'] } }`
object stored in it.

## RelationExpression

## TransactionObject

## ValidationError