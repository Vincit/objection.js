# Changelog

## 3.8.0

### What's new

- The `limitPerParent` graph option applies `limit()`, `offset()` and `first()` of relations loaded with `withGraphFetched()` per parent instead of to all parents together, e.g. `withGraphFetched('pets(latest)', { limitPerParent: true })`. With `page()` / `range()` the relation query is limited as before. On MySQL before 8, relations with a limit are fetched with one query per parent. `withGraphJoined()` ignores the option and warns about it. [#127](https://github.com/ditojs/objection/issues/127) [#429](https://github.com/Vincit/objection.js/issues/429)

### Fixes

- **Behaviour change:** `update()` validates field expression keys like `'meta:color'` like `patch()` does since 3.3.0: the written parts are validated against the json column's schema, including `$ref`s, without its `required`, while the rest of the object is validated normally. The json column counts as present and doesn't get its `default`. Before, the keys were validated as top-level properties: invalid values passed, `additionalProperties: false` rejected the keys, a required json column counted as missing, and its `default` replaced the whole stored value. [#160](https://github.com/ditojs/objection/issues/160)
- **Behaviour change:** keys containing `:` that the schema declares in `properties`, e.g. `'ns:name'`, are normal properties and columns: validated as properties and written to their column by `patch()`, `update()` and `merge()`. Before, `patch()` (since 3.3.0) and `update()` / `fromJson()` treated them as field expressions and wrote them as JSON paths. Properties that only `$beforeValidate()` declares are still treated as field expressions. [#160](https://github.com/ditojs/objection/issues/160)
- **Behaviour change:** `insertGraph()` throws a `ValidationError` of type `InvalidGraph` for `#unrelate` / `#delete` markers also with `allowMarkers: true`, where 3.7.0 skipped the marked models: an insert has nothing to unrelate or delete. `allowMarkers` stays in the `InsertGraphOptions` typings until 4.0, deprecated and without effect. [#2410](https://github.com/Vincit/objection.js/pull/2410)
- **Behaviour change:** a root model marked with `#unrelate` or `#delete` gets the error that the markers can only be used for related models, in `upsertGraph()` and `insertGraph()`, also without `allowMarkers`. [#164](https://github.com/ditojs/objection/issues/164)
- **Behaviour change:** `upsertGraph()` with `noUpdate`, `noDelete`, `noUnrelate` and `insertMissing` runs as an upsert like any other `upsertGraph()` call. Models that already exist are left alone instead of failing with duplicate key errors, and markers allowed with `allowMarkers` take effect. Only `insertGraph()` runs as an insert.
- **Behaviour change:** many-to-many `patch()` / `update()` with join table extras select the ids of the matching related rows first, patch the join rows, and then the related rows by these ids, in batches of 500 values. A filter on a column that the patch changes, e.g. `.patch({ name: 'renamed', role: 'new' }).where('movies.name', 'old')`, left the join rows unchanged. These patches run several statements, so use a transaction if they need to be atomic. [#161](https://github.com/ditojs/objection/issues/161)
- On MySQL, `limit()` / `offset()` of many-to-many `patch()` / `update()` with join table extras pick the related rows to update, and only their join rows are updated. Before, all matching join rows were updated. Other databases ignore a limit in updates, as before. [#161](https://github.com/ditojs/objection/issues/161)
- **Behaviour change:** `asFindQuery()` in static hooks always runs the find query and returns the affected rows. It returned the value the query was resolved with, e.g. `0` for a patch with nothing to set, or the value of `resolve()` / `cancelQuery()`, and threw `TypeError: related.some is not a function` for many-to-many patches that only change join table extras.
- `asFindQuery()` in static hooks of many-to-many `patchAndFetchById()` / `updateAndFetchById()` keeps the query's filters
- **Behaviour change:** the id condition of `$query()` and of `patchAndFetchById()`, `updateAndFetchById()` and the other `*ById` methods gets its own where group, so a user's `orWhere()` can't get around it: `$query().patch(…).orWhere(b)` runs `id = 1 and (b)` instead of `id = 1 or b`. The where groups are built when the SQL is generated, so `asFindQuery()` in static hooks no longer drops or repeats where clauses of relation queries, which regressed in 3.3.0. [#2191](https://github.com/Vincit/objection.js/issues/2191)
- **Behaviour change:** `withGraphJoined()` selects the root table's columns instead of `*`, so the columns of joined tables no longer land on the root models under their plain names. `distinct('*')` keeps its `distinct`.
- `distinctOn()` with `withGraphJoined()`, `withGraphFetched()` and `joinRelated()`: its columns were treated as selected, so the other columns were missing from the models, and joined relations could fail with "column does not exist".
- **Behaviour change:** `withGraphJoined()` throws when the root query selects a different column under a name it selects itself, e.g. a joined table's column without an alias like `select('Person.*', 'pets.id')`, `select('pets.*')`, `ref('Person.age').as('name')` or `'Person.name as id'`, and raw SQL, subqueries or aggregates under the name of an id column it needs to build the graph. Before, SQL Server returned arrays of values and the other databases silently kept one of them, sometimes grouping the root models by the wrong id. Raw SQL, subqueries and aggregates under other names replace the column. Select such columns under a different name.
- Selections are matched after `wrapIdentifier` mapping (`knexSnakeCaseMappers()`) for column names and aliases too, so `withGraphFetched()` no longer selects a relation column a second time and strips it from the result when it's selected under its snake_case name
- **Behaviour change:** `resultSize()` with `withGraphJoined()` throws `model … has no idColumn` for models without a primary key if the joined relations include a to-many relation, as the root models can't be counted without ids. Since 3.3.0 it counted the joined rows instead, or failed on MySQL. With only to-one relations, the rows are counted. [#164](https://github.com/ditojs/objection/issues/164)
- On SQL Server, the order of a relation's `modify` or an `onBuild` hook is left out of the subqueries of many-to-many modify queries, `withGraphJoined()` and `joinRelated()`, including `through.modify`, and out of `update()` / `patch()` queries, unless they have a limit. SQL Server rejects these orders. Other databases are unchanged. [#167](https://github.com/ditojs/objection/pull/167)
- On SQL Server, `update()`, `patch()` and `delete()` of aliased tables go through a common table expression, as SQL Server can't alias the table of these statements
- **Behaviour change:** on SQL Server, constraint, not-null and data errors are thrown as `DBError` and its subclasses (`UniqueViolationError`, `ForeignKeyViolationError`, `NotNullViolationError`, `CheckViolationError`, `DataError`), with the tedious error as `nativeError`, like on the other databases. Read `err.nativeError.number` instead of `err.number`. This also makes the fix for primary key violations from 3.7.0 work with knex. [#2688](https://github.com/Vincit/objection.js/issues/2688)
- The warning about duplicate relations in relation expressions like `'[a.b, a.c]'` says that only the last one is used and that it will throw in objection 4.0, instead of announcing an error in objection 2.0 [#164](https://github.com/ditojs/objection/issues/164)
- **Behaviour change:** all warnings objection logs start with `[objection] `, and each is logged once [#164](https://github.com/ditojs/objection/issues/164)
- The errors for mixing `withGraphJoined()` and `withGraphFetched()` quote relation names with double quotes like other error messages

### Docs

- What `relate().returning()` returns on each database, and which relations accept an array of ids
- `onBuildKnex()`: calls on the objection builder that map to knex methods are applied
- The typings require TypeScript 5.1, and CI checks them with it. With TypeScript 5.0, methods of custom query builders like `firstWithName() { return this.where(...).first(); }` are implicitly `any` without a return type annotation.

### Other

- The knex peer dependency is `>=2.3.0 <4`, the versions objection is tested with [#95](https://github.com/ditojs/objection/issues/95)
- CI runs the integration tests on SQL Server [#163](https://github.com/ditojs/objection/issues/163)

## 3.7.0

### Security

- **Behaviour change:** the `#unrelate` and `#delete` markers need the new `allowMarkers: true` option in both `insertGraph()` and `upsertGraph()`, like `#ref` needs `allowRefs`. Without it, a marked model throws a `ValidationError` of type `InvalidGraph`, also in `insertGraph()`, which silently skipped marked models before. The markers come from the graph data and take precedence over the `noUnrelate` / `noDelete` options, so graph data from a request body could unrelate or delete related rows that these options were meant to protect. With `allowMarkers: true`, the markers work as in 3.6.0. [#2410](https://github.com/Vincit/objection.js/pull/2410)

### Fixes

- **Behaviour change:** many-to-many `unrelate()` / `patch()` identify the join rows to modify with a correlated `EXISTS` subquery, instead of row ids (`ctid` on Postgres, `_rowid_` on SQLite), the values of all columns (MySQL) or the related ids (MSSQL). The generated SQL changes. This fixes join tables that are Postgres views, `through.modify` filters (on Postgres they failed with `column "tableoid" does not exist`, on SQLite they modified other join rows), MySQL join rows with `FLOAT` or `DATETIME(6)` values that don't survive a round trip through JavaScript, and on MSSQL the filters on the join table, which modified all join rows of the matching related rows. On Postgres, SQLite and MSSQL, join rows that only differ in their extras are told apart, so only the matching one changes. On MySQL, the owner and related keys of the matching join rows are fetched with the subquery first, and the join rows are then modified by these keys, as MySQL doesn't let a statement read the table it modifies, e.g. through filters that read the join table or triggers on it. The keys can't tell apart join rows that only differ in their extras, like before 3.3.0. [#1853](https://github.com/Vincit/objection.js/issues/1853)
- **Behaviour change:** `upsertGraph()` upserts the subgraphs of related models that it relates recursively. There, arrays of relation paths in the `update` and `noUpdate` options match the full relation path from the root of the graph, like relation expressions since 3.6.0, so they also apply to the root models of the subgraph, e.g. `noUpdate: ['movies']` to the related movies. Before, they were matched against the relation paths from the root of the subgraph. The other options have no effect on the root models of a subgraph. [#131](https://github.com/ditojs/objection/issues/131)
- **Behaviour change:** `runAfter()` hooks in the queries of relations loaded with `withGraphFetched()` no longer see the join columns that objection selects internally, like the other queries since 3.3.0. Hooks that read these columns get `undefined`. [#45](https://github.com/ditojs/objection/issues/45)
- A `through.modelClass` join model with `idColumn` returning `null` is no longer changed to use the related join columns as its id [#2305](https://github.com/Vincit/objection.js/issues/2305)
- Warn once when the `joinOperation` option is passed to `withGraphFetched()` or for fetched relations of `withGraph()`, where it is ignored [#2125](https://github.com/Vincit/objection.js/issues/2125)
- The warning from 3.4.1 about owner join properties holding arrays also covers many-to-many relations [#2667](https://github.com/Vincit/objection.js/issues/2667)
- `whereInComposite()` with multiple columns and a subquery works on SQLite, as a row value comparison, instead of throwing
- `whereInComposite()` with multiple columns and a subquery works on MSSQL
- Many-to-many `through.modify` filters are kept for model classes bound with `bindKnex()`
- `insertGraph()` / `upsertGraph()` throw the error about cyclic references for a `#ref` cycle through owners without a primary key, instead of failing to patch the deferred foreign key by id [#2305](https://github.com/Vincit/objection.js/issues/2305)
- **Behaviour change:** with `none()`, or when a query is resolved with `resolve()` in a hook, patches and updates no longer modify the extras of many-to-many join rows or the instance of `$query()`, and `BelongsToOneRelation` deletes no longer clear the foreign keys of the owners. These were updated although nothing was written. [#2184](https://github.com/Vincit/objection.js/issues/2184)
- `$clone()`, `toJSON()` and validation copy objects with a writable `Symbol.toStringTag`, e.g. decimal.js numbers, instead of sharing them, which regressed in 3.6.0. Built-ins like `URL` are still shared, like in lodash's `cloneDeep()`.
- Patch validation keeps boolean subschemas like `properties: { b: false }`. They were dropped, so patches passed that the schema forbids.
- Patch validation no longer validates field expression keys with numeric parts like `'tags:0'` against object schemas, which rejected patches of array elements
- Required properties given as query properties, e.g. `raw()`, failed validation with an error about a missing schema when the schema uses `$ref` to the schema of another model class [#2199](https://github.com/Vincit/objection.js/issues/2199)
- On Postgres, a backslash in front of a `?` in a JSON field expression key is kept, which knex dropped [#2077](https://github.com/Vincit/objection.js/issues/2077)
- On MySQL, subqueries of the updated or deleted table are also wrapped in where groups and join clauses, which failed with `ER_UPDATE_TABLE_USED`
- `resultSize()` and the `total` of `page()` with `withGraphJoined()` keep the selections that `groupBy()` and `having()` refer to by alias [#2329](https://github.com/Vincit/objection.js/issues/2329)
- Relation expressions no longer mistake inherited object properties for relations, e.g. when merging graph expressions or parsing a relation named `constructor` [#63](https://github.com/ditojs/objection/issues/63)
- `$clone()` no longer prints Node's `Buffer()` deprecation warning (DEP0005)

### Types

- `fetchGraph<Person>()` with only the model type argument compiles again, without narrowing
- `PartialModelObject` accepts partial objects for nullable to-one relations [#2190](https://github.com/Vincit/objection.js/issues/2190)
- **Behaviour change:** `snakeCaseMappers()` and `knexSnakeCaseMappers()` take separate option types, `SnakeCaseMappersOptions` and `KnexSnakeCaseMappersOptions`, with `preserveJsonKeys` only on the former, so `knexSnakeCaseMappers({ preserveJsonKeys: true })` no longer compiles. The option never had an effect there. The shared options are `SnakeCaseOptions`.
- The rows of `relate().returning()` are typed as `any`, and `returning()` accepts multiple columns [#2044](https://github.com/Vincit/objection.js/issues/2044)

### Docs

- Graph option expressions can't name a relation together with relations below it, or repeat a relation like `'[movies.reviews, movies.actors]'` [#131](https://github.com/ditojs/objection/issues/131)
- Shared validators throw for different schemas with the same `$id`
- The typings require TypeScript 5.0 since 3.3.0
- Workarounds for the `withGraph` narrowing with reassignments and generic helpers
- `insert()` and `patch()` ignore relation data

### Other

- **Behaviour change:** remove the `mapNestedKeys` option of `knexSnakeCaseMappers()` and `knexIdentifierMapping()` that 3.5.0 added. It also converted the keys of JSON columns that the driver returns parsed. Results are converted one level deep again, like before 3.5.0. The `KnexIdentifierMappingOptions` type is removed too. [#2273](https://github.com/Vincit/objection.js/issues/2273)

## 3.6.0

### What's new

- The graph options of `insertGraph()` / `upsertGraph()` that take relation paths (`relate`, `unrelate`, `insertMissing`, `update`, `noInsert`, `noUpdate`, `noDelete`, `noRelate`, `noUnrelate`) also accept a relation expression in the same syntax as `withGraphFetched()`, e.g. `noInsert: '*'` or `noDelete: '[pets, movies.reviews]'`. Like the array, an expression only matches the relations at the end of the paths it names, so `'movies.reviews'` doesn't match `movies`. `'*'` matches all relations at any depth, and recursive expressions like `'parent.^'` every level of the recursion. Root models are never matched, so `noInsert: '*'` inserts new root models but no related ones. Aliases and empty expressions throw an error. [#131](https://github.com/ditojs/objection/issues/131)

### Fixes

- `upsertGraph()` patches the related models of many-to-many relations by their id, and their extra properties in the join row by the ids of both ends. Until now these patches filtered by a subquery that joins the join table, and on MySQL, the patches of a graph upserted without a transaction deadlocked each other. The SQL of these patches changes. [#135](https://github.com/ditojs/objection/issues/135)
- The warning from 3.4.0 about owner models missing a join property skips the foreign key of a `BelongsToOneRelation`, unless it's part of the id. It's also missing when it was never set, e.g. on models returned by `insert()` or created with `fromJson()`, where no related model is the right result. A foreign key left out of a partial `select()` looks the same and no longer warns either. Join properties of all other relations still warn, including non-id columns. [#132](https://github.com/ditojs/objection/issues/132)
- `relate()`, `$relatedQuery().insert()` and `insertGraph()` / `upsertGraph()` inserting or relating models of many-to-many and has-one-through relations whose join table is also the related table throw an error, like `unrelate()` since 3.4.0. They inserted the join rows as new related rows, or failed with unique violations after inserting the related rows. [#133](https://github.com/ditojs/objection/issues/133)
- Recursive upserts of related models with children no longer warn about the unknown graph option `options` since 3.4.0

### Other

- Replace the custom build of lodash's `cloneDeep()` from 2018 with a small implementation, which `$clone()`, `toJSON()` and validation use to copy objects in model properties. It copies model data the same way, 2 to 4 times faster. Objects with a `null` prototype keep it instead of getting `Object.prototype`, `BigInt64Array` / `BigUint64Array` are copied instead of shared, and so are Buffers nested in objects, which shared their memory with the original before.
- The parsers of relation expressions and JSON field expressions are generated with [Peggy](https://peggyjs.org/) instead of PEG.js 0.10, with `npm run build:parsers`. Parse results and error messages are the same.
- The example projects use current versions of their dependencies and need Node.js 20.17 or newer

## 3.5.0

### What's new

- Add the `mapNestedKeys` option to `knexSnakeCaseMappers()` and `knexIdentifierMapping()`, which also converts the keys of objects nested one level down, e.g. the column names in the rows of knex's `nestTables: true` option on MySQL: `knexSnakeCaseMappers({ mapNestedKeys: true })` [#2273](https://github.com/Vincit/objection.js/issues/2273)
- The relation mapping's `beforeInsert(model, context, owner)` hook receives the owner model as a third argument. With `insertGraph()` / `upsertGraph()` it's the parent object from the input graph, which may not be inserted yet, and it's `undefined` when the query was started from ids or several owners. [#2240](https://github.com/Vincit/objection.js/issues/2240)

### Types

- Add the opt-in `TypedRelationMappings<M>` helper: used with `satisfies` on `relationMappings`, it checks that the mappings use relation properties of the model, a relation type matching their cardinality, and the right `modelClass` [#16](https://github.com/ditojs/objection/issues/16)
- Add `Generated<T>` to mark columns the database fills in, e.g. `id!: Generated<number>`, and the `Insertable<M>` / `InsertableGraph<M>` types for insert data, which leave them optional [#16](https://github.com/ditojs/objection/issues/16)
- Add `isOneToOne()` to the `Relation` typings and docs. It's the safe way to check for relations to a single model, as `HasOneRelation` and `HasOneThroughRelation` extend the many-relations.

## 3.4.1

### Fixes

- Select aliased aggregates like `count('* as n')`, `count('id', { as: 'n' })` and `count({ n: 'id' })` in `withGraphJoined()` modifiers. They were treated as selecting all columns, or were missing from the result. Unaliased aggregates are left out, since their column name differs between databases. [#2219](https://github.com/Vincit/objection.js/issues/2219)
- JSON field expressions (`ref('col:path')`, `'col:path'` keys in patches) and the `whereJson*()` methods warn once on databases other than Postgres, where they generate invalid or silently wrong SQL. MySQL, for example, reads `#>` as a comment. On MySQL, `whereJsonSupersetOf(column, value)` / `whereJsonSubsetOf(column, value)` with a plain column and a JSON object or array are passed on to knex, which supports them there. [#276](https://github.com/Vincit/objection.js/issues/276)
- Fix the infinite recursion in `andWhereJsonNotSupersetOf()`
- The warnings about missing join properties from 3.4.0 also cover `ManyToManyRelation` and `HasOneThroughRelation`: owner models missing a join property, and related models that come back without the owner join column, e.g. stripped by `$parseDatabaseJson()`. [#1832](https://github.com/Vincit/objection.js/issues/1832), [#2258](https://github.com/Vincit/objection.js/issues/2258)
- Warn once when a relation's owner join property holds an array, e.g. a JSON array of keys, which isn't supported and silently fetched no related models. Use a `ManyToManyRelation` through a join table instead. [#2667](https://github.com/Vincit/objection.js/issues/2667)

## 3.4.0

### What's new

- Support models without a primary key: return `null` from `idColumn`, e.g. for join table models. Methods that need an identifier, like `findById()`, `deleteById()` and `$query()`, throw an error. [#2305](https://github.com/Vincit/objection.js/issues/2305)

### Fixes

- `insertGraph()` / `upsertGraph()` with `relate: true` silently dropped `HasManyRelation` / `HasOneRelation` children whose composite id contains the foreign key, and deleted the existing ones without inserting them again [#2544](https://github.com/Vincit/objection.js/issues/2544)
- Required properties given as query properties, e.g. `raw()`, `val()`, `ref()` or subqueries, failed validation [#2199](https://github.com/Vincit/objection.js/issues/2199)
- `upsertGraph()` treated JSON arrays and objects as unchanged when they loosely equal the current value, e.g. `false` and `[]`. **Behaviour change:** these values are now patched. [#1874](https://github.com/Vincit/objection.js/issues/1874)
- Many-to-many and has-one-through relations whose join table is also the related table failed with SQL errors in `withGraphFetched()`, `$relatedQuery()` and `relatedQuery()`. `unrelate()` and patching join table extras on such relations throw an error instead of modifying the wrong rows. [#1803](https://github.com/Vincit/objection.js/issues/1803)
- Patch validation rejected valid patches when an `anyOf` / `oneOf` option only consisted of `required`, which 3.3.0 didn't cover yet [#1681](https://github.com/Vincit/objection.js/issues/1681)
- Throw `UniqueViolationError` for primary key violations on MSSQL [#2688](https://github.com/Vincit/objection.js/issues/2688)
- `$fetchGraph()` / `fetchGraph()` / `$relatedQuery()` warn once when owner models are missing a join property, e.g. an id left out of a partial `select()`. The relation silently came back empty. Since 3.6.0, the foreign keys of `BelongsToOneRelation` owners no longer warn, see [#132](https://github.com/ditojs/objection/issues/132). [#1832](https://github.com/Vincit/objection.js/issues/1832)
- `withGraphJoined()` checks column aliases against the identifier length limit of the database (MySQL 256, MSSQL 128, SQLite none) instead of always the 63 of Postgres, and the error points to the `minimize` option. The limit isn't configurable. [#2242](https://github.com/Vincit/objection.js/issues/2242)
- `withGraphFetched()` / `$fetchGraph()` warn once when related models are missing a join property, e.g. snake_case relation mappings with `knexSnakeCaseMappers()`. They were silently dropped. [#2258](https://github.com/Vincit/objection.js/issues/2258)
- `insertGraph()` / `upsertGraph()` warn once per unknown option, e.g. a misspelled `noInset`. The option is ignored, and will throw in 4.0. [#84](https://github.com/ditojs/objection/issues/84)

### Types

- Add the `only` option to `from()`, `table()` and `into()`, e.g. for Postgres `ONLY` [#2182](https://github.com/Vincit/objection.js/issues/2182)

### Docs

- `first()` doesn't limit the related items per parent in `modifyGraph()` [#1647](https://github.com/Vincit/objection.js/issues/1647)
- `runAfter()` in the queries of fetched relations can't replace the related models [#2647](https://github.com/Vincit/objection.js/issues/2647)
- `page()` and `range()` need an `orderBy()` with a unique tiebreaker to avoid repeated or skipped rows [#2575](https://github.com/Vincit/objection.js/issues/2575)
- Typing model properties with a merged interface [#2237](https://github.com/Vincit/objection.js/issues/2237)
- The `through` mapping of relations whose join table is also the related table [#1803](https://github.com/Vincit/objection.js/issues/1803)

### Other

- **Breaking for old knex:** the knex peer dependency is `>=2.3.0` instead of `>=1.0.1`. Some fixes of 3.3.0 don't work with older knex versions. CI now also tests knex 2.3.0. Part of [#95](https://github.com/ditojs/objection/issues/95)
- Tests no longer use bluebird, lodash and uuid

## 3.3.0

### Security

- Escape keys in JSON field expressions. A `?` in a key used in `ref()`, a patch or update with field expression keys, or the `whereJson*` methods was read by knex as a binding placeholder [#2077](https://github.com/Vincit/objection.js/issues/2077), and a `'` broke out of the SQL string literal, allowing SQL injection when keys come from user input.

### What's new

- `withGraphFetched()` / `withGraphJoined()` narrow the result types: fetched relations become required on the result. Generic helpers with an explicit `QB` return type need `withGraphFetched<string>()`. [#25](https://github.com/ditojs/objection/pull/25) **Behaviour change:** this also breaks variables declared with `let` that are later assigned an unnarrowed query, helpers generic over the model type that return `QueryBuilder<M>`, and explicit type arguments like `Person.fetchGraph<Person>()` (fixed in 3.7.0). Annotate the variable, or use `withGraphFetched<string>()`.
- Add `withGraph()` with algorithm-agnostic merging, and `isJoinChildQuery()` [#63](https://github.com/ditojs/objection/issues/63)
- Add `patchById()` and `updateById()` [#1415](https://github.com/Vincit/objection.js/issues/1415)
- `insertGraph()` / `upsertGraph()` resolve cyclic `#ref` dependencies by deferring `BelongsToOne` foreign keys. Graphs that threw before now succeed, and the deferred foreign keys are written with one `patch()` per owner model, which runs its update hooks. [#1482](https://github.com/Vincit/objection.js/issues/1482)
- Add a `preserveJsonKeys` option to `snakeCaseMappers()` to map only the column part of field expressions [#1089](https://github.com/Vincit/objection.js/issues/1089)
- Support empty keys in JSON field expressions, e.g. `col:[""]` [#2680](https://github.com/Vincit/objection.js/pull/2680). **Behaviour change:** `col:[""]` and `col:['']` used to refer to a key consisting of the two quote characters, `col:[a,b]` to the path `a.b` instead of the key `a,b`, and spaces around keys in brackets were trimmed.
- `whereJson*` methods accept `ref()`, `val()`, `raw()` and subqueries on the right side
- Pass `returning()` options, e.g. `includeTriggerModifications`, on to knex [#2309](https://github.com/Vincit/objection.js/issues/2309)

### Fixes

- Group the user's where clauses when adding a relation's owner condition. `$relatedQuery(...).where(a).orWhere(b).delete()` / `patch()` affected **other owners' rows**, and finds returned them. [#2191](https://github.com/Vincit/objection.js/issues/2191), [#1909](https://github.com/Vincit/objection.js/issues/1909)
- `findByIds([])` / `whereInComposite()` with an empty array and composite ids produced invalid SQL, and **matched every row on SQLite** [#1914](https://github.com/Vincit/objection.js/issues/1914)
- `onConflict().ignore()`: inserted rows were assigned to the wrong models, `$setDatabaseJson` could crash, and `insertAndFetch()` fetched undefined ids. **Behaviour change:** on SQLite this uses `RETURNING`, which needs SQLite 3.35 or newer, and it throws when it can't match the returned rows to the models, e.g. with ids generated by the database. Ignored models are still returned, with their input values. [#2320](https://github.com/Vincit/objection.js/issues/2320), [#2597](https://github.com/Vincit/objection.js/issues/2597), [#2661](https://github.com/Vincit/objection.js/issues/2661)
- `asFindQuery()` in many-to-many update and delete hooks lost its filters [#2266](https://github.com/Vincit/objection.js/issues/2266)
- Patch validation: `not` schemas stay intact [#1681](https://github.com/Vincit/objection.js/issues/1681), and nested `required` is also stripped for nullable and untyped objects, extending the 3.1.2 fix [#1664](https://github.com/Vincit/objection.js/issues/1664)
- `resultSize()` and the `total` of `page()` count root models instead of joined rows with `withGraphJoined()` [#2143](https://github.com/Vincit/objection.js/issues/2143), [#2329](https://github.com/Vincit/objection.js/issues/2329). The limit of `page()` still applies to the joined rows.
- Keep aliased subquery and raw selections in `withGraphJoined()` modifiers [#2365](https://github.com/Vincit/objection.js/issues/2365)
- Map column names in `whereJson*` methods with `knexSnakeCaseMappers`. **Behaviour change:** column names given in database format are mapped again, which changes some of them, e.g. `data_2` with `underscoreBeforeDigits`.
- Match `table.*` selections through knex identifier mapping [#2288](https://github.com/Vincit/objection.js/issues/2288)
- Use the keys of modified `graphExpressionObject()` results [#2793](https://github.com/Vincit/objection.js/issues/2793)
- Track internally selected columns on the query builder, so `runAfter()` hooks of the query never see them. The queries of relations loaded with `withGraphFetched()` still do. [#45](https://github.com/ditojs/objection/issues/45)
- **Behaviour change:** many-to-many `unrelate()` / `patch()` only modify the join rows matching the filters, not all join rows of the matching related rows [#1853](https://github.com/Vincit/objection.js/issues/1853). The generated SQL of these operations changes. On MySQL, the matching join rows are fetched in a separate query, which avoids `ER_UPDATE_TABLE_USED` ("You can't specify target table … for update in FROM clause") [#2127](https://github.com/Vincit/objection.js/issues/2127) and `ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG` when a trigger on the join table modifies the related table [#2406](https://github.com/Vincit/objection.js/pull/2406), and `unrelate()` returns `0` instead of `[]` when nothing matches. Ported from [#2406](https://github.com/Vincit/objection.js/pull/2406).
- **Behaviour change:** `asFindQuery()` in hooks no longer applies the `runAfter()` callbacks of the original query, including those of `throwIfNotFound()` and `traverse()`, and returns `[]` instead of `[undefined]` for a `findById()` that finds nothing [#2093](https://github.com/Vincit/objection.js/issues/2093)
- **Behaviour change:** field expression keys in patch objects, e.g. `'meta:a.b'`, are validated against the nested schema of the JSON column. Patches like `{ 'meta:b': value }` no longer fail with `additionalProperties: false`, but patches that passed before can fail the nested schema [#1666](https://github.com/Vincit/objection.js/issues/1666)
- **Behaviour change:** the `joinOperation` option of `withGraphJoined()` applies per call, no longer to all relations of the query [#2125](https://github.com/Vincit/objection.js/issues/2125)
- **Behaviour change:** `withGraphJoined()` throws when it can't identify rows, instead of silently merging them [#2737](https://github.com/Vincit/objection.js/issues/2737). It still needs a primary key on every model, and models without one throw a clear error [#2748](https://github.com/Vincit/objection.js/issues/2748).
- `insertGraph()` / `upsertGraph()` warn when `onConflict()`, `ignore()` or `merge()` is used. The clause is ignored, and will throw in 4.0. [#2156](https://github.com/Vincit/objection.js/issues/2156)

### Types

- **Breaking for TypeScript < 5.0:** the typings use `const` type parameters, so they need TypeScript 5.0 or newer. `skipLibCheck` doesn't help, as older versions can't parse them.
- Export the db-errors classes as types [#2499](https://github.com/Vincit/objection.js/issues/2499)

### Docs

- The docs moved to VitePress and are hosted at [ditojs.github.io/objection](https://ditojs.github.io/objection/)
- Document `relatedFindQueryMutates` / `relatedInsertQueryMutates` [#2356](https://github.com/Vincit/objection.js/issues/2356)
- Document running code after a transaction commits [#2582](https://github.com/Vincit/objection.js/issues/2582)

### Other

- Update knex to 3.3 in development, which fixes inverted bindings in `delete()` with `joinRelated()` [#2799](https://github.com/Vincit/objection.js/issues/2799)

Thanks to @falkenhawk and Marcin L for the many-to-many work in [#2406](https://github.com/Vincit/objection.js/pull/2406), @kapouer for [#2680](https://github.com/Vincit/objection.js/pull/2680) and @cesumilo for [#2625](https://github.com/Vincit/objection.js/pull/2625), which led to `preserveJsonKeys`.

## 3.2.0

Objection is now maintained at [ditojs/objection](https://github.com/ditojs/objection).

### What's new

- Support mixing `withGraphJoined()` and `withGraphFetched()` in the same query. Before, the last method called silently decided the algorithm for all relations. A top-level relation can only be loaded with one of them. **Behaviour change:** loading the same top-level relation with both, e.g. `withGraphFetched('pets').withGraphJoined('pets.toys')`, throws. Before, all relations were joined. [#2269](https://github.com/Vincit/objection.js/issues/2269)
- Add `none()` to make a query match no rows [#2184](https://github.com/Vincit/objection.js/issues/2184)
- `upsertGraph()`: mark individual related models with `#unrelate` or `#delete` [#2410](https://github.com/Vincit/objection.js/pull/2410). Since 3.7.0, the markers need the `allowMarkers: true` option.
- Return rows from `relate()` with `returning()` [#2044](https://github.com/Vincit/objection.js/issues/2044)
- Apply `select()` to the fetch query of `updateAndFetch()`, `patchAndFetch()` and their `ById` variants [#1938](https://github.com/Vincit/objection.js/issues/1938)
- Add a `noDoubleUnderscores` option to the snake case mappers [#2805](https://github.com/Vincit/objection.js/issues/2805)
- Pass `format` options from `toJSON()` / `$toJson()` to `$formatJson()` of the model and all nested models [#2033](https://github.com/Vincit/objection.js/pull/2033)
- Support `$defs` in JSON schemas [#2576](https://github.com/Vincit/objection.js/pull/2576)

### Fixes

- **Behaviour change:** throw when `for()` is used outside of `relatedQuery()`. It was silently ignored before, so `Model.query().for(1).delete()` deleted **every row** of the table. [#2185](https://github.com/Vincit/objection.js/issues/2185)
- **Behaviour change:** throw when `for()` is called after a write method on a `relatedQuery()`. Before, `update()`, `patch()` and `delete()` silently did nothing, and `insert()` and `relate()` wrote `NULL` foreign keys.
- Fix validators being shared between models with the same `uniqueTag()` but different schemas. Part of [#2540](https://github.com/Vincit/objection.js/issues/2540)
- Fix `orderBy()` with refs and raws as array items [#2252](https://github.com/Vincit/objection.js/issues/2252)
- Clear an `orderBy` added at build time, e.g. by a relation's `modify`, from the `resultSize()` and `page()` count query [#2747](https://github.com/Vincit/objection.js/issues/2747)
- Support `Model.ref()` references in relation join mappings [#1873](https://github.com/Vincit/objection.js/issues/1873)
- Reference the bare column in JSON where methods when no JSON path is given, so Postgres can use GIN indexes [#2008](https://github.com/Vincit/objection.js/issues/2008)
- Fix subqueries in join builders on MySQL (`parentQuery.isUpdate is not a function`) [#2407](https://github.com/Vincit/objection.js/pull/2407)
- Make `union()` deduplicate regardless of array size [#2811](https://github.com/Vincit/objection.js/issues/2811)
- Serialize relation modifiers and aliases before the recursion marker in `RelationExpression.toString()` [#2812](https://github.com/Vincit/objection.js/issues/2812)

### Types

- Fix `first()` infinite type recursion in custom query builder methods [#2637](https://github.com/Vincit/objection.js/issues/2637)
- `PartialModelObject` accepts partial model data for nested relations, so inserting objects typed with data-only interfaces type-checks [#2190](https://github.com/Vincit/objection.js/issues/2190)
- Keep custom query builder types after `throwIfNotFound()`
- Add a `QueryBuilder` constructor typing for custom query builders [#2306](https://github.com/Vincit/objection.js/issues/2306)
- Allow `null` and readonly arrays for `idColumn`, readonly arrays for `jsonAttributes`. Code that reads them needs to handle these types. Models without a primary key are supported at runtime since 3.4.0. [#2693](https://github.com/Vincit/objection.js/issues/2693), [#2745](https://github.com/Vincit/objection.js/issues/2745)
- Allow `bigint` values in where methods [#2318](https://github.com/Vincit/objection.js/issues/2318)
- Support object joins, `limit()` / `offset()` with `skipBinding`, and aliased aggregates. Part of [#2189](https://github.com/Vincit/objection.js/issues/2189)
- Fix the `tableNameFor()`, `tableRefFor()` and `aliasFor()` typings [#2790](https://github.com/Vincit/objection.js/pull/2790)
- Add `knexIdentifierMapping` [#1947](https://github.com/Vincit/objection.js/issues/1947)
- Add `tableName()`, `tableRef()` and `emptyInstance()` to `QueryBuilder` [#2792](https://github.com/Vincit/objection.js/pull/2792), [#2794](https://github.com/Vincit/objection.js/pull/2794)
- Add the column list overload of `with()` [#2749](https://github.com/Vincit/objection.js/issues/2749)
- Fix generic static `this` for `query()`, `fromJson()` and `fetchGraph()` [#2700](https://github.com/Vincit/objection.js/pull/2700)

### Docs

- Document what `afterInsert()` receives as `result` [#2342](https://github.com/Vincit/objection.js/issues/2342)
- Document that `withGraphJoined()` requires a primary key [#2748](https://github.com/Vincit/objection.js/issues/2748)
- Document the `skipUndefined()` deprecation [#2149](https://github.com/Vincit/objection.js/issues/2149)
- Use `declare` for the query builder type properties in the custom query builder and plugin recipes, which fail with TS2612 on ES2022+ targets
- Fix the koa-ts example typings [#2361](https://github.com/Vincit/objection.js/issues/2361)
- Clarify `whereNotColumn()` [#2808](https://github.com/Vincit/objection.js/pull/2808)

### Other

- Drop Node 14 from CI, since knex 3 requires Node 16+. Objection's `engines` still include Node 14, but it's no longer tested.

Thanks to everyone whose pull requests made it into this release: @amit-meshbey, @androvonx95, @bilalakbar, @Bolt4243, @cesumilo, @falkenhawk, @geeksilva97, @IlyaSemenov, @kapouer, @kartikdp, @LiahMartens, @max-kahnt-keylight, @nickbouldien, @nickfuryoc, @ralcorta and @salisbury-espinosa.

## 3.1.5

### What's new

- Types: Fix generic static `this` [#2533](https://github.com/Vincit/objection.js/pull/2533)
- Types: Add `fromRaw` to `FromSelector regex [#2628](https://github.com/Vincit/objection.js/issues/2628)
- Types: Fix argument types of `onConflict()` [#2635](https://github.com/Vincit/objection.js/pull/2635)
- Types: Make `trx` optional for `Model.transaction(trx, cb)` [#2694](https://github.com/Vincit/objection.js/pull/2694)

## 3.1.4

### What's new

- Fix `upsertGraph()` `$beforeUpdate()` calls on empty relates [#2605](https://github.com/Vincit/objection.js/issues/2605)
- Don't call `onError()` with internal exceptions [#2603](https://github.com/Vincit/objection.js/issues/2603)
- Remove docs and typings for nonexistent `$pick()`
- Make `$omitFromJson()` + `$omitFromDatabaseJson()` compatible with old `$omit()` syntax

## 3.1.3

### What's new

- Revert generic constructor type change [#2531](https://github.com/Vincit/objection.js/issues/2531), [#2399](https://github.com/Vincit/objection.js/pull/2399)

### What's new

- Patch Validator: Prevent recursion on inner properties [#2520](https://github.com/Vincit/objection.js/pull/2520)

## 3.1.2
  
### What's new

- Patch Validator: Prevent recursion on inner properties [#2520](https://github.com/Vincit/objection.js/pull/2520)

## 3.1.1

### What's new

- Only add Ajv formats if they weren't added in user-land already [#2482](https://github.com/Vincit/objection.js/pull/2482)

## 3.1.0

### What's new

- Support `$beforeUpdate()` mutations in `upsertGraph()` [#2233](https://github.com/Vincit/objection.js/issues/2233)
- Remove deprecated `$afterGet()` hook [#2477](https://github.com/Vincit/objection.js/pull/2477)
- Drop support for Node v12 [#2478](https://github.com/Vincit/objection.js/pull/2478)

## 3.0.5

### What's new

- Fixes [#2183](https://github.com/Vincit/objection.js/pull/2183)
- Fixes [#2257](https://github.com/Vincit/objection.js/pull/2257)
- Fixes [#2276](https://github.com/Vincit/objection.js/pull/2276)
- Fixes [#2453](https://github.com/Vincit/objection.js/pull/2453)
- Fixes [#2476](https://github.com/Vincit/objection.js/pull/2476)

## 3.0.4

### What's new

- Fixes [#2447](https://github.com/Vincit/objection.js/issues/2447)

## 3.0.3

### What's new

- Fixes [#1673](https://github.com/Vincit/objection.js/issues/1673)
- Fixes [#1957](https://github.com/Vincit/objection.js/issues/1957)
- Fixes [#2105](https://github.com/Vincit/objection.js/issues/2105)
- Fixes [#2132](https://github.com/Vincit/objection.js/issues/2132)
- Fixes [#2251](https://github.com/Vincit/objection.js/issues/2251)
- Fixes [#2262](https://github.com/Vincit/objection.js/issues/2262)
- Fixes [#2271](https://github.com/Vincit/objection.js/issues/2271)
- Fixes [#2277](https://github.com/Vincit/objection.js/issues/2277)
- Fixes [#2308](https://github.com/Vincit/objection.js/pull/2308)
- Fixes [#2311](https://github.com/Vincit/objection.js/issues/2311)
- Fixes [#2311](https://github.com/Vincit/objection.js/pull/2311)
- Fixes [#2311](https://github.com/Vincit/objection.js/pull/2311)
- Fixes [#2332](https://github.com/Vincit/objection.js/issues/2332)
- Fixes [#2337](https://github.com/Vincit/objection.js/issues/2337)
- Fixes [#2372](https://github.com/Vincit/objection.js/pull/2372)
- Fixes [#2379](https://github.com/Vincit/objection.js/pull/2379)
- Fixes [#2383](https://github.com/Vincit/objection.js/pull/2383)
- Fixes [#2399](https://github.com/Vincit/objection.js/pull/2399)
- Fixes [#2404](https://github.com/Vincit/objection.js/pull/2404)
- Fixes [#2405](https://github.com/Vincit/objection.js/pull/2405)
- Fixes [#2408](https://github.com/Vincit/objection.js/pull/2408)
- Fixes [#2409](https://github.com/Vincit/objection.js/pull/2409)
- Fixes [#2423](https://github.com/Vincit/objection.js/pull/2423)

## 3.0.2

### What's new

- Fixes [#1356](https://github.com/Vincit/objection.js/issues/1356)
- Fixes [#1957](https://github.com/Vincit/objection.js/issues/1957)
- Fixes [#2192](https://github.com/Vincit/objection.js/issues/2192)
- Fixes [#2247](https://github.com/Vincit/objection.js/pull/2247)
- Fixes [#2307](https://github.com/Vincit/objection.js/pull/2307)
- Fixes [#2308](https://github.com/Vincit/objection.js/pull/2308)
- Fixes [#2311](https://github.com/Vincit/objection.js/pull/2311)
- Fixes [#2323](https://github.com/Vincit/objection.js/pull/2323)
- Fixes [#2337](https://github.com/Vincit/objection.js/issues/2337)
- Fixes [#2362](https://github.com/Vincit/objection.js/pull/2362)

## 3.0.1

### What's new

- Fixes [#2123](https://github.com/Vincit/objection.js/issues/2123)
- Fixes [#2150](https://github.com/Vincit/objection.js/issues/2150)
- Fixes [#2179](https://github.com/Vincit/objection.js/pull/2179)

## 3.0.0

### What's new

- Fixes [#1986](https://github.com/Vincit/objection.js/issues/1986)
- Fixes [#1987](https://github.com/Vincit/objection.js/issues/1987)
- Fixes [#1954](https://github.com/Vincit/objection.js/issues/1954)
- Fixes [#1993](https://github.com/Vincit/objection.js/issues/1993)
- Fixes [#1688](https://github.com/Vincit/objection.js/issues/1688)
- Fixes [#1651](https://github.com/Vincit/objection.js/issues/1651)
- Fixes [#2135](https://github.com/Vincit/objection.js/issues/2135)
- Fixes [#1936](https://github.com/Vincit/objection.js/issues/1936)
- Fixes [#1905](https://github.com/Vincit/objection.js/issues/1905)
- Fixes [#1997](https://github.com/Vincit/objection.js/issues/1997)
- Fixes [#2024](https://github.com/Vincit/objection.js/issues/2024)

### Breaking changes

See the [migration guide](/release-notes/migration.md).

## 2.2.10

### What's new

- Add `modelClass` property for `ValidationError` and `NotFoundError`.

## 2.2.9

### What's new

- Add `noWait` query builder method.

## 2.2.8

### What's new

- Fixes [#1982](https://github.com/Vincit/objection.js/issues/1982)
- Fixes [#1983](https://github.com/Vincit/objection.js/issues/1983)

## 2.2.7

### What's new

- `QueryBuilder.castTo` can now be used to cast query results to any typescript type.

## 2.2.6

### What's new

- Fixes [#1964](https://github.com/Vincit/objection.js/issues/1964)

## 2.2.5

### What's new

- Fixes [#1855](https://github.com/Vincit/objection.js/issues/1855)

## 2.2.4

### What's new

- Add support for onConflict, merge and ignore knex methods.

## 2.2.2

### What's new

- [#1722](https://github.com/Vincit/objection.js/issues/1722)

## 2.2.1

### What's new

- Fixes [#1757](https://github.com/Vincit/objection.js/issues/1757)
- Fixes [#1729](https://github.com/Vincit/objection.js/issues/1729)

## 2.2.0

### What's new

- Fixes [#1770](https://github.com/Vincit/objection.js/issues/1770)
- Fixes [#1699](https://github.com/Vincit/objection.js/issues/1699)
- Fixes [#1703](https://github.com/Vincit/objection.js/issues/1703)
- Fixes [#1675](https://github.com/Vincit/objection.js/issues/1675)
- Fixes [#1708](https://github.com/Vincit/objection.js/issues/1708)
- Fixes [#1743](https://github.com/Vincit/objection.js/issues/1743)
- Fixes [#1731](https://github.com/Vincit/objection.js/issues/1731)
- Fixes [#1761](https://github.com/Vincit/objection.js/issues/1761)

## 2.1.4

### What's new

- Fixes [#1750](https://github.com/Vincit/objection.js/issues/1750)

## 2.1.3

### What's new

- Add `underscoreBetweenUppercaseLetters` option for snake case mappers. [#1676](https://github.com/Vincit/objection.js/issues/1676)

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

- modifiers can now take arguments and are a lot more useful. See [this recipe](/recipes/modifiers.html) for more info.

- Objection now uses the [db-errors](https://github.com/Vincit/db-errors) library by default to wrap the database errors.

- `insertMissing` `upsertGraph` option now works as expected with `relate: true`: items that are not found in the database are inserted.

- Brand new typings written from scratch with many improvements and finally a support for [custom query builders](/recipes/custom-query-builder.html)

- A bunch of improvements and bug fixes for `upsertGraph`, including a huge speedup in some cases due to less data fetching.

- A brand new [fn](/api/objection/#fn) helper for calling SQL functions.

- Objection now uses native promises instead of bluebird.

- Objection is now leaner as we dropped a bunch of dependencies like `bluebird` and `lodash`.

- In addition to all of this, a huge number of bugs has been squashed!

### Breaking changes

See the [migration guide](/release-notes/migration.md).

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

- Make [Model.fetchTableMetadata](/api/model/static-methods.html#static-fetchtablemetadata) and [Model.tableMetadata](/api/model/static-methods.html#static-tablemetadata) methods public. [#871](https://github.com/Vincit/objection.js/issues/871)
- Add [onBuildKnex](/api/query-builder/other-methods.html#onbuildknex) query builder hook. [#807](https://github.com/Vincit/objection.js/issues/807)

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

- Optional [object notation](/api/types/#relationexpression-object-notation) for relation expressions.
- fix [#855](https://github.com/Vincit/objection.js/issues/855)
- fix [#858](https://github.com/Vincit/objection.js/issues/858)

## 1.0.1

### What's new

- Added public [Relation.joinModelClass](/api/types/#class-relation) accessor
- Don't call `returning` on sqlite (prevents a warning message added in knex 0.14.4)
- fix [#844](https://github.com/Vincit/objection.js/issues/844)
- Small documentation updates
- Small typing fixes end updates

## 1.0.0 🎉

### What's new

- The static [`relatedQuery`](/api/model/static-methods.html#static-relatedquery) method.
- New reflection methods:
  [`isFind`](/api/query-builder/other-methods.html#isfind),
  [`isInsert`](/api/query-builder/other-methods.html#isinsert),
  [`isUpdate`](/api/query-builder/other-methods.html#isupdate),
  [`isDelete`](/api/query-builder/other-methods.html#isdelete),
  [`isRelate`](/api/query-builder/other-methods.html#isrelate),
  [`isUnrelate`](/api/query-builder/other-methods.html#isunrelate),
  [`hasWheres`](/api/query-builder/other-methods.html#haswheres),
  [`hasSelects`](/api/query-builder/other-methods.html#hasselects),
  `hasEager`,
  [`has`](/api/query-builder/other-methods.html#has).
  [`clear`](/api/query-builder/other-methods.html#clear).
  [`columnNameToPropertyName`](/api/model/static-methods.html#static-columnnametopropertyname),
  [`propertyNameToColumnName`](/api/model/static-methods.html#static-propertynametocolumnname).
- `ManyToMany` extras now work consistently in queries and filters. [#760](https://github.com/Vincit/objection.js/issues/760)

### Breaking changes

- `modelInstance.$query().delete().returning(something)` now returns a single instance instead of an array. [#659](https://github.com/Vincit/objection.js/issues/659)

- Node 6.0.0 is now the minimum. Objection will not work on node < 6.0.0.

- [`ValidationError`](/api/types/#class-validationerror) overhaul. This is a big one, so read this carefully! There are three things to check when you migrate to 1.0:

  1. The [`createValidationError`](/api/model/static-methods.html#static-createvalidationerror) and [`ValidationError`](/api/types/#class-validationerror) interfaces have changed.
     If you have overridden the `createValidationError` method in your project, or you create custom `ValidationError` instances
     you need migrate to the interfaces.
  2. The model validation errors (jsonSchema violations) have remained pretty much the same but there are couple of differences. Before, the
     keys of `error.data` were property names even when a nested object in a graph failed a validation. Now the keys for nested
     validation errors are key paths like `foo.bar[2].spam`. Another tiny difference is the order of validation errors for each key in
     `error.data`. Let's say a property `spam` failed for your model and `error.data.spam` contains an array of objects that describe
     the failures. Before, the first failed validation was the last item in the array, now it is the first item.
  3. All [`ValidationErrors`](/api/types/#class-validationerror) now have a `type` field. Before all [`ValidationErrors`](/api/types/#class-validationerror) but the model
     validation errors (errors like "invalid relation expression", or "cyclic model graph") had no type, and could only be identified
     based on the existence of some weird key in `error.data`. The `error.data` is now removed from those errors and the `type` should be
     used instead. The message from the data is now stored in `error.message`.

- Removed deprecated methods `whereRef`, `whereJsonField` and `whereJsonEquals`. The [`ref`](/api/objection/#ref) helper can be used to replace the
  `whereRef` calls. [`ref`](/api/objection/#ref) and `lit` can be used to replace the removed json methods.

- `ManyToMany` extras now work consistently in queries and filters. [#760](https://github.com/Vincit/objection.js/issues/760). This is not
  a breaking change per se, but can cause some queries to fail with a "ambiguous identifier" error because the join table is now joined
  in places where it previously wasn't. You need to explicitly specify the table for those failing columns using `Table.theColumn` syntax.

### Changes

- `isFindQuery` is renamed to [`isFind`](/api/query-builder/other-methods.html#isfind) and deprecated.

## 0.9.4

### What's new

- Fixed [#627](https://github.com/Vincit/objection.js/issues/627)
- Fixed [#671](https://github.com/Vincit/objection.js/issues/671)
- Fixed [#672](https://github.com/Vincit/objection.js/issues/672)
- Fixed [#674](https://github.com/Vincit/objection.js/issues/674)

## 0.9.3

### What's new

- Add beforeInsert hook for relations. [#649](https://github.com/Vincit/objection.js/issues/649) [#19](https://github.com/Vincit/objection.js/issues/19)
- Add `relatedFindQueryMutates` and `relatedInsertQueryMutates` configs as well as [`$setRelated`](/api/model/instance-methods.html#setrelated) and [`$appendRelated`](/api/model/instance-methods.html#appendrelated) helpers. [#599](https://github.com/Vincit/objection.js/issues/599)
- Fixed [#648](https://github.com/Vincit/objection.js/issues/648)

## 0.9.2

### What's new

- Fix regression: `from` fails with a subquery.

## 0.9.1

### What's new

- [`castTo`](/api/query-builder/other-methods.html#castto) method for setting the model class of query result rows.
- [`onError`](/api/query-builder/other-methods.html#onerror) `QueryBuilder` method.
- [`knexSnakeCaseMappers`](/api/objection/#knexsnakecasemappers) and [`snakeCaseMappers`](/api/objection/#snakecasemappers) for snake_case to camelCase conversions.

## 0.9.0

### What's new

- Relations can now be defined using keys inside JSON columns. See the examples [here](/api/model/static-properties.html#static-relationmappings).
- `lit` helper function [#275](https://github.com/Vincit/objection.js/issues/275)
- Fixes for [`upsertGraph`](/api/query-builder/mutate-methods.html#upsertgraph) when using composite keys. [#517](https://github.com/Vincit/objection.js/issues/517)
- Added `noDelete`, `noUpdate`, `noInsert`, `noRelate` and `noUnrelate` options for `upsertGraph`. See [UpsertGraphOptions docs](/api/types/#type-upsertgraphoptions) for more info.
- `insertGraph` now accepts an options object just like `upsertGraph`. `relate` option can be used instead of `#dbRef`. [#586](https://github.com/Vincit/objection.js/issues/586)

### Breaking changes

- Instance update/patch with `returning` now return a single object instead of an array. [#423](https://github.com/Vincit/objection.js/issues/423)

- Because of the support for JSON relations [the `Relation` class](/api/types/#class-relation)
  has changed a bit.

## 0.8.8

### What's new

- Typing updates: [#489](https://github.com/Vincit/objection.js/issues/489) [#487](https://github.com/Vincit/objection.js/issues/487)
- Improve `resultSize` method. [#213](https://github.com/Vincit/objection.js/issues/213)
- Avoid unnecessary updates in upsertGraph [#480](https://github.com/Vincit/objection.js/issues/480)

## 0.8.7

### What's new

- `throwIfNotFound` now also throws when update or delete doesn't change any rows.
- [`mixin`](/api/objection/#mixin) and [`compose`](/api/objection/#compose) helpers for applying multiple plugins. [#475](https://github.com/Vincit/objection.js/issues/475) [#473](https://github.com/Vincit/objection.js/issues/473)
- Typing updates [#474](https://github.com/Vincit/objection.js/issues/474) [#479](https://github.com/Vincit/objection.js/issues/479)
- `upsertGraph` now validates patched models correctly. [#477](https://github.com/Vincit/objection.js/issues/477)

## 0.8.6

### What's new

- Finally: the first version of [`upsertGraph`](/guide/query-examples.html#graph-upserts) method! Please open issues about bugs, WTFs and missing features.
- Strip readonly virtual properties in fromJson & friends [#432](https://github.com/Vincit/objection.js/issues/432)
- Fixed [#439](https://github.com/Vincit/objection.js/issues/439)

## 0.8.5

### What's new

- Add [`Model.useLimitInFirst`](/api/model/static-properties.html#static-uselimitinfirst) configuration flag.

## 0.8.4

### What's new

- New shorthand methods `joinEager`, `naiveEager`,
  `mergeJoinEager` and `mergeNaiveEager`.
- New shorthand method [`findOne`](/api/query-builder/find-methods.html#findone)
- New reflection method [`isFindQuery`](/api/query-builder/other-methods.html#isfind)
- ManyToMany extra properties can now be updated [#413](https://github.com/Vincit/objection.js/issues/413)

## 0.8.3

### What's new

- `NaiveEagerAlogrithm`
- [Aliases in relation expressions](/api/types/#type-relationexpression) [#402](https://github.com/Vincit/objection.js/issues/402)
- New lazily evaluated `raw` function. [#275](https://github.com/Vincit/objection.js/issues/275)

## 0.8.2

### What's new

- `Model.namedFilters` object for defining shared filters that can be used by name in eager expressions.
- Full support for views and table aliases in eager, join, joinRelation etc. [#181](https://github.com/Vincit/objection.js/issues/181)
- Fix `bindTransaction` bug with `ManyToManyRelation` junction tables [#395](https://github.com/Vincit/objection.js/issues/395)

## 0.8.1

### What's new

- [`throwIfNotFound`](/api/query-builder/other-methods.html#throwifnotfound) method for making empty query results throw an exception.
- fix error when passing model instance to a `where` method. [#387](https://github.com/Vincit/objection.js/issues/387)

## 0.8.0

### What's new

- All query methods now call `Model.query` to create a `QueryBuilder` instance [#346](https://github.com/Vincit/objection.js/issues/346)
- Objection is no longer transpiled. One of the implications is that you can use a github
  link in package.json to test experimental versions.
- `count` can now be called without arguments [#364](https://github.com/Vincit/objection.js/issues/364)
- A new [`getRelations`](/api/model/static-methods.html#static-getrelations) method for plugin development and other reflection greatness.

### Breaking changes

> Old model definition

```js
function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);

Person.tableName = 'Person';

Person.prototype.fullName = function () {
  return this.firstName + ' ' + this.lastName;
};

// More static and prototype methods.
```

> Easiest way to migrate to `class` and `extends` keywords

```js
class Person extends Model {}

Person.tableName = 'Person';

Person.prototype.fullName = function () {
  return this.firstName + ' ' + this.lastName;
};

// More static and prototype methods.
```

- Support for node versions below 4.0.0 has been removed. With it the support for legacy class inheritance using `Model.extend` method
  has also been removed. This means that you need to change your model definitions to use the `class` and `extends` keywords.
  To achieve this with the minimum amount of changes you can simply swap the constructor function and `Model.extend` to
  a class definition. You can still define all static and prototype methods and properties the old way. See the example on the right -->

  Note that this also affects Babel transpilation. You cannot (or need to) use `babel-plugin-transform-es2015-classes` anymore.
  See the [ESNext example project](https://github.com/Vincit/objection.js/tree/0.8.0/examples/express-es7) as an example of
  how to setup babel.

- The default value of [`pickJsonSchemaProperties`](/api/model/static-properties.html#static-pickjsonschemaproperties) was changed to `false`. Before, all properties that
  were not listed in `jsonSchema` were removed before `insert`, `patch` or `update` (if `jsonSchma` was defined). Starting from
  this version you need to explicitly set the value to `true`. You may have been used this feature by accident.
  If you have weird problems after the update, try setting `objection.Model.pickJsonSchemaProperties = true;` to see
  if it helps.

- [`relate`](/api/query-builder/mutate-methods.html#relate) and [`unrelate`](/api/query-builder/mutate-methods.html#unrelate) methods now return the result of the
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

- `joinRelation` now accepts [`RelationExpressions`](/api/types/#type-relationexpression) and can join multiple and nested relations.

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
- Validation can now be easily modified through a new [`Validator`](/api/types/#class-validator) interface. [#241](https://github.com/Vincit/objection.js/issues/241) [#199](https://github.com/Vincit/objection.js/issues/199)
- fix a `JoinEager` problem where an empty result for a relation caused the following relations to be empty. [#292](https://github.com/Vincit/objection.js/issues/292)
- `ref(fieldExpression)` syntax to reduce need for knex.raw and updating single attribute inside JSON column. [#270](https://github.com/Vincit/objection.js/issues/270)
- mergeEager method.

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

- Eager loading can now be done using joins and zero extra queries. See `eagerAlgorithm`, `defaultEagerAlgorithm` and `eager` for more info.
- `#ref` in graph inserts can now contain extra properties for many-to-many relations [#156](https://github.com/Vincit/objection.js/issues/156)
- `#dbRef` can now be used to refer to existing rows from a `insertWithRelated` graph.
- [`modelPaths`](/api/model/static-properties.html#static-modelpaths) attribute for cleaner way to point to models in relationMappings.
- [`pickJsonSchemaProperties`](/api/model/static-properties.html#static-pickjsonschemaproperties) config parameter [#110](https://github.com/Vincit/objection.js/issues/110)
- [`insertGraphAndFetch`](/api/query-builder/mutate-methods.html#insertgraphandfetch) with `insertWithRelatedAndFetch` alias. [#172](https://github.com/Vincit/objection.js/issues/172)
- Added [`$beforeDelete`](/api/model/instance-methods.html#beforedelete) and [`$afterDelete`](/api/model/instance-methods.html#afterdelete) hooks [#112](https://github.com/Vincit/objection.js/issues/112)
- Old values can now be accessed from `$beforeUpdate`, `$afterUpdate`, `$beforeValidate` and `$afterValidate` hooks [#185](https://github.com/Vincit/objection.js/issues/185)
- Support length property [#168](https://github.com/Vincit/objection.js/issues/168)
- Make sure operations are executed in the order they are called [#180](https://github.com/Vincit/objection.js/issues/180)
- Fetch nothing if the `where` clauses hit no rows in `update/patchAndFetchById` methods [#189](https://github.com/Vincit/objection.js/issues/189)
- Lots of performance tweaks.
- `$loadRelated` and `loadRelated` now return a `QueryBuilder`.

### Breaking changes

- Undefined values as query method arguments now throw an exception. Before they were just silently ignored
  and for example `delete().where('id', undefined)` caused the entire table to be deleted. [skipUndefined](/api/query-builder/other-methods.html#skipundefined)
  method can be called for a query builder to handle the undefined values the old way.

- Deprecated method `dumpSql` is now removed.

- `$loadRelated` and `loadRelated` now return a `QueryBuilder`. This may break your code is some rare cases
  where you have called a non-standard promise method like `reflect` for the return value of these functions.

## 0.5.5

### What's new

- [Virtual attributes](/api/model/static-properties.html#static-virtualattributes)

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

- \$afterGet hook.

## 0.5.0

### What's new

- joinRelation family of query builder methods.
- `HasOneRelation` for creating inverse one-to-one relations.
- Relations have been renamed `OneToOneRelation` --> `BelongsToOneRelation`, `OneToManyRelation` --> `HasManyRelation`.
  The old names work, but have been deprecated.
- [withSchema](/api/query-builder/find-methods.html#withschema) now works as expected and sets the schema of all queries executed by the query builder the
  method is called for.
- filterEager method for better eager query filtering.
- [extra properties](/api/model/static-properties.html#static-relationmappings) feature for selecting/inserting columns from/to the join table in many-to-many relations.
- Eager query recursion depth can be controlled like so: `parent.^5`.

## 0.4.0

### What's new

- Query context feature. See [#51](https://github.com/Vincit/objection.js/issues/51) and [these docs](/api/query-builder/other-methods.html#context) for more info.
- Composite key support.
- [findById](/api/query-builder/find-methods.html#findbyid), [deleteById](/api/query-builder/mutate-methods.html#deletebyid), [whereComposite](/api/query-builder/find-methods.html#wherecomposite) and
  [whereInComposite](/api/query-builder/find-methods.html#whereincomposite) query builder methods.

### Breaking changes

There shouldn't be any major breaking changes. We moved from ES5 to ES7 + babel in this version so there are big changes
in the codebase. If something comes up, please open an issue.

There are a few known corner cases that may break:

- You can now define a model for the join table of `ManyToMany` relations in `relationMappings`. This is optional,
  but may be needed if you already have a model for a `ManyToMany` relation _and_ you use `snake_case`
  to `camelCase` conversion for the column names. See the documentation on the [through](/api/types/#type-relationthrough)
  property of [relationMappings](/api/model/static-properties.html#static-relationmappings).

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

- insertWithRelated method for
  inserting model trees
- [insertAndFetch](/api/query-builder/mutate-methods.html#insertandfetch),
  [updateAndFetchById](/api/query-builder/mutate-methods.html#updateandfetchbyid) and
  [patchAndFetchById](/api/query-builder/mutate-methods.html#patchandfetchbyid) helper methods
- Filters for eager expressions
- [New alternative way to use transactions](/guide/transactions.html)
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
