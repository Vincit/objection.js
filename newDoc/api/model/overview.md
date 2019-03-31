# Overview

## Model data lifecycle

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
2. `internal`: The data layout of a model instance.
3. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another, converter methods are called:

1. `database` -> [$parseDatabaseJson](/api/model/instance-methods.html#parsedatabasejson) -> `internal`
2. `internal` -> [$formatDatabaseJson](/api/model/instance-methods.html#formatdatabasejson) -> `database`
3. `external` -> [$parseJson](/api/model/instance-methods.html#parsejson) -> `internal`
4. `internal` -> [$formatJson](/api/model/instance-methods.html#formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the [$parseDatabaseJson](/api/model/instance-methods.html#parsedatabasejson) method. When data is written to database it goes through the [$formatDatabaseJson](/api/model/instance-methods.html#formatdatabasejson) method.

Similarly when you give data for a query (for example [`query().insert(req.body)`](/api/query-builder/instance-methods.html#insert)) or create a model explicitly using [`Model.fromJson(obj)`](/api/model/static-methods.html#static-fromjson) the [$parseJson](/api/model/instance-methods.html#parsejson) method is invoked. When you call [`model.toJSON()`](/api/model/instance-methods.html#tojson) or [`model.$toJson()`](/api/model/instance-methods.html#tojson) the [$formatJson](/api/model/instance-methods.html#formatjson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) and [koa](https://koajs.com/) automatically call the [toJSON](/api/model/instance-methods.html#tojson) method when you pass the model instance to methods like `response.json(model)`. You rarely need to call [toJSON()](/api/model/instance-methods.html#tojson) or [$toJson()](/api/model/instance-methods.html#tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the outside world.

All instance methods of models are prefixed with `$` letter so that they won’t overlap with database properties. All properties that start with `$` are also removed from `database` and `external` layouts.

In addition to these data formatting hooks, Model also has query lifecycle hooks

* [$beforeUpdate](/api/model/instance-methods.html#beforeupdate)
* [$afterUpdate](/api/model/instance-methods.html#afterupdate)
* [$beforeInsert](/api/model/instance-methods.html#beforeinsert)
* [$afterInsert](/api/model/instance-methods.html#afterinsert)
* [$beforeDelete](/api/model/instance-methods.html#beforedelete)
* [$afterDelete](/api/model/instance-methods.html#afterdelete)
* [$afterGet](/api/model/instance-methods.html#afterget)
