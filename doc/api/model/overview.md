# Overview

## Model data lifecycle

For the purposes of this explanation, let’s define three data layouts:

1. `database`: The data layout returned by the database.
2. `internal`: The data layout of a model instance.
3. `external`: The data layout after calling model.toJSON().

Whenever data is converted from one layout to another, converter methods are called:

1. `database` -> [$parseDatabaseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#parsedatabasejson) -> `internal`
2. `internal` -> [$formatDatabaseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#formatdatabasejson) -> `database`
3. `external` -> [$parseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#parsejson) -> `internal`
4. `internal` -> [$formatJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#formatjson) -> `external`

So for example when the results of a query are read from the database the data goes through the [$parseDatabaseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#parsedatabasejson) method. When data is written to database it goes through the [$formatDatabaseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#formatdatabasejson) method.

Similarly when you give data for a query (for example [`query().insert(req.body)`](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/mutate-methods.md#insert)) or create a model explicitly using [`Model.fromJson(obj)`](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-methods.md#static-fromjson) the [$parseJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#parsejson) method is invoked. When you call [`model.toJSON()`](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#tojson) or [`model.$toJson()`](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#tojson) the [$formatJson](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#formatjson) is called.

Note: Most libraries like [express](http://expressjs.com/en/index.html) and [koa](https://koajs.com/) automatically call the [toJSON](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#tojson) method when you pass the model instance to methods like `response.json(model)`. You rarely need to call [toJSON()](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#tojson) or [$toJson()](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#tojson) explicitly.

By overriding the lifecycle methods, you can have different layouts for the data in database and when exposed to the outside world.

All instance methods of models are prefixed with `$` letter so that they won’t overlap with database properties. All properties that start with `$` are also removed from `database` and `external` layouts.

In addition to these data formatting hooks, Model also has query lifecycle hooks

* [$beforeUpdate](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#beforeupdate)
* [$afterUpdate](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#afterupdate)
* [$beforeInsert](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#beforeinsert)
* [$afterInsert](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#afterinsert)
* [$beforeDelete](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#beforedelete)
* [$afterDelete](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#afterdelete)
* [$afterGet](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#afterget)
