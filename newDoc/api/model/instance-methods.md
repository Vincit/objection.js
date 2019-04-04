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

##### Examples

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

##### Examples

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

## $beforeInsert()

```js
class Person extends Model {
  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    await this.doPossiblyAsyncStuff();
  }
}
```

Called before a model is inserted into the database.

You can return a promise from this function if you need to do asynchronous stuff. You can also throw an exception to abort the insert and reject the query. This can be useful if you need to do insert specific validation.

If you start a query from this hook, make sure you specify `queryContext.transaction` as it's connection to make sure the query takes part in the same transaction as the parent query. See the example below.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the insert query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    // This can always be done even if there is no running
    // transaction. In that case `queryContext.transaction`
    // returns the normal knex instance. This makes sure that
    // the query is not executed outside the original query's
    // transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

## $afterInsert()

```js
class Person extends Model {
  async $afterInsert(queryContext) {
    await super.$afterInsert(queryContext);
    await this.doPossiblyAsyncStuff();
  }
}
```

Called after a model has been inserted into the database.

You can return a promise from this function if you need to do asynchronous stuff.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the insert query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $afterInsert(queryContext) {
    await super.$afterInsert(queryContext);
    // This can always be done even if there is no running transaction. In that
    // case `queryContext.transaction` returns the normal knex instance. This
    // makes sure that the query is not executed outside the original query's
    // transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

## $beforeUpdate()

```js
class Person extends Model {
  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    await this.doPossiblyAsyncStuff();
  }
}
```

Called before a model instance is updated.

You can return a promise from this function if you need to do asynchronous stuff. You can also throw an exception to abort the update and reject the query. This can be useful if
you need to do update specific validation.

This method is also called before a model is patched. Therefore all the model's properties may not exist. You can check if the update operation is a patch by checking the `opt.patch` boolean.

Inside the hook, `this` contains the values to be updated. If (and only if) the query is started for an existing model instance using [$query](/api/model/instance-methods.html#query), `opt.old` object contains the old values. The old values are never fetched from the database implicitly. For non-instance queries the `opt.old` object is `undefined`. See the examples.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|[ModelOptions](/api/types/#type-modeloptions)|Update options.
queryContext|Object|The context object of the update query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    // This can always be done even if there is no running transaction.
    // In that case `queryContext.transaction` returns the normal knex
    // instance. This makes sure that the query is not executed outside
    // the original query's transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

Note that the `opt.old` object is only populated for instance queries started with `$query`:

```js
somePerson
  .$query()
  .update(newValues);
```

For the following query `opt.old` is `undefined` because there is no old object in the javascript side. objection.js doesn't fetch the old values even if they existed in the database
for performance and simplicity reasons.

```js
Person
  .query()
  .update(newValues)
  .where('foo', 'bar');
```

## $afterUpdate()

```js
class Person extends Model {
  async $afterUpdate(opt, queryContext) {
    await super.$afterUpdate(opt, queryContext);
    await this.doPossiblyAsyncStuff();
  }
}
```

Called after a model instance is updated.

You can return a promise from this function if you need to do asynchronous stuff.

This method is also called after a model is patched. Therefore all the model's properties may not exist. You can check if the update operation is a patch by checking the `opt.patch` boolean.

Inside the hook, `this` contains the values to be updated. If (and only if) the query is started for an existing model instance using [$query](/api/model/instance-methods.html#query), `opt.old` object contains the old values. The old values are never fetched from the database implicitly. For non-instance queries the `opt.old` object is `undefined`. See the examples.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|[ModelOptions](/api/types/#type-modeloptions)|Update options.
queryContext|Object|The context object of the update query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $afterUpdate(opt, queryContext) {
    await super.$afterUpdate(opt, queryContext);
    // This can always be done even if there is no running transaction.
    // In that case `queryContext.transaction` returns the normal knex
    // instance. This makes sure that the query is not executed
    // outside the original query's transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

Note that the `opt.old` object is only populated for instance queries started with `$query`:

```js
somePerson
  .$query()
  .update(newValues);
```

For the following query `opt.old` is `undefined` because there is no old object in the javascript side. objection.js doesn't fetch the old values even if they existed in the database for performance and simplicity reasons.

```js
Person
  .query()
  .update(newValues)
  .where('foo', 'bar');
```


## $beforeDelete()

```js
class Person extends Model {
  async $beforeDelete(queryContext) {
    await super.$beforeDelete(queryContext);
    await doPossiblyAsyncStuff();
  }
}
```

Called before a model is deleted.

You can return a promise from this function if you need to do asynchronous stuff.

::: warning
This method is only called for instance deletes started with [$query()](/api/model/instance-methods.html#query) method. All hooks are instance methods. For deletes there is no instance for which to call the hook, except when [$query()](/api/model/instance-methods.html#query) is used. Objection doesn't fetch the item just to call the hook for it to ensure predictable performance and prevent a whole class of concurrency bugs.
:::

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the update query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $beforeDelete(queryContext) {
    await super.$beforeDelete(queryContext);
    // This can always be done even if there is no running transaction.
    // In that case `queryContext.transaction` returns the normal knex
    // instance. This makes sure that the query is not executed outside
    // the original query's transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

## $afterDelete()

```js
class Person extends Model {
  async $afterDelete(queryContext) {
    await super.$afterDelete(queryContext);
    await this.doPossiblyAsyncStuff();
  }
}
```

Called after a model is deleted.

You can return a promise from this function if you need to do asynchronous stuff.

::: warning
This method is only called for instance deletes started with [$query()](/api/model/instance-methods.html#query) method. All hooks are instance methods. For deletes there is no instance for which to call the hook, except when [$query()](/api/model/instance-methods.html#query) is used. Objection doesn't fetch the item just to call the hook for it to ensure predictable performance and prevent a whole class of concurrency bugs.
:::

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of the update query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  async $afterDelete(queryContext) {
    await super.$afterDelete(queryContext);
    // This can always be done even if there is no running transaction. In that
    // case `queryContext.transaction` returns the normal knex instance. This
    // makes sure that the query is not executed outside the original query's
    // transaction.
    await SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

## $afterGet()

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
queryContext|Object|The context object of the update query. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
[Promise](http://bluebirdjs.com/docs/getting-started.html)<br>void|Promise or void depending whether your hook is async or not.

##### Examples

The current query's transaction/knex instance can always be accessed through `queryContext.transaction`.

```js
class Person extends Model {
  $afterGet(queryContext) {
    // This can always be done even if there is no running transaction.
    // In that case `queryContext.transaction` returns the normal knex
    // instance. This makes sure that the query is not executed outside
    // the original query's transaction.
    return SomeModel
      .query(queryContext.transaction)
      .insert(whatever);
  }
}
```

## $clone()

```js
const clone = modelInstance.$clone(options);
```

Returns a (deep) copy of a model instance.

If the item to be cloned has instances of [Model](/api/model/) as properties (or arrays of them) they are cloned using their `$clone()` method. A shallow copy without relations can be created by passing the `shallow: true` option.

##### Arguments

Argument|Type|Description
--------|----|--------------------
opt|[CloneOptions](/api/types/#type-cloneoptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|Deep clone of `this`

##### Examples

```js
const shallowClone = modelInstance.$clone({ shallow: true });
```

## toJSON()

```js
const jsonObj = modelInstance.toJSON(opt);
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

##### Examples

```js
const shallowObj = modelInstance.toJSON({ shallow: true, virtuals: false });
```

```js
const onlySomeVirtuals = modelInstance.toJSON({ virtuals: ['fullName'] });
```

## $toJson()

Alias for [toJSON](/api/model/instance-methods.html#tojson)

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

## $setJson()

```js
modelInstance.$setJson(json, opt);
```

Sets the values from a JSON object.

Validates the JSON before setting values.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO to set
opt|[ModelOptions](/api/types/#type-modeloptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

## $setDatabaseJson()

```js
modelInstance.$setDatabaseJson(json);
```

Sets the values from a JSON object in database format.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON POJO in database format

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

## $set()

```js
modelInstance.$set(json);
```

Sets the values from another model instance or object.

Unlike [$setJson](/api/model/instance-methods.html#setjson), this doesn't call any [$parseJson](/api/model/instance-methods.html#parsejson) hooks or validate the input. This simply sets each value in the object to this object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
obj|Object|The values to set

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

## $setRelated()

```js
modelInstance.$setRelated(relation, relatedModels);
```

Sets related models to a corresponding property in the object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
relation|string&#124;[Relation](/api/types/#class-relation)|Relation name or a relation instance to set.
relatedModels|[Model](/api/model/)&#124;[Model](/api/model/)[]|Models to set.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

##### Examples

```js
person.$setRelated('parent', parent);
console.log(person.parent);
```

```js
person.$setRelated('children', children);
console.log(person.children[0]);
```

## $appendRelated()

```js
modelInstance.$appendRelated(relation, relatedModels);
```

Appends related models to a corresponding property in the object.

##### Arguments

Argument|Type|Description
--------|----|-------------------
relation|string&#124;[Relation](/api/types/#class-relation)|Relation name or a relation instance to append to.
relatedModels|[Model](/api/model/)&#124;[Model](/api/model/)[]|Models to append.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

##### Examples

```js
person.$appendRelated('parent', parent);
console.log(person.parent);
```

```js
person.$appendRelated('children', child1);
person.$appendRelated('children', child2);

child1 = person.children[person.children.length - 1];
child2 = person.children[person.children.length - 2];
```

## $loadRelated()

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

##### Examples

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

## $omit()

```js
modelInstance.$omit(keys);
```

Omits a set of properties.

##### Arguments

Argument|Type|Description
--------|----|-------------------
keys|string<br>string[]<br>Object&lt;string,&nbsp;boolean&gt;|keys to omit

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

##### Examples

Omits a set of properties.

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

## $pick()

```js
modelInstance.$pick(keys);
```

Picks a set of properties.

##### Arguments

Argument|Type|Description
--------|----|-------------------
keys|string<br>string[]<br>Object&lt;string,&nbsp;boolean&gt;|keys to pick

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|`this` for chaining

##### Examples

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
