import * as objection from '../../../';
import { ref, RelationMappings } from '../../../';
import { Person } from './person';
import { Review } from './review';

export class Movie extends objection.Model {
  id!: number;

  duration!: number;

  title!: string;
  actors!: Person[];
  director!: Person;

  reviews!: Review[];

  // Needed for testing `relate({ foo: 50, bar: 20, baz: 10 })`
  foo!: number;
  bar!: number;
  baz!: number;

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
