# Relations

We already went through how to create relationships (aka. relations, associations) in the [models](/introduction/models.html) section's examples but here's a list of all the available relation types in a nicely searchable place. See [this](/api/types.html#type-relationmapping) API doc section for full documentation of the relation mapping parameters.

Relationships are a very basic concept in relational databases and if you aren't familiar with it, you should spend some time googling it first. Basically there are three ways to create a relationship between two tables `A` and `B`:

1. Table `A` has a column that holds table `B`'s id. This relationship is called a `BelongsToOneRelation` in objection.
   We can say that `A` belongs to one `B`.

2. Table `B` has a column that holds table `A`'s id. This relationship is called a `HasManyRelation` in objection.
   We can say that `A` has many `B`'s.

3. Table `C` has columns for both `A` and `B` tables' identifiers. This relationship is called `ManyToManyRelation` in objection.
   Each row in `C` joins one `A` with one `B`. Therefore an `A` row can be related to multiple `B` rows and a `B` row can be related to
   multiple `A` rows through table `C`.

While relations are usually created between the primary key of one table and a foreign key reference of another table, objection has no such limitations. You can create relationship using any two columns (or any sets of columns). You can even create relation using values nested deep inside json columns.

If you've used other ORMs you may notice that objection's `relationMappings` are pretty verbose. There are couple of reasons for that:

1. For a new user, this style underlines what is happening, and which columns and tables are involved.

2. You only need to define relations once. Writing a couple of lines more for clarity shouldn't impact your productivity.

## Examples

Vocabulary for the relation descriptions:

 * source model: The model for which you are writing the `relationMapping` for.
 * related model: The model at the other end of the relation.

`BelongsToOneRelation`: Use this relation when the source model has the foreign key

```js
class Animal extends Model {
  static tableName = 'animals';

  static relationMappings = {
    owner: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'animals.ownerId',
        to: 'persons.id'
      }
    }
  }
}
```

`HasManyRelation`: Use this relation when the related model has the foreign key

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    animals: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    }
  }
}
```

`HasOneRelation`: Just like `HasManyRelation` but for one related row

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    animal: {
      relation: Model.HasOneRelation,
      modelClass: Animal,
      join: {
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    }
  }
}
```

`ManyToManyRelation`: Use this relation when the model is related to a list of other models through a join table

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'persons.id',
        through: {
          // persons_movies is the join table.
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    }
  }
}
```

`HasOneThroughRelation`: Use this relation when the model is related to a single model through a join table

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    movie: {
      relation: Model.HasOneThroughRelation,
      modelClass: Movie,
      join: {
        from: 'persons.id',
        through: {
          // persons_movies is the join table.
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    }
  }
}
```

## Require loops

Require loops (circular dependencies, circular requires) are a very common problem when defining relations. Whenever a module `A` imports module `B` that immediately (synchronously) imports module `A`, you create a require loop that node.js or objection cannot solve automatically. A require loop usually leads to the other imported value to be an empty object which causes all kinds of problems. Objection attempts to detect these situations and mention the words `require loop` in the thrown error. Objection offers multiple solutions to this problem. See the circular dependency solutions examples in this section. In addition to objection's solutions, you can always organize your code so that such loops are not created.

Solutions to require loops

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    // Solution 1:
    //
    // relationMappings getter is accessed lazily when you execute your first query
    // that needs it. Therefore if you `require` your models inside the getter, you
    // don't end up with a require loop. Note that only one end of the relation needs
    // to be required like this, not both. `relationMappings` can also be a method or
    // a thunk if you prefer those instead of getters.
    const Animal = require('./Animal');

    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'persons.id',
          to: 'animals.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        // Solution 2:
        //
        // Absolute file path to a module that exports the model class. This is similar
        // to solution 1, but objection calls `require` under the hood. The downside here
        // is that you need to give an absolute file path because of the way `require` works.
        modelClass: path.join(__dirname, 'Movie'),
        join: {
          from: 'persons.id',
          through: {
            // persons_movies is the join table.
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        // Solution 3:
        //
        // Use only a module name and define a `modelPaths` property for your model (or a superclass
        // of your model). Search for `modelPaths` from the docs for more info.
        modelClass: 'Movie',
        join: {
          from: 'persons.id',
          through: {
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      }
    };
  }
}
```
