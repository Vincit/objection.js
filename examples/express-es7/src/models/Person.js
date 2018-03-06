import { Model } from 'objection';
import Animal from './Animal';
import Movie from './Movie';

export default class Person extends Model {
  // Table name is the only required property.
  static tableName = 'persons';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['firstName', 'lastName'],

    properties: {
      id: { type: 'integer' },
      parentId: { type: ['integer', 'null'] },
      firstName: { type: 'string', minLength: 1, maxLength: 255 },
      lastName: { type: 'string', minLength: 1, maxLength: 255 },
      age: { type: 'number' },

      address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          zipCode: { type: 'string' }
        }
      }
    }
  };

  // This object defines the relations to other models.
  static relationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
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
        // ManyToMany relation needs the `through` object to describe the join table.
        through: {
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
