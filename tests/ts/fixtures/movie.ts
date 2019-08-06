import * as objection from '../../../';
import { RelationMappings, ref } from '../../../';
import { Person } from './person';

export class Movie extends objection.Model {
  title!: string;
  actors!: Person[];
  director!: Person;

  /**
   * This static field instructs Objection how to hydrate and persist
   * relations. By making relationMappings a thunk, we avoid require loops
   * caused by other class references.
   */
  static relationMappings: RelationMappings = {
    actors: {
      relation: objection.Model.ManyToManyRelation,
      modelClass: Person,
      join: {
        from: ['Movie.id1', 'Model.id2'],
        through: {
          from: 'Actors.movieId',
          to: ref('Actors.personId').castInt()
        },
        to: [ref('Person.id1'), 'Person.id2']
      },
      filter: qb => qb.orderByRaw('coalesce(title, id)')
    },
    director: {
      relation: objection.Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Movie.directorId',
        to: 'Person.id'
      }
    }
  };
}
