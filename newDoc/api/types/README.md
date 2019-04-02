---
sidebar: auto
---

# Types

## `type` RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation`, `Model.ManyToManyRelation` and `Model.HasOneThroughRelation`.
modelClass|[Model](/api/model/)<br>string|Constructor of the related model class, an absolute path to a module that exports one or a path relative to [modelPaths](/api/model/static-properties.html#static-modelpaths) that exports a model class.
join|[RelationJoin](#type-relationjoin)|Describes how the models are related to each other. See [RelationJoin](#type-relationjoin).
modify|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Optional modifier for the relation query. If specified as a function, it will be called each time before fetching the relation. If specified as a string, named filter with specified name will be applied each time when fetching the relation. If specified as an object, it will be used as an additional query parameter - e. g. passing {name: 'Jenny'} would additionally narrow fetched rows to the ones with the name 'Jenny'.
filter|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Alias for modify.
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted model instance. This function can be async.

## `type` RelationJoin

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the owner table. Must be given with the table name. For example `persons.id`. Composite key can be specified using an array of columns e.g. `['persons.a', 'persons.b']`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the related table. Must be given with the table name. For example `movies.id`. Composite key can be specified using an array of columns e.g. `['movies.a', 'movies.b']`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
through|[RelationThrough](#type-relationthrough)|Describes the join table if the models are related through one.

## `type` RelationThrough

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `from` property of the `RelationJoin`. For example `Person_movies.actorId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `to` property of the `RelationJoin`. For example `Person_movies.movieId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
modelClass|string<br>ModelClass|If you have a model class for the join table, you should specify it here. This is optional so you don't need to create a model class if you don't want to.
extra|string[]<br>Object|Columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert. The values can be aliased by providing an object `{propertyName: 'columnName', otherPropertyName: 'otherColumnName'} instead of array`
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted join table model instance. This function can be async.

## `type` ModelOptions

Property|Type|Description
--------|----|-----------
patch|boolean|If true the json is treated as a patch and the `required` field of the json schema is ignored in the validation. This allows us to create models with a subset of required properties for patch operations.
skipValidation|boolean|If true the json schema validation is skipped
old|object|The old values for methods like `$beforeUpdate` and `$beforeValidate`.

## `type` CloneOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored

## `type` ToJsonOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored. Default is false.
virtuals|boolean<br>string[]|If false, virtual attributes are omitted from the output. Default is true. You can also pass an array of property names and only those virtual properties get picked. You can even pass in property/function names that are not included in the static `virtualAttributes` array.

## `type` EagerOptions

Property|Type|Description
--------|----|-----------
minimize|boolean|If true the aliases of the joined tables and columns in a join based eager loading are minimized. This is sometimes needed because of identifier length limitations of some database engines. objection throws an exception when a query exceeds the length limit. You need to use this only in those cases.
separator|string|Separator between relations in nested join based eager query. Defaults to `:`. Dot (`.`) cannot be used at the moment because of the way knex parses the identifiers.
aliases|Object|Aliases for relations in a join based eager query. Defaults to an empty object.
joinOperation|string|Which join type to use `['leftJoin', 'innerJoin', 'rightJoin', ...]` or any other knex join method name. Defaults to `leftJoin`.

## `type` FieldExpression

Field expressions are strings that allow you to refer to JSONB fields inside columns.

Syntax: `<column reference>[:<json field reference>]`

e.g. `persons.jsonColumnName:details.names[1]` would refer to value `'Second'` in column `persons.jsonColumnName` which has
`{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.

First part `<column reference>` is compatible with column references used in knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.

Second part describes a path to an attribute inside the referred column. It is optional and it always starts with colon which follows directly with first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or `Table.jsonArrayColumn:[321]`.

Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference to json keys / array indexes:

e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly both of the following objects `[null, [null,null,null, "I was accessed"]]` and `{ "1": { "3" : "I was accessed" } }`

Caveats when using special characters in keys:

1. `objectColumn.key` This is the most common syntax, good if you are not using dots or square brackets `[]` in your json object key name.
2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
4. Keys containing square brackets and quotes `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]` Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
99. Keys containing dots, square brackets, single quotes and double quotes in one json key is not currently supported

There are some special methods that accept `FieldExpression` strings directly, like [whereJsonSupersetOf](/api/query-builder/instance-methods.html#wherejsonsupersetof) but you can use `FieldExpressions` anywhere with [ref](/api/objection/#ref). Here's an example:

```js
const { ref } = require('objection');

await Person.query()
  .select([
    'id',
    ref('persons.jsonColumn:details.name').castText().as('name'),
    ref('persons.jsonColumn:details.age').castInt().as('age')
  ])
  .join(
    'someTable',
    ref('persons.jsonColumn:details.name').castText(),
    '=',
    ref('someTable.name')
  )
  .where('age', '>', ref('someTable.ageLimit'));
```

In the above example, we assume `persons` table has a column named `jsonColumn` of type `jsonb` (only works on postgres).

## `type` RelationExpression

Relation expression is a simple DSL for expressing relation trees.

These strings are all valid relation expressions:

 * `children`
 * `children.movies`
 * `[children, pets]`
 * `[children.movies, pets]`
 * `[children.[movies, pets], pets]`
 * `[children.[movies.actors.[children, pets], pets], pets]`
 * `[children as kids, pets(filterDogs) as dogs]`

There are two tokens that have special meaning: `*` and `^`. `*` means "all relations recursively" and `^` means "this relation recursively".

For example `children.*` means "relation `children` and all its relations, and all their relations and ...".

::: warning
The * token must be used with caution or you will end up fetching your entire database.
:::

Expression `parent.^` is equivalent to `parent.parent.parent.parent...` up to the point a relation no longer has results for the `parent` relation. The recursion can be limited to certain depth by giving the depth after the `^` character. For example `parent.^3` is equal to `parent.parent.parent`.

Relations can be aliased using the `as` keyword.

For example the expression `children.[movies.actors.[pets, children], pets]` represents a tree:

```
              children
              (Person)
                 |
         -----------------
         |               |
       movies           pets
      (Movie)         (Animal)
         |
       actors
      (Person)
         |
    -----------
    |         |
   pets    children
 (Animal)  (Person)

```

The model classes are shown in parenthesis. When given to `eager` method, this expression would fetch all relations as shown in the tree above:

```js
const people = await Person
  .query()
  .eager('children.[movies.actors.[pets, children], pets]');

// All persons have the given relation tree fetched.
console.log(people[0].children[0].movies[0].actors[0].pets[0].name);
```

Relation expressions can have arguments. Arguments are used to refer to modifier functions (either [global](/api/model/static-properties.html#static-modifiers) or [local](/api/query-builder/instance-methods.html#eager)). Arguments are listed in parenthesis after the relation names like this:

```js
Person
  .query()
  .eager(`children(arg1, arg2).[movies.actors(arg3), pets]`)
```

You can spread eager expressions to multiple lines and add whitespace:

```js
Person
  .query()
  .eager(`[
    children.[
      pets,
      movies.actors.[
        pets,
        children
      ]
    ]
  ]`)
```

Eager expressions can be aliased using `as` keyword:

```js
Person
  .query()
  .eager(`[
    children as kids.[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats,

      movies.actors.[
        pets,
        children as kids
      ]
    ]
  ]`)
```

### RelationExpression object notation

In addition to the string expressions, a more verbose object notation can also be used.

The string expression in the comment is equivalent to the object expression below it:

```js
// `children`
{
  children: true
}
```

```js
// `children.movies`
{
  children: {
    movies: true
  }
}
```

```js
// `[children, pets]`
{
  children: true
  pets: true
}
```

```js
// `[children.[movies, pets], pets]`
{
  children: {
    movies: true,
    pets: true
  }
  pets: true
}
```

```js
// `parent.^`
{
  parent: {
    $recursive: true
  }
}
```

```js
// `parent.^5`
{
  parent: {
    $recursive: 5
  }
}
```

```js
// `parent.*`
{
  parent: {
    $allRecursive: true
  }
}
```

```js
// `[children as kids, pets(filterDogs) as dogs]`
{
  kids: {
    $relation: 'children'
  },

  dogs: {
    $relation: 'pets',
    $modify: ['filterDogs']
  }
}
```

## `class` ValidationError

## `class` NotFoundError
