# Models

Models are created by inheriting from the [Model](/api/model.html) class. A [Model](/api/model.html) subclass represents a database table and instances of that class represent table rows. A [Model](/api/model.html) class can define [relationships](/guide/relations.html) (aka. relations, associations) to other models using the static [relationMappings](/api/model.html#static-relationmappings) property.

In objection, all configuration is done through [Model](/api/model.html) classes and there is no global configuration or state. This allows you to create isolated components and for example to use multiple different databases with different configurations in one app. Most of the time you want the same configuration for all models and a good pattern is to create a `BaseModel` superclass and inherit all your models from that. You can then add all shared configuration to `BaseModel`. See the [Reference --> Model --> Static properties](/api/model.html#static-tablename) section for all available configuration options.

Models can optionally define a [jsonSchema](/api/model.html#static-jsonschema) object that is used for input validation. Every time a [Model](/api/model.html) instance is created, it is validated against the [jsonSchema](/api/model.html#static-tablename). Note that [Model](/api/model.html) instances are implicitly created whenever you call [insert](/api/query-builder.html#insert), [insertGraph](/api/query-builder.html#insertgraph), [patch](/api/query-builder.html#patch) or any other method that takes model properties (no validation is done when reading from the database).

Each model must have an identifier column. The identifier column name can be set using the [idColumn](/api/model.html#static-idcolumn) property. [idColumn](/api/model.html#static-idcolumn) defaults to `"id"`. If your table's identifier is something else, you need to set [idColumn](/api/model.html#static-idcolumn). Composite id can be set by giving an array of column names. Composite keys are first class citizens in objection.

## Examples

A working model with minimal amount of code:

```js
const { Model } = require('objection');

class MinimalModel extends Model {
  static get tableName() {
    return 'someTableName';
  }
}

module.exports = MinimalModel;
```

Using ESNext static properties:

```js
import { Model } from 'objection';

export default class MinimalModel extends Model {
  static tableName = 'someTableName';
}
```

Model with custom methods, json schema validation and relations. This model is used in the examples:

```js
const { Model } = require('objection');

class Person extends Model {

  // Table name is the only required property.
  static get tableName() {
    return 'persons';
  }

  // Each model must have a column (or a set of columns) that uniquely
  // identifies the rows. The column(s) can be specified using the `idColumn`
  // property. `idColumn` returns `id` by default and doesn't need to be
  // specified unless the model's primary key is something else.
  static get idColumn() {
    return 'id';
  }

  // Methods can be defined for model classes just as you would for
  // any javascript class. If you want to include the result of these
  // method in the output json, see `virtualAttributes`.
  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for input validation. Whenever a model instance is created
  // either explicitly or implicitly it is checked against this schema.
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
    // Import models here to prevent require loops.
    const Animal = require('./Animal');
    const Movie = require('./Movie');

    return {
      pets: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model
        // subclass constructor or an absolute file path
        // to a module that exports one.
        modelClass: Animal,
        join: {
          from: 'persons.id',
          to: 'animals.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'persons.id',
          // ManyToMany relation needs the `through` object
          // to describe the join table.
          through: {
            // If you have a model class for the join table
            // you need to specify it like this:
            // modelClass: PersonMovie,
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'persons.id',
          to: 'persons.parentId'
        }
      },

      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'persons.parentId',
          to: 'persons.id'
        }
      }
    };
  }
}
```

ESNext:

```js
class Person extends Model {
  // Table name is the only required property.
  static tableName = 'persons';

  // Each model must have a column (or a set of columns) that uniquely
  // identifies the rows. The colum(s) can be specified using the `idColumn`
  // property. `idColumn` returns `id` by default and doesn't need to be
  // specified unless the model's primary key is something else.
  static idColumn = 'id';

  // Methods can be defined for model classes just as you would for
  // any javascript class. If you want to include the result of these
  // method in the output json, see `virtualAttributes`.
  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for input validation. Whenever a model instance is created
  // either explicitly or implicitly it is checked against this schema.
  // http://json-schema.org/.
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

  // This object defines the relations to other models.
  static relationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model
      // subclass constructor or an absolute file path
      // to a module that exports one. We use the file
      // path version here to prevent require loops.
      modelClass: __dirname + '/Animal',
      join: {
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: __dirname + '/Movie',
      join: {
        from: 'persons.id',
        // ManyToMany relation needs the `through` object
        // to describe the join table.
        through: {
          // If you have a model class for the join table
          // you need to specify it like this:
          // modelClass: PersonMovie,
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    },

    children: {
      relation: Model.HasManyRelation,
      modelClass: Person,
      join: {
        from: 'persons.id',
        to: 'persons.parentId'
      }
    },

    parent: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'persons.parentId',
        to: 'persons.id'
      }
    }
  };
}
```
