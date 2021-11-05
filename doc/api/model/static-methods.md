# Static Methods

## `static` query()

```js
const queryBuilder = Person.query(transactionOrKnex);
```

Creates a query builder for the model's table.

All query builders are created using this function, including `$query`, `relatedQuery` and `$relatedQuery`. That means you can modify each query by overriding this method for your model class.

See the [query examples](/guide/query-examples.html) section for more examples.

#### Arguments

| Argument          | Type   | Description                                                                                                                                                         |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| transactionOrKnex | object | Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database. for a query. Falsy values are ignored. |

#### Return value

| Type                                | Description               |
| ----------------------------------- | ------------------------- |
| [QueryBuilder](/api/query-builder/) | The created query builder |

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
const marksAndJennifers = await Person.query()
  .where(builder => {
    builder.where('firstName', 'Jennifer').where('age', '<', 30);
  })
  .orWhere(builder => {
    builder.where('firstName', 'Mark').where('age', '>', 30);
  });

console.log(marksAndJennifers);

// Get a subset of rows and fetch related models
// for each row.
const oldPeople = await Person.query()
  .where('age', '>', 60)
  .withGraphFetched('children.children.movies');

console.log(
  "some old person's grand child has appeared in",
  oldPeople[0].children[0].children[0].movies.length,
  'movies'
);
```

Insert models to the database:

```js
const sylvester = await Person.query().insert({
  firstName: 'Sylvester',
  lastName: 'Stallone'
});

console.log(sylvester.fullName());
// --> 'Sylvester Stallone'.

// Batch insert. This only works on Postgresql as it is
// the only database that returns the identifiers of
// _all_ inserted rows. If you need to do batch inserts
// on other databases useknex* directly.
// (See .knexQuery() method).
const inserted = await Person.query().insert([
  { firstName: 'Arnold', lastName: 'Schwarzenegger' },
  { firstName: 'Sylvester', lastName: 'Stallone' }
]);

console.log(inserted[0].fullName()); // --> 'Arnold Schwarzenegger'
```

`update` and `patch` can be used to update models. Only difference between the mentioned methods is that `update` validates the input objects using the model class's full jsonSchema and `patch` ignores the `required` property of the schema. Use `update` when you want to update _all_ properties of a model and `patch` when only a subset should be updated.

```js
const numUpdatedRows = await Person.query()
  .update({ firstName: 'Jennifer', lastName: 'Lawrence', age: 35 })
  .where('id', jennifer.id);

console.log(numUpdatedRows);

// This will throw assuming that `firstName` or `lastName`
// is a required property for a Person.
await Person.query().update({ age: 100 });

// This will _not_ throw.
await Person.query().patch({ age: 100 });

console.log('Everyone is now 100 years old');
```

Models can be deleted using the delete method. Naturally the delete query can be chained with any knex\* methods:

```js
await Person.query()
  .delete()
  .where('age', '>', 90);

console.log('anyone over 90 is now removed from the database');
```

## `static` relatedQuery()

```js
const queryBuilder = Person.relatedQuery(relationName, transactionOrKnex);
```

Creates a query builder that can be used to query a relation of an item (or items).

This method is best explained through examples. See the examples below and the following sections:

- [relation queries](/guide/query-examples.html#relation-queries)
- [relation subqueries recipe](/recipes/relation-subqueries.html)

##### Arguments

| Argument          | Type   | Description                                                                                                                                                        |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| relationName      | string | The name of the relation to query.                                                                                                                                 |
| transactionOrKnex | object | Optional transaction or knex instance for the query. This can be used to specify a transaction or even a different database for a query. Falsy values are ignored. |

##### Return value

| Type                                | Description               |
| ----------------------------------- | ------------------------- |
| [QueryBuilder](/api/query-builder/) | The created query builder |

##### Examples

This example fetches `pets` for a person with id 1. `pets` is the name of the relation defined in [relationMappings](/api/model/static-properties.html#static-relationmappings).

```js
const personId = 1;
const pets = await Person.relatedQuery('pets').for(personId);
```

```sql
select "animals".* from "animals"
where "animals"."ownerId" = 1
```

Just like to any query, you can chain any methods. The following example only fetches dogs and sorts them by name:

```js
const dogs = await Person.relatedQuery('pets')
  .for(1)
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" = 1
order by "name" asc
```

If you want to fetch dogs of multiple people in one query, you can pass an array of identifiers to the [for](/api/query-builder/other-methods.html#for) method like this:

```js
const dogs = await Person.relatedQuery('pets')
  .for([1, 2])
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" in (1, 2)
order by "name" asc
```

You can even give it a subquery! The following example fetches all dogs of all people named Jennifer.

```js
// Note that there is no `await` here. This query does not get executed.
const jennifers = Person.query().where('name', 'Jennifer');

