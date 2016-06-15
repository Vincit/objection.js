# Changelog

## 0.5.1

### What's new

* [$afterGet](#afterget) hook.

## 0.5.0 

### What's new

* [joinRelation](#joinrelation) family of query builder methods.
* `HasOneRelation` for creating inverse one-to-one relations.
* Relations have been renamed `OneToOneRelation` --> `BelongsToOneRelation`, `OneToManyRelation` --> `HasManyRelation`.
  The old names work, but have been deprecated.
* [withSchema](#withschema) now works as expected and sets the schema of all queries executed by the query builder the
  method is called for.
* [filterEager](#filtereager) method for better eager query filtering.
* [extra properties](#relationmappings) feature for selecting/inserting columns from/to the join table in many-to-many relations.
* Eager query recursion depth can be controlled like so: `parent.^5`.

## 0.4.0

### What's new

 * Query context feature. See [#51](https://github.com/Vincit/objection.js/issues/51) and [these docs](#context) for more info.
 * Composite key support.
 * [findById](#findbyid), [deleteById](#deletebyid), [whereComposite](#wherecomposite) and
   [whereInComposite](#whereincomposite) query builder methods.

### Breaking changes

There shouldn't be any major breaking changes. We moved from ES5 to ES7 + babel in this version so there are big changes
in the codebase. If something comes up, please open an issue.

There are a few known corner cases that may break:

 * You can now define a model for the join table of `ManyToMany` relations in `relationMappings`. This is optional,
   but may be needed if you already have a model for a `ManyToMany` relation *and* you use `snake_case`
   to `camelCase` conversion for the column names. See the documentation on the [through](#relationthrough)
   property of [relationMappings](#relationmappings).

 * The repo no longer contains the actual built javascript. Only the ES7 code that is transpiled when the code is
   published to npm. Therefore you can no longer specify a git hash to package.json to use for example the
   HEAD version. We will start to publish alpha and RC versions to npm when something new and experimental
   is added to the library.

## 0.3.3

### What's new

 * fix regression: QueryBuilder.from is broken.

## 0.3.2

### What's new

 * Improved relation expression whitespace handling.

## 0.3.1

### What's new

 * `whereJson*` methods can now be used inside functions given to `where` methods.
 * Added multiple missing knex methods to `QueryBuilder`.

## 0.3.0

### What's new

 * [insertWithRelated](http://vincit.github.io/objection.js/QueryBuilder.html#insertWithRelated) method for
   inserting model trees
 * [insertAndFetch](http://vincit.github.io/objection.js/QueryBuilder.html#insertAndFetch),
   [updateAndFetchById](http://vincit.github.io/objection.js/QueryBuilder.html#updateAndFetchById) and
   [patchAndFetchById](http://vincit.github.io/objection.js/QueryBuilder.html#patchAndFetchById) helper methods
 * Filters for [eager expressions](#eager-queries)
 * [New alternative way to use transactions](#transaction-object)
 * Many performance updates related to cloning, serializing and deserializing model trees.

### Breaking changes

 * QueryBuilder methods `update`, `patch` and `delete` now return the number of affected rows.
   The new methods `updateAndFetchById` and `patchAndFetchById` may help with the migration
 * `modelInstance.$query()` instance method now returns a single model instead of an array
 * Removed `Model.generateId()` method. `$beforeInsert` can be used instead

## 0.2.8

### What's new

 * ES6 inheritance support
 * generator function support for transactions
 * traverse,pick and omit methods for Model and QueryBuilder
 * bugfix: issue #38
 
## 0.2.7

### What's new

 * bugfix: fix #37 also for `$query()`.
 * Significant `toJson`/`fromJson` performance boost.

## 0.2.6

### What's new

 * bugfix: fix regression bug that broke dumpSql.

## 0.2.5

### What's new

 * bugfix: fix regression bug that prevented values assigned to `this` in `$before` callbacks from getting into
   the actual database query

## 0.2.4

### What's new

 * bugfix: many-to-many relations didn't work correctly with a snake_case to camelCase conversion
   in the related model class.

## 0.2.3

### What's new

 * Promise constructor is now exposed through `require('objection').Promise`.

## 0.2.2

### What's new

 * $beforeUpdate, $afterUpdate, $beforeInsert etc. are now asynchronous and you can return promises from them.
 * Added `Model.fn()` shortcut to `knex.fn`.
 * Added missing `asCallback` and `nodeify` methods for `QueryBuilder`.

## 0.2.1

### What's new

 * bugfix: Chaining `insert` with `returning` now returns all listed columns. 

## 0.2.0

### What's new

 * New name `objection.js`.
 * `$beforeInsert`, `$afterInsert`, `$beforeUpdate` and `$afterUpdate` hooks for `Model`.
 * Postgres jsonb query methods: `whereJsonEquals`, `whereJsonSupersetOf`, `whereJsonSubsetOf` and friends.
 * `whereRef` query method.
 * Expose `knex.raw()` through `Model.raw()`.
 * Expose `knex.client.formatter()` through `Model.formatter()`.
 * `QueryBuilder` can be used to make sub queries just like knex's `QueryBuilder`.
 * Possibility to use a custom `QueryBuilder` subclass by overriding `Model.QueryBuilder`.
 * Filter queries/objects for relations.
 * A pile of bug fixes.

### Breaking changes

 * Project was renamed to objection.js. Migrate simply by replacing `moron` with `objection`.

## 0.1.0

First release.