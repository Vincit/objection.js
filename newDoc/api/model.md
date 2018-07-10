---
sidebarDepth: 2
---

# `class` Model

Subclasses of this class represent database tables.

## Overview

### Model data lifecycle

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
2. `internal`: The data layout of a model instance.
3. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another, converter methods are called:

1. `database` -> [$parseDatabaseJson](#parsedatabasejson) -> `internal`
2. `internal` -> [$formatDatabaseJson](#formatdatabasejson) -> `database`
3. `external` -> [$parseJson](#parsejson) -> `internal`
4. `internal` -> [$formatJson](#formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the [$parseDatabaseJson](#parsedatabasejson) method. When data is written to database it goes through the [$formatDatabaseJson](#formatdatabaseJjson) method.

Similarly when you give data for a query (for example [query().insert(req.body)](/api/query-builder.html#insert) or create a model explicitly using [Model.fromJson(obj)](#static-fromjson) the [$parseJson](#parsejson) method is invoked. When you call [model.toJSON()](#tojson) or [model.$toJson()](#tojson) the [$formatJson](#formathson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) automatically call the [toJSON](#tojson) method when you pass the model to methods like `response.json(model)`. You rarely need to call [toJSON()](#tojson) or [$toJson()](#tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the outside world.

All instance methods of models are prefixed with `$` letter so that they won’t overlap with database properties. All properties that start with `$` are also removed from `database` and `external` layouts.

In addition to these data formatting hooks, Model also has query lifecycle hooks

* [$beforeUpdate](#beforeupdate)
* [$afterUpdate](#afterupdate)
* [$beforeInsert](#beforeinsert)
* [$afterInsert](#afterinsert)
* [$beforeDelete](#beforedelete)
* [$afterDelete](#afterdelete)
* [$afterGet](#afterget)

## Static properties

### `static` tableName

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

### `static` jsonSchema

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

### `static` idColumn

::: multi-language example begin
::: multi-language section ES2015 begin

```js
class Person extends Model {
  static get idColumn() {
    return 'some_column_name';
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static idcolumn = 'some_column_name';
}
```

::: multi-language section ESNext end
::: multi-language example end

Name of the primary key column in the database table.

Composite id can be specified by giving an array of column names.

Defaults to 'id'.

### `static` modelPaths

::: multi-language example begin
::: multi-language section ES2015 begin

```js
class Person extends Model {
  static get modelPaths() {
    return [__dirname];
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static modelPaths = [__dirname];
}
```

::: multi-language section ESNext end
::: multi-language example end

A list of paths from which to search for models for relations.

A model class can be defined for a relation in [relationMappings](#relationmappings) as

1. A model class constructor
2. An absolute path to a module that exports a model class
3. A path relative to one of the paths in `modelPaths` array.

You probably don't want to define `modelPaths` property for each model. Once again we
recommend that you create a `BaseModel` super class for all your models and define
shared configuration such as this there.

#### Examples

Using a shared `BaseModel` superclass:

```js
const { Model } = require('objection');

// models/BaseModel.js
class BaseModel extends Model {
  static get modelPaths() {
    return [__dirname];
  }
}

module.exports = {
  BaseModel
};

// models/Person.js
const { BaseModel } = require('./BaseModel');

class Person extends BaseModel {
  ...
}
```

### `static` relationMappings

This property defines the relations to other models.

relationMappings is an object (or a function that returns an object) whose keys are relation names and values are [RelationMapping](/api/types.html#type-relationmapping) instances. The `join` property in addition to the relation type define how the models are related to one another. The `from` and `to` properties of the `join` object define the database columns through which the models are associated. Note that neither of these columns need to be primary keys. They can be any columns. In fact they can even be fields inside JSON columns (using the [ref](/api/objection.html#ref) helper). In the case of ManyToManyRelation also the join table needs to be defined. This is done using the `through` object.

The `modelClass` passed to the relation mappings is the class of the related model. It can be one of the following:

1. A model class constructor
2. An absolute path to a module that exports a model class
3. A path relative to one of the paths in [`modelPaths`](#static-modelpaths) array.

The file path versions are handy for avoiding require loops.

Further reading:
 * [the relation guide](/guide/relations.html)
 * [RelationMapping](/api/types.html#type-relationmapping)

#### Examples

::: multi-language example begin
::: multi-language section ES2015 begin

```js
const { Model, ref } = require('objection');

class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'persons.id',
          // Any of the `to` and `from` fields can also be
          // references to nested fields (or arrays of references).
          // Here the relation is created between `persons.id` and
          // `animals.json.details.ownerId` properties. The reference
          // must be casted to the same type as the other key.
          to: ref('animals.json:details.ownerId').castInt()
        }
      },

      father: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'persons.fatherId',
          to: 'persons.id'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'persons.id',
          through: {
            from: 'persons_movies.actorId',
            to: 'persons_movies.movieId'

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
          to: 'movies.id'
        }
      }
    };
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
import { Model, ref } from 'objection';

class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'persons.id',
        // Any of the `to` and `from` fields can also be
        // references to nested fields (or arrays of references).
        // Here the relation is created between `persons.id` and
        // `animals.json.details.ownerId` properties. The reference
        // must be casted to the same type as the other key.
        to: ref('animals.json:details.ownerId').castInt()
      }
    },

    father: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'persons.fatherId',
        to: 'persons.id'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'persons.id',
        through: {
          from: 'persons_movies.actorId',
          to: 'persons_movies.movieId'

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
        to: 'movies.id'
      }
    }
  };
}
```

::: multi-language section ESNext end
::: multi-language example end

### `static` jsonAttributes

::: multi-language example begin
::: multi-language section ES2015 begin

```js
class Person extends Model {
  static get jsonAttributes() {
    return ['someProp', 'someOtherProp'];
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static jsonAttributes = ['someProp', 'someOtherProp'];
}
```

::: multi-language section ESNext end
::: multi-language example end

Properties that should be saved to database as JSON strings.

The properties listed here are serialized to JSON strings upon insertion/update to the database and parsed back to objects when models are read from the database. Combined with the postgresql's json or jsonb data type, this is a powerful way of representing documents as single database rows.

If this property is left unset all properties declared as objects or arrays in the [jsonSchema](#static-jsonschema) are implicitly added to this list.

### `static` columnNameMappers

::: multi-language example begin
::: multi-language section ES2015 begin

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers();
  }
}
```

::: multi-language section ES2015 end
::: multi-language section ESNext begin


```js
import { Model, snakeCaseMappers } from 'objection';

class Person extends Model {
  static columnNameMappers = snakeCaseMappers();
}
```

::: multi-language section ESNext end
::: multi-language example end

The mappers to use to convert column names to property names in code.

Further reading:

 * [snakeCaseMappers](/api/objection.html#snakecasemappers)
 * [snake_case to camelCase conversion recipe](/recipes/snake-case-to-camel-case-conversion.html)

#### Examples

If your columns are UPPER_SNAKE_CASE:

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers({ upperCase: true });
  }
}
```

The mapper signature:

```js
class Person extends Model {
  static columnNameMappers = {
    parse(obj) {
      // database --> code
    },

    format(obj) {
      // code --> database
    }
  };
}
```


## Static methods

### static query()

## Instance methods

### $relatedQuery()

::: multi-language example begin
::: multi-language section ES2015 begin


::: multi-language section ES2015 end
::: multi-language section ESNext begin


::: multi-language section ESNext end
::: multi-language example end
