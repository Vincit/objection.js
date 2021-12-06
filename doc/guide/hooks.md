# Hooks

Hooks are model methods that allow you too hook into different stages of objection queries. There are three different kinds of hooks

1. [instance query hooks](#instance-query-hooks)
2. [static query hooks](#static-query-hooks)
3. [model data lifecycle hooks](#model-data-lifecycle-hooks)

Each hook type serve a different purpose. We'll go through the different types in the following chapters.

## Instance query hooks

These hooks are executed in different stages of each query type (find, update, insert, delete) for **model instances**. The following hooks exist:

- [\$beforeInsert](/api/model/instance-methods.html#beforeinsert)
- [\$afterInsert](/api/model/instance-methods.html#afterinsert)
- [\$beforeUpdate](/api/model/instance-methods.html#beforeupdate)
- [\$afterUpdate](/api/model/instance-methods.html#afterupdate)
- [\$beforeDelete](/api/model/instance-methods.html#beforedelete)
- [\$afterDelete](/api/model/instance-methods.html#afterdelete)
- [\$afterFind](/api/model/instance-methods.html#afterfind)

All of these are instance methods on a model. Therefore you can access the model instance's properties through `this`.

```js
class Person extends Model {
  $beforeInsert(context) {
    this.createdAt = new Date().toISOString();
  }
}
```

Instance hooks can be async. It allows you, among other things, to execute queries. If you do fire off queries from instance hooks, it's important to always make sure they are fired inside any existing transaction. You can access the transaction through the `context`:

```js
class Person extends Model {
  async $beforeInsert(context) {
    // Remember to attach any queries to the existing transaction. This works
    // even if there's no transaction, so you should just always pass the
    // `context.transaction` to queries.
    await SomeModel.query(context.transaction).patch({ whatever: false });
  }
}
```

::: warning
Warning!

Running queries and other async operations inside instance hooks can lead to very unpredictable performance because the instance hooks are run for each model instance. For example, consider a query that returns 1000 items. If you have an `$afterFind` hook that executes a query, you'd be executing 1000 queries! The [static query hooks](#static-query-hooks) are better suited for that kind of thing.
:::

Because the instance hooks are executed for model instances, they cannot be executed when there are no model instances available. Not all hooks can be implemented and some hooks are only executed in certain situations. There's no `$beforeFind` hook, because we don't have any model instances before the query is executed. There's nothing to call the hook for. `$beforeDelete` and `$afterDelete` are also a bit strange for this reason. They are **only** executed when you run an instance query like this:

```js
const arnold = await Person.query().findOne({ name: 'Arnold' });

// This will execute the delete hooks because here we have a model
// instance `arnold`.
await arnold.$query().delete();

// This will NOT execute the delete hooks because we don't have model
// instance for Arnold.
await Person.query()
  .delete()
  .where('name', 'Arnold');
```

Objection could fetch the items from the database and call the hooks for those model instances, but that would lead to unpredicable performance, and that's something objection tries to avoid. If you need to do something like this, you can do it using [the static query hooks](#static-query-hooks).

Another thing that may cause confusion with the instance hooks is that the insert and update hooks are always executed for the **input** items:

```js
class Person extends Model {
  $beforeUpdate() {
    console.log(this.firstName);
  }
}

// This will print 'Jennifer'
await Person.query()
  .patch({ firstName: 'Jennifer' })
  .where('id', 1);

const arnold = await Person.query().findOne({ name: 'Arnold' });

// This will also print 'Jennifer' and NOT 'Arnold'.
await arnold.$query().patch({ firstName: 'Jennifer' });
```

Each instance hook is passed the [context](/api/query-builder/other-methods.html#context) object as the only argument. The context contains whatever data you have installed using either the [context](/api/query-builder/other-methods.html#context) or the [mergeContext](/api/query-builder/other-methods.html#mergecontext) method. In addition to that, it always contains the `transaction` property that holds the parent query's transaction.

```js
class Person extends Model {
  $beforeUpdate(context) {
    console.log(context.hello);
  }
}

// This will print 'hello!'
await Person.query()
  .mergeContext({ hello: 'hello!' })
  .patch({ firstName: 'Jennifer' })
  .where('id', 1);
```

::: tip
Note!

If you use 3rd party plugins, it's very usual that they use the hooks to perform their magic. If any plugins are used, it's a good idea to always call the `super` implementation if you implement any of the hooks:

```js
class Person extends SomePluginP(Model) {
  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    ...
  }

  async $afterFind(context) {
    const result = await super.$afterFind(context);
    ...
    return result;
  }
}
```

:::

## Static query hooks

Static hooks are executed in different stages of each query type (find, update, insert, delete). Unlike the [instance query hooks](#instance-query-hooks), static hooks are executed once per query. Static hooks are always executed and there are no corner cases like the `$beforeDelete`/`$afterDelete` issue with instance hooks. The following hooks are available:

- [beforeInsert](/api/model/static-methods.html#static-beforeinsert)
- [afterInsert](/api/model/static-methods.html#static-afterinsert)
- [beforeUpdate](/api/model/static-methods.html#static-beforeupdate)
- [afterUpdate](/api/model/static-methods.html#static-afterupdate)
- [beforeDelete](/api/model/static-methods.html#static-beforedelete)
- [afterDelete](/api/model/static-methods.html#static-afterdelete)
- [beforeFind](/api/model/static-methods.html#static-beforefind)
- [afterFind](/api/model/static-methods.html#static-afterfind)

The static hooks are passed one argument of type [StaticHookArguments](/api/types/#type-statichookarguments). The most interesting of all properties of that object is the `asFindQuery` parameter that allows you to fetch the items that were/would be affected by the query. For example the following example would fetch the identifiers of all people that would get deleted by the query being executed:

```js
class Person extends Model {
  static async beforeDelete({ asFindQuery }) {
    // This query will automatically be executed in the same transaction
    // as the query we are hooking into.
    const idsOfItemsToBeDeleted = await asFindQuery().select('id');
    await doSomethingWithIds(idsOfItemsToBeDeleted);
  }
}
```

The beauty of `asFindQuery` and the static hooks is that they work in all cases, no matter how complex your query is.

::: warning
Warning!

Even though the static hooks are only executed once per query, and `asFindQuery` only executes one additional query, it can still lead to bad performance. For example, consider this query that deletes all items in a table:

```js
await Person.query().delete();
```

If `Person` has a hook that uses `asFindQuery` to fetch all items that will get deleted, the hook ends up fetching the whole table! Even if you simply select the `id`, the amount of data can be huge.

Be careful with `asFindQuery`!
:::

Another interesting argument is the `cancelQuery` function. It allows you to cancel the query being executed. Used in conjunction with the `asFindQuery`, you can do stuff like this:

```js
class Person extends Model {
  static async beforeDelete({ asFindQuery, cancelQuery }) {
    // Even though `asFindQuery` returns a `select` query by default, you
    // can turn it into an update, insert, delete or whatever you want.
    const [numAffectedItems] = await asFindQuery().patch({ deleted: true });

    // Cancel the query being executed with `numAffectedItems`
    // as the return value. No need to `await` this one.
    cancelQuery(numAffectedItems);
  }
}
```

The example above turns all delete queries into updates that set the `deleted` property to true. These two lines implement a simple version of a "soft delete" feature.

You can also access the model instances for which the query is started, the input model instances and the relation. The next example should explain what each of them mean:

```js
class Person extends Model {
  static beforeUpdate({ items, inputItems, relation }) {
    console.log('items:     ', items);
    console.log('inputItems:', inputItems);
    console.log('relation:  ', relation ? relation.name : 'none');
  }

  static afterInsert({ items, inputItems, relation }) {
    console.log('items:     ', items);
    console.log('inputItems:', inputItems);
    console.log('relation:  ', relation ? relation.name : 'none');
  }
}

const jennifer = await Person.query().insert({ firstName: 'Jennifer' });
// items:      []
// inputItems: [{ firstName: 'Jennifer' }]
// relation:   none

await jennifer.$query().patch({ lastName: 'Aniston' });
// items:      [{ id: 1, firstName: 'Jennifer' }]
// inputItems: [{ lastName: 'Aniston' }]
// relation:   none

await jennifer.$relatedQuery('movies').insert({ name: "We're the Millers" });
// items:      [{ id: 1, firstName: 'Jennifer' }]
// inputItems: [{ name: "We're the Millers" }]
// relation:   movies

await Person.relatedQuery('pets')
  .for([jennifer, brad])
  .insert([{ name: 'Cato' }, { name: 'Doggo' }]);
// items:      [{ id: 1, firstName: 'Jennifer' }, { id: 2, firstName: 'Brad' }]
// inputItems: [{ name: 'Cato' }, { name: 'Doggo' }]
// relation:   pets
```

In `afterDelete`, `afterUpdate`, `afterInsert` and `afterFind` hooks, the `result` property of the input argument contains the result of the query. You can change the result by returning a non-undefined value from the hook:

```js
class Person extends Model {
  static afterFind({ result }) {
    return {
      result,
      success: true
    };
  }
}

const result = await Person.query();

console.log(result.success);
console.log(result.result.length);
```

::: tip
Note!

If you use 3rd party plugins, it's very usual that they use the hooks to perform their magic. If any plugins are used, it's a good idea to always call the `super` implementation if you implement any of the hooks:

```js
class Person extends SomePlugin(Model) {
  static async beforeInsert(args) {
    await super.beforeInsert(args);
    const { asFindQuery, items } = args;
    ...
  }

  static async afterFind(args) {
    const result = await super.afterFind(args);
    const { asFindQuery, items } = args;
    ...
    return result;
  }
}
```

:::

## Model data lifecycle hooks

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
2. `internal`: The data layout of a model instance.
3. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another a data lifecycle hook is called:

1. `database` -> [\$parseDatabaseJson](/api/model/instance-methods.html#parsedatabasejson) -> `internal`
2. `internal` -> [\$formatDatabaseJson](/api/model/instance-methods.html#formatdatabasejson) -> `database`
3. `external` -> [\$parseJson](/api/model/instance-methods.html#parsejson) -> `internal`
4. `internal` -> [\$formatJson](/api/model/instance-methods.html#formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the [\$parseDatabaseJson](/api/model/instance-methods.html#parsedatabasejson) method. When data is written to database it goes through the [\$formatDatabaseJson](/api/model/instance-methods.html#formatdatabasejson) method.

Similarly when you give data for a query (for example [`query().insert(req.body)`](/api/query-builder/mutate-methods.html#insert)) or create a model explicitly using [`Model.fromJson(obj)`](/api/model/static-methods.html#static-fromjson) the [\$parseJson](/api/model/instance-methods.html#parsejson) method is invoked. When you call [`model.toJSON()`](/api/model/instance-methods.html#tojson) or [`model.$toJson()`](/api/model/instance-methods.html#tojson) the [\$formatJson](/api/model/instance-methods.html#formatjson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) and [koa](https://koajs.com/) automatically call the [toJSON](/api/model/instance-methods.html#tojson) method when you pass the model instance to methods like `response.json(model)`. You rarely need to call [toJSON()](/api/model/instance-methods.html#tojson) or [\$toJson()](/api/model/instance-methods.html#tojson) explicitly. This is because `JSON.stringify` calls the `toJSON` method and basically all libraries that create JSON strings use `JSON.stringify` under the hood.

Data lifecycle hooks are always synchronous. They cannot be `async` or return promises.

Fore example, here's a hook that converts date strings to `moment` instances when read from the database, and back to date strings when written to database:

```js
// We use a hardcoded list here. Note that you can store these fields
// for example as a static array in the model and access it through
// this.constructor in the hooks, or read the values from `jsonSchema`
// if you use it.
const dateColumns = ['dateOfBirth', 'dateOfDeath'];

class Person extends Model {
  $parseDatabaseJson(json) {
    // Remember to call the super implementation.
    json = super.$parseDatabaseJson(json);

    for (const dateColumn of dateColumns) {
      // Remember to always check if the json object has the particular
      // field. It may not exist if the user has used `select('id')`
      // or any other select that excludes the field.
      if (json[dateColumn] !== undefined) {
        json[dateColumn] = moment(json[dateColumn]);
      }
    }

    return json;
  }

  $formatDatabaseJson(json) {
    for (const dateColumn of dateColumns) {
      // Remember to always check if the json object has the particular field.
      // It may not exist if the user updates or inserts a partial object.
      if (json[dateColumn] !== undefined && moment.isMoment(json[dateColumn])) {
        json[dateColumn] = json[dateColumn].toISOString();
      }
    }

    // Remember to call the super implementation.
    return super.$formatDatabaseJson(json);
  }
}
```

::: warning
Be sure to read the special requirements for the data lifecycle hooks in their documentation.

[\$parseDatabaseJson](/api/model/instance-methods.html#parsedatabasejson)<br>
[\$formatDatabaseJson](/api/model/instance-methods.html#formatdatabasejson)<br>
[\$parseJson](/api/model/instance-methods.html#parsejson)<br>
[\$formatJson](/api/model/instance-methods.html#formatjson)
:::
