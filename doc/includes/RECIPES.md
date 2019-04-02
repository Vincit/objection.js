# Recipe book

## Raw queries

```js
const { raw } = require('objection');
const ageToAdd = 10

await Person
  .query()
  .patch({
    age: raw('age + ?', ageToAdd)
  })

console.log(childAgeSums[0].childAgeSum);
```

```js
const { raw } = require('objection');

const childAgeSums = await Person
  .query()
  .select(raw('coalesce(sum(??), 0)', 'age').as('childAgeSum'))
  .where(raw(`?? || ' ' || ??`, 'firstName', 'lastName'), 'Arnold Schwarzenegger')
  .orderBy(raw('random()'));

console.log(childAgeSums[0].childAgeSum);
```

> `raw` can be nested with other `raw`, `lit` and `ref` instances. Here's a contrived example.

```js
const { raw } = require('objection');

const childAgeSums = await Person
  .query()
  .select(
    raw('coalesce(sum(?), ?)', ref('age'), lit(0)).as('childAgeSum')
  )
  .where(
    raw(
      `? || ' ' || ?`,
      raw('??', 'firstName'),
      raw('??', 'lastName')
    ),
    'Arnold Schwarzenegger'
  )
  .orderBy(raw('random()'));

console.log(childAgeSums[0].childAgeSum);
```

