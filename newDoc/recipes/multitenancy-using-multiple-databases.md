# Multitenancy using multiple databases

By default, the examples guide you to setup the database connection by calling [Model.knex(knex)](/api/model/static-methods.html#static-knex). This doesn't fly if you want to select the database based on the request as it sets the connection globally. There are (at least) two patterns for dealing with this kind of setup:

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

  const people = await Person
    .query()
    .findById(req.params.id);

  res.send(people);
});
```

## Knex passing pattern

Another option is to add the knex instance to the request using a middleware and not bind models at all (not even using [Model.knex()](/api/model/static-methods.html#static-knex)). The knex instance can be passed to [query](/api/model/static-methods.html#static-query), [$query](/api/model/instance-methods.html#query), and [$relatedQuery](/api/model/instance-methods.html#relatedquery) methods as the last argument. This pattern forces you to design your services and helper methods in a way that you always need to pass in a knex instance. A great thing about this is that you can pass a transaction object instead. (the knex/objection transaction object is a query builder just like the normal knex instance). This gives you a fine grained control over your transactions.


```js
app.use((req, res, next) => {
  // This function is defined in the previous example.
  req.knex = getKnexForRequest(req);
  next();
});

app.get('/people', async (req, res) => {
  const people = await Person
    .query(req.knex)
    .findById(req.params.id);

  res.send(people)
});
```
