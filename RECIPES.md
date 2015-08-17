# Table of contents

- [Raw queries](#raw-queries)
- [Change id column](#change-id-column)
- [Custom validation](#custom-validation)
- [Map column names to different property names](#map-column-names-to-different-property-names)
- [Paging](#paging)
- [Subqueries](#subqueries)
- [Joins](#joins)
- [Polymorphic associations](#polymorphic-associations)
- [Timestamps](#timestamps)
- [Custom query builder methods](#custom-query-builder-methods)
- [Multi-tenancy](#multi-tenancy)

## Raw queries

To write raw SQL queries, use the `.raw()` method of knex. You can always access a knex
instance through [knex()](http://vincit.github.io/objection.js/Model.html#_P_knex) method of
any model class. There are also some helper methods such as `whereRaw()` in the `QueryBuilder`.

```js
var knex = Person.knex();
Person
  .query()
  .select(knex.raw('coalesce(sum(age), 0) as "childAgeSum"'))
  .groupBy('parentId')
  .then(function (childAgeSums) {
    console.log(childAgeSums[0].childAgeSum);
  });
```

In transactions `this` points to the knex instance:

```js
objection.transaction(Person, function (Person) {
  var knex = this;

  return knex.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE').then(function () {
    return Person.query().insert(req.body);
  });
});
```

## Change id column

Name of the identifier column can be changed by setting the static `idColumn` property of
a model class.

```js
Person.idColumn = 'person_id';
```

## Custom validation

If you want to use the json schema validation but add some custom validation on top of it you can override the
[$beforeValidate](http://vincit.github.io/objection.js/Model.html#SbeforeValidate) and
[$afterValidate](http://vincit.github.io/objection.js/Model.html#SafterValidate) methods.

If you don't want to use the built-in json schema validation, you can just ignore the `jsonSchema` property. It is
optional. If you want to use some other validation library, simply override the [$validate method](http://vincit.github.io/objection.js/Model.html#Svalidate)
of the model class. You need to throw a [ValidationError](http://vincit.github.io/objection.js/ValidationError.html) when validation fails.

```js
Person.prototype.$validate = function (objectToValidate, options) {
  // This makes revalidation possible: `someModel.$validate()`.
  objectToValidate = objectToValidate || this;

  if (!someCustomValidator(objectToValidate)) {
    throw new objection.ValidationError({someProp: 'validation error message for the property'});
  }

  // Remember to return the input json object.
  return objectToValidate;
};
```

## Map column names to different property names

Sometimes you may want to use for example snake_cased column names in database tables
and camelCased property names in code. You can use the functions

- [$parseDatabaseJson](http://vincit.github.io/objection.js/Model.html#SparseDatabaseJson)
- [$formatDatabaseJson](http://vincit.github.io/objection.js/Model.html#SformatDatabaseJson)
- [$parseJson](http://vincit.github.io/objection.js/Model.html#SparseJson)
- [$formatJson](http://vincit.github.io/objection.js/Model.html#SformatJson)

to convert data between database and "external" representations. Example of the mentioned
snake_case/camelCase conversion:

```js
// This is called when an object is serialized to database format.
Person.prototype.$formatDatabaseJson = function (json) {
  // Call superclass implementation.
  json = Model.prototype.$formatDatabaseJson.call(this, json);

  return _.mapKeys(json, function (value, key) {
    return _.snakeCase(key);
  });
};

// This is called when an object is read from database.
Person.prototype.$parseDatabaseJson = function (json) {
  json = _.mapKeys(json, function (value, key) {
    return _.camelCase(key);
  });

  // Call superclass implementation.
  return Model.prototype.$parseDatabaseJson.call(this, json);
};
```

## Paging

Any query can be paged using the [page](http://vincit.github.io/objection.js/QueryBuilder.html#page) or
[range](http://vincit.github.io/objection.js/QueryBuilder.html#range) method.

```js
Person
  .query()
  .where('age', '>', 20)
  .page(5, 100)
  .then(function (result) {
    console.log(result.results.length); // --> 100
    console.log(result.total); // --> 3341
  });
```

## Subqueries

Subqueries can be written just like in knex: by passing a function in place of a value.

```js
Person
  .query()
  .where('age', '>', function () {
    this.avg('age').from('Person');
  })
  .then(function (personsOlderThanAverage) {
    console.log(personsOlderThanAverage);
  });
```

A bunch of query building methods accept a function. See the knex.js documentation or
just try it out. A function is accepted in most places you would expect.

## Joins

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join).

```js
Person
  .query()
  .select('Person.*', 'Parent.firstName as parentName')
  .join('Person as Parent', 'Person.parentId', 'Parent.id')
  .then(function (persons) {
    console.log(persons[0].parentName);
  });
```

## Polymorphic associations

Creating polymorphic associations isn't as easy as it could be at the moment, but it can be done using
custom filters for relations. Let's assume we have tables `Comment`, `Issue` and `PullRequest`. Both
`Issue` and `PullRequest` can have a list of comments. `Comment` has a column `commentableId` to hold
the foreign key and `commentableType` to hold the related model type. You can set up the relations
like this:

```js
Issue.relationMappings = {
  comments: {
    relation: Model.OneToManyRelation,
    modelClass: Comment,
    filter: {commentableType: 'Issue'},
    join: {
      from: 'Issue.id',
      to: 'Comment.commentableId'
    }
  }
};

PullRequest.relationMappings = {
  comments: {
    relation: Model.OneToManyRelation,
    modelClass: Comment,
    filter: {commentableType: 'PullRequest'},
    join: {
      from: 'PullRequest.id',
      to: 'Comment.commentableId'
    }
  }
};
```

The `{commentableType: 'Type'}` filter adds a `WHERE "commentableType" = 'Type'` clause to the relation fetch
query. It doesn't automatically set the type when you insert a new comment. You have to set the `commentableType`
manually:

```js
someIssue
  .$relatedQuery('comments')
  .insert({text: 'blaa', commentableType: 'Issue'})
  .then(...)
```

## Timestamps

You can implement the `$beforeInsert` and `$beforeUpdate` methods to set the timestamps:

```js
Person.prototype.$beforeInsert = function () {
  this.createdAt = new Date().toISOString();
};

Person.prototype.$beforeUpdate = function () {
  this.updatedAt = new Date().toISOString();
};
```

If you want to do this for all your models, you can simply create common base class that
implements these methods.

## Custom query builder methods

You can extend the `QueryBuilder` returned by `Model.query()`, `modelInstance.$relatedQuery()`
and `modelInstance.$query()` methods by setting the model class's static `QueryBuilder` property:

```js
var QueryBuilder = require('objection').QueryBuilder;

function MyQueryBuilder() {
  QueryBuilder.apply(this, arguments);
}

QueryBuilder.extend(MyQueryBuilder);

// Some custom method.
MyQueryBuilder.prototype.upsert = function (model) {
  if (model.id) {
    return this.update(model);
  } else {
    return this.insert(model);
  }
};

Person.QueryBuilder = MyQueryBuilder;
```

Now you can do this:

```js
Person.query().upsert(person).then(function () {
  ...
});
```

If you want to set the custom query builder for all model classes you can just override the `QueryBuilder` property of
the `Model` base class. A cleaner option would be to create your own Model subclass, set its `QueryBuilder` property
and inherit all your models from the custom Model class.

## Multi-tenancy

By default, the examples guide you to setup the database connection by setting the knex object of the `Model` base
class. This doesn't fly if you want to select the database based on the request as it sets the connection globally.

If you have a different database for each tenant, a useful pattern is to add a middleware that adds the models to
`req.models` hash like so:

```js
app.use(function (req, res, next) {
  // Function that parses the tenant id from path, header, query parameter etc.
  // and returns an instance of knex.
  var knex = getDatabaseForRequest(req);

  req.models = {
    Person: Person.bindKnex(knex),
    Movie: Movie.bindKnex(knex),
    Animal: Animal.bindKnex(knex)
  };

  next();
});
```

and then _always_ use the models through `req.models` instead of requiring them directly. What `bindKnex` method
actually does is that it creates an anonymous subclass of the model class and sets its knex connection. That way the
database connection doesn't change for the other requests that are currently being executed.
