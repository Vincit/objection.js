# Models

Models are created by inheriting from the [Model](/api/model/) class. A [Model](/api/model/) subclass represents a database table and instances of that class represent table rows. A [Model](/api/model/) class can define [relationships](/guide/relations.html) (aka. relations, associations) to other models using the static [relationMappings](/api/model/static-properties.html#static-relationmappings) property.

In objection, all configuration is done through [Model](/api/model/) classes and there is no global configuration or state. This allows you to create isolated components and for example to use multiple different databases with different configurations in one app. Most of the time you want the same configuration for all models and a good pattern is to create a `BaseModel` superclass and inherit all your models from that. You can then add all shared configuration to `BaseModel`. See the the static properties in [API Reference --> class Model](/api/model/static-properties.html#static-tablename) section for all available configuration options.

Models can optionally define a [jsonSchema](/api/model/static-properties.html#static-jsonschema) object that is used for input validation. Every time a [Model](/api/model/) instance is created, it is validated against the [jsonSchema](/api/model/static-properties.html#static-tablename). Note that [Model](/api/model/) instances are implicitly created whenever you call [insert](/api/query-builder/instance-methods.html#insert), [insertGraph](/api/query-builder/instance-methods.html#insertgraph), [patch](/api/query-builder/instance-methods.html#patch) or any other method that takes in model properties (no validation is done when reading from the database).

Each model must have an identifier column. The identifier column name can be set using the [idColumn](/api/model/static-properties.html#static-idcolumn) property. [idColumn](/api/model/static-properties.html#static-idcolumn) defaults to `"id"`. If your table's identifier is something else, you need to set [idColumn](/api/model/static-properties.html#static-idcolumn). Composite id can be set by giving an array of column names. Composite keys are first class citizens in objection.

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
  // No tables or columns are generated based on this. This is only
  // used for input validation. Whenever a model instance is created
  // either explicitly or implicitly it is checked against this schema.
  // See http://json-schema.org/ for more info.
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
        // Model.jsonAttributes property.
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
    // Importing models here is a one way to avoid require loops.
    const Animal = require('./Animal');
    const Movie = require('./Movie');

    return {
      pets: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model
        // subclass constructor or an absolute file path
        // to a module that exports one. We use a model
        // subclass constructor `Animal` here.
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
