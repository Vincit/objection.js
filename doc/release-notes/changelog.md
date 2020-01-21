# Changelog

## 2.1.2

### What's new

- Fix `startTransaction` typings.

## 2.1.1

### What's new

- Fixes [#1489](https://github.com/Vincit/objection.js/issues/1489)

## 2.1.0

### What's new

- Fixes [#1638](https://github.com/Vincit/objection.js/issues/1638)
- Fixes [#1636](https://github.com/Vincit/objection.js/issues/1636)
- Fixes [#1615](https://github.com/Vincit/objection.js/issues/1615)

# Changelog

## 2.0.10

### What's new

- Fixes [#1630](https://github.com/Vincit/objection.js/issues/1630)

## 2.0.9

### What's new

- Fixes [#1606](https://github.com/Vincit/objection.js/issues/1606)

## 2.0.8

### What's new

- Fixes [#1627](https://github.com/Vincit/objection.js/issues/1627)

## 2.0.7

### What's new

- Fixes [#1607](https://github.com/Vincit/objection.js/issues/1607)

## 2.0.6

### What's new

- Fixes [#1603](https://github.com/Vincit/objection.js/issues/1603)

## 2.0.5

### What's new

- Fixes `upsertGraph` bug where composite keys were not selected correctly. See the fix [here](https://github.com/Vincit/objection.js/commit/0e58cf010348efc33e5459c055eea141f62f7561).

## 2.0.4

### What's new

- New `skipFetched` option for `fetchGraph` and `$fetchGraph`

## 2.0.3

### What's new

- Fixes [#1585](https://github.com/Vincit/objection.js/issues/1585)
- Fixes [#1361](https://github.com/Vincit/objection.js/issues/1361)
- Fixes [#1488](https://github.com/Vincit/objection.js/issues/1488)

## 2.0.0

### What's new

- Cleaner and more consistent API. A lot of methods have been renamed, removed combined and cleaned up. Most of the old methods still exist, but print a deprecation warning when first used. Some examples:

  - `eager` -> `withGraphFetched`
  - `joinEager` -> `withGraphJoined`
  - removed `eagerAlgorithm` (you must explicitly use either `withGraphFetched` or `withGraphJoined`)
  - merged `allowEager`, `allowInsert` and `allowUpsert` into one method `allowGraph`
  - `$loadRelated` -> `$fetchGraph`
  - `joinRelation` -> `joinRelated`
  - `$relatedQuery` no longer mutates the receiving model instances

- New [static hook API](/guide/hooks.html#static-query-hooks). The old instance hooks are still around.

- `relatedQuery` can now be used for more than just subqueries. See the examples [here](/guide/query-examples.html#relation-queries).

- modifiers can now take arguments and are a lot more useful. See [this recipe](https://vincit.github.io/objection.js/recipes/modifiers.html) for more info.

- Objection now uses the [db-errors](https://github.com/Vincit/db-errors) library by default to wrap the database errors.

- `insertMissing` `upsertGraph` option now works as expected with `relate: true`: items that are not found in the database are inserted.

- Brand new typings written from scratch with many improvements and finally a support for [custom query builders](/recipes/custom-query-builder.html#custom-query-builder)

- A bunch of improvements and bug fixes for `upsertGraph`, including a huge speedup in some cases due to less data fetching.

- A brand new [fn](/api/objection/#fn) helper for calling SQL functions.

- Objection now uses native promises instead of bluebird.

- Objection is now leaner as we dropped a bunch of dependencies like `bluebird` and `lodash`.

- In addition to all of this, a huge number of bugs has been squashed!

### Breaking changes

See the [migration guide](/1.x/migration.md).

## 1.6.10

- Fixes [#1455](https://github.com/Vincit/objection.js/issues/1455)

## 1.6.9

- Revert fix for [#1089](https://github.com/Vincit/objection.js/issues/1089). It was causing more bugs than it fixed. #1089 will be addressed in 2.0.
- Typings updates

## 1.6.8

- Fix [#1287](https://github.com/Vincit/objection.js/issues/1287)

## 1.6.7

- A bunch of regression bug fixes.

## 1.6.3

- Fixes: [#1227](https://github.com/Vincit/objection.js/issues/1227)

## 1.6.2

- Add `as` method for `raw` making it possible to use `raw` expressions in `joinEager` modifiers (as long as you give names to your raw expressions using `as`).

## 1.6.1

- Fix some very rare upsertGraph edge cases.

## 1.6.0

- Add `Model.traverseAsync` and `modelInstance.$traverseAsync` methods.

- Fixes: [#842](https://github.com/Vincit/objection.js/issues/842) and [#1205](https://github.com/Vincit/objection.js/issues/1205). This bug is about subqueries "inheriting" parent query table name and alias. This bug has been around a long time and there is a small chance that people have started accidentally or on purpose use it as a feature. If you get weird reference errors from subqueries (relation not found, table not found etc.) you may need to explicitly give an alias or use `from` in your subqueries after this update. This is a borderline breaking change, but since 2.0 is still pretty far away, I wanted to get this out faster. If I'm wrong and people are heavily depending on this bug, I'll revert the change.

- Fixes: [#1215](https://github.com/Vincit/objection.js/issues/1215)
- Fixes: [#1206](https://github.com/Vincit/objection.js/issues/1206)

## 1.5.3

### What's new

- Fixes [#1204](https://github.com/Vincit/objection.js/issues/1204)

## 1.5.1

### What's new

- Relations are now loaded lazily [#1202](https://github.com/Vincit/objection.js/issues/1202)
- `relationMappings.modelClass` can now be a function that returns a model class.

## 1.5.0

### What's new

- fix [#1131](https://github.com/Vincit/objection.js/issues/1131)
- fix [#1114](https://github.com/Vincit/objection.js/issues/1114)
- fix [#1185](https://github.com/Vincit/objection.js/issues/1185)
- fix [#1109](https://github.com/Vincit/objection.js/issues/1109)
- fix [#1110](https://github.com/Vincit/objection.js/issues/1110)
- add eagerObject and eagerModifiers accessors to QueryBuilder.
- complete rewrite of `insertGraph` and `upsertGraph` code. The rewrite brought a bunch of small performance optimizations and makes future development easier. No breaking changes.
- Chaining `returning('*')` to `insertGraph` or `upsertGraph` now propagates the call to all insert, update and delete operations.
- Code using objectio can now be transpilsed to ES5. No need to add babel workarounds anymore.

## 1.4.0

### What's new

- Add `modifierNotFound` hook [#1120](https://github.com/Vincit/objection.js/issues/1120)
- fix [#1121](https://github.com/Vincit/objection.js/issues/1121)
- fix [#1126](https://github.com/Vincit/objection.js/issues/1126)

## 1.3.0

### What's new

- Use `objection.raw` instead of `knex.raw` in `Model.raw`. [#1077](https://github.com/Vincit/objection.js/issues/1077)
- Allow modifiers (namedFilters) to be used in `modifyEager` too.
- Add `underscoreBeforeDigits` option for snake case converters. [#1025](https://github.com/Vincit/objection.js/issues/1025)
- fix [#1074](https://github.com/Vincit/objection.js/issues/1074)
- Typing fixes

## 1.2.3

### What's new

- fix [#1007](https://github.com/Vincit/objection.js/issues/1007)
- fix [#1008](https://github.com/Vincit/objection.js/issues/1008)
- fix [#1047](https://github.com/Vincit/objection.js/issues/1047)

## 1.2.2

### What's new

- Improve reference cycle detection in `upsertGraph`

## 1.2.1

### What's new

- fix [#1009](https://github.com/Vincit/objection.js/issues/1009)

## 1.2.0

### What's new

- fix [#919](https://github.com/Vincit/objection.js/issues/919)
- fix [#964](https://github.com/Vincit/objection.js/issues/964)
- Add `aliasFor` method to public API
- Prevent bluebird warnings
- UPPER_SNAKE_CASE support for `snakeCaseMappers` and `knexSnakeCaseMappers`

## 1.1.10

### What's new

- Nothing! the npm release was somehow borked. This was just a rerelease of 1.1.9.

## 1.1.9

### What's new

- fix [#782](https://github.com/Vincit/objection.js/issues/782)

## 1.1.8

### What's new

- fix [#909](https://github.com/Vincit/objection.js/issues/909)

## 1.1.7

### What's new

- fix [#884](https://github.com/Vincit/objection.js/issues/884)

## 1.1.6

### What's new

- Add typings for fetchTableMetadata, tableMetadata and onbuildknex

## 1.1.5

### What's new

- Make [Model.fetchTableMetadata](#fetchtablemetadata) and [Model.tableMetadata](#tablemetadata) methods public. [#871](https://github.com/Vincit/objection.js/issues/871)
- Add [onBuildKnex](#onbuildknex) query builder hook. [#807](https://github.com/Vincit/objection.js/issues/807)

## 1.1.4

### What's new

- fix subquery bug causing incompatibility with knex 0.14.5 and sqlite3

## 1.1.3

### What's new

- fix regression in 1.1.2 (sorry about this) [#869](https://github.com/Vincit/objection.js/issues/869)

## 1.1.2

### What's new

- Add `virtuals` option for `toJSON` and `$toJson` [#866](https://github.com/Vincit/objection.js/issues/866)
- fix [#868](https://github.com/Vincit/objection.js/issues/868)

## 1.1.1

### What's new

- fix [#865](https://github.com/Vincit/objection.js/issues/865)
- fix bug where the static `Model.relatedQuery` didn't use the relation name as an alias for the table. This may break
  code if you have explicitly referenced the subquery table. [#859](https://github.com/Vincit/objection.js/issues/859)

## 1.1.0

### What's new

- Optional [object notation](#relationexpression-object-notation) for relation expressions.
- fix [#855](https://github.com/Vincit/objection.js/issues/855)
- fix [#858](https://github.com/Vincit/objection.js/issues/858)

## 1.0.1

### What's new

- Added public [Relation.joinModelClass](#relation) accessor
- Don't call `returning` on sqlite (prevents a warning message added in knex 0.14.4)
- fix [#844](https://github.com/Vincit/objection.js/issues/844)
- Small documentation updates
- Small typing fixes end updates

## 1.0.0 🎉

### What's new

- The static [`relatedQuery`](#relatedquery) method.
- New reflection methods:
  [`isFind`](#isfind),
  [`isInsert`](#isinsert),
  [`isUpdate`](#isupdate),
  [`isDelete`](#isdelete),
  [`isRelate`](#isrelate),
  [`isUnrelate`](#isunrelate),
  [`hasWheres`](#haswheres),
  [`hasSelects`](#hasselects),
  [`hasEager`](#haseager),
  [`has`](#has).
  [`clear`](#clear).
  [`columnNameToPropertyName`](#columnnametopropertyname),
  [`propertyNameToColumnName`](#propertynametocolumnname).
- `ManyToMany` extras now work consistently in queries and filters. [#760](https://github.com/Vincit/objection.js/issues/760)

### Breaking changes

- `modelInstance.$query().delete().returning(something)` now returns a single instance instead of an array. [#659](https://github.com/Vincit/objection.js/issues/659)

- Node 6.0.0 is now the minimum. Objection will not work on node < 6.0.0.

- [`ValidationError`](#validationerror) overhaul. This is a big one, so read this carefully! There are three things to check when you migrate to 1.0:

  1. The [`createValidationError`](#createvalidationerror) and [`ValidationError`](#validationerror) interfaces have changed.
     If you have overridden the `createValidationError` method in your project, or you create custom `ValidationError` instances
     you need migrate to the interfaces.
  2. The model validation errors (jsonSchema violations) have remained pretty much the same but there are couple of differences. Before, the
     keys of `error.data` were property names even when a nested object in a graph failed a validation. Now the keys for nested
     validation errors are key paths like `foo.bar[2].spam`. Another tiny difference is the order of validation errors for each key in
     `error.data`. Let's say a property `spam` failed for your model and `error.data.spam` contains an array of objects that describe
     the failures. Before, the first failed validation was the last item in the array, now it is the first item.
  3. All [`ValidationErrors`](#validationerror) now have a `type` field. Before all [`ValidationErrors`](#validationerror) but the model
     validation errors (errors like "invalid relation expression", or "cyclic model graph") had no type, and could only be identified
     based on the existence of some weird key in `error.data`. The `error.data` is now removed from those errors and the `type` should be
     used instead. The message from the data is now stored in `error.message`.

- Removed deprecated methods `whereRef`, `whereJsonField` and `whereJsonEquals`. The [`ref`](#ref) helper can be used to replace the
  `whereRef` calls. [`ref`](#ref) and [`lit`](#lit) can be used to replace the removed json methods.

- `ManyToMany` extras now work consistently in queries and filters. [#760](https://github.com/Vincit/objection.js/issues/760). This is not
  a breaking change per se, but can cause some queries to fail with a "ambiguous identifier" error because the join table is now joined
  in places where it previously wasn't. You need to explicitly specify the table for those failing columns using `Table.theColumn` syntax.

### Changes

- `isFindQuery` is renamed to [`isFind`](http://vincit.github.io/objection.js/#isfind) and deprecated.

## 0.9.4

### What's new

- Fixed [#627](https://github.com/Vincit/objection.js/issues/627)
- Fixed [#671](https://github.com/Vincit/objection.js/issues/671)
- Fixed [#672](https://github.com/Vincit/objection.js/issues/672)
- Fixed [#674](https://github.com/Vincit/objection.js/issues/674)

## 0.9.3

### What's new

- Add beforeInsert hook for relations. [#649](https://github.com/Vincit/objection.js/issues/649) [#19](https://github.com/Vincit/objection.js/issues/19)
- Add [`relatedFindQueryMutates`](#relatedfindquerymutates) and [`relatedInsertQueryMutates`](#relatedinsertquerymutates) configs as well as [`$setRelated`](#_s_setrelated) and [`$appendRelated`](#_s_appendrelated) helpers. [#599](https://github.com/Vincit/objection.js/issues/599)
- Fixed [#648](https://github.com/Vincit/objection.js/issues/648)

## 0.9.2

### What's new

- Fix regression: `from` fails with a subquery.

## 0.9.1

### What's new

- [`castTo`](http://vincit.github.io/objection.js/#castto) method for setting the model class of query result rows.
- [`onError`](http://vincit.github.io/objection.js/#onerror) `QueryBuilder` method.
- [`knexSnakeCaseMappers`](http://vincit.github.io/objection.js/#objection-knexsnakecasemappers) and [`snakeCaseMappers`](http://vincit.github.io/objection.js/#objection-snakecasemappers) for snake_case to camelCase conversions.

## 0.9.0

### What's new

- Relations can now be defined using keys inside JSON columns. See the examples [here](http://vincit.github.io/objection.js/#relationmappings).
- [`lit`](http://vincit.github.io/objection.js/#lit) helper function [#275](https://github.com/Vincit/objection.js/issues/275)
- Fixes for [`upsertGraph`](http://vincit.github.io/objection.js/#upsertgraph) when using composite keys. [#517](https://github.com/Vincit/objection.js/issues/517)
- Added `noDelete`, `noUpdate`, `noInsert`, `noRelate` and `noUnrelate` options for `upsertGraph`. See [UpsertGraphOptions docs](#upsertgraphoptions) for more info.
- `insertGraph` now accepts an options object just like `upsertGraph`. `relate` option can be used instead of `#dbRef`. [#586](https://github.com/Vincit/objection.js/issues/586)

### Breaking changes

- Instance update/patch with `returning` now return a single object instead of an array. [#423](https://github.com/Vincit/objection.js/issues/423)

- Because of the support for JSON relations [the `Relation` class](http://vincit.github.io/objection.js/#relation)
  has changed a bit.

## 0.8.8

### What's new

- Typing updates: [#489](https://github.com/Vincit/objection.js/issues/489) [#487](https://github.com/Vincit/objection.js/issues/487)
- Improve `resultSize` method. [#213](https://github.com/Vincit/objection.js/issues/213)
- Avoid unnecessary updates in upsertGraph [#480](https://github.com/Vincit/objection.js/issues/480)

## 0.8.7

### What's new

- `throwIfNotFound` now also throws when update or delete doesn't change any rows.
- [`mixin`](#mixin) and [`compose`](#compose) helpers for applying multiple plugins. [#475](https://github.com/Vincit/objection.js/issues/475) [#473](https://github.com/Vincit/objection.js/issues/473)
- Typing updates [#474](https://github.com/Vincit/objection.js/issues/474) [#479](https://github.com/Vincit/objection.js/issues/479)
- `upsertGraph` now validates patched models correctly. [#477](https://github.com/Vincit/objection.js/issues/477)

## 0.8.6

### What's new

- Finally: the first version of [`upsertGraph`](#graph-upserts) method! Please open issues about bugs, WTFs and missing features.
- Strip readonly virtual properties in fromJson & friends [#432](https://github.com/Vincit/objection.js/issues/432)
- Fixed [#439](https://github.com/Vincit/objection.js/issues/439)

## 0.8.5

### What's new

- Add [`Model.useLimitInFirst`](http://vincit.github.io/objection.js/#uselimitinfirst) configuration flag.

## 0.8.4

### What's new

- New shorthand methods [`joinEager`](http://vincit.github.io/objection.js/#joineager), [`naiveEager`](http://vincit.github.io/objection.js/#naiveeager),
  [`mergeJoinEager`](http://vincit.github.io/objection.js/#mergejoineager) and [`mergeNaiveEager`](http://vincit.github.io/objection.js/#mergenaiveeager).
- New shorthand method [`findOne`](http://vincit.github.io/objection.js/#findone)
- New reflection method [`isFindQuery`](http://vincit.github.io/objection.js/#isfind)
- ManyToMany extra properties can now be updated [#413](https://github.com/Vincit/objection.js/issues/413)

## 0.8.3

### What's new

- [`NaiveEagerAlogrithm`](http://vincit.github.io/objection.js/#eager)
- [Aliases in relation expressions](http://vincit.github.io/objection.js/#relationexpression) [#402](https://github.com/Vincit/objection.js/issues/402)
- New lazily evaluated `raw` function. [#275](https://github.com/Vincit/objection.js/issues/275)

## 0.8.2

### What's new

- [`Model.namedFilters`](http://vincit.github.io/objection.js/#namedfilters) object for defining shared filters that can be used by name in eager expressions.
- Full support for views and table aliases in eager, join, joinRelation etc. [#181](https://github.com/Vincit/objection.js/issues/181)
- Fix `bindTransaction` bug with `ManyToManyRelation` junction tables [#395](https://github.com/Vincit/objection.js/issues/395)

## 0.8.1

### What's new

- [`throwIfNotFound`](http://vincit.github.io/objection.js/#throwifnotfound) method for making empty query results throw an exception.
- fix error when passing model instance to a `where` method. [#387](https://github.com/Vincit/objection.js/issues/387)

## 0.8.0

### What's new

- All query methods now call `Model.query` to create a `QueryBuilder` instance [#346](https://github.com/Vincit/objection.js/issues/346)
- Objection is no longer transpiled. One of the implications is that you can use a github
  link in package.json to test experimental versions.
- `count` can now be called without arguments [#364](https://github.com/Vincit/objection.js/issues/364)
- A new [`getRelations`](#getrelations) method for plugin development and other reflection greatness.

### Breaking changes

> Old model definition

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);

Person.tableName = 'Person';

Person.prototype.fullName = function() {
  return this.firstName + ' ' + this.lastName;
};

// More static and prototype methods.
```

> Easiest way to migrate to `class` and `extends` keywords

```js
class Person extends Model {}

Person.tableName = 'Person';

Person.prototype.fullName = function() {
  return this.firstName + ' ' + this.lastName;
};

// More static and prototype methods.
```

- Support for node versions below 4.0.0 has been removed. With it the support for legacy class inheritance using `Model.extend` method
  has also been removed. This means that you need to change your model definitions to use the `class` and `extends` keywords.
  To achieve this with the minimum amount of changes you can simply swap the constructor function and `Model.extend` to
  a class definition. You can still define all static and prototype methods and properties the old way. See the example on the right -->

  Note that this also affects Babel transpilation. You cannot (or need to) use `babel-plugin-transform-es2015-classes` anymore.
  See the [ESNext example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) as an example of
  how to setup babel.

- The default value of [`pickJsonSchemaProperties`](#pickjsonschemaproperties) was changed to `false`. Before, all properties that
  were not listed in `jsonSchema` were removed before `insert`, `patch` or `update` (if `jsonSchma` was defined). Starting from
  this version you need to explicitly set the value to `true`. You may have been used this feature by accident.
  If you have weird problems after the update, try setting `objection.Model.pickJsonSchemaProperties = true;` to see
  if it helps.

- [`relate`](#pickjsonschemaproperties) and [`unrelate`](#pickjsonschemaproperties) methods now return the result of the
  underlying query (`patch` in case of `HasManyRelation`, `HasOneRelation`, and `BelongsToOneRelation`. `insert` otherwise).
  Before the method input was always returned.

- `Model.RelatedQueryBuilder` is removed. `Model.QueryBuilder` is now used to create all query builders for the model.
  This only affects you if you have defined custom query builders.

## 0.7.12

### What's new

- fix [#345](https://github.com/Vincit/objection.js/issues/345)

## 0.7.11

### What's new

- fix [#339](https://github.com/Vincit/objection.js/issues/339)
- fix [#341](https://github.com/Vincit/objection.js/issues/341)

## 0.7.10

### What's new

- fix bugs that prevented using `$relatedQuery` and `eager` together with `JoinEagerAlgorithm`
- typing updates

## 0.7.9

### What's new

- [`joinRelation`](http://vincit.github.io/objection.js/#joinrelation) now accepts [`RelationExpressions`](http://vincit.github.io/objection.js/#relationexpression) and can join multiple and nested relations.

## 0.7.6

### What's new

- `range` and `page` methods now use a window function and only generate one query on postgresql [#62](https://github.com/Vincit/objection.js/issues/62)
- fix MSSQL 2100 parameter limit in eager queries [#311](https://github.com/Vincit/objection.js/issues/311)

## 0.7.5

### What's new

- fix [#327](https://github.com/Vincit/objection.js/issues/327)
- fix [#256](https://github.com/Vincit/objection.js/issues/256)

## 0.7.4

### What's new

- automatically select columns needed for relations [#309](https://github.com/Vincit/objection.js/issues/309)
- fix an issue where `$formatJson` was called inside `insertGraph` [#326](https://github.com/Vincit/objection.js/issues/326)

## 0.7.3

### What's new

- fix [#325](https://github.com/Vincit/objection.js/issues/325)
- fix an issue where `select` had to be used in addition to `distinct` in some cases

## 0.7.2

### What's new

- `HasOneThroughRelation` relation type.

## 0.7.1

### What's new

- fix `JoinEagerAlgorithm` NPE bug

## 0.7.0

### What's new

- `jsonSchema` without `properties` now works. [#205](https://github.com/Vincit/objection.js/issues/205)
- `relationMappings` can now be a function. [#227](https://github.com/Vincit/objection.js/issues/227)
- many to many extras can now be aliased. [#223](https://github.com/Vincit/objection.js/issues/223)
- zero values are now allowed in relation columns. [#228](https://github.com/Vincit/objection.js/issues/228)
- active transaction can now be accessed in `$before/$after` hooks through `queryContext.transaction` property.
- Validation can now be easily modified through a new [`Validator`](#validator) interface. [#241](https://github.com/Vincit/objection.js/issues/241) [#199](https://github.com/Vincit/objection.js/issues/199)
- fix a `JoinEager` problem where an empty result for a relation caused the following relations to be empty. [#292](https://github.com/Vincit/objection.js/issues/292)
- `ref(fieldExpression)` syntax to reduce need for knex.raw and updating single attribute inside JSON column. [#270](https://github.com/Vincit/objection.js/issues/270)
- [mergeEager](http://vincit.github.io/objection.js/#mergeeager) method.

### Breaking changes

- `$relatedQuery` now returns a single model instead of an array for belongsToOne and hasOne relations. [#155](https://github.com/Vincit/objection.js/issues/155)
- identifier of a model can now be updated. Be careful with this one! Before if you forgot a wrong id in an `update`/`patch` operation, it would simply get ignored. Now the id is also updated just like any other column [#100](https://github.com/Vincit/objection.js/issues/100)
- `Table.*` is now selected by default in all queries instead of `*`. This will break some join queries that don't have an explicit select clause. [#161](https://github.com/Vincit/objection.js/issues/161)
- `ValidationError.data` is now an object including, for each key, a list of errors with context info. [#283](https://github.com/Vincit/objection.js/issues/283)

## 0.6.2

### What's new

- `relationMappings` can now be a function [#227](https://github.com/Vincit/objection.js/issues/227)

## 0.6.1

### What's new

- fix bug [#205](https://github.com/Vincit/objection.js/issues/205)

## 0.6.0

### What's new

- Eager loading can now be done using joins and zero extra queries. See [`eagerAlgorithm`](#eageralgorithm), [`defaultEagerAlgorithm`](#defaulteageralgorithm) and [`eager`](#eager) for more info.
- `#ref` in graph inserts can now contain extra properties for many-to-many relations [#156](https://github.com/Vincit/objection.js/issues/156)
- `#dbRef` can now be used to refer to existing rows from a `insertWithRelated` graph.
- [`modelPaths`](#modelpaths) attribute for cleaner way to point to models in relationMappings.
- [`pickJsonSchemaProperties`](#pickjsonschemaproperties) config parameter [#110](https://github.com/Vincit/objection.js/issues/110)
- [`insertGraphAndFetch`](#insertgraphandfetch) with `insertWithRelatedAndFetch` alias. [#172](https://github.com/Vincit/objection.js/issues/172)
- Added [`$beforeDelete`](#_s_beforedelete) and [`$afterDelete`](#_s_afterdelete) hooks [#112](https://github.com/Vincit/objection.js/issues/112)
- Old values can now be accessed from `$beforeUpdate`, `$afterUpdate`, `$beforeValidate` and `$afterValidate` hooks [#185](https://github.com/Vincit/objection.js/issues/185)
- Support length property [#168](ttps://github.com/Vincit/objection.js/issues/168)
- Make sure operations are executed in the order they are called [#180](https://github.com/Vincit/objection.js/issues/180)
- Fetch nothing if the `where` clauses hit no rows in `update/patchAndFetchById` methods [#189](https://github.com/Vincit/objection.js/issues/189)
- Lots of performance tweaks.
- `$loadRelated` and `loadRelated` now return a `QueryBuilder`.

### Breaking changes

- Undefined values as query method arguments now throw an exception. Before they were just silently ignored
  and for example `delete().where('id', undefined)` caused the entire table to be deleted. [skipUndefined](http://vincit.github.io/objection.js/#skipundefined)
  method can be called for a query builder to handle the undefined values the old way.

- Deprecated method `dumpSql` is now removed.

- `$loadRelated` and `loadRelated` now return a `QueryBuilder`. This may break your code is some rare cases
  where you have called a non-standard promise method like `reflect` for the return value of these functions.

## 0.5.5

### What's new

- [Virtual attributes](#virtualattributes)

## 0.5.4

### What's new

- bugfix: insertWithRelated now works with `additionalProperties = false` in `jsonSchema`
- Add updateAndFetch and patchAndFetch methods for `$query`
- bugfix: afterGet was not called for nested models in eager query
- Use ajv instad of tv4 for json schema validation

## 0.5.3

### What's new

- ES6 promise compatibility fixes.

## 0.5.1

### What's new

- [\$afterGet](#afterget) hook.

## 0.5.0

### What's new

- [joinRelation](#joinrelation) family of query builder methods.
- `HasOneRelation` for creating inverse one-to-one relations.
- Relations have been renamed `OneToOneRelation` --> `BelongsToOneRelation`, `OneToManyRelation` --> `HasManyRelation`.
  The old names work, but have been deprecated.
- [withSchema](#withschema) now works as expected and sets the schema of all queries executed by the query builder the
  method is called for.
- [filterEager](#filtereager) method for better eager query filtering.
- [extra properties](#relationmappings) feature for selecting/inserting columns from/to the join table in many-to-many relations.
- Eager query recursion depth can be controlled like so: `parent.^5`.

## 0.4.0

### What's new

- Query context feature. See [#51](https://github.com/Vincit/objection.js/issues/51) and [these docs](#context) for more info.
- Composite key support.
- [findById](#findbyid), [deleteById](#deletebyid), [whereComposite](#wherecomposite) and
  [whereInComposite](#whereincomposite) query builder methods.

### Breaking changes

There shouldn't be any major breaking changes. We moved from ES5 to ES7 + babel in this version so there are big changes
in the codebase. If something comes up, please open an issue.

There are a few known corner cases that may break:

- You can now define a model for the join table of `ManyToMany` relations in `relationMappings`. This is optional,
  but may be needed if you already have a model for a `ManyToMany` relation _and_ you use `snake_case`
  to `camelCase` conversion for the column names. See the documentation on the [through](#relationthrough)
  property of [relationMappings](#relationmappings).

- The repo no longer contains the actual built javascript. Only the ES7 code that is transpiled when the code is
  published to npm. Therefore you can no longer specify a git hash to package.json to use for example the
  HEAD version. We will start to publish alpha and RC versions to npm when something new and experimental
  is added to the library.

## 0.3.3

### What's new

- fix regression: QueryBuilder.from is broken.

## 0.3.2

### What's new

- Improved relation expression whitespace handling.

## 0.3.1

### What's new

- `whereJson*` methods can now be used inside functions given to `where` methods.
- Added multiple missing knex methods to `QueryBuilder`.

## 0.3.0

### What's new

- [insertWithRelated](http://vincit.github.io/objection.js/QueryBuilder.html#insertWithRelated) method for
  inserting model trees
- [insertAndFetch](http://vincit.github.io/objection.js/QueryBuilder.html#insertAndFetch),
  [updateAndFetchById](http://vincit.github.io/objection.js/QueryBuilder.html#updateAndFetchById) and
  [patchAndFetchById](http://vincit.github.io/objection.js/QueryBuilder.html#patchAndFetchById) helper methods
- Filters for [eager expressions](#eager-queries)
- [New alternative way to use transactions](#transaction-object)
- Many performance updates related to cloning, serializing and deserializing model trees.

### Breaking changes

- QueryBuilder methods `update`, `patch` and `delete` now return the number of affected rows.
  The new methods `updateAndFetchById` and `patchAndFetchById` may help with the migration
- `modelInstance.$query()` instance method now returns a single model instead of an array
- Removed `Model.generateId()` method. `$beforeInsert` can be used instead

## 0.2.8

### What's new

- ES6 inheritance support
- generator function support for transactions
- traverse,pick and omit methods for Model and QueryBuilder
- bugfix: issue #38

## 0.2.7

### What's new

- bugfix: fix #37 also for `$query()`.
- Significant `toJson`/`fromJson` performance boost.

## 0.2.6

### What's new

- bugfix: fix regression bug that broke dumpSql.

## 0.2.5

### What's new

- bugfix: fix regression bug that prevented values assigned to `this` in `$before` callbacks from getting into
  the actual database query

## 0.2.4

### What's new

- bugfix: many-to-many relations didn't work correctly with a snake_case to camelCase conversion
  in the related model class.

## 0.2.3

### What's new

- Promise constructor is now exposed through `require('objection').Promise`.

## 0.2.2

### What's new

- $beforeUpdate, $afterUpdate, \$beforeInsert etc. are now asynchronous and you can return promises from them.
- Added `Model.fn()` shortcut to `knex.fn`.
- Added missing `asCallback` and `nodeify` methods for `QueryBuilder`.

## 0.2.1

### What's new

- bugfix: Chaining `insert` with `returning` now returns all listed columns.

## 0.2.0

### What's new

- New name `objection.js`.
- `$beforeInsert`, `$afterInsert`, `$beforeUpdate` and `$afterUpdate` hooks for `Model`.
- Postgres jsonb query methods: `whereJsonEquals`, `whereJsonSupersetOf`, `whereJsonSubsetOf` and friends.
- `whereRef` query method.
- Expose `knex.raw()` through `Model.raw()`.
- Expose `knex.client.formatter()` through `Model.formatter()`.
- `QueryBuilder` can be used to make sub queries just like knex's `QueryBuilder`.
- Possibility to use a custom `QueryBuilder` subclass by overriding `Model.QueryBuilder`.
- Filter queries/objects for relations.
- A pile of bug fixes.

### Breaking changes

- Project was renamed to objection.js. Migrate simply by replacing `moron` with `objection`.

## 0.1.0

First release.