// This is the only executed query in this example.
const allDogsOfAllJennifers = await Person.relatedQuery('pets')
  .for(jennifers)
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" in (
  select "persons"."id"
  from "persons"
  where "name" = 'Jennifer'
)
order by "name" asc
```

`relatedQuery` also works with `relate` , `unrelate`, `delete` and all other query methods. The following example relates a person with id 100 to a movie with id 200 for the many-to-many relation `movies`:

```js
await Person.relatedQuery('movies')
  .for(100)
  .relate(200);
```

```sql
insert into "persons_movies" ("personId", "movieId") values (100, 200)
```

See more examples [here](/guide/query-examples.html#relation-queries).

`relatedQuery` can also be used as a subquery when `for` is omitted. The next example selects the count of a relation and the maximum value of another one:

```js
const people = await Person.query().select([
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
console.log(people[0].dogCount);
console.log(people[0].mostRecentMovieDate);
```

Find models that have at least one item in a relation:

```js
const peopleThatHavePets = await Person.query().whereExists(
  Person.relatedQuery('pets')
);
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

## `static` transaction()

```js
const result = await Person.transaction(callback);
const result = await Person.transaction(trxOrKnex, callback);
```

Shortcut for `Person.knex().transaction(callback)`.

See the [transaction guide](/guide/transactions.html).

##### Arguments

| Argument  | Type               | Description                                     |
| --------- | ------------------ | ----------------------------------------------- |
| callback  | function           |
| trxOrKnex | knex or Transation | Optional existing transaction or knex instance. |

##### Examples

```js
try {
  const scrappy = await Person.transaction(async trx => {
    const jennifer = await Person.query(trx).insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    const scrappy = await jennifer
      .$relatedQuery('pets', trx)
      .insert({ name: 'Scrappy' });

    return scrappy;
  });

  console.log('Great success! Both Jennifer and Scrappy were inserted');
} catch (err) {
  console.log(
    'Something went wrong. Neither Jennifer nor Scrappy were inserted'
  );
}
```

## `static` startTransaction()

```js
const trx = await Person.startTransaction(trxOrKnex);
```

Shortcut for `objection.transaction.start(Model1.knex())`.

See the [transaction guide](/guide/transactions.html).

##### Arguments

| Argument  | Type               | Description                                     |
| --------- | ------------------ | ----------------------------------------------- |
| trxOrKnex | knex or Transation | Optional existing transaction or knex instance. |

##### Examples

```js
const trx = await Person.startTransaction();

try {
  await Person.query(trx).insert(person1);
  await Person.query(trx).insert(person2);
  await Person.query(trx)
    .patch(person3)
    .where('id', person3.id);
  await trx.commit();
} catch (err) {
  await trx.rollback();
  throw err;
}
```

## `static` beforeFind()

```js
class Person extends Model {
  static beforeFind(args) {}
}
```

A hook that is executed before find queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                   |
| ---- | ----------------------------- |
| any  | The return value is not used. |

## `static` afterFind()

```js
class Person extends Model {
  static afterFind(args) {}
}
```

A hook that is executed after find queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                                                                               |
| ---- | ----------------------------------------------------------------------------------------- |
| any  | If the return value is not `undefined`, it will be used as the return value of the query. |

## `static` beforeUpdate()

```js
class Person extends Model {
  static beforeUpdate(args) {}
}
```

A hook that is executed before update and patch queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                   |
| ---- | ----------------------------- |
| any  | The return value is not used. |

## `static` afterUpdate()

```js
class Person extends Model {
  static afterUpdate(args) {}
}
```

A hook that is executed after update and patch queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                                                                               |
| ---- | ----------------------------------------------------------------------------------------- |
| any  | If the return value is not `undefined`, it will be used as the return value of the query. |

## `static` beforeInsert()

```js
class Person extends Model {
  static beforeInsert(args) {}
}
```

A hook that is executed before insert queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                   |
| ---- | ----------------------------- |
| any  | The return value is not used. |

## `static` afterInsert()

```js
class Person extends Model {
  static afterInsert(args) {}
}
```

A hook that is executed after insert queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                                                                               |
| ---- | ----------------------------------------------------------------------------------------- |
| any  | If the return value is not `undefined`, it will be used as the return value of the query. |

## `static` beforeDelete()

```js
class Person extends Model {
  static beforeDelete(args) {}
}
```

A hook that is executed before delete queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                   |
| ---- | ----------------------------- |
| any  | The return value is not used. |

## `static` afterDelete()

```js
class Person extends Model {
  static afterDelete(args) {}
}
```

A hook that is executed after delete queries.

See these sections for more information:

- [static hooks guide](/guide/hooks.html#static-query-hooks)
- [documentation for the arguments](/api/types/#type-statichookarguments)

##### Arguments

| Argument | Type                                                        | Description   |
| -------- | ----------------------------------------------------------- | ------------- |
| args     | [StaticHookArguments](/api/types/#type-statichookarguments) | The arguments |

##### Return value

| Type | Description                                                                               |
| ---- | ----------------------------------------------------------------------------------------- |
| any  | If the return value is not `undefined`, it will be used as the return value of the query. |

## `static` bindKnex()

```js
const BoundPerson = Person.bindKnex(transactionOrKnex);
```

Creates an anonymous model subclass class that is bound to the given knex instance or transaction.

This method can be used to bind a Model subclass to multiple databases for example in a multi-tenant system. See the [multi tenancy recipe](/recipes/multitenancy-using-multiple-databases.html) for more info.

Also check out the [model binding pattern for transactions](/guide/transactions.html#binding-models-to-a-transaction) which internally uses `bindKnex`.

##### Arguments

| Argument          | Type   | Description                                          |
| ----------------- | ------ | ---------------------------------------------------- |
| transactionOrKnex | object | knex instance or a transaction to bind the model to. |

##### Return value

| Type                         | Description                            |
| ---------------------------- | -------------------------------------- |
| Constructor<? extends Model> | The created model subclass constructor |

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

await transaction(Person.knex(), async trx => {
  const TransactingPerson = Person.bindTransaction(trx);

  await TransactingPerson.query().insert({ firstName: 'Jennifer' });

  return TransactingPerson.query()
    .patch({ lastName: 'Lawrence' })
    .where('id', jennifer.id);
});
```

This is 100% equivalent to the example above:

```js
const { transaction } = require('objection');
const Person = require('./models/Person');

await transaction(Person, async TransactingPerson => {
  await TransactingPerson.query().insert({ firstName: 'Jennifer' });

  return TransactingPerson.query()
    .patch({ lastName: 'Lawrence' })
    .where('id', jennifer.id);
});
```

## `static` fromJson()

```js
const person = Person.fromJson(json, opt);
```

Creates a model instance from a POJO (Plain Old Javascript Object).

The object is checked against [jsonSchema](/api/model/static-properties.html#static-jsonschema) if a schema is provided and an exception is thrown on failure.

The `json` object is also passed through the [\$parseJson](/api/model/instance-methods.html#parsejson) hook before the model instance is created. See [this section](/api/model/overview.html#model-data-lifecycle) for more info.

##### Arguments

| Argument | Type                                          | Description                                     |
| -------- | --------------------------------------------- | ----------------------------------------------- |
| json     | Object                                        | The JSON object from which to create the model. |
| opt      | [ModelOptions](/api/types/#type-modeloptions) | Update options.                                 |

##### Return value

| Type                 | Description                |
| -------------------- | -------------------------- |
| [Model](/api/model/) | The created model instance |

##### Examples

Create a model instance:

```js
const jennifer = Person.fromJson({ firstName: 'Jennifer' });
```

Create a model instance skipping validation:

```js
const jennifer = Person.fromJson(
  { firstName: 'Jennifer' },
  { skipValidation: true }
);
```

## `static` fromDatabaseJson()

```js
const person = Person.fromDatabaseJson(row);
```

Creates a model instance from a JSON object send by the database driver.

Unlike [fromJson](/api/model/static-methods.html#static-fromjson), this method doesn't validate the input. The input is expected to be in the database format as explained [here](/api/model/overview.html#model-data-lifecycle).

##### Arguments

| Argument | Type   | Description     |
| -------- | ------ | --------------- |
| row      | Object | A database row. |

##### Return value

| Type                 | Description                |
| -------------------- | -------------------------- |
| [Model](/api/model/) | The created model instance |

## `static` modifierNotFound()

```js
class BaseModel extends Model {
  static modifierNotFound(builder, modifier) {
    const { properties } = this.jsonSchema;
    if (properties && modifier in properties) {
      builder.select(modifier);
    } else {
      super.modifierNotFound(builder, modifier);
    }
  }
}
```

This method is called when an unknown modifier is used somewhere.

By default, the static `modifierNotFound()` hook throws a `ModifierNotFoundError` error. If a model class overrides the hook, it can decide to handle the modifer through the passed `builder` instance, or call the hook's definition in the super class to still throw the error.

##### Arguments

| Argument | Type                                | Description                                       |
| -------- | ----------------------------------- | ------------------------------------------------- |
| builder  | [QueryBuilder](/api/query-builder/) | The query builder on which to apply the modifier. |
| modifier | string                              | The name of the unknown modifier.                 |

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
      onCreateAjv: ajv => {
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
  static createNotFoundError(queryContext, props) {
    return new MyCustomNotFoundError({ ...props, modelClass: this });
  }
}
```

Creates an error thrown by [throwIfNotFound](/api/query-builder/other-methods.html#throwifnotfound) method. You can override this
to throw any error you want.

##### Arguments

| Argument     | Type   | Description                                                                                                               |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| queryContext | Object | The context object of query that produced the empty result. See [context](/api/query-builder/other-methods.html#context). |
| props        | any    | Data passed to the error class constructor.

##### Return value

| Type    | Description                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `Error` | The created error. [NotFoundError](/api/types/#class-notfounderror) by default. |

##### Examples

The default implementation:

```js
class Model {
  static createNotFoundError(queryContext, props) {
    return new this.NotFoundError({ ...props, modelClass: this });
  }
}
```

## `static` createValidationError()

```js
class BaseModel extends Model {
  static createValidationError({ type, message, data }) {
    return new MyCustomValidationError({ type, message, data, modelClass: this });
  }
}
```

Creates an error thrown when validation fails for a model. You can override this to throw any error you want. The errors created by this function don't have to implement any interface or have the same properties as `ValidationError`. Objection only throws errors created by this function an never catches them.

##### Return value

| Type    | Description                                                                         |
| ------- | ----------------------------------------------------------------------------------- |
| `Error` | The created error. [ValidationError](/api/types/#class-validationerror) by default. |

## `static` fetchGraph()

```js
const queryBuilder = Person.fetchGraph(models, expression, options);
```

Load related models for a set of models using a [RelationExpression](/api/types/#type-relationexpression).

##### Arguments

| Argument   | Type                                                                  | Description                                                                                                                                     |
| ---------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| models     | Array&lt;[Model](/api/model/)&#124;Object&gt;                         | Model instances for which to fetch the relations. Can be an array of model instances, array of POJOs, a single model instance or a single POJO. |
| expression | string&#124;[RelationExpression](/api/types/#type-relationexpression) | The relation expression                                                                                                                         |
| options    | [FetchGraphOptions](/api/types/#type-fetchgraphoptions)               | Optional options.                                                                                                                               |

##### Return value

| Type                                | Description               |
| ----------------------------------- | ------------------------- |
| [QueryBuilder](/api/query-builder/) | The created query builder |

##### Examples

```js
const people = await Person.fetchGraph([person1, person2], 'children.pets');

const person1 = people[0];
const person2 = people[1];
```

Relations can be filtered by giving modifier functions as arguments for the relations:

```js
const people = await Person.fetchGraph(
  [person1, person2],
  `
    children(orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `
).modifiers({
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

| Argument          | Type                                             | Description                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| filterConstructor | function                                         | If this optional constructor is given, the `traverser` is only called for models for which `model instanceof filterConstructor` returns true.                                                                                               |
| models            | [Model](/api/model/)&#124;[Model](/api/model/)[] | The model(s) whose relation trees to traverse.                                                                                                                                                                                              |
| traverser         | function([Model](/api/model/), string, string)   | The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation. |

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
const persons = await Person.query();

Model.traverseAsync(
  Person,
  persons,
  async (person, parentModel, relationName) => {
    await doSomethingWithPerson(person);
  }
);
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

| Type                                                              | Description                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Object&lt;string,&nbsp;[Relation](/api/types/#class-relation)&gt; | Object whose keys are relation names and values are [Relation](/api/types/#class-relation) instances. |

## `static` columnNameToPropertyName()

```js
const propertyName = Person.columnNameToPropertyName(columnName);
```

Runs the property through possible `columnNameMappers` and `$parseDatabaseJson` hooks to apply any possible conversion for the column name.

##### Arguments

| Argument   | Type   | Description   |
| ---------- | ------ | ------------- |
| columnName | string | A column name |

##### Return value

| Type   | Description       |
| ------ | ----------------- |
| string | The property name |

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

| Argument     | Type   | Description     |
| ------------ | ------ | --------------- |
| propertyName | string | A property name |

##### Return value

| Type   | Description     |
| ------ | --------------- |
| string | The column name |

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

Most of the time objection doesn't need this metadata, but some methods like [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) do. This method is called by objection when the metadata is needed. The result is cached and after the first call the cached promise is returned and no queries are executed.

Because objection uses this on demand, the first query that needs this information can have unpredicable performance. If that's a problem, you can call this method for each of your models during your app's startup.

If you've implemented [tableMetadata](/api/model/static-methods.html#static-tablemetadata) method to return a custom metadata object, this method doesn't execute database queries, but returns `Promise.resolve(this.tableMetadata())` instead.

##### Arguments

| Argument | Type                                                                    | Description      |
| -------- | ----------------------------------------------------------------------- | ---------------- |
| opt      | [TableMetadataFetchOptions](/api/types/#type-tablemetadatafetchoptions) | Optional options |

##### Return value

| Type                                                           | Description               |
| -------------------------------------------------------------- | ------------------------- |
| Promise&lt;[TableMetadata](/api/types/#type-tablemetadata)&gt; | The table metadata object |

## `static` tableMetadata()

```js
const metadata = Person.tableMetadata(opt);
```

Synchronously returns the table metadata object from the cache.

You can override this method to return a custom object if you don't want objection to use
[fetchTableMetadata](/api/model/static-methods.html#static-fetchtablemetadata).

See [fetchTableMetadata](/api/model/static-methods.html#static-fetchtablemetadata) for more information.

##### Arguments

| Argument | Type                                                          | Description      |
| -------- | ------------------------------------------------------------- | ---------------- |
| opt      | [TableMetadataOptions](/api/types/#type-tablemetadataoptions) | Optional options |

##### Return value

| Type                                            | Description               |
| ----------------------------------------------- | ------------------------- |
| [TableMetadata](/api/types/#type-tablemetadata) | The table metadata object |

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

## `static` ref()

Returns a [ReferenceBuilder](/api/types/#class-referencebuilder) instance that is bound to the model class. Any reference created using it will add the correct table name to the reference.

```js
const { ref } = Person;
await Person.query().where(ref('firstName'), 'Jennifer');
```

```sql
select "persons".* from "persons" where "persons"."firstName" = 'Jennifer'
```

`ref` uses the correct table name even when an alias has been given to the table.

```js
const { ref } = Person;
await Person.query()
  .alias('p')
  .where(ref('firstName'), 'Jennifer');
```

```sql
select "p".* from "persons" as "p" where "p"."firstName" = 'Jennifer'
```

Note that the following two ways to use `Model.ref` are completely equivalent:

```js
const { ref } = Person;
await Person.query().where(ref('firstName'), 'Jennifer');
```

```js
await Person.query().where(Person.ref('firstName'), 'Jennifer');
```

## `static` fn()

Shortcut for `Person.knex().fn`

## `static` knexQuery()

Shortcut for `Person.knex().table(Person.tableName)`
