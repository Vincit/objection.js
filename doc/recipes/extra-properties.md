# Join table extra properties

Sometimes when you have a many-to-many relationship, you want to store some properties in the join (pivot) table and still join them with the related objects. In objection, these proerties can be defined as `extra` properties of many-to-many relationship.

Let's consider a schema like this:

```js
exports.up = knex => {
  return knex.schema
    .createTable('actors', table => {
      table.increments('id').primary();
      table.string('name');
    })
    .createTable('movies', table => {
      table.increments('id').primary();
      table.string('name');
    })
    .createTable('actors_movies', table => {
      table.integer('actorId').references('actors.id');
      table.integer('movieId').references('movies.id');
      // The actor's character's name in the movie.
      table.string('characterName');
    });
};
```

In this schema, `characterName` is the `extra` property. When we fetch movies for an actor, we want the movie objects to contain the `characterName` in addition to normal movie properties.

You can define your [relationMapping](/api/model/static-properties.html#static-relationmappings) like this:

```js
class Actor extends Model {
  static get relationMappings() {
    return {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'actors.id',
        through: {
          from: 'actors_movies.actorId',
          to: 'actors_movies.movieId',
          extra: ['characterName']
        },
        to: 'movies.id'
      }
    }
  }
}
```

`extra` properties automatically work with all objection operations:

```js
const linda = await Actor
  .query()
  .findOne({ name: 'Linda Hamilton' });

// Fetch a movie.
const someMovie = await linda
  .$relatedQuery('movies')
  .first()

console.log(
  "Linda's character's name in the movie",
  someMovie.name,
  'is',
  someMovie.characterName
)

// Insert a movie with a `characterName`.
await linda
  .$relatedQuery('movies')
  .insert({
    name: 'Terminator',
    characterName: 'Sarah Connor'
  });

// Relate an existing movie with a `characterName`.
await linda
  .$relatedQuery('movies')
  .relate({
    id: 23452,
    characterName: 'Sarah Connor'
  });

// Update a movie and change `characterName`
await linda
  .$relatedQuery('movies')
  .patch({ characterName: 'Florence' })
  .where('movies.name', 'Curvature')
```

`extra` properties also work with [eager](/api/query-builder/eager-methods.html#eager) [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) and [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph).
