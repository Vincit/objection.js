# Static Methods

## `static` query()

```js
const queryBuilder = Person.query(transactionOrKnex);
```
Creates a query builder for the model's table.

All query builders are created using this function, including `$query`, `$relatedQuery` and `relatedQuery`. That means you can modify each query by overriding this method for your model class.

See the [query examples](/guide/query-examples.html) section for more examples.

#### Arguments

Argument|Type|Description
--------|----|--------------------
transactionOrKnex|object|Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database. for a query. Falsy values are ignored.

#### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|The created query builder

#### Examples

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

## `static` relatedQuery()

```js
const queryBuilder = Person.relatedQuery(relationName);
```

Creates a subquery for a relation.

This query can only be used as a subquery and therefore there is no need to ever pass a transaction or a knex instance to it. It will always inherit its parent query's transaction because it is compiled and executed as a part of the parent query.

See the examples below. There are also more examples in the [Relation Subqueries recipe](/recipes/relation-subqueries.html).

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationName|string|The name of the relation to create subquery for.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|The created query builder

##### Examples

Select count of a relation and the maximum value of another one:

```js
const people = await Person
  .query()
  .select([
    'persons.*',

    Person.relatedQuery('pets')
      .count()
      .where('species', 'dog')
      .as('dogCount'),

    Person.relatedQuery('movies')
      .max('createdAt')
      .as('mostRecentMovieDate')
  ]);

console.log(people[0].id);
console.log(people[0].dogCount)
console.log(people[0].mostRecentMovieDate);
```

Find models that have at least one item in a relation:

```js
const peopleThatHavePets = await Person
  .query()
  .whereExists(Person.relatedQuery('pets'));
```

Generates something like this:

```sql
select "persons".*
from "persons"
where exists (
  select "pets".*
  from "animals" as "pets"
  where "pets"."ownerId" = "persons"."id"
)
```

## `static` knex()

Get/Set the knex instance for a model class.

Subclasses inherit the connection. A system-wide knex instance can thus be set by calling `objection.Model.knex(knex)`. This works even after subclasses have been created.

