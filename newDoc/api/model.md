---
sidebarDepth: 2
---

# `class` Model

Subclasses of this class represent database tables.

## Overview

### Model Lifecycle

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
1. `internal`: The data layout of a model instance.
1. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another, converter methods are called:

1. `database` -> [$parseDatabaseJson](#parseDatabsaeJson) -> `internal`
1. `internal` -> [$formatDatabaseJson](#formatDatabaseJson) -> `database`
1. `external` -> [$parseJson](#parseJson) -> `internal`
1. `internal` -> [$formatJson](#formatJson) -> `external`

So for example when the results of a query are read from the database the data goes through the [$parseDatabaseJson](#parseDatabaseJson) method. When data is written to database it goes through the [$formatDatabaseJson](#formatDatabaseJson) method.

Similarly when you give data for a query (for example [query().insert(req.body)](/api/query-builder.html#insert) or create a model explicitly using [Model.fromJson(obj)](#static-fromjson) the [$parseJson](#parseJson) method is invoked. When you call [model.toJSON()](#tojson) or [model.$toJson()](#tojson) the [$formatJson](#formatJson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) automatically call the [toJSON](#tojson/) method when you pass the model to methods like `response.json(model)`. You rarely need to call [toJSON()](#tojson) or [$toJson()](#tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the outside world.

All instance methods of models are prefixed with `$` letter so that they won’t overlap with database properties. All properties that start with `$` are also removed from `database` and `external` layouts.

## Static properties

### static tableName

<!-- The first simple example before the description -->

::: multi-language example begin
::: multi-language section ES2015 begin

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }
}
```
::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static tableName = 'persons';
}
```
::: multi-language section ESNext end
::: multi-language example end


Name of the database table for this model.

Each model must set this.

<!-- Rest of the examples after under #### Examples header -->
#### Examples

##### Using ESNext static properties

### static jsonSchema

::: multi-language example begin
::: multi-language section ES2015 begin

```js
class Person extends Model {
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: {type: 'integer'},
        name: {type: 'string', minLength: 1, maxLength: 255},
        age: {type: 'number'}, // optional
      }
    };
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static jsonSchema = {
    type: 'object',
    required: ['name'],
    properties: {
      id: {type: 'integer'},
      name: {type: 'string', minLength: 1, maxLength: 255},
      age: {type: 'number'}, // optional
    }
  }
}
```

::: multi-language section ESNext end
::: multi-language example end

The optional schema against which the JSON is validated.

The jsonSchema can be dynamically modified in the [$beforeValidate](#beforevalidate) method.

Must follow [JSON Schema](http://json-schema.org) specification. If null no validation is done.

#### Read more

* [$beforeValidate](#beforevalidate)
* [$validate](#validate)
* [$afterValidate](#aftervalidate)
* [jsonAttributes](#static-jsonattributes)
* [custom validation recipe](/recipes/custom-validation.html)

#### Examples

##### Person

::: multi-language example begin
::: multi-language section ES2015 begin

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
::: multi-language section ES2015 end
::: multi-language section ESNext begin

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

::: multi-language section ESNext end
::: multi-language example end

### static relationMappings

### static idColumn

### static query()

## Instance methods

### $relatedQuery()
