# class Model

> Subclasses of this class represent database tables.

## Overview

#### Model Lifecycle

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
1. `internal`: The data layout of a model instance.
1. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another, converter methods are called:

1. `database` -> [`$parseDatabaseJson`](/TODO/$parseDatabsaeJson) -> `internal`
1. `internal` -> [`$formatDatabaseJson`](/TODO/$formatDatabaseJson) -> `database`
1. `external` -> [`$parseJson`](/TODO/$parseJson) -> `internal`
1. `internal` -> [`$formatJson`](/TODO/$formatJson) -> `external`

So for example when the results of a query are read from the database the data goes through the [`$parseDatabaseJson`](/TODO/$parseDatabaseJson) method. When data is written to database it goes through the [`$formatDatabaseJson`](/TODO/$formatDatabaseJson) method.

Similarly when you give data for a query (for example [`query().insert(req.body))`](/TODO/insert) or create a model explicitly using [`Model.fromJson(obj)`](/TODO/fromjson) the [`$parseJson`](/TODO/$parseJson) method is invoked. When you call [`model.toJSON()`](/TODO/tojson) or [`model.$toJson()`](/TODO/tojson) the [`$formatJson`](/TODO/formatJson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) automatically call the [`toJSON`](/TODO/tojson/) method when you pass the model to methods like `response.json(model)`. You rarely need to call [`toJSON()`](/TODO/tojson) or [`$toJson()`](/TODO/$tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the outside world. See [this recipe](/TODO/map-column-names-to-different-property-names) for an example usage of the lifecycle methods.

All instance methods of models are prefixed with `$` letter so that they won’t overlap with database properties. All properties that start with `$` are also removed from `database` and `external` layouts.

### static tableName

<!-- The first simple example before the description -->
```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }
}
```

Name of the database table for this model.

Each model must set this.

<!-- Rest of the examples after under #### Examples header -->
#### Examples

Using ESNext static properties

```js
class Person extends Model {
  static tableName = 'persons';
}
```

## static relationMappings

## static jsonSchema

<!-- static properties like this -->
## static idColumn

<!-- static methods like this -->
## static query()

<!-- Instance methods like this -->
## $relatedQuery()