If you want to use multiple databases, you can instead pass the knex instance to each individual query or use the [bindKnex](/api/model/static-methods.html#static-bindknex) method.

##### Examples

Set a knex instance:

```js
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: 'database.db'
  }
});

Model.knex(knex);
```

Get the knex instance:

```js
const knex = Person.knex();
```

## `static` bindKnex()

```js
const BoundPerson = Person.bindKnex(transactionOrKnex);
```

Creates an anonymous model subclass class that is bound to the given knex instance or transaction.

This method can be used to bind a Model subclass to multiple databases for example in a multi-tenant system. See the [multi tenancy recipe](/recipes/multitenancy-using-multiple-databases.html) for more info.

Also check out the the [model binding pattern for transactions](/guide/transactions.html#binding-models-to-a-transaction) which internally uses `bindKnex`.

##### Arguments

Argument|Type|Description
--------|----|-------------------
transactionOrKnex|object|knex instance or a transaction to bind the model to.

##### Return value

Type|Description
----|-----------------------------
Constructor<? extends Model>|The created model subclass constructor

##### Examples

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
await SomeModel.query();

// Works.
const models = await BoundModel1.query();

console.log(models[0] instanceof SomeModel); // --> true
console.log(models[0] instanceof BoundModel1); // --> true

// Works.
const models = await BoundModel2.query();

console.log(models[0] instanceof SomeModel); // --> true
console.log(models[0] instanceof BoundModel2); // --> true
```

## `static` bindTransaction()

Alias for [bindKnex](/api/model/static-methods.html#static-bindknex).

##### Examples

```js
const { transaction } = require('objection');
const Person = require('./models/Person');

await transaction(Person.knex(), async (trx) => {
  const TransactingPerson =  Person.bindTransaction(trx);

  await TransactingPerson
    .query()
    .insert({firstName: 'Jennifer'});

  return TransactingPerson
    .query()
    .patch({lastName: 'Lawrence'})
    .where('id', jennifer.id);
});
```

This is 100% equivalent to the example above:

```js
const { transaction } = require('objection');
const Person = require('./models/Person');

await transaction(Person, async (TransactingPerson) => {
  await TransactingPerson
    .query()
    .insert({firstName: 'Jennifer'});

  return TransactingPerson
    .query()
    .patch({lastName: 'Lawrence'})
    .where('id', jennifer.id);
});
```

## `static` fromJson()

```js
const person = Person.fromJson(json, opt);
```

Creates a model instance from a POJO (Plain Old Javascript Object).

The object is checked against [jsonSchema](/api/model/static-properties.html#static-jsonschema) if a schema is provided and an exception is thrown on failure.

The `json` object is also passed through the [$parseJson](/api/model/instance-methods.html#parsejson) hook before the model instance is created. See [this section](/api/model/overview.html#model-data-lifecycle) for more info.

##### Arguments

Argument|Type|Description
--------|----|-------------------
json|Object|The JSON object from which to create the model.
opt|[ModelOptions](/api/types/#type-modeloptions)|Update options.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|The created model instance

##### Examples

Create a model instance:

```js
const jennifer = Person.fromJson({ firstName: 'Jennifer' })
```

Create a model instance skipping validation:

```js
const jennifer = Person.fromJson(
  { firstName: 'Jennifer' },
  { skipValidation: true }
)
```

## `static` fromDatabaseJson()

```js
const person = Person.fromDatabaseJson(row);
```

Creates a model instance from a JSON object send by the database driver.

Unlike [fromJson](/api/model/static-methods.html#static-fromjson), this method doesn't validate the input. The input is expected to be in the database format as explained [here](/api/model/overview.html#model-data-lifecycle).

##### Arguments

Argument|Type|Description
--------|----|-------------------
row|Object|A database row.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|The created model instance

## `static` modifierNotFound()

```js
class BaseModel extends Model {
  static modifierNotFound(builder, modifier) {
    const { properties } = this.jsonSchema
    if (properties && modifier in properties) {
      builder.select(modifier)
    } else {
      super.modifierNotFound(builder, modifier)
    }
  }
}
```

Handles modifiers that are not recognized by the various mechanisms that can specify
them, such as [modify](/api/query-builder/instance-methods.html#modify) and [applyModifier](/api/query-builder/instance-methods.html#applyModifier), as well as the use of modifiers in eager expressions (see [RelationExpression](/api/types/#type-relationexpression)) and in relations (see [RelationMapping](/api/types/#type-relationmapping)).

By default, the static `modifierNotFound()` hook throws a `ModifierNotFoundError` error. If a model class overrides the hook, it can decide to handle the modifer through the passed `builder` instance, or call the hook's definition in the super class to still throw the error.

##### Arguments

Argument|Type|Description
--------|----|-------------------
builder|[QueryBuilder](/api/query-builder/)|The query builder on which to apply the modifier.
modifier|string|The name of the unknown modifier.

## `static` createValidator()

```js
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```

Creates an instance of a [Validator](/api/types/#class-validator) that is used to do all validation related stuff. This method is called only once per model class.

You can override this method to return an instance of your custom validator. The custom validator doesn't need to be based on the `jsonSchema`. It can be anything at all as long as it implements the [Validator](/api/types/#class-validator) interface.

If you want to use the default json schema based [AjvValidator](/api/types/#class-ajvvalidator) but want to modify it, you can use the `objection.AjvValidator` constructor. See the default implementation example.

If you want to share the same validator instance between multiple models, that's completely fine too. Simply implement `createValidator` so that it always returns the same object instead of creating a new one.

##### Examples

Sharing the same validator between model classes is also possible:

```js
const validator = new MyCustomValidator();

class BaseModel extends Model {
  static createValidator() {
    return validator;
  }
}
```

The default implementation:

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

## `static` createNotFoundError()

```js
class BaseModel extends Model {
  static createNotFoundError(queryContext) {
    return new MyCustomNotFoundError();
  }
}
```

Creates an error thrown by [throwIfNotFound](/api/query-builder/instance-methods.html#throwifnotfound) method. You can override this
to throw any error you want.

##### Arguments

Argument|Type|Description
--------|----|-------------------
queryContext|Object|The context object of query that produced the empty result. See [context](/api/query-builder/instance-methods.html#context).

##### Return value

Type|Description
----|-----------------------------
`Error`|The created error. [NotFoundError](/api/model/static-properties.html#static-notfounderror) by default.

##### Examples

The default implementation:

```js
class Model {
  static createNotFoundError(queryContext) {
    return new this.NotFoundError();
  }
}
```

## `static` createValidationError()

```js
class BaseModel extends Model {
  static createValidationError({ type, message, data }) {
    return new MyCustomValidationError({ type, message, data });
  }
}
```

Creates an error thrown when validation fails for a model. You can override this to throw any error you want. The errors created by this function don't have to implement any interface or have the same properties as `ValidationError`. Objection only throws errors created by this function an never catches them.

##### Return value

Type|Description
----|-----------------------------
`Error`|The created error. [ValidationError](/api/model/static-properties.html#static-validationerror) by default.

## `static` loadRelated()

```js
const queryBuilder = Person.loadRelated(
  models,
  expression,
  modifiers,
  transactionOrKnex
);
```

Load related models for a set of models using a [RelationExpression](/api/types/#type-relationexpression).

##### Arguments

Argument|Type|Description
--------|----|-------------------
models|Array&lt;[Model](/api/model/)&#124;Object&gt;|Model instances for which to fetch the relations. Can be an array of model instances, array of POJOs, a single model instance or a single POJO.
expression|string&#124;[RelationExpression](/api/types/#type-relationexpression)|The relation expression
modifiers|Object&lt;string,&nbsp;function([QueryBuilder](/api/query-builder/))&gt;|Optional modifiers
transactionOrKnex|object|Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|The created query builder

##### Examples

```js
const people = await Person.loadRelated([person1, person2], 'children.pets');

const person1 = people[0];
const person2 = people[1];
```

Relations can be filtered by giving modifier functions as arguments to the relations:

```js
const people = await Person
  .loadRelated([person1, person2], `
    children(orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `, {
    orderByAge(builder) {
      builder.orderBy('age');
    },

    orderByName(builder) {
      builder.orderBy('name');
    },

    onlyDogs(builder) {
      builder.where('species', 'dog');
    }
  });

console.log(people[1].children.pets[0]);
```

## `static` traverseAsync()

Traverses the relation tree of a model instance (or a list of model instances).

Calls the callback for each related model recursively. The callback is called also for the input models themselves.

In the second example the traverser function is only called for `Person` instances.

##### Arguments

Argument|Type|Description
--------|----|-------------------
filterConstructor|function|If this optional constructor is given, the `traverser` is only called for models for which `model instanceof filterConstructor` returns true.
models|[Model](/api/model/)&#124;[Model](/api/model/)[]|The model(s) whose relation trees to traverse.
traverser|function([Model](/api/model/), string, string)|The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation.

##### Examples

There are two ways to call this method:

```js
const models = await SomeModel.query();

await Model.traverseAsync(models, async (model, parentModel, relationName) => {
  await doSomething(model);
});
```

and

```js
const persons = await Person.query()

Model.traverseAsync(Person, persons, async (person, parentModel, relationName) => {
  await doSomethingWithPerson(person);
});
```

Also works with a single model instance

```js
const person = await Person.query();

await Person.traverseAsync(person, async (model, parentModel, relationName) => {
  await doSomething(model);
});
```

## `static` getRelations()

```js
const relations = Person.getRelations();
```

Returns a [Relation](/api/types/#class-relation) object for each relation defined in [relationMappings](/api/model/static-properties.html#static-relationmappings).

This method is mainly useful for plugin developers and for other generic usages.

##### Return value

Type|Description
----|-----------------------------
Object&lt;string,&nbsp;[Relation](/api/types/#class-relation)&gt;|Object whose keys are relation names and values are [Relation](/api/types/#class-relation) instances.

## `static` columnNameToPropertyName()

```js
const propertyName = Person.columnNameToPropertyName(columnName);
```

Runs the property through possible `columnNameMappers` and `$parseDatabaseJson` hooks to apply any possible conversion for the column name.

##### Arguments

Argument|Type|Description
--------|----|-------------------
columnName|string|A column name

##### Return value

Type|Description
----|-----------------------------
string|The property name

##### Examples

If you have defined `columnNameMappers = snakeCaseMappers()` for your model:

```js
const propName = Person.columnNameToPropertyName('foo_bar');
console.log(propName); // --> 'fooBar'
```

## `static` propertyNameToColumnName()

```js
const columnName = Person.propertyNameToColumnName(propertyName);
```
Runs the property through possible `columnNameMappers` and `$formatDatabaseJson` hooks to apply any possible conversion for the property name.

##### Arguments

Argument|Type|Description
--------|----|-------------------
propertyName|string|A property name

##### Return value

Type|Description
----|-----------------------------
string|The column name

##### Examples

If you have defined `columnNameMappers = snakeCaseMappers()` for your model:

```js
const columnName = Person.propertyNameToColumnName('fooBar');
console.log(columnName); // --> 'foo_bar'
```

## `static` fetchTableMetadata()

```js
const metadata = await Person.fetchTableMetadata(opt);
```

Fetches and caches the table metadata.

Most of the time objection doesn't need this metadata, but some methods like [joinEager](/api/query-builder/instance-methods.html#joineager) do. This method is called by objection when the metadata is needed. The result is cached and after the first call the cached promise is returned and no queries are executed.

Because objection uses this on demand, the first query that needs this information can have unpredicable performance. If that's a problem, you can call this method for each of your models during your app's startup.

If you've implemented [tableMetadata](/api/model/static-methods.html#static-tablemetadata) method to return a custom metadata object, this method doesn't execute database queries, but returns `Promise.resolve(this.tableMetadata())` instead.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|[TableMetadataFetchOptions](/api/types/#type-tablemetadatafetchoptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
Promise&lt;[TableMetadata](/api/types/#type-tablemetadata)&gt;|The table metadata object

## `static` tableMetadata()

```js
const metadata = Person.tableMetadata(opt);
```

Synchronously returns the table metadata object from the cache.

You can override this method to return a custom object if you don't want objection to use
[fetchTableMetadata](/api/model/static-methods.html#static-fetchtablemetadata).

See [fetchTableMetadata](/api/model/static-methods.html#static-fetchtablemetadata) for more information.

##### Arguments

Argument|Type|Description
--------|----|-------------------
opt|[TableMetadataOptions](/api/types/#type-tablemetadataoptions)|Optional options

##### Return value

Type|Description
----|-----------------------------
[TableMetadata](/api/types/#type-tablemetadata)|The table metadata object




##### Examples

A custom override that uses the property information in `jsonSchema`.

```js
class Person extends Model {
  static tableMetadata() {
    return {
      columns: Object.keys(this.jsonSchema.properties)
    };
  }
}
```

## `static` raw()

Shortcut for `Person.knex().raw(...args)`

## `static` fn()

Shortcut for `Person.knex().fn`

## `static` knexQuery()

Shortcut for `Person.knex().table(Person.tableName)`
