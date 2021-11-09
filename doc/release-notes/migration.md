# Migration from objection 2.x to 3.0

This document guides you through each breaking change in objection 3.0 and attempts to provide clear steps to follow. If you find something missing, please open an issue and we'll fix this guide ASAP.

Here's a list of the breaking changes

- [Dropped support for node < 12](#dropped-support-for-node-12)
- [Dropped support for knex < 0.95](#dropped-support-for-knex-0-95)
- [typescript: Methods like `findById` and `findOne` that return a single item are now typed correctly](#typescript-methods-like-findbyid-and-findone-that-return-a-single-item-are-now-typed-correctly)
- [typescript: `QueryBuilder` now inherits `PromiseLike` instead of `Promise`](#typescript-querybuilder-now-inherits-promiselike-instead-of-promise)
- [Dropped a bunch of deprecated methods and features](#dropped-a-bunch-of-deprecated-methods-and-features)

## Dropped support for node < 12

Objection 3.0 needs at least node 12 to work.

## Dropped support for knex < 0.95

Objection needs at least knex 0.95.0 to work.

This is because knex introduced some breaking changes in 0.95.0.

## typescript: Methods like `findById` and `findOne` that return a single item are now typed correctly

In 2.0 methods like `findById`, `findOne` and `first` that return one item or undefined were incorrectly typed
to always return a value. Now the return type of those methods is `SomeModel | undefined`.

You'll get compilation errors in places where you've trusted the old typings. All you need to do is to add a
check for undefined values to narrow down the type or chain the `throwIfNotFound` method that also narrows
down the type back to `SomeModel`.

Before:

```ts
const person = await Person.query().findById(id)
console.log(person.id)
```

After:

```ts
const person = await Person.query().findById(id)

if (!person) {
  throw new Error('Person not found')
}

console.log(person.id)
```

Or

```ts
const person = await Person.query().findById(id).throwIfNotFound()
console.log(person.id)
```

## typescript: `QueryBuilder` now inherits `PromiseLike` instead of `Promise`

In 2.0 and before, the `QueryBuilder` class inherited `Promise` in the typings which made code like this possible

```ts
function findPerson(id: number): Promise<Person> {
  return Person.query().findById(id);
}
```

However, `QueryBuilder` doesn't actually inherit `Promise` but instead is "thenable". Typescript has the type
`PromiseLike` for thenable objects which objection now correctly uses. There are couple of ways to fix the
compilation errors this change causes:

1. Chain `execute` to the query:

```ts
function findPerson(id: number): Promise<Person> {
  return Person.query().findById(id).execute();
}
```

2. Use `PromiseLike`:

```ts
function findPerson(id: number): PromiseLike<Person> {
  return Person.query().findById(id);
}
```

3. Make the functions `async`:

```ts
async function findPerson(id: number): Promise<Person> {
  return Person.query().findById(id);
}
```

## Dropped a bunch of deprecated methods and features

All the methods that were marked deprecated (and printed a deprection message during runtime) in 2.0 have
now been removed.

<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>

# Migration from objection 1.x to 2.0

Objection 2.0 brought a lot of great new features, but the main focus was in cleaning the API, which lead to a bunch of breaking changes. This document guides you through each change and attempts to provide clear steps to follow. If you find something missing, please open an issue and we'll fix this guide ASAP.

Here's a list of the breaking changes

- [Node 6 and 7 are no longer supported](#node-6-and-7-are-no-longer-supported)
- [modify method signature change](#modify-method-signature-change)
- [Bluebird and lodash have been removed](#bluebird-and-lodash-have-been-removed)
- [Database errors now come from db-errors library](#database-errors-now-come-from-the-db-errors-library)
- [#ref references in insertGraph and upsertGraph now require the allowRefs: true option](#ref-references-in-insertgraph-and-upsertgraph-now-require-the-allowrefs-true-option)
- [relate method now always returns the number of affected rows](#relate-method-now-always-returns-the-number-of-affected-rows)
- [\$relatedQuery no longer mutates](#relatedquery-no-longer-mutates)
- [context now acts like mergeContext](#context-now-acts-like-mergecontext)
- [Model.raw and Model.fn now return objection raw and fn](#model-raw-and-model-fn-now-return-objection-raw-and-fn)
- [QueryBuilder.toString and QueryBuilder.toSql have been removed](#querybuilder-tostring-and-querybuilder-tosql-have-been-removed)
- [Rewritten typings](#rewritten-typings)

In addition to these, **a lot** of methods were deprecated and replaced by a new method. The old methods still work, but they print a warning (once per process) when you use them. The warning message tells which method you should be using in the future and you can slowly replace the methods as you get annoyed by the warnings.

Most of the methods have simply been renamed, but in some cases the replacing methods work a little differently. Make sure to read the documentation of the new method.

## Node 6 and 7 are no longer supported

Objection now needs at least node 8 to work.

## `modify` method signature change

Before, you were able to provide multiple modifiers or modifier names to `modify` by providing multiple arguments like this:

```js
Person.query().modify('foo', 'bar');
```

Now only the first argument is used to specify modifiers and all the rest are arguments for the modifiers. The first argument can be an array so you can simply wrap the modifiers in an array if there are more than one of them:

```js
Person.query().modify(['foo', 'bar']);
```

## Bluebird and lodash have been removed

Before, all async operations returned a bluebird promise. Now the bluebird dependency has been dropped and the native `Promise` is used instead. This also means that all bluebird-specific methods

- `map`
- `reduce`
- `reflect`
- `bind`
- `spread`
- `asCallback`
- `nodeify`

have been removed from the `QueryBuilder`.

You need to go through your code and make sure you don't use any bluebird methods or trust that objection returns a bluebird promise.

Objection also used to export `Promise` and `lodash` properties like this:

```js
import { Promise, lodash } from 'objection';
```

which is not true anymore. Both of those exports have been removed.

## Database errors now come from the db-errors library

Before, when a database operation failed, objection simply passed through the native error thrown by the database client. In 2.0 the errors are wrapped using the [db-errors](https://github.com/Vincit/db-errors) library.

The `db-errors` library errors expose a `nativeError` property. If you rely on the properties of the old errors, you can simply change code like this

```js
try {
  await Person.query().where('foo', 'bar')
} catch (err) {
  if (err.code === 13514) {
    ...
  }
}
```

into this:

```js
try {
  await Person.query().where('foo', 'bar')
} catch (err) {
  err = err.nativeError || err

  if (err.code === 13514) {
    ...
  }
}
```

A preferred way to handle this would be to use the new `db-error` classes as described [here](/recipes/error-handling.html#error-handling), but the fastest migration path is to do the above trick.

## #ref references in insertGraph and upsertGraph now require the allowRefs: true option

The usage of `'#ref': 'someId'` and `#ref{someId.someProp}` now requires an explicit `allowRefs: true` option to be passed to the called method:

```js
await Person.query().insertGraph(graphWithRefs, { allowRefs: true });
```

This change was made for security reasons. An attacker could, in theory, use a `#ref{someId.someProperty}` reference to access for example the password hash of a user:

```js
const graphUpsertSentByTheAttacker = {
  user: {
    id: 13431,
    '#id': 'user',
  },

  movie: {
    name: '#ref{user.passwordHash}',
  },
};
```

and then the attacker could just take the password hash out of the movies's name in a client of some sort.

For this attack to work, the attacker must already have an access to the API that modifies the user's information. Additionally and more importantly, the graph described above (and all other graphs I could think of) would only yield the password hash in the movie's name **if the program sets the hash to the graph before the `upsertGraph` call is executed**. This is a highly unlikely scenario and in case of passowords, would require the attacker to be able to access a route that changes the user's password. The reference can never access the property in the database, only in the object itself.

Even though there's very little chance this kind of attack could be carried out at the moment, I'd advice you to never use `upsertGraph` with `{ allowRefs: true }` and unvalidated user input with references!

## relate method now always returns the number of affected rows

`relate` used to return the inserted pivot table row in case of `ManyToManyRelation` and the number of updated rows in case of other relations. Now an integer indicating the number of affected rows is always returned.

You need to go through your code and check how the return values of `relate` queries are used.

## \$relatedQuery no longer mutates

With objection 1.x, doing this

```js
await somePerson.$relatedQuery('pets');
```

added a property `pets` for `somePerson` and saved the result there. This no longer happens with objection 2. Also inserting a new item using

```js
await somePerson.$relatedQuery('pets').insert(pet);
```

would previously add the inserted pet to the `pets` array of `somePerson`. This also no longer happens.

You can use `withGraphFetched` and `fetchGraph` methods if you want to populate the relations. Also, nothing prevents you from doing this:

```js
somePerson.pets = await somePerson.$relatedQuery('pets');
```

You can also use the `Model.relatedInsertQueryMutates` and `Model.relatedFindQueryMutates` properties to revert back to 1.x behavior. Note that those properties are now deprecated and will be removed in 3.0.

## context() now acts like mergeContext()

The `context` method of `QueryBuilder` now merges the given object with the current context object instead of replacing it. You can use `clearContext` to clear the context if you need the old behaviour.

## Model.raw and Model.fn now return objection raw and fn

Previously `Model.raw` returned a knex raw builder and `Model.fn` returned a knex `FunctionHelper` instance. In 2.0 objection's [raw](/api/objection/#raw) and [fn](/api/objection/#fn) helpers are returned. To get a knex `raw` builder, you need to use `knex.raw` directly.

## QueryBuilder.toString and QueryBuilder.toSql have been removed

You can use `QueryBuilder.toKnexQuery().toSQL()` instead.

## Rewritten typings

The typings have been completely rewritten in 2.0 and many of the types have changed names. By default you shouldn't get that many errors, but whenever you have explicitly defined an objection type for something other than `Model`, you may need to adjust that type. For example the `QueryBuilder` no longer takes three generic arguments, but two.

For this breaking change we can't easily provide clear migration steps, because we don't know how much you have trusted the typescript type inference, and how much you have used explicit types.

One notable change is that you should no longer define your relations properties using `Partial<Model>` or `Partial<Model>[]`. You can simply use `Model` and `Model[]` and methods like `insertGraph` and `upsertGraph` will just work.