To mix raw SQL with queries, use the [`raw`](#raw) function from the main module
or the `raw` method of any [`Model`](#model) subclass. The only difference between
these two is that the `raw` function from the main module doesn't depend on knex
where as `Model.raw()` will throw if the model doesn't have a knex instance installed.
Both of these functions work just like the [knex's raw method](http://knexjs.org/#Raw).
And of course you can just use `knex.raw()`.

There are also some helper methods such as [`whereRaw`](#whereraw) in the [`QueryBuilder`](#querybuilder).

## JSON queries

```js
import { ref } from 'objection';

await Person
  .query()
  .select([
    'id',
    ref('jsonColumn:details.name').castText().as('name'),
    ref('jsonColumn:details.age').castInt().as('age')
  ])
  .join('animals', ref('persons.jsonColumn:details.name').castText(), '=', ref('animals.name'))
  .where('age', '>', ref('animals.jsonData:details.ageLimit'));
```

> Individual json fields can be updated like this:

```js
await Person
  .query()
  .patch({
    'jsonColumn:details.name': 'Jennifer',
    'jsonColumn:details.age': 29
  });
```

You can use the [`ref`](#ref) function from the main module to refer to json columns
in queries. There is also a bunch of query building methods that have `Json` in their
names. Check them out too.

See [`FieldExpression`](#fieldexpression) for more information about how to refer to
json fields.

Json queries currently only work with postgres.

## Custom id column

```js
class Person extends Model {
  static get idColumn() {
    return 'person_id';
  }
}
```

> ESNext:

```js
class Person extends Model {
  static idColumn = 'person_id';
}
```

Name of the identifier column can be changed by setting the static [`idColumn`](#idcolumn) property of a model class.
Composite key can be defined by using an array of column names.

## Custom validation

> Additional validation:

```js
class Person extends Model {
  $beforeInsert() {
    if (this.id) {
      throw new objection.ValidationError({
        message: 'identifier should not be defined before insert',
        type: 'MyCustomError',
        data: someObjectWithSomeData
      });
    }
  }
}
```

> Modifying the [Ajv](https://github.com/epoberezkin/ajv) based `jsonSchema` validation:

```js
const AjvValidator = require('objection').AjvValidator;

class Model {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => {
        // Here you can modify the `Ajv` instance.
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }
}
```

> Replace `jsonSchema` validation with any other validation scheme by
> implementing a custom [`Validator`](#validator):

```js
// MyCustomValidator.js

const Validator = require('objection').Validator;

class MyCustomValidator extends Validator {
  validate(args) {
    // The model instance. May be empty at this point.
    const model = args.model;

    // The properties to validate. After validation these values will
    // be merged into `model` by objection.
    const json = args.json;

    // `ModelOptions` object. If your custom validator sets default
    // values or has the concept of required properties, you need to
    // check the `opt.patch` boolean. If it is true we are validating
    // a patch object (an object with a subset of model's properties).
    const opt = args.options;

    // A context object shared between the validation methods. A new
    // object is created for each validation operation. You can store
    // whatever you need in this object.
    const ctx = args.ctx;

    // Do your validation here and throw any exception if the
    // validation fails.
    doSomeValidationAndThrowIfFails(json);

    // You need to return the (possibly modified) json.
    return json;
  }

  beforeValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.beforeValidate(args);
  }

  afterValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.afterValidate(args);
  }
}

// BaseModel.js

const Model = require('objection').Model;

// Override the `createValidator` method of a `Model` to use the
// custom validator.
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```

If you want to use the json schema validation but add some custom validation on top of it you can override the
[`$beforeValidate`](#_s_beforevalidate) or [`$afterValidate`](#_s_aftervalidate) method.

If you need to do validation on insert or update you can throw exceptions from the
[`$beforeInsert`](#_s_beforeinsert) and [`$beforeUpdate`](#_s_beforeupdate) methods.

If you don't want to use the built-in json schema validation, you can just ignore the [`jsonSchema`](#jsonschema) property.
It is completely optional. If you want to use some other validation library you need to implement a custom [`Validator`](#validator)
(see the example).

## Snake case to camel case conversion

> Conversion in knex:

```js
const Knex = require('knex');
const { knexSnakeCaseMappers } = require('objection');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  // Merge `postProcessResponse` and `wrapIdentifier` mappers.
  // If your columns are UPPER_SNAKE_CASE you can use
  // knexSnakeCaseMappers({ upperCase: true })
  ...knexSnakeCaseMappers()
});
```

> Conversion in objection:

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    // If your columns are UPPER_SNAKE_CASE you can
    // use snakeCaseMappers({ upperCase: true })
    return snakeCaseMappers();
  }
}
```

> ESNext:

```js
import { Model, snakeCaseMappers } from 'objection';

class Person extends Model {
  static columnNameMappers = snakeCaseMappers();
}
```

You may want to use snake_cased names in database and camelCased names in code. There are two ways to achieve this:

1. _Conversion in knex using [`knexSnakeCaseMappers`](#objection-knexsnakecasemappers)_.
When the conversion is done on knex level __everything__ is converted to camel case including properties and identifiers
in `relationMappings` and queries. `knexSnakeCaseMappers` use knex's `postProcessResponse` and `wrapIdentifier` hooks.

2. _Conversion in objection using [`snakeCaseMappers`](#objection-snakecasemappers)_.
When the conversion is done on objection level only database columns of the returned rows (model instances) are convered
to camel case. You still need to use snake case in `relationMappings` and queries. Note that `insert`, `patch`, `update`
and their variants still take objects in camel case. The reasoning is that objects passed to those methods usually come
from the client that also uses camel case.

**NOTE**: Beware of using `knexSnakeCaseMappers` in migrations - Knex does not perform a conversion when using a
property accessor for `max_batch` - a query result that tells Knex the latest migration batch number. If you use
`knexSnakeCaseMappers` in migrations as shown in the examples, all of your migrations will default to a single batch.
**Rolling back will cause your entire database to be rolled back at once.** See [#2644](https://github.com/tgriesser/knex/issues/2644)

## Paging

```js
const result = await Person
  .query()
  .where('age', '>', 20)
  .page(5, 100);

console.log(result.results.length); // --> 100
console.log(result.total); // --> 3341
```

Any query can be paged using the [`page`](#page) or [`range`](#range) method.

## Subqueries

> You can use functions:

```js
const peopleOlderThanAverage = await Person
  .query()
  .where('age', '>', builder => {
    builder.avg('age').from('persons');
  });

console.log(peopleOlderThanAverage);
```

> Or `QueryBuilder`s:

```js
const peopleOlderThanAverage = await Person
  .query()
  .where('age', '>', Person.query().avg('age'));

console.log(peopleOlderThanAverage);
```

Subqueries can be written just like in knex: by passing a function in place of a value. A bunch of query building
methods accept a function. See the knex.js documentation or just try it out. A function is accepted in most places
you would expect. You can also pass [`QueryBuilder`](#querybuilder) instances or knex queries instead of functions.

## Joins

> Normal knex-style join:

```js
const people = await Person
  .query()
  .select('persons.*', 'parent.firstName as parentName')
  .join('persons as parent', 'persons.parentId', 'parent.id');

console.log(people[0].parentName);
```

> [`joinRelation`](#joinrelation) helper for joining relation graphs:

```js
const people = await Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent');

console.log(people[0].grandParentName);
```

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join). Objection also has helpers like
the [`joinRelation`](#joinrelation) method family.

## PostgreSQL "returning" tricks

> Insert and return a Model instance in 1 query:

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .returning('*');

console.log(jennifer.createdAt); // NOW()-ish
console.log(jennifer.id); // Sequence ID
```

> Update a single row by ID and return the updated Model instance in 1 query:

```js
const jennifer = await Person
  .query()
  .patch({firstName: 'Jenn', lastName: 'Lawrence'})
  .where('id', 1234)
  .returning('*')
  .first();

console.log(jennifer.updatedAt); // NOW()-ish
console.log(jennifer.firstName); // "Jenn"
```

> Patch a Model instance and receive DB updates to Model instance in 1 query:

```js
const updateJennifer = await jennifer
  .$query()
  .patch({firstName: 'J.', lastName: 'Lawrence'})
  .returning('*');

console.log(updateJennifer.updatedAt); // NOW()-ish
console.log(updateJennifer.firstName); // "J."
```

> Delete all Persons named Jennifer and return the deleted rows as Model instances in 1 query:

```js
const deletedJennifers = await Person
  .query()
  .delete()
  .where({firstName: 'Jennifer'})
  .returning('*');

console.log(deletedJennifers.length); // However many Jennifers there were
console.log(deletedJennifers[0].lastName); // Maybe "Lawrence"
```

> Delete all of Jennifer's dogs and return the deleted Model instances in 1 query:

```js
const jennsDeletedDogs = await jennifer
  .$relatedQuery('pets')
  .delete()
  .where({'species': 'dog'})
  .returning('*');

console.log(jennsDeletedDogs.length); // However many dogs Jennifer had
console.log(jennsDeletedDogs[0].name); // Maybe "Fido"
```

Because PostgreSQL (and some others) support `returning('*')` chaining, you can actually `insert` a row, or
`update` / `patch` / `delete` (an) existing row(s), __and__ receive the affected row(s) as Model instances in a single query, thus improving efficiency. See the examples for more clarity.

## Polymorphic associations

```js
class Issue extends Model {
  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        filter: {commentableType: 'Issue'},
        beforeInsert(model) {
          model.commentableType = 'Issue';
        },
        join: {
          from: 'Issue.id',
          to: 'Comment.commentableId'
        }
      }
    };
  }
}

class PullRequest extends Model {
  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        filter: {commentableType: 'PullRequest'},
        beforeInsert(model) {
          model.commentableType = 'PullRequest';
        },
        join: {
          from: 'PullRequest.id',
          to: 'Comment.commentableId'
        }
      }
    };
  }
}
```

> The `{commentableType: 'Type'}` filter adds a `WHERE "commentableType" = 'Type'` clause to the relation fetch
> query. The `beforeInsert` hook takes care of setting the type on insert.


Let's assume we have tables `Comment`, `Issue` and `PullRequest`. Both `Issue` and `PullRequest` can have a list of comments.
`Comment` has a column `commentableId` to hold the foreign key and `commentableType` to hold the related model type. Check out
the first example for how to create relations for this setup ➔

This kind of associations don't have referential integrity and should be avoided if possible. Instead, consider
using the _exclusive arc table_ pattern discussed [here](https://github.com/Vincit/objection.js/issues/19#issuecomment-291621442).

## Timestamps

> This example is tested on postgres. You may need to use a different date format on other databases like mysql. See the database client's docs on which formats are supported.

```js
class Person extends Model {
  $beforeInsert() {
    this.created_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}
```

You can implement the `$beforeInsert` and `$beforeUpdate` methods to set the timestamps. If you want to do this for all
your models, you can simply create common base class that implements these methods.

## Custom query builder

```js
const QueryBuilder = require('objection').QueryBuilder;

class MyQueryBuilder extends QueryBuilder {
  // Some custom method.
  upsert(model) {
    if (model.id) {
      return this.update(model).where('id', model.id);
    } else {
      return this.insert(model);
    }
  }
}

class Person extends Model {
  static get QueryBuilder() {
    return MyQueryBuilder;
  }
}
```

> Now you can do this:

```js
await Person.query().upsert(person);
```

You can extend the [`QueryBuilder`](#querybuilder) returned by [`Model.query()`](#query), [`modelInstance.$relatedQuery()`](#_s_relatedquery)
and [`modelInstance.$query()`](#_s_query) methods by setting the model class's static [`QueryBuilder`](#querybuilder).

If you want to set the custom query builder for all model classes you can just set the `QueryBuilder`
property of the [`Model`](#model) base class. A cleaner option would be to create your own Model subclass, set its [`QueryBuilder`](#querybuilder)
property and inherit all your models from the custom Model class.

## Multi-tenancy

By default, the examples guide you to setup the database connection by setting the knex object of the [`Model`](#model) base
class. This doesn't fly if you want to select the database based on the request as it sets the connection globally. There
are (at least) two patterns for dealing with this kind of setup:

### Model binding pattern

```js
app.use((req, res, next) => {
  // Function that parses the tenant id from path, header, query parameter etc.
  // and returns an instance of knex. You should cache the knex instances and
  // not create a new one for each query.
  const knex = getDatabaseForRequest(req);

  req.models = {
    Person: Person.bindKnex(knex),
    Movie: Movie.bindKnex(knex),
    Animal: Animal.bindKnex(knex)
  };

  next();
});

app.get('/people', async (req, res) => {
  const people = await req.models.Person
    .query()
    .findById(req.params.id);

  res.send(people);
});
```

If you have a different database for each tenant, a useful pattern is to add a middleware that adds the models to
`req.models` hash and then _always_ use the models through `req.models` instead of requiring them directly. What
[`bindKnex`](#bindknex) method actually does is that it creates an anonymous subclass of the model class and sets its
knex connection. That way the database connection doesn't change for the other requests that are currently being executed.

### Database passing pattern

```js
app.use((req, res, next) => {
  // Function that parses the tenant id from path, header, query parameter etc.
  // and returns an instance of knex. You should cache the knex instances and
  // not create a new one for each query.
  req.knex = getDatabaseForRequest(req);
  next();
});

app.get('/people', async (req, res) => {
  const people = await Person
    .query(req.knex)
    .findById(req.params.id);

  res.send(people)
});
```

Another option is to add the knex instance to the request using a middleware and not bind models at all (not even using `Model.knex()`).
The knex instance can be passed to [`query`](#query), [`$query`](#_s_query), and [`$relatedQuery`](#_s_relatedquery) methods
as the last argument. This pattern forces you to design your services and helper methods in a way that you always need to pass
in a knex instance. A great thing about this is that you can pass a transaction object instead. (the knex/objection transaction
object is a query builder just like the normal knex instance). This gives you a fine grained control over your transactions.

## SQL clause precedence and parentheses

```js
await Person
  .query()
  .where('id', 1)
  .where(builder => {
    builder.where('foo', 2).orWhere('bar', 3);
  });
```

> SQL:

```sql
select * from "persons" where "id" = 1 and ("foo" = 2 or "bar" = 3)
```

You can add parentheses to queries by passing a function to the [`where`](#where) method.

## Default values

```js
class Person extends Model {
  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        gender: {
          type: 'string',
          enum: ['Male', 'Female', 'Other'],
          default: 'Female'
        }
      }
    };
  }
}
```

You can set the default values for properties using the `default` property in [`jsonSchema`](#jsonschema).

## Composite keys

> Specifying a composite primary key for a model:

```js
class Person extends Model {
  static get idColumn() {
    return ['firstName', 'lastName', 'dateOfBirth'];
  }
}
```

> Specifying a relation using a composite primary key and a composite foreign key:

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    return {
      pets: {
        relation: Model.BelongsToOneRelation,
        modelClass: Animal,
        join: {
          from: [
            'persons.firstName',
            'persons.lastName',
            'persons.dateOfBirth'
          ],
          to: [
            'animals.ownerFirstName',
            'animals.ownerLastName',
            'animals.ownerDateOfBirth'
          ]
        }
      }
    };
  }
};
```

Compound keys are fully supported. Just give an array of columns where you would normally give a single column name.
Composite primary key can be specified by setting an array of column names to the [`idColumn`](#idcolumn) of a model
class.

Here's a list of methods that may help working with composite keys:

 * [`whereComposite`](#wherecomposite)
 * [`whereInComposite`](#whereincomposite)
 * [`findById`](#findbyid)
 * [`deleteById`](#deletebyid)
 * [`updateAndFetchById`](#updateandfetchbyid)
 * [`patchAndFetchById`](#patchandfetchbyid)
 * [`$id`](#_s_id)

## Getting count of related objects

Let's say you have a `Tweet` model and a `Like` model. `Tweet` has a `HasManyRelation` named `likes` to `Like` table.
Now let's assume you'd like to fetch a list of `Tweet`s and get the number of likes for each of them without fetching
the actual `Like` rows. This cannot be easily achieved using `eager` because of the way the queries are optimized
(you can read more [here](#eager)). You can leverage SQL's subqueries and the [`relatedQuery`](#relatedquery) helper:

```js
const tweets = await Tweet
  .query()
  .select(
    'Tweet.*',
    Tweet.relatedQuery('likes').count().as('numberOfLikes')
  );

console.log(tweets[4].numberOfLikes);
```

The generated SQL is something like this:

```sql
select "Tweet".*, (select count(*) from "Like" where "Like"."tweetId" = "Tweet"."id") as "numberOfLikes" from "Tweet"
```

Naturally you can add as many subquery selects as you like. For example you could also get the count of retweets
in the same query. [`relatedQuery`](#relatedquery) method works with all relation types and not just `HasManyRelation`.

## Error handling

> An example error handler function that handles all possible errors. This example uses the [`objection-db-errors`](https://github.com/Vincit/objection-db-errors) library. Note that you should never send the errors directly to
the client as they may contains SQL and other information that reveals too much about the inner workings of your
app.

```js
const {
  ValidationError,
  NotFoundError
} = require('objection');

const {
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError
} = require('objection-db-errors');

// In this example `res` is an express response object.
function errorHandler(err, res) {
  if (err instanceof ValidationError) {
    switch (err.type) {
      case 'ModelValidation':
        res.status(400).send({
          message: err.message,
          type: 'ModelValidation',
          data: err.data
        });
        break;
      case 'RelationExpression':
        res.status(400).send({
          message: err.message,
          type: 'InvalidRelationExpression',
          data: {}
        });
        break;
      case 'UnallowedRelation':
        res.status(400).send({
          message: err.message,
          type: 'UnallowedRelation',
          data: {}
        });
        break;
      case 'InvalidGraph':
        res.status(400).send({
          message: err.message,
          type: 'InvalidGraph',
          data: {}
        });
        break;
      default:
        res.status(400).send({
          message: err.message,
          type: 'UnknownValidationError',
          data: {}
        });
        break;
    }
  } else if (err instanceof NotFoundError) {
    res.status(404).send({
      message: err.message,
      type: 'NotFound',
      data: {}
    });
  } else if (err instanceof UniqueViolationError) {
    res.status(409).send({
      message: err.message,
      type: 'UniqueViolation',
      data: {
        columns: err.columns,
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof NotNullViolationError) {
    res.status(400).send({
      message: err.message,
      type: 'NotNullViolation',
      data: {
        column: err.column,
        table: err.table,
      }
    });
  } else if (err instanceof ForeignKeyViolationError) {
    res.status(409).send({
      message: err.message,
      type: 'ForeignKeyViolation',
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof CheckViolationError) {
    res.status(400).send({
      message: err.message,
      type: 'CheckViolation',
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof DataError) {
    res.status(400).send({
      message: err.message,
      type: 'InvalidData',
      data: {}
    });
  } else if (err instanceof DBError) {
    res.status(500).send({
      message: err.message,
      type: 'UnknownDatabaseError',
      data: {}
    });
  } else {
    res.status(500).send({
      message: err.message,
      type: 'UnknownError',
      data: {}
    });
  }
}
```

Objection throws four kinds of errors:

1. [`ValidationError`](#validationerror) when an input that could come from the outside world is invalid. These inputs
    include model instances and POJOs, eager expressions object graphs etc. [`ValidationError`](#validationerror) has
    a `type` property that can be used to distinguish between the different error types.

2. [`NotFoundError`](#notfounderror) when [`throwIfNotFound`](#throwifnotfound) was called for a query and no
    results were found.

3. Database errors (unique violation error etc.) are thrown by the database client libraries and the error types depend on the
    library. You can use the [`objection-db-errors`](https://github.com/Vincit/objection-db-errors) plugin to handle these.

4. A basic javascript `Error` when a programming or logic error is detected. In these cases there is nothing the users
    can do and the only correct way to handle the error is to send a 500 response to the user and to fix the program.

See the example error handler that handles each error type.

## Indexing PostgreSQL JSONB columns

Good reading on the subject:

 * [JSONB type performance in PostgreSQL 9.4](https://blog.2ndquadrant.com/jsonb-type-performance-postgresql-9-4/) and
 * [Postgres 9.4 feature highlight - Indexing JSON data with jsonb data type](http://paquier.xyz/postgresql-2/postgres-9-4-feature-highlight-indexing-jsonb/).

### General Inverted Indexes a.k.a. GIN

This is the index type which makes all JSONB set operations fast. All `isSuperset` / `isSubset` / `hasKeys` / `hasValues` etc. queries can use this index to speed ’em up. Usually this is the index you want and it may take around 30% extra space on the DB server.

If one likes to use only the subset/superset operators with faster and smaller index one can give an extra `path_ops` parameter when creating the index: [“The path_ops index supports only the search path operator `@>` (see below), but produces a smaller and faster index for these kinds of searches.”](https://wiki.postgresql.org/wiki/What's_new_in_PostgreSQL_9.4). According to Marco Nenciarini’s post the speed up can be over 600% compared to full GIN index and the size of the index is reduced from ~30% -> ~20%.

> Full GIN index to speed up all type of json queries:

```js
.raw('CREATE INDEX on ?? USING GIN (??)', ['Hero', 'details'])
```

> Partial GIN index to speed up all subset / superset type of json queries:

```js
.raw('CREATE INDEX on ?? USING GIN (?? jsonb_path_ops)', ['Place', 'details'])
```

### Index on Expression

Another type of index one may use for JSONB field is to create an expression index for example for a certain JSON field inside a column.

You might want to use these if you are using lots of `.where(ref('jsonColumn:details.name').castText(), 'marilyn')` type of queries, which cannot be sped up with GIN index.

Use of these indexes are more limited, but they are also somewhat faster than using GIN and querying e.g. `{ field: value }` with subset operator. GIN indices also takes a lot of space in compared to expression index for certain field. So if you want to make just certain query to go extra fast you may consider using index on expression.

> An expression index referring an internal `details.name` attribute of an object stored in `jsonColumn`:

```js
.raw("CREATE INDEX on ?? ((??#>>'{details,name}'))", ['Hero', 'jsonColumn'])
```

### Complete Migration Example and Created Tables / Indexes

Complete example how to try out different index choices.

> Migration:

```js
exports.up = (knex) => {
  return knex.schema
    .createTable('Hero', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
      table.integer('homeId').unsigned()
        .references('id').inTable('Place');
    })
    .raw(
      'CREATE INDEX on ?? USING GIN (??)',
      ['Hero', 'details']
    )
    .raw(
      "CREATE INDEX on ?? ((??#>>'{type}'))",
      ['Hero', 'details']
    )
    .createTable('Place', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
    })
    .raw(
      'CREATE INDEX on ?? USING GIN (?? jsonb_path_ops)',
      ['Place', 'details']
    );
};
```

> Results following schema:

```sql
objection-jsonb-example=# \d "Hero"
            Table "public.Hero"
 Column  |          Type
---------+------------------------
 id      | integer
 name    | character varying(255)
 details | jsonb
 homeId  | integer
Indexes:
    "Hero_pkey" PRIMARY KEY, btree (id)
    "Hero_details_idx" gin (details)
    "Hero_expr_idx" btree ((details #>> '{type}'::text[]))

objection-jsonb-example=# \d "Place"
           Table "public.Place"
 Column  |          Type
---------+------------------------
 id      | integer
 name    | character varying(255)
 details | jsonb
Indexes:
    "Place_pkey" PRIMARY KEY, btree (id)
    "Place_details_idx" gin (details jsonb_path_ops)
```

> Expression index is used for example for following query:

```sql
explain select * from "Hero" where details#>>'{type}' = 'Hero';

                           QUERY PLAN
----------------------------------------------------------------
 Index Scan using "Hero_expr_idx" on "Hero"
   Index Cond: ((details #>> '{type}'::text[]) = 'Hero'::text)
```

## Ternary relationships

Assume we have the following Models:

1. user `(id, first_name, last_name)`
1. group `(id, name)`
1. permission `(id, label)`
1. user_group_permission `(user_id, group_id, permission_id, extra_attribute)`

Here's how you could create your models:

```js
// User.js
const { Model } = require("objection");

class User extends Model {
  static get tableName() { return "user"; }
  static get relationMappings() {
    return {
      groups: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Group"),
        join: {
          from: "user.id",
          through: {
            from: "user_group_permission.user_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.group_id"
          },
          to: "group.id"
        }
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Permission"),
        join: {
          from: "user.id",
          through: {
            from: "user_group_permission.user_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.permission_id"
          },
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = User;
```

```js
// Group.js
const { Model } = require("objection");

class Group extends Model {
  static get tableName() { return "group"; }
  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./User"),
        join: {
          from: "group.id",
          through: {
            from: "user_group_permission.group_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.user_id"
          },
          to: "user.id"
        }
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Permission"),
        join: {
          from: "group.id",
          through: {
            from: "user_group_permission.group_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.permission_id"
          },
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = Group;
```

```js
// Permission.js
const { Model } = require("objection");

class Permission extends Model {
  static get tableName() { return "permission"; }
  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./User"),
        join: {
          from: "permission.id",
          through: {
            from: "user_group_permission.permission_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.user_id"
          },
          to: "user.id"
        }
      },
      groups: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Group"),
        join: {
          from: "permission.id",
          through: {
            from: "user_group_permission.permission_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.group_id"
          },
          to: "group.id"
        }
      }
    };
  }
}

module.exports = Permission;
```

```js
// UserGroupPermission.js
const { Model } = require("objection");

class UserGroupPermission extends Model {
  static get tableName() { return "user_group_permission"; }
  static get idColumn() { return ["user_id", "group_id", "permission_id"]; }
  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./User"),
        join: {
          from: "user_group_permission.user_id",
          extra: ["extra_attribute"],
          to: "user.id"
        }
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./Group"),
        join: {
          from: "user_group_permission.group_id",
          extra: ["extra_attribute"],
          to: "group.id"
        }
      },
      permission: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./Permission"),
        join: {
          from: "user_group_permission.permission_id",
          extra: ["extra_attribute"],
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = UserGroupPermission;
```

Here's how you can query your models:

- `.*JoinRelation()`

```js
UserGroupPermission
  .query()
  .select(
    "first_name",
    "last_name",
    "label",
    "extra_attribute"
  )
  .joinRelation("[user, permission]")
  .where("group_id", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
/*
{
  first_name: ... ,
  last_name: ... ,
  label: ... ,
  extra_attribute: ...
}
*/
```

- `.eager()`

```js
UserGroupPermission
  .query()
  .eager("[user, permission]")
  .where("group_id", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
/*
{
  user: {
    first_name: ... ,
    last_name: ...
  },
  group: {
    name: ...
  },
  permission: {
    label: ...
  },
  extra_attribute: ...
}
*/
```

Read more about ternary relationships on [this issue](https://github.com/Vincit/objection.js/issues/179).
