# Instance Methods

All instance methods start with the character `$` to prevent them from colliding with the database column names.

## $query()

```js
const queryBuilder = person.$query(transactionOrKnex);
```

Creates a query builder for this model instance.

All queries built using the returned builder only affect this instance.

##### Arguments

Argument|Type|Description
--------|----|--------------------
transactionOrKnex|object|Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database for a query. Falsy values are ignored.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|query builder

#### Examples

Re-fetch an item from the database:

```js
// If you need to refresh the same instance you can do this:
const reFetchedPerson = await person.$query();

// Note that `person` did not get modified by the fetch.
person.$set(reFetchedPerson);
```

Insert a new item to database:

```js
const jennifer = await Person
  .fromJson({ firstName: 'Jennifer' })
  .$query()
  .insert();

console.log(jennifer.id);
```

Patch an item:

```js
await person
  .$query()
  .patch({ lastName: 'Cooper' });

console.log('person updated');
```

Delete an item.

```js
await person
  .$query()
  .delete();

console.log('person deleted');
```

## $relatedQuery()

```js
const builder = person.$relatedQuery(relationName, transactionOrKnex);
```

Use this to build a query that only affects the items related to an instance through a relation. By default, any fetched or inserted items are also stored to the owner model’s property named after the relation. See [relatedFindQueryMutates](/api/model/static-properties.html#static-relatedfindquerymutates) or [relatedInsertQueryMutates](/api/model/static-properties.html#static-relatedinsertquerymutates) to change this behaviour.

See the examples below and [here](/guide/query-examples.html#relation-queries).

##### Arguments

Argument|Type|Description
--------|----|-------------------
relationName|string|The name of the relation to query.
transactionOrKnex|object|Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database for a query. Falsy values are ignored.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|A query builder

#### Examples

Fetch all items related to an item through a relation. The fetched items are also stored to the owner item's property named after the relation (by default):

```js
const pets = await jennifer.$relatedQuery('pets');

console.log('jennifer has', pets.length, 'pets');
console.log(jennifer.pets === pets); // --> true
```

The related query is just like any other query. All knex methods are available:

```js
const dogsAndCats = await jennifer
  .$relatedQuery('pets')
  .select('animals.*', 'persons.name as ownerName')
  .where('species', '=', 'dog')
  .orWhere('breed', '=', 'cat')
  .innerJoin('persons', 'persons.id', 'animals.ownerId')
  .orderBy('animals.name');

// All the dogs and cats have the owner's name "Jennifer"
// joined as the `ownerName` property.
console.log(dogsAndCats);
```

This inserts a new item to the database and binds it to the owner item as defined by the relation (by default):

```js
const waldo = await jennifer
  .$relatedQuery('pets')
  .insert({species: 'dog', name: 'Fluffy'});

console.log(waldo.id);
```

To attach an existing item to a relation the `relate` method can be used. In this example the dog `fluffy` already exists in the database but it isn't related to `jennifer` through the `pets` relation. We can make the connection like this:

```js
await jennifer
  .$relatedQuery('pets')
  .relate(fluffy.id);

console.log('fluffy is now related to jennifer through pets relation');
```

The connection can be removed using the `unrelate` method. Again, this doesn't delete the related model. Only the connection is removed. For example in the case of ManyToMany relation the join table entries are deleted.

```js
await jennifer
  .$relatedQuery('pets')
  .unrelate()
  .where('id', fluffy.id);

console.log('jennifer no longer has fluffy as a pet');
```

Related items can be deleted using the delete method. Note that in the case of ManyToManyRelation the join table entries are not deleted. You should use `ON DELETE CASCADE` in your database migrations to make the database properly delete the join table rows when either end of the relation is deleted. Naturally the delete query can be chained with any query building methods.

```js
await jennifer
  .$relatedQuery('pets')
  .delete()
  .where('species', 'cat')

console.log('jennifer no longer has any cats');
```

`update` and `patch` can be used to update related models. Only difference between the mentioned methods is that `update` validates the input objects using the related model class's full schema and `patch` ignores the `required` property of the schema. Use `update` when you want to update _all_ properties of a model and `patch` when only a subset should be updated.

```js
const updatedFluffy = await jennifer
  .$relatedQuery('pets')
  .update({species: 'dog', name: 'Fluffy the great', vaccinated: false})
  .where('id', fluffy.id);

console.log('fluffy\'s new name is', updatedFluffy.name);

// This query will be rejected assuming that `name` or `species`
// is a required property for an Animal.
await jennifer
  .$relatedQuery('pets')
  .update({vaccinated: true})
  .where('species', 'dog');

// This query will succeed.
await jennifer
  .$relatedQuery('pets')
  .patch({vaccinated: true})
  .where('species', 'dog');

console.log('jennifer just got all her dogs vaccinated');
```

## $parseDatabaseJson()

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

This is called when a [Model](/api/model/) instance is created from a database JSON object. This method converts the JSON object from the database format to the internal format.

You can override this method to carry out whatever conversions you want for the data when it's fetched from the database, before it's converted into a model instance. See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

There are a couple of requirements for the implementation:

1. This function must be pure. It should't have any side effects because it is called from "unexpected" places (for example to determine if your model somehow transforms column names between db and code).

2. This function must be able to handle any subset of model's properties coming in.You cannot assume that some column is present in the `json` object as it depends on the select statement. There can also be additional columns because of joins, aliases etc. This method must also be prepared for null values in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO in database format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON POJO in internal format

## $formatDatabaseJson()

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

This is called when a [Model](/api/model/) is converted to database format.

You can override this method to carry out whatever conversions you want for the data when it's being sent to the database driver. See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

There are a couple of requirements for the implementation:

1. This function must be pure. It should't have any side effects because it is called from "unexpected" places (for example to determine if your model somehow transforms column names between db and code).

2. This function must be able to handle any subset of model's properties coming in. You cannot assume that some property is present in the `json` object. There can also be additional properties. This method must also be prepared for null values in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO in internal format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON POJO in database format

## $parseJson()

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

This is called when a [Model](/api/model/) is created from a JSON object. Converts the JSON object from the external format to the internal format.

You can override this method to carry out whatever conversions you want for the data when a model instance is being created from external data. See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

There are a couple of requirements for the implementation:

1. This function must be pure. It should't have any side effects because it is called from "unexpected" places (for example to determine if your model somehow transforms column names between db and code).

2. This function must be able to handle any subset of model's properties coming in. You cannot assume that some property is present in the `json` object. There can also be additional properties. This method must also be prepared for null values in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO in external format
opt|[ModelOptions](/api/types/#type-modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Object|The JSON POJO in internal format

## $formatJson()

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

This is called when a [Model](/api/model/) is converted to JSON. Converts the JSON object from the internal format to the external format.

You can override this method to carry out whatever conversions you want for the data when a model instance is being converted into external representation. See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

There are a couple of requirements for the implementation:

1. This function must be pure. It should't have any side effects because it is called from "unexpected" places (for example to determine if your model somehow transforms column names between db and code).

2. This function must be able to handle any subset of model's properties coming in. You cannot assume that some column is present in the `json` object as it depends on the select statement. There can also be additional columns because of joins, aliases etc. This method must also be prepared for null values in _any_ property of the `json` object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO in internal format

##### Return value

Type|Description
----|-----------------------------
Object|The JSON POJO in external format

## $toDatabaseJson()

```js
const row = modelInstance.$toDatabaseJson();
```

Exports this model as a database JSON object.

This method is called internally to convert a model into a database row.

See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

##### Return value

Type|Description
----|-----------------------------
Object|Database row.

## toJSON()

```js
const jsonObj = modelInstance.toJSON(opt);
```

```js
const shallowObj = modelInstance.toJSON({ shallow: true, virtuals: false });
```

```js
const onlySomeVirtuals = modelInstance.toJSON({ virtuals: ['fullName'] });
```

Exports this model as a JSON object.

See [this section](/api/model/overview.html#model-data-lifecycle) for more information.

##### Arguments

Argument|Type|Description
--------|----|--------------------
opt|[ToJsonOptions](/api/types/#type-tojsonoptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Object|Model as a JSON object.

## $toJson()

Alias for [toJSON](/api/model/instance-methods.html#tojson)

#### $loadRelated()

```js
const builder = person.$loadRelated(
  expression,
  filters,
  transactionOrKnex
);
```

Shortcut for [Person.loadRelated(person, expression, filter, transactionOrKnex)](/api/model/static-methods.html#static-loadrelated)

## $traverse()

```js
person.$traverse(filterConstructor, callback)
```

Shortcut for [Model.traverse(filterConstructor, this, callback)](/api/model/static-methods.html#static-traverse).

## $traverseAsync()

```js
person.$traverseAsync(filterConstructor, callback)
```

Shortcut for [Model.traverseAsync(filterConstructor, this, callback)](/api/model/static-methods.html#static-traverseasync).

## $knex()

```js
const knex = person.$knex()
```

Shortcut for [Person.knex()](/api/model/static-methods.html#static-knex).

## $transaction()

```js
const knex = person.$transaction()
```

Shortcut for [Person.knex()](/api/model/static-methods.html#static-knex).

## $id()

```js
console.log(model.$id()); // -> 100
// Sets the id.
model.$id(100);
```

Returns or sets the identifier of a model instance.

The identifier property does not have to be accessed or set using this method.

If the identifier property is known it can be accessed or set just like any other property. You don't need to use this method to set the identifier. This method is mainly helpful when building plugins and other tools on top of objection.

#### Examples

Composite key

```js
console.log(model.$id()); // -> [100, 20, 30]
// Sets the id.
model.$id([100, 20, 30]);
```


## $beforeValidate()

```js
class Person extends Model {
  $beforeValidate(jsonSchema, json, opt) {
    return jsonSchema;
  }
}
```

This is called before validation.

You can add any additional validation to this method. If validation fails, simply throw an exception and the query will be rejected. If you modify the `jsonSchema` argument and return it, that one will be used to validate the model.

`opt.old` object contains the old values while `json` contains the new values if validation is being done for an existing object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
jsonSchema|Object|A deep clone of this class's jsonSchema
json|Object|The JSON object to be validated
opt|[ModelOptions](/api/types/type-modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Object|The modified jsonSchema or the input jsonSchema.

## $afterValidate()

```js
class Person extends Model {
  $afterValidate(json, opt) {

  }
}
```

This is called after successful validation.

You can do further validation here and throw a an error if something goes wrong.

`opt.old` object contains the old values while `json` contains the new values if validation is being done for an existing object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object to be validated
opt|[ModelOptions](/api/types/type-modeloptions)|Optional options

## $validate()

```js
modelInstance.$validate();
```

Validates the model instance.

Calls [$beforeValidate](/api/model/instance-methods.html#beforevalidate) and [$afterValidate](/api/model/instance-methods.html#aftervalidate) methods. This method is called automatically from [fromJson](/api/model/static-methods.html#static-fromjson) and [$setJson](/api/model/instance-methods.html#setjson) methods. This method can also be
called explicitly when needed.

##### Throws

Type|Description
----|-----------------------------
[ValidationError](/api/types/#class-validationerror)|If validation fails.
