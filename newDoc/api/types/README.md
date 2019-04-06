---
sidebar: auto
---

# Types

This page contains the documentation of all other types and classes than [Model](/api/model/) and [QueryBuilder](/api/query-builder/). There are two types of items on this page:

1. `type`: A type is just a POJO (Plain Old Javascript Object) with a set of properties.
2. `class`: A class is a javascript class with properties and methods.

## `type` RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation`, `Model.ManyToManyRelation` and `Model.HasOneThroughRelation`.
modelClass|[Model](/api/model/)<br>string|Constructor of the related model class, an absolute path to a module that exports one or a path relative to [modelPaths](/api/model/static-properties.html#static-modelpaths) that exports a model class.
join|[RelationJoin](/api/types/#type-relationjoin)|Describes how the models are related to each other. See [RelationJoin](/api/types/#type-relationjoin).
modify|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Optional modifier for the relation query. If specified as a function, it will be called each time before fetching the relation. If specified as a string, named filter with specified name will be applied each time when fetching the relation. If specified as an object, it will be used as an additional query parameter - e. g. passing {name: 'Jenny'} would additionally narrow fetched rows to the ones with the name 'Jenny'.
filter|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Alias for modify.
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted model instance. This function can be async.

## `type` RelationJoin

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the owner table. Must be given with the table name. For example `persons.id`. Composite key can be specified using an array of columns e.g. `['persons.a', 'persons.b']`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the related table. Must be given with the table name. For example `movies.id`. Composite key can be specified using an array of columns e.g. `['movies.a', 'movies.b']`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
through|[RelationThrough](/api/types/#type-relationthrough)|Describes the join table if the models are related through one.

## `type` RelationThrough

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `from` property of the `RelationJoin`. For example `Person_movies.actorId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `to` property of the `RelationJoin`. For example `Person_movies.movieId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
modelClass|string<br>ModelClass|If you have a model class for the join table, you should specify it here. This is optional so you don't need to create a model class if you don't want to.
extra|string[]<br>Object|Join table columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert. The values can be aliased by providing an object `{propertyName: 'columnName', otherPropertyName: 'otherColumnName'} instead of array`
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted join table model instance. This function can be async.

## `type` ModelOptions

Property|Type|Description
--------|----|-----------
patch|boolean|If true the json is treated as a patch and the `required` field of the json schema is ignored in the validation. This allows us to create models with a subset of required properties for patch operations.
skipValidation|boolean|If true the json schema validation is skipped
old|object|The old values for methods like `$beforeUpdate` and `$beforeValidate`.

## `type` CloneOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored

## `type` ToJsonOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored. Default is false.
virtuals|boolean<br>string[]|If false, virtual attributes are omitted from the output. Default is true. You can also pass an array of property names and only those virtual properties get picked. You can even pass in property/function names that are not included in the static `virtualAttributes` array.

## `type` EagerOptions

Property|Type|Description
--------|----|-----------
minimize|boolean|If true the aliases of the joined tables and columns in a join based eager loading are minimized. This is sometimes needed because of identifier length limitations of some database engines. objection throws an exception when a query exceeds the length limit. You need to use this only in those cases.
separator|string|Separator between relations in nested join based eager query. Defaults to `:`. Dot (`.`) cannot be used at the moment because of the way knex parses the identifiers.
aliases|Object|Aliases for relations in a join based eager query. Defaults to an empty object.
joinOperation|string|Which join type to use `['leftJoin', 'innerJoin', 'rightJoin', ...]` or any other knex join method name. Defaults to `leftJoin`.

## `type` UpsertGraphOptions

Property|Type|Description
--------|----|-----------
relate|boolean<br>string[]|If true, relations are related instead of inserted. Relate functionality can be enabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
unrelate|boolean<br>string[]|If true, relations are unrelated instead of deleted. Unrelate functionality can be enabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
insertMissing|boolean<br>string[]|If true, models that have identifiers _and_ are not found, are inserted. By default this is false and an error is thrown. This functionality can be enabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
update|boolean<br>string[]|If true, update operations are performed instead of patch when altering existing models, affecting the way the data is validated. With update operations, all required fields need to be present in the data provided. This functionality can be enabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
noInsert|boolean<br>string[]|If true, no inserts are performed. Inserts can be disabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
noUpdate|boolean<br>string[]|If true, no updates are performed. Updates can be disabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
noDelete|boolean<br>string[]|If true, no deletes are performed. Deletes can be disabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
noRelate|boolean<br>string[]|If true, no relates are performed. Relate operations can be disabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).
noUnrelate|boolean<br>string[]|If true, no unrelate operations are performed. Unrelate operations can be disabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-upserts).

## `type` InsertGraphOptions

Property|Type|Description
--------|----|-----------
relate|boolean<br>string[]|If true, models with an `id` are related instead of inserted. Relate functionality can be enabled for a subset of relations of the graph by providing a list of relation expressions. See the examples [here](/guide/query-examples.html#graph-inserts).

## `type` TableMetadataFetchOptions

Property|Type|Description
--------|----|-----------
table|string|A custom table name. If not given, Model.tableName is used.
knex|knex<br>Transaction|A knex instance or a transaction

## `type` TableMetadataOptions

Property|Type|Description
--------|----|-----------
table|string|A custom table name. If not given, Model.tableName is used.


## `type` TableMetadata

Property|Type|Description
--------|----|-----------
columns|string[]|Names of all the columns in a table.

## `type` FieldExpression

Field expressions are strings that allow you to refer to JSONB fields inside columns.

Syntax: `<column reference>[:<json field reference>]`

e.g. `persons.jsonColumnName:details.names[1]` would refer to value `'Second'` in column `persons.jsonColumnName` which has
`{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.

First part `<column reference>` is compatible with column references used in knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.

Second part describes a path to an attribute inside the referred column. It is optional and it always starts with colon which follows directly with first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or `Table.jsonArrayColumn:[321]`.

Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference to json keys / array indexes:

e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly both of the following objects `[null, [null,null,null, "I was accessed"]]` and `{ "1": { "3" : "I was accessed" } }`

Caveats when using special characters in keys:

1. `objectColumn.key` This is the most common syntax, good if you are not using dots or square brackets `[]` in your json object key name.
2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
4. Keys containing square brackets and quotes `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]` Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
99. Keys containing dots, square brackets, single quotes and double quotes in one json key is not currently supported

There are some special methods that accept `FieldExpression` strings directly, like [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof) but you can use `FieldExpressions` anywhere with [ref](/api/objection/#ref). Here's an example:

```js
const { ref } = require('objection');

await Person.query()
  .select([
    'id',
    ref('persons.jsonColumn:details.name').castText().as('name'),
    ref('persons.jsonColumn:details.age').castInt().as('age')
  ])
  .join(
    'someTable',
    ref('persons.jsonColumn:details.name').castText(),
    '=',
    ref('someTable.name')
  )
  .where('age', '>', ref('someTable.ageLimit'));
```

In the above example, we assume `persons` table has a column named `jsonColumn` of type `jsonb` (only works on postgres).

## `type` RelationExpression

Relation expression is a simple DSL for expressing relation trees.

These strings are all valid relation expressions:

 * `children`
 * `children.movies`
 * `[children, pets]`
 * `[children.movies, pets]`
 * `[children.[movies, pets], pets]`
 * `[children.[movies.actors.[children, pets], pets], pets]`
 * `[children as kids, pets(filterDogs) as dogs]`

There are two tokens that have special meaning: `*` and `^`. `*` means "all relations recursively" and `^` means "this relation recursively".

For example `children.*` means "relation `children` and all its relations, and all their relations and ...".

::: warning
The * token must be used with caution or you will end up fetching your entire database.
:::

Expression `parent.^` is equivalent to `parent.parent.parent.parent...` up to the point a relation no longer has results for the `parent` relation. The recursion can be limited to certain depth by giving the depth after the `^` character. For example `parent.^3` is equal to `parent.parent.parent`.

Relations can be aliased using the `as` keyword.

For example the expression `children.[movies.actors.[pets, children], pets]` represents a tree:

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

The model classes are shown in parenthesis. When given to `eager` method, this expression would fetch all relations as shown in the tree above:

```js
const people = await Person
  .query()
  .eager('children.[movies.actors.[pets, children], pets]');

// All persons have the given relation tree fetched.
console.log(people[0].children[0].movies[0].actors[0].pets[0].name);
```

Relation expressions can have arguments. Arguments are used to refer to modifier functions (either [global](/api/model/static-properties.html#static-modifiers) or [local](/api/query-builder/instance-methods.html#eager)). Arguments are listed in parenthesis after the relation names like this:

```js
Person
  .query()
  .eager(`children(arg1, arg2).[movies.actors(arg3), pets]`)
```

You can spread eager expressions to multiple lines and add whitespace:

```js
Person
  .query()
  .eager(`[
    children.[
      pets,
      movies.actors.[
        pets,
        children
      ]
    ]
  ]`)
```

Eager expressions can be aliased using `as` keyword:

```js
Person
  .query()
  .eager(`[
    children as kids.[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats,

      movies.actors.[
        pets,
        children as kids
      ]
    ]
  ]`)
```

### RelationExpression object notation

In addition to the string expressions, a more verbose object notation can also be used.

The string expression in the comment is equivalent to the object expression below it:

```js
// `children`
{
  children: true
}
```

```js
// `children.movies`
{
  children: {
    movies: true
  }
}
```

```js
// `[children, pets]`
{
  children: true
  pets: true
}
```

```js
// `[children.[movies, pets], pets]`
{
  children: {
    movies: true,
    pets: true
  }
  pets: true
}
```

```js
// `parent.^`
{
  parent: {
    $recursive: true
  }
}
```

```js
// `parent.^5`
{
  parent: {
    $recursive: 5
  }
}
```

```js
// `parent.*`
{
  parent: {
    $allRecursive: true
  }
}
```

```js
// `[children as kids, pets(filterDogs) as dogs]`
{
  kids: {
    $relation: 'children'
  },

  dogs: {
    $relation: 'pets',
    $modify: ['filterDogs']
  }
}
```

## `type` TransactionObject

This is nothing more than a knex transaction object. It can be used as a knex query builder, it can be [passed to objection queries](/guide/transactions.html#passing-around-a-transaction-object) and [models can be bound to it](/guide/transactions.html#binding-models-to-a-transaction)

See the section about [transactions](/guide/transactions.html) for more info and examples.

### Instance Methods

#### commit()

```js
const promise = trx.commit();
```

Call this method to commit the transaction. This only needs to be called if you use `transaction.start()` method.

#### rollback()

```js
const promise = trx.rollback(error);
```

Call this method to rollback the transaction. This only needs to be called if you use `transaction.start()` method. You need to pass the error to the method as the only argument.


## `class` ValidationError

```js
const { ValidationError } = require('objection');

throw new ValidationError({type, message, data});
```

For each `key`, a list of errors is given. Each error contains the default `message` (as returned by the validator), an optional `keyword` string to identify the validation rule which didn't pass and a `param` object which optionally contains more details about the context of the validation error.

If `type` is anything else but `"ModelValidation"`, `data` can be any object that describes the error.

Error of this class is thrown by default if validation of any input fails. By input we mean any data that can come from the outside world, like model instances (or POJOs), relation expressions object graphs etc.

You can replace this error by overriding [Model.createValidationError()](/api/model/static-methods.html#static-createvalidationerror) method.

See the [error handling recipe](/recipes/error-handling.html) for more info.

Property|Type|Description
--------|----|-----------
statusCode|number|HTTP status code for interop with express error handlers and other libraries that search for status code from errors.
type|string|One of "ModelValidation", "RelationExpression", "UnallowedRelation" and "InvalidGraph". This can be any string for your own custom errors. The listed values are used internally by objection.
data|object|The content of this property is documented below for "ModelValidation" errors. For other types, this can be any data.

If `type` is `"ModelValidation"` then `data` object should follow this pattern:

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

## `class` NotFoundError

```js
const { NotFoundError } = require('objection');

throw new NotFoundError(data);
```

Error of this class is thrown by default by [throwIfNotFound()](/api/query-builder/instance-methods.html#throwifnotfound)

You can replace this error by overriding [Model.createNotFoundError()](/api/model/static-methods.html#static-createnotfounderror) method.

See the [error handling recipe](/recipes/error-handling.html) for more info.

## `class` Relation

`Relation` is a parsed and normalized instance of a [RelationMapping](/api/types/#type-relationmapping). `Relation`s can be accessed using the [getRelations](/api/model/static-methods.html#static-getrelations) method.

`Relation` holds a [RelationProperty](/api/types/#class-relationproperty) instance for each property that is used to create the relationship between two tables.

`Relation` is actually a base class for all relation types `BelongsToOneRelation`, `HasManyRelation` etc. You can use `instanceof` to determine the type of the relations (see the example on the right). Note that `HasOneRelation` is a subclass of `HasManyRelation` and `HasOneThroughRelation` is a subclass of `ManyToManyRelation`. Arrange your `instanceof` checks accordingly.

Property|Type|Description
--------|----|-----------
name|string|Name of the relation. For example `pets` or `children`.
ownerModelClass|function|The model class that has defined the relation.
relatedModelClass|function|The model class of the related objects.
ownerProp|[RelationProperty](/api/types/#class-relationproperty)|The relation property in the `ownerModelClass`.
relatedProp|[RelationProperty](/api/types/#class-relationproperty)|The relation property in the `relatedModelClass`.
joinModelClass|function|The model class representing the join table. This class is automatically generated by Objection if none is provided in the `join.through.modelClass` setting of the relation mapping, see [RelationThrough](/api/types/#type-relationthrough).
joinTable|string|The name of the join table (only for `ManyToMany` and `HasOneThrough` relations).
joinTableOwnerProp|[RelationProperty](/api/types/#class-relationproperty)|The join table property pointing to `ownerProp` (only for `ManyToMany` and `HasOneThrough` relations).
joinTableRelatedProp|[RelationProperty](/api/types/#class-relationproperty)|The join table property pointing to `relatedProp` (only for `ManyToMany` and `HasOneThrough` relations).

Note that `Relation` instances are actually instances of the relation classes used in `relationMappings`. For example:

```js
class Person extends Model {
  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'persons.id',
          to: 'animals.ownerId'
        }
      }
    };
  }
}

