---
sidebarDepth: 2
---

# `class` Model

Subclasses of this class represent database tables.

See the [model section](/guide/models.html#examples) of the guide for some simple example models. The API documentation below also contains a bunch of examples.

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

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }
}
```

Name of the database table for this model.

Each model must set this.

### `static` jsonSchema

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

### `static` idColumn

```js
class Person extends Model {
  static get idColumn() {
    return 'some_column_name';
  }
}
```

Name of the primary key column in the database table.

Composite id can be specified by giving an array of column names.

Defaults to 'id'.

### `static` modelPaths

```js
class Person extends Model {
  static get modelPaths() {
    return [__dirname];
  }
}
```

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

### `static` concurrency

```js
class Person extends Model {
  static get concurrency() {
    return 10;
  }
}
```

How many queries can be run concurrently per connection.

This doesn't limit the concurrencly of the entire server. It only limits the number of concurrent queries that can be run on a single connection. By default knex connection pool size is 10, which means that the maximum number of concurrent queries started by objection is `Model.concurrency * 10`. You can also easily increase the knex pool size.

The default concurrency is 4 except for mssql, for which the default is 1. The mssql default is needed because of the buggy driver that only allows one query at a time per connection.

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

### `static` jsonAttributes

```js
class Person extends Model {
  static get jsonAttributes() {
    return ['someProp', 'someOtherProp'];
  }
}
```

Properties that should be saved to database as JSON strings.

The properties listed here are serialized to JSON strings upon insertion/update to the database and parsed back to objects when models are read from the database. Combined with the postgresql's json or jsonb data type, this is a powerful way of representing documents as single database rows.

If this property is left unset all properties declared as objects or arrays in the [jsonSchema](#static-jsonschema) are implicitly added to this list.

### `static` cloneObjectAttributes

```js
class Person extends Model {
  static get cloneObjectAttributes() {
    return false;
  }
}
```

If true (the default) object attributes (for example jsonb columns) are cloned when `$toDatabaseJson`, `$toJson` or `toJSON` is called. If this is set to false, they are not cloned. Note that nested `Model` instances inside relations etc. are still effectively cloned, because `$toJson` is called for them recursively, but their jsonb columns, again,
are not :)

Usually you don't need to care about this setting, but if you have large object fields (for example large objects in jsonb columns) cloning the data can become slow and play a significant part in your server's performance. There's rarely a need to to clone this data, but since it has historically been copied, we cannot change the default behaviour
easily.

TLDR; Set this setting to `false` if you have large jsonb columns and you see that cloning that data takes a significant amount of time **when you profile the code**.

### `static` columnNameMappers

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers();
  }
}
```

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

### `static` relatedFindQueryMutates

```js
class Person extends Model {
  static get relatedFindQueryMutates() {
    return false;
  }
}
```

If this config is set to false, calling `foo.$relatedQuery('bar')` doesn't assign the fetched related models to `foo.bar`. The default is true.

### `static` relatedInsertQueryMutates

```js
class Person extends Model {
  static get relatedInsertQueryMutates() {
    return false;
  }
}
```

If this config is set to false, calling `foo.$relatedQuery('bar').insert(obj)` doesn't append the inserted related model to `foo.bar`. The default is true.

### `static` virtualAttributes

```js
class Person extends Model {
  static get virtualAttributes() {
    return ['fullName', 'isFemale'];
  }

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get isFemale() {
    return this.gender === 'female';
  }
}

const person = Person.fromJson({
  firstName: 'Jennifer',
  lastName: 'Aniston',
  gender: 'female'
});

// Note that `toJSON` is always called automatically
// when an object is serialized to a JSON string using
// JSON.stringify. You very rarely need to call `toJSON`
// explicitly. koa, express and all other frameworks I'm
// aware of use JSON.stringify to serialize objects to JSON.
console.log(person.toJSON());
// --> {"firstName": "Jennifer", "lastName": "Aniston", "isFemale": true, "fullName": "Jennifer Aniston"}
```

