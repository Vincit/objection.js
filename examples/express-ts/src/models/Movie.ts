import {Model} from 'objection';
import {join} from 'path';
import Person from './Person';

export default class Movie extends Model {
  readonly id: number;
  name: string;

  // Optional eager relations.
  actors?: Person[];

  // Table name is the only required property.
  static tableName = 'Movie';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['name'],

    properties: {
      id: {type: 'integer'},
      name: {type: 'string', minLength: 1, maxLength: 255}
    }
  };

  // This relationMappings is a thunk, which prevents require loops:
  static relationMappings = () => ({
    actors: {
      relation: Model.ManyToManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: join(__dirname, 'Person'),
      join: {
        from: 'Movie.id',
        // ManyToMany relation needs the `through` object to describe the join table.
        through: {
          from: 'Person_Movie.movieId',
          to: 'Person_Movie.personId'
        },
        to: 'Person.id'
      }
    }
  });
}
