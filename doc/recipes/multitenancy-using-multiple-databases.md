# Multitenancy using multiple databases

By default, the examples guide you to setup the database connection by calling [Model.knex(knex)](/api/model/static-methods.html#static-knex). This doesn't fly if you want to select the database based on the request as it sets the connection globally. There are (at least) two patterns for dealing with this kind of setup:

_NOTE:_ The following patterns don't work if you have a large amount of tenants since we need to create a knex instance for each of them. In those cases you probably shouldn't be creating a separate database for each tenant anyway.

## Model binding pattern

If you have a different database for each tenant, a useful pattern is to add a middleware that adds the models to `req.models` hash and then _always_ use the models through `req.models` instead of requiring them directly. What [bindKnex](/api/model/static-properties.html#static-bindknex) method actually does is that it creates an anonymous subclass of the model class and sets its knex connection. That way the database connection doesn't change for the other requests that are currently being executed.

```js
const Knex = require('knex');

app.use((req, res, next) => {
  const knexCache = new Map();

  // Function that parses the tenant id from path, header, query parameter etc.
  // and returns an instance of knex. You should cache the knex instances and
  // not create a new one for each query. Knex takes care of connection pooling.
  const knex = getKnexForRequest(req, knexCache);

  req.models = {
    Person: Person.bindKnex(knex),
    Movie: Movie.bindKnex(knex),
    Animal: Animal.bindKnex(knex)
  };

  next();
});

function getKnexForRequest(req, knexCache) {
  // If you pass the tenantIs a query parameter, you would do something
  // like this.
  let tenantId = req.query.tenantId;
  let knex = knexCache.get(tenantId);

  if (!knex) {
    knex = Knex(knexConfigForTenant(tenantId));
    knexCache.set(tenantId, knex);
  }

  return knex;
}

function knexConfigForTenant(tenantId) {
  return {
    // The correct knex config object for the given tenant.
  };
}

app.get('/people', async (req, res) => {
  const { Person } = req.models;

  const people = await Person.query().findById(req.params.id);

  res.send(people);
});
```

## Knex passing pattern

Another option is to add the knex instance to the request using a middleware and not bind models at all (not even using [Model.knex()](/api/model/static-methods.html#static-knex)). The knex instance can be passed to [query](/api/model/static-methods.html#static-query), [\$query](/api/model/instance-methods.html#query), and [\$relatedQuery](/api/model/instance-methods.html#relatedquery) methods as the last argument. This pattern forces you to design your services and helper methods in a way that you always need to pass in a knex instance. A great thing about this is that you can pass a transaction object instead. (the knex/objection transaction object is a query builder just like the normal knex instance). This gives you a fine grained control over your transactions.

```js
app.use((req, res, next) => {
  // This function is defined in the previous example.
  req.knex = getKnexForRequest(req);
  next();
});

app.get('/people', async (req, res) => {
  const people = await Person.query(req.knex).findById(req.params.id);

  res.send(people);
});
```

## Using AsyncLocalStorage API

The [Async hooks](https://nodejs.org/api/async_hooks.html#async_hooks_async_hooks) modules in latest Nodejs provides a native implementation of "continuation-local-storage" called [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage)

This was added in Nodejs `v13.10.0` but, a "usable" version is only available @ `v15` after fixing some critical [bugs](https://github.com/knex/knex/issues/3879)

The basic idea is like thread level static variables, we can store/set "async stack" level variables and those variables will preserve its value for any functions invoked ( directly or indirectly ) from that particular "async stack"

For eg: consider we want to connect to different databases based on some request data. Then we have to do two things

1. Write a middleware which captures data from request and set it as a "AsyncLocalStorage" variable.
2. Override `Model.prototype.constructor.knex` function in Objection.js ( Every single query in Objection.js is using this function to get a connected knex instance ) in such a way that, we return a knex instance by using the information stored in previously set "AsyncLocalStorage" variable.

For eg:

1. ExpressJs middleware
```
const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

app.use(function(req, res, next) {
  /*
   * Here we are connecting to db based on subdomain name.
   * client1.example.com => client1db
   * client2.example.com => client2db
   */
  const host = req.headers['host'];
  const clientDomain = host.substring(0, host.indexOf('.'));
  storage.run(clientDomain, ()=>{
    setImmediate(next);
  });
});
```

2.  Override `Model.prototype.constructor.knex` function

```
const { Model } = require('objection');

Model.prototype.constructor.knex = function() {
  const clientDomain = storage.getStore();
  return getKnexInstanceForClient(clientDomain);
};

```
where `getKnexInstanceForClient` function returns a connected knex instance based on provided `clientDomain` data

In the above example Point 1 and 2 can be written different files, but both should share the `storage` variable it can be shared either by using global variables or using a module / singleton 