Getters and methods listed here are serialized with real properties when `toJSON` is called.

The virtual values are not written to database. Only the "external" JSON format will contain them.

### `static` uidProp

```js
class Person extends Model {
  static get uidProp() {
    return '#id';
  }
}
```


Name of the property used to store a temporary non-db identifier for the model.

NOTE: You cannot use any of the model's properties as `uidProp`. For example if your model has a property `id`, you cannot set `uidProp = 'id'`.

Defaults to '#id'.

### `static` uidRefProp

```js
class Person extends Model {
  static get uidRefProp() {
    return '#ref';
  }
}
```

Name of the property used to store a reference to a [uidProp](#static-uidprop)

NOTE: You cannot use any of the model's properties as `uidRefProp`. For example if your model has a property `ref`, you cannot set `uidRefProp = 'ref'`.

Defaults to `'#ref'`.

### `static` dbRefProp

```js
class Person extends Model {
  static get dbRefProp() {
    return '#dbRef';
  }
}
```

Name of the property used to point to an existing database row from an `insertGraph` graph.

NOTE: You cannot use any of the model's properties as `dbRefProp`. For example if your model has a property `id`, you cannot set `dbRefProp = 'id'`.

Defaults to '#dbRef'.


### `static` propRefRegex

```js
class Person extends Model {
  static get propRefRegex() {
    return /#ref{([^\.]+)\.([^}]+)}/g;
  }
}
```

Regular expression for parsing a reference to a property.

Defaults to `/#ref{([^\.]+)\.([^}]+)}/g`.

### `static` pickJsonSchemaProperties

```js
class Person extends Model {
  static get pickJsonSchemaProperties() {
    return true;
  }
}
```

If this is true only properties in `jsonSchema` are picked when inserting or updating a row in the database.

Defaults to false.

### `static` defaultEagerAlgorithm

```js
class Person extends Model {
  static get defaultEagerAlgorithm() {
    return Model.WhereInEagerAlgorithm;
  }
}
```

Sets the default eager loading algorithm for this model. Must be either
`Model.WhereInEagerAlgorithm` or `Model.JoinEagerAlgorithm`.

Defaults to `Model.WhereInEagerAlgorithm`.

### `static` defaultEagerOptions

```js
class Person extends Model {
  static get defaultEagerOptions() {
    return {
      minimize: true,
      separator: '->',
      aliases: {}
    };
  }
}
```

Sets the default options for eager loading algorithm. See the possible
fields [here](/api/types.html#type-eageroptions).

Defaults to `{minimize: false, separator: ':', aliases: {}}`.

### `static` modifiers

Reusable query building functions that can be used in any [eager query](#eager), using [`modify`](#modify) method and in many other places.

```js
class Movie extends Model {
  static get modifiers() {
    return {
      goodMovies(builder) {
        builder.where('stars', '>', 3);
      },

      orderByName(builder) {
        builder.orderBy('name')
      }
    };
  }
}

class Animal extends Model {
  static get modifiers() {
    return {
      dogs(builder) {
        builder.where('species', 'dog');
      }
    };
  }
}
```

Modifiers can be used in any eager query:

```js
Person
  .query()
  .eager('[movies(goodMovies, orderByName).actors, pets(dogs)]')
```

Modifiers can also be used through [modifyEager](#modifyeager):

```js
Person
  .query()
  .eager('[movies.actors, pets]')
  .modifyEager('movies', ['goodMovies', 'orderByName'])
  .modifyEager('pets', 'dogs')
```

### `static` namedFilters

An alias for [`modifiers`](#static-modifiers)

### `static` useLimitInFirst

```js
class Animal extends Model {
  static get useLimitInFirst() {
    return true;
  }
}
```

If true, `limit(1)` is added to the query when `first()` is called. Defaults to `false`.

## Static methods

### static query()

## Instance methods

### $relatedQuery()
