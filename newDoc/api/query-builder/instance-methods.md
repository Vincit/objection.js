# Instance Methods

## insert()

```js
const builder = queryBuilder.insert(modelsOrObjects);
```

Creates an insert query.

The inserted objects are validated against the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema). If validation fails
the Promise is rejected with a [ValidationError](/api/objection.html#objection-validationerror).

NOTE: The return value of the insert query _only_ contains the properties given to the insert
method plus the identifier. This is because we don't make an additional fetch query after
the insert. Using postgres you can chain [returning('*')](/api/query-builder/instance-methods.html#returning) to the query to get all
properties - see [this recipe](/recipes/returning-tricks.html) for some examples. If you use
`returning(['only', 'some', 'props'])` note that the result object will still contain the input properies
__plus__ the properties listed in `returning`. On other databases you can use the [insertAndFetch](/api/query-builder/instance-methods.html#insertandfetch) method.

Batch inserts only work on Postgres because Postgres is the only database engine
that returns the identifiers of _all_ inserted rows. knex supports batch inserts on
other databases also, but you only get the id of the first (or last) inserted object
as a result. If you need batch insert on other databases you can use knex directly
through [knexQuery](/api/model/static-methods.html#static-knexquery).

#### Arguments

Argument|Type|Description
--------|----|--------------------
modelsOrObjects|Object&#124;[Model](/api/model/)&#124;Object[]&#124;[Model](/api/model/)[];|Objects to insert

#### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

#### Examples

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

console.log(jennifer.id);
```

Batch insert (Only works on Postgres):

```js
const actors = await someMovie
  .$relatedQuery('actors')
  .insert([
    {firstName: 'Jennifer', lastName: 'Lawrence'},
    {firstName: 'Bradley', lastName: 'Cooper'}
  ]);

console.log(actors[0].firstName);
console.log(actors[1].firstName);
```

You can also give raw expressions and subqueries as values like this:

```js
const { raw } = require('objection');

await Person
  .query()
  .insert({
    age: Person.query().avg('age'),
    firstName: raw("'Jenni' || 'fer'")
  });
```

Fields marked as `extras` for many-to-many relations in [relationMappings](/api/model/static-properties.html#static-relationmappings) are automatically
written to the join table instead of the target table. The `someExtra` field in the following example is written
to the join table if the `extra` array of the relation mapping contains the string `'someExtra'`.

```js
const jennifer = await someMovie
  .$relatedQuery('actors')
  .insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    someExtra: "I'll be written to the join table"
  });

console.log(jennifer.someExtra);
```

## insertGraph()

## patch()
