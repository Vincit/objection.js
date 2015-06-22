# Table of contents

- [Raw queries](#raw-queries)
- [Change id column](#change-id-column)
- [Map column names to different property names](#map-column-names-to-different-property-names)
- [Paging](#paging)
- [Subqueries](#subqueries)
- [Joins](#joins)

## Raw queries

To write raw SQL queries, use the `.raw()` method of knex. You can always access a knex
instance through [knex()](http://vincit.github.io/moron.js/MoronModel.html#_P_knex) method of
any model class. There are also some helper methods such as `whereRaw()` in the `MoronQueryBuilder`.

```js
var knex = Person.knex();
Person
  .query()
  .select(knex.raw('coalesce(sum(age), 0) as "childAgeSum"'))
  .groupBy('parentId')
  .then(function (childAgeSums) {
    console.log(childAgeSums[0].childAgeSum);
  });
```

In transactions `this` points to the knex instance:

```js
moron.transaction(Person, function (Person) {
  var knex = this;

  return knex.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE').then(function () {
    return Person.query().insert(req.body);
  });
});
```

## Change id column

Name of the identifier column can be changed by setting the static `idColumn` property of
a model class.

```js
Person.idColumn = 'person_id';
```

## Map column names to different property names

Sometimes you may want to use for example snake_cased column names in database tables
and camelCased property names in code. You can use the functions

- [$parseDatabaseJson](http://vincit.github.io/moron.js/MoronModel.html#SparseDatabaseJson)
- [$formatDatabaseJson](http://vincit.github.io/moron.js/MoronModel.html#SformatDatabaseJson)
- [$parseJson](http://vincit.github.io/moron.js/MoronModel.html#SparseJson)
- [$formatJson](http://vincit.github.io/moron.js/MoronModel.html#SformatJson)

to convert data between database and "external" representations. Example of the mentioned
snake_case/camelCase conversion:

```js
// This is called when an object is serialized to database format.
Person.prototype.$formatDatabaseJson = function (json) {
  // Call superclass implementation.
  json = MoronModel.prototype.$formatDatabaseJson.call(this, json);

  return _.mapKeys(json, function (value, key) {
    return _.snakeCase(key);
  });
};

// This is called when an object is read from database.
Person.prototype.$parseDatabaseJson = function (json) {
  json = _.mapKeys(json, function (value, key) {
    return _.camelCase(key);
  });

  // Call superclass implementation.
  return MoronModel.prototype.$parseDatabaseJson.call(this, json);
};
```

## Paging

Any query can be paged using the [page](http://vincit.github.io/moron.js/MoronQueryBuilder.html#page) or
[range](http://vincit.github.io/moron.js/MoronQueryBuilder.html#range) method.

```js
Person
  .query()
  .where('age', '>', 20)
  .page(5, 100)
  .then(function (result) {
    console.log(result.results.length); // --> 100
    console.log(result.total); // --> 3341
  });
```

## Subqueries

Subqueries can be written just like in knex: by passing a function in place of a value.

```js
Person
  .query()
  .where('age', '>', function () {
    this.avg('age').from('Person');
  })
  .then(function (personsOlderThanAverage) {
    console.log(personsOlderThanAverage);
  });
```

A bunch of query building methods accept a function. See the knex.js documentation or
just try it out. A function is accepted in most places you would expect.

## Joins

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join).

```js
Person
  .query()
  .select('Person.*', 'Parent.firstName as parentName')
  .join('Person as Parent', 'Person.parentId', 'Parent.id')
  .then(function (persons) {
    console.log(persons[0].parentName);
  });
```
