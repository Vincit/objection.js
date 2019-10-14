# Other Methods

## debug()

See [knex documentation](http://knexjs.org/#Builder-debug)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## context()

```js
queryBuilder = queryBuilder.context(queryContext);
```

Sets/gets the query context.

Some query builder methods create more than one query. The query context is an object that is shared with all queries started by a query builder.

The context is also passed to [$beforeInsert](/api/model/instance-methods.html#beforeinsert), [$afterInsert](/api/model/instance-methods.html#afterinsert), [$beforeUpdate](/api/model/instance-methods.html#beforeupdate), [$afterUpdate](/api/model/instance-methods.html#afterupdate), [$beforeDelete](/api/model/instance-methods.html#beforedelete), [$afterDelete](/api/model/instance-methods.html#afterdelete) and [$afterGet](/api/model/instance-methods.html#afterget) calls that the query creates.

In addition to properties added using this method (and [mergeContext](/api/query-builder/other-methods.html#mergecontext)) the query context object always has a `transaction` property that holds the active transaction. If there is no active transaction the `transaction` property contains the normal knex instance. In both cases the value can be passed anywhere where a transaction object can be passed so you never need to check for the existence of the `transaction` property.

See the methods [runBefore](/api/query-builder/other-methods.html#runbefore), [onBuild](/api/query-builder/other-methods.html#onbuild) and [runAfter](/api/query-builder/other-methods.html#runafter)
for more information about the hooks.

::: tip
Most of the time, you should be using [mergeContext](/api/query-builder/other-methods.html#mergecontext) instead of this method. This method replaces the whole context, while `mergeContext` merges the values with the current ones.
:::

##### Arguments

Argument|Type|Description
--------|----|--------------------
queryContext|Object|The query context object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

You can set the context like this:

```js
await Person
  .query()
  .context({something: 'hello'});
```

and access the context like this:

```js
const context = builder.context();
```

You can set any data to the context object. You can also register QueryBuilder lifecycle methods for _all_ queries that share the context:

```js
Person
  .query()
  .context({
    runBefore(result, builder) {
      return result;
    },
    runAfter(result, builder) {
      return result;
    },
    onBuild(builder) {}
  });
```

For example the `eager` method causes multiple queries to be executed from a single query builder. If you wanted to make all of them use the same schema you could write this:

```js
Person
  .query()
  .eager('[movies, children.movies]')
  .context({
    onBuild(builder) {
      builder.withSchema('someSchema');
    }
  });
```

## mergeContext()

```js
queryBuilder = queryBuilder.mergeContext(queryContext);
```

Merges values into the query context.

This method is like [context](/api/query-builder/other-methods.html#context) but instead of replacing the whole context this method merges the objects.

##### Arguments

Argument|Type|Description
--------|----|--------------------
queryContext|Object|The object to merge into the query context.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## tableNameFor()

```js
const tableName = queryBuilder.tableNameFor(modelClass);
```

Returns the table name for a given model class in the query. Usually the table name can be fetched through `Model.tableName` but if the source table has been changed for example using the [QueryBuilder#table](/api/query-builder/find-methods.html#table) method `tableNameFor` will return the correct value.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|function|A model class.

##### Return value

Type|Description
----|-----------------------------
string|The source table (or view) name for `modelClass`.

## tableRefFor()

```js
const tableRef = queryBuilder.tableRefFor(modelClass);
```

Returns the name that should be used to refer to the `modelClass`'s table in the query.
Usually a table can be referred to using its name, but `tableRefFor` can return a different
value for example in case an alias has been given.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|function|A model class.

##### Return value

Type|Description
----|-----------------------------
string|The name that should be used to refer to a table in the query.

## reject()

```js
queryBuilder = queryBuilder.reject(reason);
```

Skips the database query and "fakes" an error result.

##### Arguments

Argument|Type|Description
--------|----|--------------------
reson| |The rejection reason

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## resolve()

```js
queryBuilder = queryBuilder.resolve(value);
```

Skips the database query and "fakes" a result.

##### Arguments

Argument|Type|Description
--------|----|--------------------
value| |The resolve value

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## isExecutable()

```js
const isExecutable = queryBuilder.isExecutable();
```

Returns false if this query will never be executed.

This may be true in multiple cases:

1. The query is explicitly resolved or rejected using the [resolve](/api/query-builder/other-methods.html#resolve) or [reject](/api/query-builder/other-methods.html#reject) methods.
2. The query starts a different query when it is executed.

##### Return value

Type|Description
----|-----------------------------
boolean|false if the query will never be executed.

## isFind()

```js
const isFind = queryBuilder.isFind();
```

Returns true if the query is read-only.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query is read-only.

## isInsert()

```js
const isInsert = queryBuilder.isInsert();
```

Returns true if the query performs an insert operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an insert operation.

## isUpdate()

```js
const isUpdate = queryBuilder.isUpdate();
```

Returns true if the query performs an update or patch operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an update or patch operation.

## isDelete()

```js
const isDelete = queryBuilder.isDelete();
```

Returns true if the query performs a delete operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs a delete operation.

## isRelate()

```js
const isRelate = queryBuilder.isRelate();
```

Returns true if the query performs a relate operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs a relate operation.

## isUnrelate()

```js
const isUnrelate = queryBuilder.isUnrelate();
```

Returns true if the query performs an unrelate operation.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an unrelate operation.

## isInternal()

```js
const isInternal = queryBuilder.isInternal();
```

Returns true for internal "helper" queries that are not directly
part of the operation being executed. For example the `select` queries
performed by `upsertGraph` to get the current state of the graph are
internal queries.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query performs an internal helper operation.

## hasWheres()

```js
const hasWheres = queryBuilder.hasWheres();
```

Returns true if the query contains where statements.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query contains where statements.

## hasSelects()

```js
const hasSelects = queryBuilder.hasSelects();
```

Returns true if the query contains any specific select staments, such as:
`'select'`, `'columns'`, `'column'`, `'distinct'`, `'count'`, `'countDistinct'`, `'min'`, `'max'`, `'sum'`, `'sumDistinct'`, `'avg'`, `'avgDistinct'`

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query contains any specific select staments.

## hasEager()

```js
const hasEager = queryBuilder.hasEager();
```

Returns true if the query defines any eager expressions.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query defines any eager expressions.

## has()

```js
const has = queryBuilder.has(selector);
```

```js
console.log(Person.query().range(0, 4).has('range'));
```

Returns true if the query defines an operation that matches the given selector.

##### Arguments

Argument|Type|Description
--------|----|--------------------
selector|string&nbsp;&#124;&nbsp;RegExp|A name or regular expression to match all defined operations against.

##### Return value

Type|Description
----|-----------------------------
boolean|true if the query defines an operation that matches the given selector.

## clear()

```js
queryBuilder = queryBuilder.clear(selector);
```

Removes all operations in the query that match the given selector.

##### Arguments

Argument|Type|Description
--------|----|--------------------
selector|string&nbsp;&#124;&nbsp;regexp|A name or regular expression to match all operations that are to be removed against.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
console.log(Person.query().orderBy('firstName').clear('orderBy').has('orderBy'));
```

## runBefore()

```js
queryBuilder = queryBuilder.runBefore(runBefore);
```

Registers a function to be called before just the database query when the builder is executed. Multiple functions can be chained like `then` methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|--------------------
runBefore|function(result,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed. This function can be async. Note that it needs to return the result used for further processing in the chain of calls.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
  .runBefore(async result => {
    console.log('hello 1');

    await Promise.delay(10);

    console.log('hello 2');
    return result
  })
  .runBefore(result => {
    console.log('hello 3');
    return result
  });

await query;
// --> hello 1
// --> hello 2
// --> hello 3
```

## onBuild()

```js
queryBuilder = queryBuilder.onBuild(onBuild);
```

Functions registered with this method are called each time the query is built into an SQL string. This method is ran after [runBefore](/api/query-builder/other-methods.html#runbefore) methods but before [runAfter](/api/query-builder/other-methods.html#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it. You shouldn't modify the query in any of the `run` methods.

Unlike the `run` methods (`runAfter`, `runBefore` etc.) these must be synchronous. Also you should not register any `run` methods from these. You should _only_ call the query building methods of the builder provided as a parameter.

##### Arguments

Argument|Type|Description
--------|----|--------------------
onBuild|function([QueryBuilder](/api/query-builder/))|The **synchronous** function to be executed.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Eamples

```js
const query = Person.query();

query
 .onBuild(builder => {
   builder.where('id', 1);
 })
 .onBuild(builder => {
   builder.orWhere('id', 2);
 });
```

## onBuildKnex()

```js
queryBuilder = queryBuilder.onBuildKnex(onBuildKnex);
```

Functions registered with this method are called each time the query is built into an SQL string. This method is ran after [onBuild](/api/query-builder/other-methods.html#onbuild) methods but before [runAfter](/api/query-builder/other-methods.html#runafter) methods.

If you need to modify the SQL query at query build time, this is the place to do it in addition to `onBuild`. The only difference between `onBuildKnex` and `onBuild` is that in `onBuild` you can modify the objection's query builder. In `onBuildKnex` the objection builder has been compiled into a knex query builder and any modifications to the objection builder will be ignored.

Unlike the `run`  methods (`runAfter`, `runBefore` etc.) these must be synchronous. Also you should not register any `run` methods from these. You should _only_ call the query building methods of the __knexBuilder__ provided as a parameter.

::: warning
You should never call any query building (or any other mutating) method on the `objectionBuilder` in this function. If you do, those calls will get ignored. At this point the query builder has been compiled into a knex query builder and you should only modify that. You can call non mutating methods like `hasSelects`, `hasWheres` etc. on the objection builder.
:::

##### Arguments

Argument|Type|Description
--------|----|--------------------
onBuildKnex|function(`KnexQueryBuilder`,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .onBuildKnex((knexBuilder, objectionBuilder) => {
   knexBuilder.where('id', 1);
 });
```

## runAfter()

```js
queryBuilder = queryBuilder.runAfter(runAfter);
```

Registers a function to be called when the builder is executed.

These functions are executed as the last thing before any promise handlers registered using the [then](/api/query-builder/other-methods.html#then) method. Multiple functions can be chained like [then](/api/query-builder/other-methods.html#then)  methods of a promise.

##### Arguments

Argument|Type|Description
--------|----|--------------------
runAfter|function(result,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed. This function can be async. Note that it needs to return the result used for further processing in the chain of calls.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .runAfter(async (models, queryBuilder) => {
   return models;
 })
 .runAfter(async (models, queryBuilder) => {
   models.push(Person.fromJson({firstName: 'Jennifer'}));
   return models;
 });

const models = await query;
```

## onError()

```js
queryBuilder = queryBuilder.onError(onError);
```

Registers an error handler. Just like `catch` but doesn't execute the query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
onError|function(Error,&nbsp;[QueryBuilder](/api/query-builder/))|The function to be executed on error.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

```js
const query = Person.query();

query
 .onError(async (error, queryBuilder) => {
   // Handle `SomeError` but let other errors go through.
   if (error instanceof SomeError) {
     // This will cause the query to be resolved with an object
     // instead of throwing an error.
     return {error: 'some error occurred'};
   } else {
     return Promise.reject(error);
   }
 })
 .where('age', > 30);
```


## castTo()

```js
queryBuilder = queryBuilder.castTo(ModelClass);
```

Sets the model class of the result rows.

##### Return value

Type|Description
----|-----------------------------
[ModelClass](/api/model/)|The model class of the result rows.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

The following example creates a query through `Person`, joins a bunch of relations, selects
only the related `Animal`'s columns and returns the results as `Animal` instances instead
of `Person` instances.

```js
const animals = await Person
  .query()
  .joinRelation('children.children.pets')
  .select('children:children:pets.*')
  .castTo(Animal);
```

If your result rows represent no actual model, you can use `objection.Model`

```js
const { Model } = require('objection');

const models = await Person
  .query()
  .joinRelation('children.pets')
  .select([
    'children:pets.id as animalId',
    'children.firstName as childFirstName'
  ])
  .castTo(Model);
```

## modelClass()

```js
const modelClass = queryBuilder.modelClass();
```

Gets the Model subclass this builder is bound to.

##### Return value

Type|Description
----|-----------------------------
[Model](/api/model/)|The Model subclass this builder is bound to

## toString()

```js
const sql = queryBuilder.toString();
```

Returns the SQL string suitable for logging input **but not for execution**, via Knex's `toString()`. This method should not be used to create queries for database execution because it makes no guarantees about escaping bindings properly.

Note: In the current release, if the query builder attempts to execute multiple queries or throw any exception whatsoever, **no error will throw** and instead the following string is returned:

```
This query cannot be built synchronously. Consider using debug() method instead.
```

Later versions of Objection may introduce a native way to retrieve an executable SQL statement, or handle this behavior differently.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build, or `This query cannot be built synchronously. Consider using debug() method instead.` if an exception is thrown

## toSql()

```js
const sql = queryBuilder.toSql();
```

An alias for `toString()`.

Note: The behavior of Objection's `toSql()` is different from Knex's `toSql()` (see above). This method may be deprecated soon.

##### Return value

Type|Description
----|-----------------------------
string|The SQL this query builder will build, or `This query cannot be built synchronously. Consider using debug() method instead.` if an exception is thrown

## skipUndefined()

```js
queryBuilder = queryBuilder.skipUndefined();
```

If this method is called for a builder then undefined values passed to the query builder methods don't cause an exception but are ignored instead.

For example the following query will return all `Person` rows if `req.query.firstName` is `undefined`.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
Person
  .query()
  .skipUndefined()
  .where('firstName', req.query.firstName)
```

## transacting()

```js
queryBuilder = queryBuilder.transacting(transaction);
```

Sets the transaction for a query.

##### Arguments

Argument|Type|Description
--------|----|--------------------
transaction|object|A transaction object

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

## clone()

```js
const clone = queryBuilder.clone();
```

Create a clone of this builder.

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|Clone of the query builder

## execute()

```js
const promise = queryBuilder.execute();
```

Executes the query and returns a Promise.

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## then()

```js
const promise = queryBuilder.then(successHandler, errorHandler);
```

Executes the query and returns a Promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
successHandler|function|identity|Promise success handler
errorHandler|function|identity|Promise error handler

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## map()

```js
const promise = queryBuilder.map(mapper);
```

Executes the query and calls `map(mapper)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
mapper|function|identity|Mapper function

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## reduce()

```js
const promise = queryBuilder.reduce(reducer, initialValue);
```

Executes the query and calls `reduce(reducer, initialValue)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
reducer|function|undefined|Reducer function
initialValue|any|first element of the reduced collection|First arg for the
reducer function

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## catch()

```js
const promise = queryBuilder.catch(errorHandler);
```

Executes the query and calls `catch(errorHandler)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
errorHandler|function|identity|Error handler

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## return()

```js
const promise = queryBuilder.return(returnValue);
```

Executes the query and calls `return(returnValue)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
returnValue| |undefined|Return value

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## bind()

```js
const promise = queryBuilder.bind(returnValue);
```

Executes the query and calls `bind(context)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
context| |undefined|Bind context

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## asCallback()

```js
const promise = queryBuilder.asCallback(callback);
```

Executes the query and calls `asCallback(callback)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
callback|function|undefined|Node style callback

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## nodeify()

```js
const promise = queryBuilder.nodeify(callback);
```

Executes the query and calls `nodeify(callback)` for the returned promise.

##### Arguments

Argument|Type|Default|Description
--------|----|-------|------------
callback|function|undefined|Node style callback

##### Return value

Type|Description
----|-----------------------------
`Promise`|Promise the will be resolved with the result of the query.

## resultSize()

```js
const promise = queryBuilder.resultSize();
```

Returns the amount of rows the current query would produce without [limit](/api/query-builder/find-methods.html#limit) and [offset](/api/query-builder/find-methods.html#offset) applied. Note that this executes a copy of the query and returns a Promise.

This method is often more convenient than `count` which returns an array of objects instead a single number.

##### Return value

Type|Description
----|-----------------------------
`Promise<number>`|Promise the will be resolved with the result size.

##### Examples

```js
const query = Person
  .query()
  .where('age', '>', 20);

const [total, models] = await Promise.all([
  query.resultSize(),
  query.offset(100).limit(50)
]);
```

## page()

```js
queryBuilder = queryBuilder.page(page, pageSize);
```

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .page(5, 100);

console.log(result.results.length); // --> 100
console.log(result.total); // --> 3341
```

Two queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size, but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`. The problem with this is that if the result set is empty, we don't get the total count either. (If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|-------------------
page|number|The index of the page to return. The index of the first page is 0.
pageSize|number|The page size

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

## range()

```js
queryBuilder = queryBuilder.range(start, end);
```

Only returns the given range of results.

Two queries are performed by this method: the actual query and a query to get the `total` count.

Mysql has the `SQL_CALC_FOUND_ROWS` option and `FOUND_ROWS()` function that can be used to calculate the result size, but according to my tests and [the interwebs](http://www.google.com/search?q=SQL_CALC_FOUND_ROWS+performance) the performance is significantly worse than just executing a separate count query.

Postgresql has window functions that can be used to get the total count like this `select count(*) over () as total`. The problem with this is that if the result set is empty, we don't get the total count either. (If someone can figure out a way around this, a PR is very welcome).

##### Arguments

Argument|Type|Description
--------|----|--------------------
start|number|The index of the first result (inclusive)
end|number|The index of the last result (inclusive)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .range(0, 100);

console.log(result.results.length); // --> 101
console.log(result.total); // --> 3341
```

`range` can be called without arguments if you want to specify the limit and offset explicitly:

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .limit(10)
  .range();

console.log(result.results.length); // --> 101
console.log(result.total); // --> 3341
```

## pluck()

```js
queryBuilder = queryBuilder.pluck(propertyName);
```

If the result is an array, plucks a property from each object.

##### Arguments

Argument|Type|Description
--------|----|--------------------
propertyName|string|The name of the property to pluck

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const firstNames = await Person
  .query()
  .where('age', '>', 20)
  .pluck('firstName');

console.log(typeof firstNames[0]); // --> string
```

## first()

```js
queryBuilder = queryBuilder.first();
```

If the result is an array, selects the first item.

NOTE: This doesn't add `limit 1` to the query by default. You can override the [Model.useLimitInFirst](/api/model/static-properties.html#static-uselimitinfirst) property to change this behaviour.

Also see [findById](/api/query-builder/find-methods.html#findbyid) and [findOne](/api/query-builder/find-methods.html#findone) shorthand methods.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const firstPerson = await Person
  .query()
  .first()

console.log(firstPerson.age);
```

## throwIfNotFound()

```js
queryBuilder = queryBuilder.throwIfNotFound();
```

Causes a [Model.NotFoundError](/api/types/#class-notfounderror) to be thrown if the query result is empty.

You can replace `Model.NotFoundError` with your own error by implementing the static [Model.createNotFoundError(ctx)](/api/model/static-methods.html#static-createnotfounderror) method.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
try {
  await Language
    .query()
    .where('name', 'Java')
    .andWhere('isModern', true)
    .throwIfNotFound()
} catch (err) {
  // No results found.
  console.log(err instanceof Language.NotFoundError); // --> true
}
```

## traverse()

```js
queryBuilder = queryBuilder.traverse(modelClass, traverser);
```

Traverses through all models in the result, including the eagerly loaded relations.

The optional first parameter can be a constructor. If given, the traverser function is only called for the models of that class.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter. If given, the traverser function is only called for models of this class.
traverser|function([Model](/api/model/), [Model](/api/model/), string)|The traverser function that is called for each model. The first argument is the model itself. If the model is in a relation of some other model the second argument is the parent model and the third argument is the name of the relation.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

```js
const people = await Person
  .query()
  .eager('pets')
  .traverse((model, parentModel, relationName) => {
    delete model.id;
  });

console.log(people[0].id); // --> undefined
console.log(people[0].pets[0].id); // --> undefined
```

```js
const persons = await Person
  .query()
  .eager('pets')
  .traverse(Animal, (animal, parentModel, relationName) => {
    delete animal.id;
  });

console.log(persons[0].id); // --> 1
console.log(persons[0].pets[0].id); // --> undefined
```

## pick()

```js
queryBuilder = queryBuilder.pick(modelClass, properties);
```

Pick properties from result models.

The first example goes through all models (including relations) and discards all
properties but `id` and `name`. The second example also traverses the whole model
tree and discards all but `id` and `firstName` properties of all `Person`
instances and `id` and `name` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter
properties|string[]|The properties to pick

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .pick(['id', 'name']);
```

and

```js
Person
  .query()
  .eager('pets')
  .pick(Person, ['id', 'firstName'])
  .pick(Animal, ['id', 'name']);
```

## omit()

```js
queryBuilder = queryBuilder.omit(modelClass, properties);
```

Omit properties of result models.

The first example goes through all models (including relations) and omits the properties
`parentId` and `ownerId`. The second example also traverses the whole model tree and
omits the properties `parentId` and `age` from all `Person` instances and `ownerId`
and `species` properties of all `Animal` instances.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|[Model](/api/model/)|The optional model class filter
properties|string[]|The properties to omit

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining

##### Examples

There are two ways to call this methods:

```js
Person
  .query()
  .eager('pets').
  .omit(['parentId', 'ownerId']);
```

and

```js
Person
  .query()
  .eager('pets')
  .omit(Person, ['parentId', 'age'])
  .omit(Animal, ['ownerId', 'species']);
```

## timeout()

See [knex documentation](http://knexjs.org/#Builder-timeout)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.


## connection()

See [knex documentation](http://knexjs.org/#Builder-connection)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## modify()

Works like `knex`'s [modify](http://knexjs.org/#Builder-modify) function but in addition you can specify model [modifier](/api/model/static-properties.html#static-modifiers) by providing modifier names.

See [knex documentation](http://knexjs.org/#Builder-modify)

##### Arguments

Argument|Type|Description
--------|----|--------------------
modifier|function([QueryBuilder](/api/query-builder/))&nbsp;&#124;&nbsp;string&nbsp;&#124;&nbsp;string[]|The modify callback function, receiving the builder as its first argument, followed by the optional arguments. If a string is provided, the corresponding [modifier](/api/model/static-properties.html#static-modifiers) is executed instead.
*arguments|...any|The optional arguments passed to the modify function

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## applyModifier()

Applies modifiers to the query builder.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modifier|string|The name of the modifier, as found in [modifier](/api/model/static-properties.html#static-modifiers).
*arguments| |When providing multiple arguments, all provided modifiers will be applied.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## applyFilter()

An alias for [applyModifier](/api/query-builder/other-methods.html#applymodifier)
