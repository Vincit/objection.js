import { Model } from 'objection'
import Person from './Person'

export default class Movie extends Model {
  id!: number
  name!: string

  actors!: Person[]

  // Table name is the only required property.
  static tableName = 'movies'

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['name'],

    properties: {
      id: { type: 'integer' },
      name: { type: 'string', minLength: 1, maxLength: 255 },
    },
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    actors: {
      relation: Model.ManyToManyRelation,

      // The related model.
      modelClass: Person,

      join: {
        from: 'movies.id',

        // ManyToMany relation needs the `through` object to describe the join table.
        through: {
          from: 'persons_movies.movieId',
          to: 'persons_movies.personId',
        },

        to: 'persons.id',
      },
    },
  })
}
