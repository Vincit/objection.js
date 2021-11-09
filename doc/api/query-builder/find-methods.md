# Find Methods

## findById()

```js
queryBuilder = queryBuilder.findById(id);
```

Finds a single item by id.

##### Arguments

| Argument | Type                       | Description     |
| -------- | -------------------------- | --------------- |
| id       | any&nbsp;&#124;&nbsp;any[] | The identifier. |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
const person = await Person.query().findById(1);
```

Composite key:

```js
const person = await Person.query().findById([1, '10']);
```

`findById` can be used together with `patch`, `delete` and any other query method. All it does is adds the needed `where` clauses to the query.

```js
await Person.query()
  .findById(someId)
  .patch({ firstName: 'Jennifer' });
```

## findByIds()

```js
queryBuilder = queryBuilder.findByIds(ids);
```

Finds a list of items. The order of the returned items is not guaranteed to be the same as the order of the inputs.

##### Arguments

| Argument | Type  | Description            |
| -------- | ----- | ---------------------- |
| ids      | any[] | A List of identifiers. |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
const [person1, person2] = await Person.query().findByIds([1, 2]);
```

Composite key:

```js
const [person1, person2] = await Person.query().findByIds([
  [1, '10'],
  [2, '10']
]);
```

## findOne()

```js
queryBuilder = queryBuilder.findOne(...whereArgs);
```

Shorthand for `where(...whereArgs).first()`.

##### Arguments

