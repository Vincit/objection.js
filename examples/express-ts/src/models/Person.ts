import { JsonSchema } from 'jsonschema';
import { Model, RelationMappings } from 'objection';
import { join } from 'path';

export interface Address {
  street: string;
  city: string;
  zipCode: string;
}

export default class Person extends Model {
  // Table name is the only required property.
  static tableName = 'Person';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema: JsonSchema = {
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
  static relationMappings: RelationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: join(__dirname, 'Animal'),
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: join(__dirname, 'Movie'),
      join: {
        from: 'Person.id',
        // ManyToMany relation needs the `through` object to describe the join table.
        through: {
          from: 'Person_Movie.personId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    },

    children: {
      relation: Model.HasManyRelation,
      modelClass: join(__dirname, 'Person'),
      join: {
        from: 'Person.id',
        to: 'Person.parentId'
      }
    }
  };

  readonly id: number;
  parent: Person;
  firstName: string;
  lastName: string;
  age: number;
  address: Address;

  examplePersonMethod(arg: string): number {
    return 1;
  }
}
