import { Model } from 'objection';
import Person from './Person';

export default class Movie extends Model {
  readonly id: number;
  name: string;
  actors: Person[];

  // Table name is the only required property.
  static tableName = 'Movie';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['name'],

    properties: {
      id: { type: 'integer' },
      name: { type: 'string', minLength: 1, maxLength: 255 }
    }
  };

  static relationMappings = {
    actors: {
      relation: Model.ManyToManyRelation,
      modelClass: () => Person,
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
  };
}
