# Eager Methods

## eager()

```js
queryBuilder = queryBuilder.eager(relationExpression, modifiers);
```

Fetch relations eagerly for the result rows.

See the [eager loading](/guide/query-examples.html#eager-loading) section for more examples and [RelationExpression](/api/types/#type-relationexpression) for more info on the relation expression language.

You can choose the way objection performs the eager loading by using [eagerAlgorithm](/api/query-builder/eager-methods.html#eageralgorithm) method on a query builder or by setting the [defaultEagerAlgorithm](/api/model/static-properties.html#static-defaulteageralgorithm) property of a model. The three algorithms currently available are `Model.WhereInEagerAlgorithm` (the default) `Model.JoinEagerAlgorithm` and `Model.NaiveEagerAlgorithm`. All three have their strengths and weaknesses. We will go through the main differences below. You can always see the executed SQL by calling the [debug](/api/query-builder/other-methods.html#debug) method for the query builder.

<b>WhereInEagerAlgorithm</b>

This algorithm uses multiple queries to fetch the related objects. Objection performs one query per level in the eager tree. For example only two additional queries will be created for eager expression `children.children` no matter how many children the model has or how many children each of the children have. This algorithm is explained in detail in [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

Limitations:

 * Relations cannot be referred in the query because they are not joined.
 * `limit` and `page` methods will work incorrectly when applied to a relation using `modifyEager`, because they will be applied on a query that fetches relations for multiple parents. You can use `limit` and `page` for the root query.

<b>JoinEagerAlgorithm</b>

This algorithm uses joins to fetch the whole eager tree using one single query. This allows you to reference the relations in the root query (see the last example). The related tables can be referred using the relation name. Nested relations must be separated by `:` character (dot is not used because of the way knex parses identifiers).

When this algorithm is used, information schema queries are executed to get table column names. They are done only once for each table during the lifetime of the process and then cached.

Limitations:

 * `limit` and `page` methods will work incorrectly because they will limit the result set that contains all the result rows in a flattened format. For example the result set of the eager expression `children.children` will have `10 * 10 * 10` rows assuming the you fetched 10 models that all had 10 children that all had 10 children.

<b>NaiveEagerAlgorithm</b>

This algorithm naively fetches the relations using a separate query for each model. For example relation expression `children.children` will cause 111 queries to be performed assuming a result set of 10 each having 10 children each having 10 children. For small result sets this doesn't matter. The clear benefit of this algorithm is that there are no limitations. You can use `offset`, `limit`, `min`, `max` etc. in `modifyEager`. You can for example fetch only the youngest child for each parent.

<b>Performance differences</b>

`WhereInEagerAlgorithm` performs more queries than `JoinEagerAlgorithm` which can cause a significant delay especially if the round trip time to the database server is significant. On the other hand the result from `WhereInEagerAlgorithm` is trivial to parse into a tree structure while the result of `JoinEagerAlgorithm` needs some complex parsing which can lead to a significant performance decrease. Which method is faster depends heavily on the query and the environment. You should select the algorithm that makes your code cleaner and only consider performance if you have an actual measured real-life problem. Don't optimize prematurely! `NaiveEagerAlgorithm` is by far the slowest. It should only be used for
cases where performance doesn't matter and when it is the only option to get the job done.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The eager expression
modifiers|Object&lt;string,&nbsp;function([QueryBuilder](/api/query-builder/))&gt;|The modifier functions for the expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
// Fetch `children` relation for each result Person and `pets` and `movies`
// relations for all the children.
const people = await Person
  .query()
  .eager('children.[pets, movies]');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be modified by giving modifier functions as arguments to the relations:

```js
const people = await Person
  .query()
  .eager('children(selectNameAndId).[pets(onlyDogs, orderByName), movies]', {
    selectNameAndId: (builder) => {
      builder.select('name', 'id');
    },
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  });

console.log(people[0].children[0].pets[0].name);
cconsole.log(people[0].children[0].movies[0].id);
```

Reusable modifiers can be defined for a model class using [modifiers](/api/model/static-properties.html#static-modifiers)

```js
class Person extends Model {
  static get modifiers() {
    return {
      defaultSelects(builder) {
        builder.select('id', 'firstName', 'lastName')
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

      onlyDogs(builder) {
        builder.where('species', 'dog');
      }
    };
  }
}

const people = await Person
  .query()
  .eager(`
    children(defaultSelects, orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `);

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Filters can also be registered using the [modifyEager](/api/query-builder/other-methods.html#modifyeager) method:

```js
const people = await Person
  .query()
  .eager('children.[pets, movies]')
  .modifyEager('children', builder => {
    // Order children by age and only select id.
    builder.orderBy('age').select('id');
  })
  .modifyEager('children.[pets, movies]', builder => {
    // Only select `pets` and `movies` whose id > 10 for the children.
    builder.where('id', '>', 10);
  })
  .modifyEager('children.movies]', builder => {
    // Only select 100 first movies for the children.
    builder.limit(100);
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be given aliases using the `as` keyword:

```js
const people = await Person
  .query()
  .eager(`[
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

The eager queries are optimized to avoid the N + 1 query problem. Consider this query:

```js
const people = await Person
  .query()
  .where('id', 1)
  .eager('children.children');

console.log(people[0].children.length); // --> 10
console.log(people[0].children[9].children.length); // --> 10
```

The person has 10 children and they all have 10 children. The query above will return 100 database rows but will generate only three database queries when using `WhereInEagerAlgorithm` and only one query when using `JoinEagerAlgorithm`.

The loading algorithm can be changed using the [eagerAlgorithm](/api/query-builder/eager-methods.html#eageralgorithm) method:

```js
const people = await Person
  .query()
  .where('id', 1)
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[movies, children.pets]')
  .where('movies.name', 'like', '%terminator%')
  .where('children:pets.species', 'dog');

console.log(people);
```

## eagerAlgorithm()

```js
queryBuilder = queryBuilder.eagerAlgorithm(algo);
```

Select the eager loading algorithm for the query. See comparison between
the available algorithms [here](/api/query-builder/eager-methods.html#eager).

##### Arguments

Argument|Type|Description
--------|----|--------------------
algo|EagerAlgorithm|The eager loading algorithm to use. One of `Model.JoinEagerAlgorithm`, `Model.WhereInEagerAlgorithm` and `Model.NaiveEagerAlgorithm`.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const people = await Person
  .query()
  .eagerAlgorithm(Person.JoinEagerAlgorithm)
  .eager('[pets, children]')
```

## eagerOptions()

```js
queryBuilder = queryBuilder.eagerOptions(options);
```

Sets [options](/api/types/#type-eageroptions) for the eager query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
options|[EagerOptions](/api/types/#type-eageroptions)|Options to set.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const people = await Person
  .query()
  .eagerOptions({joinOperation: 'innerJoin'})
  .eager('[pets, children]')
```

## joinEager()

```js
queryBuilder = queryBuilder.joinEager(expr, modifiers)
```

Shorthand for

```js
queryBuilder
  .eagerAlgorithm(Model.JoinEagerAlgorithm)
  .eager(expr, modifiers)
```

When this algorithm is used, information schema queries are executed to get table column names. They are done only once for each table during the lifetime of the process and then cached.

## naiveEager()

```js
queryBuilder = queryBuilder.naiveEager(expr, modifiers)
```

Shorthand for

```js
queryBuilder
  .eagerAlgorithm(Model.NaiveEagerAlgorithm)
  .eager(expr, modifiers)
```

## mergeEager()

Just like [eager](/api/query-builder/eager-methods.html#eager) but instead of replacing query builder's eager expression this method merges the given expression to the existing expression.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The eager expression
modifiers|Object&lt;string,&nbsp;function([QueryBuilder](/api/query-builder/))&gt;|The modifier functions for the expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following queries are equivalent

```js
Person
  .query()
  .eager('[children.pets, movies]')
```

```js
Person
  .query()
  .eager('children')
  .mergeEager('children.pets')
  .mergeEager('movies')
```

```js
Person
  .query()
  .eager('children.pets')
  .mergeEager('movies')
```

```js
Person
  .query()
  .mergeEager('children.pets')
  .mergeEager('movies')
```

## mergeJoinEager()

Shorthand for `eagerAlgorithm(Model.JoinEagerAlgorithm).mergeEager(expr)`.

## mergeNaiveEager()

Shorthand for `eagerAlgorithm(Model.NaiveEagerAlgorithm).mergeEager(expr)`.

## eagerObject()

```js
const builder = Person.query()
  .eager('children.pets(onlyId)')

const eagerObject = builder.eagerObject();
console.log(eagerObject.children.pets.modify);
// prints ["onlyId"]

eagerObject.children.movies = true
// You can modify the object and pass it back to the `eager` method.
builder.eager(eagerObject)
```

Returns the object representation of the current eager expression.

See [this section](/api/types/#relationexpression-object-notation) for more examples and information about the structure of the returned object.

##### Return value

Type|Description
----|-----------------------------
object|Object representation of the current eager expression.

## eagerModifiers()

```js
const builder = Person.query()
  .eager('children.pets(onlyId)', {
    onlyId: builder.select('id')
  })

const modifiers = builder.eagerModifiers();
console.log(modifiers.onlyId.toString());
// prints 'builder => builder.select("id")'
```

Returns the current eager modifiers of the query.

##### Return value

Type|Description
----|-----------------------------
object|Eager modifiers of the query.

## allowEager()

```js
queryBuilder = queryBuilder.allowEager(relationExpression);
```

Sets the allowed eager expression.

Any subset of the allowed expression is accepted by [eager](/api/query-builder/eager-methods.html#eager) method. For example setting the allowed expression to `a.b.c` expressions `a`, `a.b` and `a.b.c` are accepted by [eager](/api/query-builder/eager-methods.html#eager) method. Setting any other expression will reject the query and cause the promise error handlers to be called.

This method is useful when the eager expression comes from an untrusted source like query parameters of a http request.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
Person
  .query()
  .allowEager('[children.pets, movies]')
  .eager(req.query.eager)
```

## mergeAllowEager()

Just like [allowEager](/api/query-builder/eager-methods.html#alloweager) but instead of replacing query builder's allowEager expression this method merges the given expression to the existing expression.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|The allowed eager expression

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following queries are equivalent

```js
Person
  .query()
  .allowEager('[children.pets, movies]')
```

```js
Person
  .query()
  .allowEager('children')
  .mergeAllowEager('children.pets')
  .mergeAllowEager('movies')
```

```js
Person
  .query()
  .allowEager('children.pets')
  .mergeAllowEager('movies')
```

```js
Person
  .query()
  .mergeAllowEager('children.pets')
  .mergeAllowEager('movies')
```

## modifyEager()

```js
queryBuilder = queryBuilder.modifyEager(pathExpression, modifier);
```

Can be used to modify eager queries.

The `pathExpression` is a relation expression that specifies the queries for which the modifier is given.

The following query would filter out the children's pets that are <= 10 years old:

##### Arguments

Argument|Type|Description
--------|----|--------------------
pathExpression|[RelationExpression](/api/types/#type-relationexpression)|Expression that specifies the queries for which to give the filter.
modifier|function([QueryBuilder](/api/query-builder/)&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;string[]|A modifier function, [model modifier](/api/model/static-properties.html#static-modifiers) name or an array of model modifier names.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    builder.where('age', '>', 10);
  })
```

The path expression can have multiple targets. The next example sorts both the pets and movies of the children by id:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.[pets, movies]', builder => {
    builder.orderBy('id');
  })
```

This example only selects movies whose name contains the word 'Predator':

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('[children.movies, movies]', builder => {
    builder.where('name', 'like', '%Predator%');
  })
```

The modifier can also be a [Model modifier](/api/model/static-properties.html#static-modifiers) name, or an array of them:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.movies', 'selectId')
```

## filterEager()

Alias for [modifyEager](/api/query-builder/other-methods.html#modifyeager).