const relations = Person.getRelations();

console.log(relations.pets instanceof Model.HasManyRelation); // --> true
console.log(relations.pets.name); // --> pets
console.log(relations.pets.ownerProp.cols); // --> ['id']
console.log(relations.pets.relatedProp.cols); // --> ['ownerId']
```

## `class` RelationProperty

Represents a property that is used to create relationship between two tables. A single `RelationProperty` instance can represent
composite key. In addition to a table column, A `RelationProperty` can represent a nested field inside a column (for example a jsonb column).

### Properties

Property|Type|Description
--------|----|-----------
size|number|The number of columns. In case of composite key, this is greater than one.
modelClass|function|The model class that owns the property.
props|string[]|The column names converted to "external" format. For example if `modelClass` defines a snake_case to camelCase conversion, these names are in camelCase. Note that a `RelationProperty` may actually point to a sub-properties of the columns in case they are of json or some other non-scalar type. This array always contains only the converted column names. Use `getProp(obj, idx)` method to get the actual value from an object.
cols|string[]|The column names in the database format. For example if `modelClass` defines a snake_case to camelCase conversion, these names are in snake_case. Note that a `RelationProperty` may actually point to a sub-properties of the columns in case they are of json or some other non-scalar type. This array always contains only the column names.

### Methods

#### getProp()

```js
const value = property.getProp(obj, index);
```

Gets this property's index:th value from an object. For example if the property represents a composite key `[a, b.d.e, c]`
and obj is `{a: 1, b: {d: {e: 2}}, c: 3}` then `getProp(obj, 1)` would return `2`.

#### setProp()

```js
property.setProp(obj, index, value);
```

Sets this property's index:th value in an object. For example if the property represents a composite key `[a, b.d.e, c]`
and obj is `{a: 1, b: {d: {e: 2}}, c: 3}` then `setProp(obj, 1, 'foo')` would mutate `obj` into `{a: 1, b: {d: {e: 'foo'}}, c: 3}`.

#### fullCol()

```js
const col = property.fullCol(builder, index);
```

Returns the property's index:th column name with the correct table reference. Something like `"Table.column"`.
The first argument must be an objection [QueryBuilder](/api/types/#querybuilder) instance.

#### ref()

```js
const ref = property.ref(builder, index);
```

Allows you to do things like this:

```js
const builder = Person.query();
const ref = property.ref(builder, 0);
builder.where(ref, '>', 10);
```

Returns a [ReferenceBuilder](/api/objection/#ref) instance that points to the index:th column.

#### patch()

```js
property.patch(patchObj, index, value);
```

Allows you to do things like this:

```js
const builder = Person.query();
const patch = {};
property.patch(patch, 0, 'foo');
builder.patch(patch);
```

Appends an update operation for the index:th column into `patchObj` object.

## `class` ReferenceBuilder

An instance of this is returned from the [ref](/api/objection/#ref) helper function.

### Instance Methods

#### castText()

Cast reference to sql type `text`.

#### castInt()

Cast reference to sql type `integer`.

#### castBigInt()

Cast reference to sql type `bigint`.

#### castFloat()

Cast reference to sql type `float`.

#### castDecimal()

Cast reference to sql type `decimal`.

#### castReal()

Cast reference to sql type `real`.

#### castBool()

Cast reference to sql type `boolean`.

#### castType()

Give custom type to which referenced value is casted to.

**DEPRECATED:** Use `castTo` instead. `castType` Will be removed in 2.0.

`.castType('mytype') --> CAST(?? as mytype)`

#### castTo()

Give custom type to which referenced value is casted to.

`.castTo('mytype') --> CAST(?? as mytype)`

#### castJson()

In addition to other casts wrap reference to_jsonb() function so that final value
reference will be json type.

#### as()

Gives an alias for the reference `.select(ref('age').as('yougness'))`

## `class` LiteralBuilder

An instance of this is returned from the [lit](/api/objection/#lit) helper function. If an object
is given as a value, it is casted to json by default.

### Instance Methods

#### castText()

Cast to sql type `text`.

#### castInt()

Cast to sql type `integer`.

#### castBigInt()

Cast to sql type `bigint`.

#### castFloat()

Cast to sql type `float`.

#### castDecimal()

Cast to sql type `decimal`.

#### castReal()

Cast to sql type `real`.

#### castBool()

Cast to sql type `boolean`.

#### castType()

Give custom type to which referenced value is casted to.

**DEPRECATED:** Use `castTo` instead. `castType` Will be removed in 2.0.

`.castType('mytype') --> CAST(?? as mytype)`

#### castTo()

Give custom type to which referenced value is casted to.

`.castTo('mytype') --> CAST(?? as mytype)`

#### castJson()

Converts the value to json (jsonb in case of postgresql). The default
cast type for object values.

#### castArray

Converts the value to an array literal.

**DEPRECATED:** Use `asArray` instead. `castArray` Will be removed in 2.0.

#### asArray()

Converts the value to an array literal.

`lit([1, 2, 3]).asArray() --> ARRAY[?, ?, ?]`

Can be used in conjuction with `castTo`.

`lit([1, 2, 3]).asArray().castTo('real[]') -> CAST(ARRAY[?, ?, ?] AS real[])`

#### as()

Gives an alias for the reference `.select(ref('age').as('yougness'))`

## `class` RawBuilder

An instance of this is returned from the [raw](/api/objection/#raw) helper function.

### Instance Methods

#### as()

Gives an alias for the raw expression `.select(raw('concat(foo, bar)').as('fooBar'))`.

You should use this instead of inserting the alias to the SQL to give objection more information about the query. Some edge cases, like using `raw` in `select` inside a `joinEager` modifier won't work unless you use this method.

## `class` Validator

```js
const { Validator } = require('objection');
```

Abstract class from which model validators must be inherited. See the example for explanation. Also check out the [createValidator](/api/model/static-methods.html#static-createvalidator) method.

#### Examples

```js
const { Validator } = require('objection');

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

const { Model } = require('objection');

// Override the `createValidator` method of a `Model` to use the
// custom validator.
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```

## `class` AjvValidator

```js
const { AjvValidator } = require('objection');
```

The default [Ajv](https://github.com/epoberezkin/ajv) based json schema
validator. You can override the [createValidator](/api/model/static-methods.html#static-createvalidator)
method of [Model](/api/model/) like in the example to modify the validator.

#### Examples

```js
const { Model, AjvValidator } = require('objection');

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
