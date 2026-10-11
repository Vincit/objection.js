# Eager Loading Methods

## withGraphFetched()

```js
queryBuilder = queryBuilder.withGraphFetched(relationExpression, graphOptions);
```

Fetch a graph of related items for the result of any query (eager loading).

There are two methods that can be used to load relations eagerly: [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) and [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined). The main difference is that [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) uses multiple queries under the hood to fetch the result while [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) uses a single query and joins to fetch the results. Both methods allow you to do different things which we will go through in detail in the examples below and in the examples of the [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) method.

As mentioned, this method uses multiple queries to fetch the related objects. Objection performs one query per level in the relation expression tree. For example only two additional queries will be created for the expression `children.children` no matter how many children the item has or how many children each of the children have. This algorithm is explained in detail in [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/) (note that `withGraphFetched` method used to be called `eager`).

**Limitations:**

- Relations cannot be referenced in the root query because they are not joined.
- `limit` and `page` methods will work incorrectly when applied to a relation using `modifyGraph` or `modifiers` because they will be applied on a query that fetches relations for multiple parents. You can use `limit` and `page` for the root query. To limit the related items per parent, set the `maxBatchSize` [graph option](/api/types/#type-graphoptions) to `1` so that each parent gets its own query.
- `first` doesn't limit the related items per parent when applied to a relation using `modifyGraph` or `modifiers`: all matching related items are still assigned to the parents, or with `useLimitInFirst`, the whole query is limited to one item. Use `limit(1)` together with `maxBatchSize: 1` instead.

See the [eager loading](/guide/query-examples.html#eager-loading) section for more examples and [RelationExpression](/api/types/#type-relationexpression) for more info about the relation expression language.

See the [fetchGraph](/api/model/static-methods.html#static-fetchgraph) and [\$fetchGraph](/api/model/instance-methods.html#fetchgraph) methods if you want to load relations for items already loaded from the database.

**About performance:**

Note that while [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) sounds more performant than [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched), both methods have very similar performance in most cases and [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) is actually much much faster in some cases where the [relationExpression](/api/types/#type-relationexpression) contains multiple many-to-many or has-many relations. The flat record list the db returns for joins can have an incredible amount of duplicate information in some cases. Transferring + parsing that data from the db to node can be very costly, even though the actual joins in the db are very fast. You shouldn't select [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) blindly just because it sounds more peformant. The three rules of optimization apply here too: 1. Don't optimize 2. Don't optimize yet 3. Profile before optimizing. When you don't actually need joins, use [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched).

##### Arguments

| Argument           | Type                                                      | Description                                                  |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
| relationExpression | [RelationExpression](/api/types/#type-relationexpression) | The relation expression describing which relations to fetch. |
| options            | [GraphOptions](/api/types/#type-graphoptions)             | Optional options.                                            |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

Fetches all `Persons` named Arnold with all their pets. `'pets'` is the name of the relation defined in [relationMappings](/api/model/static-properties.html#static-relationmappings).

```js
const people = await Person.query()
  .where('firstName', 'Arnold')
  .withGraphFetched('pets');

console.log(people[0].pets[0].name);
```

Fetch `children` relation for each result Person and `pets` and `movies`
relations for all the children.

```js
const people = await Person.query().withGraphFetched('children.[pets, movies]');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

[Relation expressions](/api/types/#relationexpression-object-notation) can also be objects. This is equivalent to the previous example:

```js
const people = await Person.query().withGraphFetched({
  children: {
    pets: true,
    movies: true
  }
});

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relation results can be filtered and modified by giving modifier function names as arguments for the relations:

```js
const people = await Person.query()
  .withGraphFetched(
    'children(selectNameAndId).[pets(onlyDogs, orderByName), movies]'
  )
  .modifiers({
    selectNameAndId(builder) {
      builder.select('name', 'id');
    },

    orderByName(builder) {
      builder.orderBy('name');
    },

    onlyDogs(builder) {
      builder.where('species', 'dog');
    }
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Reusable modifiers can be defined for a model class using [modifiers](/api/model/static-properties.html#static-modifiers). Also see the [modifiers recipe](/recipes/modifiers.md).

```js
class Person extends Model {
  static get modifiers() {
    return {
      // Note that this modifier takes an argument!
      filterGender(builder, gender) {
        builder.where('gender', gender);
      },

      defaultSelects(builder) {
        builder.select('id', 'firstName', 'lastName');
      },

      orderByAge(builder) {
        builder.orderBy('age');
      }
    };
  }
}

class Animal extends Model {
  static get modifiers() {
    return {
      orderByName(builder) {
        builder.orderBy('name');
      },

      filterSpecies(builder, species) {
        builder.where('species', species);
      }
    };
  }
}

const people = await Person.query().modifiers({
  // You can bind arguments to Model modifiers like this
  filterFemale(builder) {
    builder.modify('filterGender', 'female');
  },

  filterDogs(builder) {
    builder.modify('filterSpecies', 'dog');
  }
}).withGraphFetched(`
    children(defaultSelects, orderByAge, filterFemale).[
      pets(filterDogs, orderByName),
      movies
    ]
  `);

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Filters can also be registered using the [modifyGraph](/api/query-builder/eager-methods.html#modifygraph) method:

```js
const people = await Person.query()
  .withGraphFetched('children.[pets, movies]')
  .modifyGraph('children', builder => {
    // Order children by age and only select id.
    builder.orderBy('age').select('id');
  })
  .modifyGraph('children.[pets, movies]', builder => {
    // Only select `pets` and `movies` whose id > 10 for the children.
    builder.where('id', '>', 10);
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be given aliases using the `as` keyword:

```js
const people = await Person.query().withGraphFetched(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

console.log(people[0].kids[0].dogs[0].name);
console.log(people[0].kids[0].movies[0].id);
```

Eager loading is optimized to avoid the N + 1 queries problem. Consider this query:

```js
const people = await Person.query()
  .where('id', 1)
  .withGraphFetched('children.children');

console.log(people[0].children.length); // --> 10
console.log(people[0].children[9].children.length); // --> 10
```

The person has 10 children and they all have 10 children. The query above will return 100 database rows but will generate only three database queries when using `withGraphFetched` and only one query when using `withGraphJoined`.

##### TypeScript

Relations are usually declared as optional properties, since they are only set when fetched. When the relation expression is a literal, `withGraphFetched`, `withGraphJoined`, [fetchGraph](/api/model/static-methods.html#static-fetchgraph) and [\$fetchGraph](/api/model/instance-methods.html#fetchgraph) narrow the result type, so that the fetched relations become required, at every level of the expression:

```ts
class Person extends Model {
  firstName!: string;
  parent?: Person | null;
  pets?: Animal[];
  children?: Person[];
}

const people = await Person.query().withGraphFetched('[pets.owner, children.pets]');

people[0].pets[0].owner.firstName; // `pets` and `owner` are not optional.
people[0].children[0].pets.length;
people[0].parent; // Not fetched, still `Person | null | undefined`.
```

The narrowing works with string and object notation, and with modifiers like `pets(onlyDogs)`. It is kept by `first()`, `findById()`, `findOne()`, `throwIfNotFound()`, `page()` and the other query builder methods, and multiple `withGraphFetched` calls are merged, like objection merges the expressions. Custom query builders are kept too, as long as the model declares its query builder type with `this`, as in the [custom query builder recipe](/recipes/custom-query-builder.html#extending-the-query-builder-in-typescript): `declare QueryBuilderType: MyQueryBuilder<this>`.

Fetching a relation only removes `undefined` from its type, it never adds or removes `null`: `parent?: Person | null` becomes `Person | null`, while `parent?: Person` becomes `Person`. Since objection sets to-one relations to `null` when there is no related row, declare to-one relations that can be empty as `T | null`, e.g. `parent?: Person | null`.

The narrowed types remain assignable to the declared ones, so existing type annotations like `Person[]` or `QueryBuilder<Person>` keep working. `$query()` on a narrowed instance isn't narrowed, as it doesn't fetch the relations again.

**Limitations:**

- Only literal expressions are narrowed. An expression of type `string` (e.g. a variable or a function argument) leaves the result type as it was.
- Nodes the type-level parser doesn't understand are skipped instead of reported: aliased relations (`pets as dogs`), `*` and recursion (`children.^`, where `children` itself is still narrowed) are not narrowed, and unknown relation names are ignored.
- The narrowed query builder is a different type than the one it was created from. It can be assigned to the declared type, but not the other way around. This causes type errors in two cases:
  - Reassigning a `let` variable whose type was inferred from a narrowed query: `let query = Person.query().withGraphFetched('pets')` can't be assigned `Person.query()` later on, and assigning it `query.withGraphFetched('children')` can fail with "Type instantiation is excessively deep and possibly infinite". Annotate the variable with the declared type instead.
  - Generic helpers with an explicit return type, whether they are generic over the query builder or over the model type. Pass `string` as type argument to opt out of the narrowing and keep the query builder type.

```ts
let query: QueryBuilder<Person> = Person.query().withGraphFetched('pets');
query = query.withGraphFetched('children');

function withPets<QB extends QueryBuilder<Person>>(query: QB): QB {
  // `query.withGraphFetched('pets')` would be a type error here.
  return query.withGraphFetched<string>('pets');
}

function withChildren<M extends Model>(query: QueryBuilder<M>): QueryBuilder<M> {
  return query.withGraphFetched<string>('children');
}
```

The narrowing requires TypeScript 5.0 or newer, as do the typings since objection 3.3.0.

## withGraphJoined()

```js
queryBuilder = queryBuilder.withGraphJoined(relationExpression, graphOptions);
```

Join and fetch a graph of related items for the result of any query (eager loading).

There are two methods that can be used to load relations eagerly: [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) and [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined). The main difference is that [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) uses multiple queries under the hood to fetch the result while [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) uses a single query and joins to fetch the results. Both methods allow you to do different things which we will go through in detail in the examples below and in the examples of the [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) method.

As mentioned, this method uses [SQL joins](https://www.postgresql.org/docs/12/tutorial-join.html) to join all the relations defined in the `relationExpression` and then parses the result into a graph of model instances equal to the one you get from `withGraphFetched`. The main benefit of this is that you can filter the query based on the relations. See the examples.

By default left join is used but you can define the join type using the [joinOperation](/api/types/#type-graphoptions) option. The `joinOperation` only applies to the relations of the call it's passed to, including their nested relations, so multiple `withGraphJoined` calls can use different join types:

```js
const people = await Person.query()
  .withGraphJoined('parent', { joinOperation: 'innerJoin' })
  .withGraphJoined('pets.toys', { joinOperation: 'leftJoin' });
```

Calls without a `joinOperation` use the default, which is the `joinOperation` of [defaultGraphOptions](/api/model/static-properties.html#static-defaultgraphoptions) or `leftJoin`. If a relation is passed to multiple calls with a `joinOperation`, the last one is used for it. All other options are shared by all `withGraphJoined` calls of the query.

**Limitations:**

- `limit`, `page` and `range` methods will work incorrectly because they will limit the result set that contains all the result rows in a flattened format. For example the result set of the eager expression children.children will have 10 \* 10 \* 10 rows assuming that you fetched 10 models that all had 10 children that all had 10 children. The `total` count of `page` and `range` and the result of [resultSize](/api/query-builder/other-methods.html#resultsize) are not affected by this, as they count the distinct root models.
- All models in the relation expression, including the root model, need a primary key. The flat result rows are grouped into a graph using the [idColumn](/api/model/static-properties.html#static-idcolumn) values, so the `idColumn` must exist in the table and uniquely identify the rows. If the `idColumn` is `null` or doesn't exist in the table, the rows can't be told apart, and `withGraphJoined` throws an error instead of returning a wrong result. Use [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) for models without a primary key.
- The relations are joined as subqueries, and only the selections of their modifiers that objection can name are selected from them: columns, aliased columns like `'name as petName'`, aggregates with an alias like `count('* as toyCount')`, `count('id', { as: 'toyCount' })` or `sum({ totalPrice: 'price' })`, [ref](/api/objection/#ref) and [raw](/api/objection/#raw) with `as()`, subqueries with `as()`, and raw SQL that ends with an alias like `as "petName"`, `as pet_name` or `as ??`. Subqueries and raw SQL like this are selected in addition to the other columns, and don't change which other columns are selected. Other selections, like `count()` without an alias or raw SQL with an unquoted alias that contains upper case letters, are missing from the result. Give them an alias, for example `count('* as petCount')` or `raw('count(*)').as('petCount')`.
- To merge the rows into models, `withGraphJoined` adds the [idColumn](/api/model/static-properties.html#static-idcolumn) and the relation columns to the selections of the joined subqueries. When a modifier uses `groupBy`, it needs to group by the `idColumn` too, for example `groupBy('animals.id')`, as most databases don't allow selecting columns that aren't grouped. To group by other columns only, use [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched).

**About performance:**

Note that while [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) sounds more performant than [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched), both methods have very similar performance in most cases and [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) is actually much much faster in some cases where the [relationExpression](/api/types/#type-relationexpression) contains multiple many-to-many or has-many relations. The flat record list the db returns for joins can have an incredible amount of duplicate information in some cases. Transferring + parsing that data from the db to node can be very costly, even though the actual joins in the db are very fast. You shouldn't select [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) blindly just because it sounds more peformant. The three rules of optimization apply here too: 1. Don't optimize 2. Don't optimize yet 3. Profile before optimizing. When you don't actually need joins, use [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched).

##### Arguments

| Argument           | Type                                                      | Description                                                  |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
| relationExpression | [RelationExpression](/api/types/#type-relationexpression) | The relation expression describing which relations to fetch. |
| options            | [GraphOptions](/api/types/#type-graphoptions)             | Optional options.                                            |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

In TypeScript, the result type is narrowed to include the fetched relations, see [withGraphFetched](/api/query-builder/eager-methods.html#typescript).

##### Examples

All examples in [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) also work with `withGraphJoined`. Remember to also study those. The following examples are only about the cases that don't work with [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched)

Using `withGraphJoined` all the relations are joined to the main query and you can reference them in any query building method. Note that nested relations are named by concatenating relation names using `:` as a separator. See the next example:

```js
const people = await Person.query()
  .withGraphJoined('children.[pets, movies]')
  .whereIn('children.firstName', ['Arnold', 'Jennifer'])
  .where('children:pets.name', 'Fluffy')
  .where('children:movies.name', 'like', 'Terminator%');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Using [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) you can refer to columns only by their name because the column names are unique in the query. With `withGraphJoined` you often need to also mention the table name. Consider the following example. We join the relation `pets` to a `persons` query. Both tables have the `id` column. We need to use `where('persons.id', '>', 100)` instead of `where('id', '>', 100)` so that objection knows which `id` you mean. If you don't do this, you get an `ambiguous column name` error.

```js
const people = await Person.query()
  .withGraphJoined('pets')
  .where('persons.id', '>', 100);
```

##### Mixing withGraphJoined and withGraphFetched

`withGraphJoined` and [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) can be used in the same query. The joined relations are joined to the main query, so you can filter by them, and the fetched relations are then loaded using separate queries for the resulting models. The order of the calls doesn't matter.

```js
const people = await Person.query()
  .withGraphJoined('pets')
  .withGraphFetched('[movies, children]')
  .where('pets.species', 'dog');

// Only people that have a dog are returned and only their dogs are in
// `pets`. `movies` and `children` contain all related items of those people.
console.log(people[0].pets[0].species);
console.log(people[0].movies.length);
```

A top-level relation can be either joined or fetched, but not both. Passing the same relation to both methods, even when only a nested relation is different (for example `withGraphJoined('pets')` and `withGraphFetched('pets.toys')`), throws an error. The `*` expression can't be used when mixing the methods. [modifyGraph](/api/query-builder/eager-methods.html#modifygraph) works with both joined and fetched relations.

To add relations without caring whether they are joined or fetched, for example in reusable modifiers, use [withGraph](/api/query-builder/eager-methods.html#withgraph). It keeps the algorithm of the relations that are already loaded.

## withGraph()

```js
queryBuilder = queryBuilder.withGraph(relationExpression, graphOptions);
```

With `graphOptions.algorithm` set to `'fetch'` or `'join'`, this is the same as [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) or [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined).

Without an `algorithm`, the relations are added to the graph without choosing an algorithm, which is useful when the graph is extended in different places, for example in modifiers:

- Top-level relations that are already joined or fetched keep their algorithm, including their nested relations.
- New top-level relations use the algorithm of the most recent `withGraphJoined`, `withGraphFetched` or `withGraph` call with an `algorithm`, and are fetched if there was none. Child queries inherit it from their parent query.

Unlike passing the same relation to both [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) and [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched), this never throws for relations that are already loaded. All other options are passed on, and [modifiers](/api/query-builder/other-methods.html#modifiers), [modifyGraph](/api/query-builder/eager-methods.html#modifygraph) and [clearWithGraph](/api/query-builder/eager-methods.html#clearwithgraph) work the same way. `clearWithGraph` also forgets the most recently used algorithm.

##### Arguments

| Argument           | Type                                                      | Description                                                                         |
| ------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| relationExpression | [RelationExpression](/api/types/#type-relationexpression) | The relation expression describing which relations to load.                         |
| options            | [GraphOptions](/api/types/#type-graphoptions)             | Optional options, plus `algorithm`: `'fetch'` or `'join'`. Other values throw.      |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

In TypeScript, the result type is narrowed like with [withGraphFetched](/api/query-builder/eager-methods.html#typescript).

##### Examples

```js
const people = await Person.query()
  .withGraphJoined('pets')
  .withGraphFetched('movies')
  // `pets.toys` is joined and `movies.actors` fetched, like their parents.
  // `children` is fetched, as `withGraphFetched` was used most recently.
  .withGraph('[pets.toys, movies.actors, children]');
```

```js
const people = await Person.query().withGraph('pets', { algorithm: 'join' });
```

## graphExpressionObject()

```js
const builder = Person.query().withGraphFetched('children.pets(onlyId)');

const expr = builder.graphExpressionObject();
console.log(expr.children.pets.$modify);
// prints ["onlyId"]

expr.children.movies = true;
// You can modify the object and pass it back to the `withGraphFetched` method.
builder.withGraphFetched(expr);
```

Returns the object representation of the relation expression passed to either `withGraphFetched` or `withGraphJoined`.

See [this section](/api/types/#relationexpression-object-notation) for more examples and information about the structure of the returned object.

##### Return value

| Type   | Description                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| object | Object representation of the current relation expression passed to either `withGraphFetched` or `withGraphJoined`. |

## allowGraph()

```js
queryBuilder = queryBuilder.allowGraph(relationExpression);
```

Sets the allowed tree of relations to fetch, insert or upsert using [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched), [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined), [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) or [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) methods.

When using [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) or [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) the query is rejected and an error is thrown if the [expression](/api/types/#type-relationexpression) passed to the methods is not a subset of the [expression](/api/types/#type-relationexpression) passed to `allowGraph`. This method is useful when the relation expression comes from an untrusted source like query parameters of a http request.

If the model tree given to the [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) or the [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method isn't a subtree of the given [expression](/api/types/#type-relationexpression), the query is rejected and and error is thrown.

See the examples.

##### Arguments

| Argument           | Type                                                      | Description                     |
| ------------------ | --------------------------------------------------------- | ------------------------------- |
| relationExpression | [RelationExpression](/api/types/#type-relationexpression) | The allowed relation expression |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

This will throw because `actors` is not allowed.

```js
await Person.query()
  .allowGraph('[children.pets, movies]')
  .withGraphFetched('movies.actors');
```

This will not throw:

```js
await Person.query()
  .allowGraph('[children.pets, movies]')
  .withGraphFetched('children.pets');
```

Calling `allowGraph` multiple times merges the expressions. The following is equivalent to the previous example:

```js
await Person.query()
  .allowGraph('children.pets')
  .allowGraph('movies')
  .withGraphFetched(req.query.eager);
```

Usage in `insertGraph` and `upsertGraph` works the same way. The following will not throw.

```js
const insertedPerson = await Person.query()
  .allowGraph('[children.pets, movies]')
  .insertGraph({
    firstName: 'Sylvester',
    children: [
      {
        firstName: 'Sage',
        pets: [
          {
            name: 'Fluffy',
            species: 'dog'
          },
          {
            name: 'Scrappy',
            species: 'dog'
          }
        ]
      }
    ]
  });
```

This will throw because `cousins` is not allowed:

```js
const insertedPerson = await Person.query()
  .allowGraph('[children.pets, movies]')
  .upsertGraph({
    firstName: 'Sylvester',

    children: [
      {
        firstName: 'Sage',
        pets: [
          {
            name: 'Fluffy',
            species: 'dog'
          },
          {
            name: 'Scrappy',
            species: 'dog'
          }
        ]
      }
    ],

    cousins: [sylvestersCousin]
  });
```

You can use [clearAllowGraph](/api/query-builder/eager-methods.html#clearallowgraph) to clear any previous calls to `allowGraph`.

## clearAllowGraph()

Clears all calls to `allowGraph`.

## clearWithGraph()

Clears all calls to `withGraphFetched` and `withGraphJoined`.

## modifyGraph()

```js
queryBuilder = queryBuilder.modifyGraph(pathExpression, modifier);
```

Can be used to modify `withGraphFetched` and `withGraphJoined` queries.

The `pathExpression` is a relation expression that specifies the queries for which the modifier is given.

The following query would filter out the children's pets that are <= 10 years old:

##### Arguments

| Argument       | Type                                                                                           | Description                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| pathExpression | [RelationExpression](/api/types/#type-relationexpression)                                      | Expression that specifies the queries for which to give the filter.                                                                 |
| modifier       | function([QueryBuilder](/api/query-builder/)&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;string[] | A modifier function, [model modifier](/api/model/static-properties.html#static-modifiers) name or an array of model modifier names. |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
Person.query()
  .withGraphFetched('[children.[pets, movies], movies]')
  .modifyGraph('children.pets', builder => {
    builder.where('age', '>', 10);
  });
```

The path expression can have multiple targets. The next example sorts both the pets and movies of the children by id:

```js
Person.query()
  .withGraphFetched('[children.[pets, movies], movies]')
  .modifyGraph('children.[pets, movies]', builder => {
    builder.orderBy('id');
  });
```

This example only selects movies whose name contains the word 'Predator':

```js
Person.query()
  .withGraphFetched('[children.[pets, movies], movies]')
  .modifyGraph('[children.movies, movies]', builder => {
    builder.where('name', 'like', '%Predator%');
  });
```

The modifier can also be a [Model modifier](/api/model/static-properties.html#static-modifiers) name, or an array of them:

```js
Person.query()
  .withGraphFetched('[children.[pets, movies], movies]')
  .modifyGraph('children.movies', 'selectId');
```