| Argument  | Type   | Description                                                                      |
| --------- | ------ | -------------------------------------------------------------------------------- |
| whereArgs | ...any | Anything the [where](/api/query-builder/find-methods.html#where) method accepts. |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
const person = await Person.query().findOne({
  firstName: 'Jennifer',
  lastName: 'Lawrence'
});
```

```js
const person = await Person.query().findOne('age', '>', 20);
```

```js
const person = await Person.query().findOne(raw('random() < 0.5'));
```

## alias()

```js
queryBuilder = queryBuilder.alias(alias);
```

Give an alias for the table to be used in the query.

##### Arguments

| Argument | Type   | Description                |
| -------- | ------ | -------------------------- |
| alias    | string | Table alias for the query. |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
await Person.query()
  .alias('p')
  .where('p.id', 1)
  .join('persons as parent', 'parent.id', 'p.parentId');
```

## aliasFor()

```js
queryBuilder = queryBuilder.aliasFor(tableNameOrModelClass, alias);
```

Give an alias for any table in the query.

##### Arguments

| Argument              | Type                               | Description                        |
| --------------------- | ---------------------------------- | ---------------------------------- |
| tableNameOrModelClass | string&nbsp;&#124;&nbsp;ModelClass | The table or model class to alias. |
| alias                 | string                             | The alias.                         |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
// This query uses joinRelated to join a many-to-many relation which also joins
// the join table `persons_movies`. We specify that the `persons_movies` table
// should be called `pm` instead of the default `movies_join`.
await Person.query()
  .aliasFor('persons_movies', 'pm')
  .joinRelated('movies')
  .where('pm.someProp', 100);
```

Model class can be used instead of table name

```js
await Person.query()
  .aliasFor(Movie, 'm')
  .joinRelated('movies')
  .where('m.name', 'The Room');
```

## select()

See [knex documentation](http://knexjs.org/#Builder-select)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## forUpdate()

See [knex documentation](http://knexjs.org/#Builder-forUpdate)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## forShare()

See [knex documentation](http://knexjs.org/#Builder-forShare)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## skipLocked()

See [knex documentation](http://knexjs.org/#Builder-skipLocked)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## noWait()

See [knex documentation](http://knexjs.org/#Builder-noWait)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## as()

See [knex documentation](http://knexjs.org/#Builder-as)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## columns()

See [knex documentation](http://knexjs.org/#Builder-columns)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## column()

See [knex documentation](http://knexjs.org/#Builder-column)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## from()

See [knex documentation](http://knexjs.org/#Builder-from)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## into()

See [knex documentation](http://knexjs.org/#Builder-into)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## with()

See [knex documentation](http://knexjs.org/#Builder-with)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## withSchema()

See [knex documentation](http://knexjs.org/#Builder-withSchema)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## table()

See [knex documentation](http://knexjs.org/#Builder-table)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## distinct()

See [knex documentation](http://knexjs.org/#Builder-distinct)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## distinctOn()

See [knex documentation](http://knexjs.org/#Builder-distinctOn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## where()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## andWhere()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhere()

See [knex documentation](http://knexjs.org/#Builder-where)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNot()

See [knex documentation](http://knexjs.org/#Builder-whereNot)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNot()

See [knex documentation](http://knexjs.org/#Builder-whereNot)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereRaw()

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereWrapped()

See [knex documentation](http://knexjs.org/#Builder-wheres)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## havingWrapped()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereRaw()

See [knex documentation](http://knexjs.org/#Builder-whereRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereExists()

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereExists()

See [knex documentation](http://knexjs.org/#Builder-whereExists)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNotExists()

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNotExists()

See [knex documentation](http://knexjs.org/#Builder-whereNotExists)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereIn()

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereIn()

See [knex documentation](http://knexjs.org/#Builder-whereIn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNotIn()

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNotIn()

See [knex documentation](http://knexjs.org/#Builder-whereNotIn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNull()

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNull()

See [knex documentation](http://knexjs.org/#Builder-whereNull)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNotNull()

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNotNull()

See [knex documentation](http://knexjs.org/#Builder-whereNotNull)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereBetween()

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNotBetween()

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereBetween()

See [knex documentation](http://knexjs.org/#Builder-whereBetween)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNotBetween()

See [knex documentation](http://knexjs.org/#Builder-whereNotBetween)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## andWhereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## andWhereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereNotColumn()

See [knex documentation](http://knexjs.org/#Builder-whereColumn)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## groupBy()

See [knex documentation](http://knexjs.org/#Builder-groupBy)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## groupByRaw()

See [knex documentation](http://knexjs.org/#Builder-groupByRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orderBy()

See [knex documentation](http://knexjs.org/#Builder-orderBy)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orderByRaw()

See [knex documentation](http://knexjs.org/#Builder-orderByRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## union()

See [knex documentation](http://knexjs.org/#Builder-union)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## unionAll()

See [knex documentation](http://knexjs.org/#Builder-unionAll)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## intersect()

See [knex documentation](http://knexjs.org/#Builder-unionAll)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |


## having()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## havingRaw()

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orHaving()

See [knex documentation](http://knexjs.org/#Builder-having)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orHavingRaw()

See [knex documentation](http://knexjs.org/#Builder-havingRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## offset()

See [knex documentation](http://knexjs.org/#Builder-offset)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## limit()

See [knex documentation](http://knexjs.org/#Builder-limit)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## count()

See [knex documentation](http://knexjs.org/#Builder-count)

Also see the [resultSize](/api/query-builder/other-methods.md#resultsize) method for a cleaner way to just get the number of rows a query would create.

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## countDistinct()

See [knex documentation](http://knexjs.org/#Builder-count)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## min()

See [knex documentation](http://knexjs.org/#Builder-min)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## max()

See [knex documentation](http://knexjs.org/#Builder-max)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## sum()

See [knex documentation](http://knexjs.org/#Builder-sum)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## avg()

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## avgDistinct()

See [knex documentation](http://knexjs.org/#Builder-avg)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## returning()

See [knex documentation](http://knexjs.org/#Builder-returning)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## columnInfo()

See [knex documentation](http://knexjs.org/#Builder-columnInfo)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## whereComposite()

```js
queryBuilder = queryBuilder.whereComposite(columns, operator, values);
```

[where](/api/query-builder/find-methods.html#where) for (possibly) composite keys.

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
builder.whereComposite(['id', 'name'], '=', [1, 'Jennifer']);
```

This method also works with a single column - value pair:

```js
builder.whereComposite('id', 1);
```

## whereInComposite()

```js
queryBuilder = queryBuilder.whereInComposite(columns, values);
```

[whereIn](/api/query-builder/find-methods.html#wherein) for (possibly) composite keys.

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
builder.whereInComposite(
  ['a', 'b'],
  [
    [1, 2],
    [3, 4],
    [1, 4]
  ]
);
```

```js
builder.whereInComposite('a', [[1], [3], [1]]);
```

```js
builder.whereInComposite('a', [1, 3, 1]);
```

```js
builder.whereInComposite(['a', 'b'], SomeModel.query().select('a', 'b'));
```

## whereJsonSupersetOf()

```js
queryBuilder = queryBuilder.whereJsonSupersetOf(
  fieldExpression,
  jsonObjectOrFieldExpression
);
```

Where left hand json field reference is a superset of the right hand json value or reference.

##### Arguments

| Argument                    | Type                                                                                               | Description                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| fieldExpression             | [FieldExpression](/api/types/#type-fieldexpression)                                                | Reference to column / json field, which is tested for being a superset |
| jsonObjectOrFieldExpression | Object&nbsp;&#124;&nbsp;Array&nbsp;&#124;&nbsp;[FieldExpression](/api/types/#type-fieldexpression) | To which to compare                                                    |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

```js
const people = await Person.query().whereJsonSupersetOf(
  'additionalData:myDogs',
  'additionalData:dogsAtHome'
);

// These people have all or some of their dogs at home. Person might have some
// additional dogs in their custody since myDogs is superset of dogsAtHome.

const people = await Person.query().whereJsonSupersetOf(
  'additionalData:myDogs[0]',
  { name: 'peter' }
);

// These people's first dog name is "peter", but the dog might have
// additional attributes as well.
```

Object and array are always their own supersets.

For arrays this means that left side matches if it has all the elements listed in the right hand side. e.g.

```
[1,2,3] isSuperSetOf [2] => true
[1,2,3] isSuperSetOf [2,1,3] => true
[1,2,3] isSuperSetOf [2,null] => false
[1,2,3] isSuperSetOf [] => true
```

The `not` variants with jsonb operators behave in a way that they won't match rows, which don't have the referred json key referred in field expression. e.g. for table

```
 id |    jsonObject
----+--------------------------
  1 | {}
  2 | NULL
  3 | {"a": 1}
  4 | {"a": 1, "b": 2}
  5 | {"a": ['3'], "b": ['3']}
```

this query:

```js
builder.whereJsonNotEquals('jsonObject:a', 'jsonObject:b');
```

Returns only the row `4` which has keys `a` and `b` and `a` != `b`, but it won't return any rows that don't have `jsonObject.a` or `jsonObject.b`.

## orWhereJsonSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/find-methods.html#wherejsonsupersetof)

## whereJsonNotSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/find-methods.html#wherejsonsupersetof)

## orWhereJsonNotSupersetOf()

See [whereJsonSupersetOf](/api/query-builder/find-methods.html#wherejsonsupersetof)

## whereJsonSubsetOf()

```js
queryBuilder = queryBuilder.whereJsonSubsetOf(
  fieldExpression,
  jsonObjectOrFieldExpression
);
```

Where left hand json field reference is a subset of the right hand json value or reference.

Object and array are always their own subsets.

See [whereJsonSupersetOf](/api/query-builder/find-methods.html#wherejsonsupersetof)

##### Arguments

| Argument                    | Type                                                                                               | Description                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| fieldExpression             | [FieldExpression](/api/types/#type-fieldexpression)                                                | Reference to column / json field, which is tested for being a superset |
| jsonObjectOrFieldExpression | Object&nbsp;&#124;&nbsp;Array&nbsp;&#124;&nbsp;[FieldExpression](/api/types/#type-fieldexpression) | To which to compare                                                    |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereJsonSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/find-methods.html#wherejsonsubsetof)

## whereJsonNotSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/find-methods.html#wherejsonsubsetof)

## orWhereJsonNotSubsetOf()

See [whereJsonSubsetOf](/api/query-builder/find-methods.html#wherejsonsubsetof)

## whereJsonIsArray()

```js
queryBuilder = queryBuilder.whereJsonIsArray(fieldExpression);
```

Where json field reference is an array.

##### Arguments

| Argument        | Type                                                | Description |
| --------------- | --------------------------------------------------- | ----------- |
| fieldExpression | [FieldExpression](/api/types/#type-fieldexpression) |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereJsonIsArray()

See [whereJsonIsArray](/api/query-builder/find-methods.html#wherejsonisarray)

## whereJsonNotArray()

See [whereJsonIsArray](/api/query-builder/find-methods.html#wherejsonisarray)

## orWhereJsonNotArray()

See [whereJsonIsArray](/api/query-builder/find-methods.html#wherejsonisarray)

## whereJsonIsObject()

```js
queryBuilder = queryBuilder.whereJsonIsObject(fieldExpression);
```

Where json field reference is an object.

##### Arguments

| Argument        | Type                                                | Description |
| --------------- | --------------------------------------------------- | ----------- |
| fieldExpression | [FieldExpression](/api/types/#type-fieldexpression) |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereJsonIsObject()

See [whereJsonIsObject](/api/query-builder/find-methods.html#wherejsonisobject)

## whereJsonNotObject()

See [whereJsonIsObject](/api/query-builder/find-methods.html#wherejsonisobject)

## orWhereJsonNotObject()

See [whereJsonIsObject](/api/query-builder/find-methods.html#wherejsonisobject)

## whereJsonHasAny()

```js
queryBuilder = queryBuilder.whereJsonHasAny(fieldExpression, keys);
```

Where any of given strings is found from json object keys.

::: tip
This doesn't work for arrays. If you want to check if an array contains an item, see [this](https://github.com/Vincit/objection.js/issues/415) and [this](https://github.com/Vincit/objection.js/issues/1133) issue.
:::

##### Arguments

| Argument        | Type                                                | Description                                  |
| --------------- | --------------------------------------------------- | -------------------------------------------- |
| fieldExpression | [FieldExpression](/api/types/#type-fieldexpression) |
| keys            | string&nbsp;&#124;&nbsp;string[]                    | Strings that are looked from object or array |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereJsonHasAny()

See [whereJsonHasAny](/api/query-builder/find-methods.html#wherejsonhasany)

## whereJsonHasAll()

```js
queryBuilder = queryBuilder.whereJsonHasAll(fieldExpression, keys);
```

Where all of given strings are found from json object keys.

::: tip
This doesn't work for arrays. If you want to check if an array contains an item, see [this](https://github.com/Vincit/objection.js/issues/415) and [this](https://github.com/Vincit/objection.js/issues/1133) issue.
:::

##### Arguments

| Argument        | Type                                                | Description                                  |
| --------------- | --------------------------------------------------- | -------------------------------------------- |
| fieldExpression | [FieldExpression](/api/types/#type-fieldexpression) |
| keys            | string&nbsp;&#124;&nbsp;string[]                    | Strings that are looked from object or array |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## orWhereJsonHasAll()

See [whereJsonHasAll](/api/query-builder/find-methods.html#wherejsonhasall)
