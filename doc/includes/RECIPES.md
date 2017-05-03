# Recipe book

## Raw queries

```js
Person
  .query()
  .select(Person.raw('coalesce(sum(??), 0) as ??', ['age', 'childAgeSum']))
  .groupBy('parentId')
  .then(childAgeSums => {
    console.log(childAgeSums[0].childAgeSum);
  });
```

To write raw SQL queries, use the [`raw`](#raw) method of any [`Model`](#model) subclass. There are also some helper
methods such as [`whereRaw`](#whereraw) in the [`QueryBuilder`](#querybuilder). The [`raw`](#raw) method works just like the
[knex's raw method](http://knexjs.org/#Raw). And of course you can just use `knex.raw()`.

## Change id column

```js
class Person extends Model {
  static get idColumn() {
    return 'person_id';
  }
}
```

> ES5:

```js
Person.idColumn = 'person_id';
```

Name of the identifier column can be changed by setting the static [`idColumn`](#idcolumn) property of a model class.
Composite key can be defined by using an array of column names.

## Custom validation

> Additional validation:

```js
class Person extends Model {
  beforeInsert() {
    if (this.id) {
      throw new objection.ValidationError({
        id: [{
          message: 'identifier should not be defined before insert'
          keyword: null,
          params: null
        }]
      });
    }
  }
}
```

> ES5:

```js
Person.prototype.$beforeInsert = function () {
  if (this.id) {
    throw new objection.ValidationError({
      id: [{
        message: 'identifier should not be defined before insert'
        keyword: null,
        params: null
      }]
    });
  }
};
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
    // values, you need to check the `opt.patch` boolean. If it is true
    // we are validating a patch object, the defaults should not be set.
    const opt = args.options;

    // A context object shared between the validation methods. A new
    // object is created for each validation operation.
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

## Map column names to different property names

> snake_case/camelCase conversion:

```js
class Person extends Model {
  // This is called when an object is serialized to database format.
  $formatDatabaseJson(json) {
    json = super.$formatDatabaseJson(json);

    return _.mapKeys(json, (value, key) => {
      return _.snakeCase(key);
    });
  }

  // This is called when an object is read from database.
  $parseDatabaseJson(json) {
    json = _.mapKeys(json, function (value, key) {
      return _.camelCase(key);
    });

    return super.$parseDatabaseJson(json);
  }
}
```

> ES5:

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

> Note that even though column names are mapped when fetching / storing data, one still has to use
> db column names when writing queries:

```js
await Person.query().insert({ firstName: 'Jennifer' });
let jen = await Person.query().where('first_name', 'Jennifer');
expect(jen.firstName).to.equal('Jennifer');
```

Sometimes you may want to use for example snake_cased column names in database tables
and camelCased property names in code. You can use the functions

- [`$parseDatabaseJson`](#_s_parsedatabasejson)
- [`$formatDatabaseJson`](#_s_formatdatabasejson)
- [`$parseJson`](#_s_parsejson)
- [`$formatJson`](#_s_formatjson)

to convert data between database and "external" representations.

## Paging

```js
Person
  .query()
  .where('age', '>', 20)
  .page(5, 100)
  .then(result => {
    console.log(result.results.length); // --> 100
    console.log(result.total); // --> 3341
  });
```

Any query can be paged using the [`page`](#page) or [`range`](#range) method.

## Subqueries

> You can use functions:

```js
Person
  .query()
  .where('age', '>', builder => {
    builder.avg('age').from('Person');
  })
  .then(peopleOlderThanAverage => {
    console.log(peopleOlderThanAverage);
  });
```

> Or `QueryBuilder`s:

```js
Person
  .query()
  .where('age', '>', Person.query().avg('age'))
  .then(peopleOlderThanAverage => {
    console.log(peopleOlderThanAverage);
  });
```

Subqueries can be written just like in knex: by passing a function in place of a value. A bunch of query building
methods accept a function. See the knex.js documentation or just try it out. A function is accepted in most places
you would expect. You can also pass [`QueryBuilder`](#querybuilder) instances or knex queries instead of functions.

## Joins

> Normal knex-style join:

```js
Person
  .query()
  .select('Person.*', 'Parent.firstName as parentName')
  .join('Person as Parent', 'Person.parentId', 'Parent.id')
  .then(people => {
    console.log(people[0].parentName);
  });
```

> [`joinRelation`](#joinrelation) helper for joining relation graphs:

```js
Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent')
  .then(people => {
    console.log(people[0].grandParentName);
  });
```

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join). Objection also has helpers like
the [`joinRelation`](#joinrelation) method family.

## PostgreSQL "returning" tricks

> Insert and return the data in 1 query:

```js
Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .returning('*')
  .then(jennifer => {
    console.log(jennifer.createdAt); // NOW()-ish
    console.log(jennifer.id);
  });

```

> Update a single row by ID and return the data for that row in 1 query:

```js
Person
  .query()
  .patch({firstName: 'Jenn', lastName: 'Lawrence'})
  .where('id', 1234)
  .first() // Ensures we're returned a single row in the promise resolution
  .returning('*')
  .then(jennifer => {
    console.log(jennifer.updatedAt); // NOW()-ish
    console.log(jennifer.firstName); // "Jenn"
  });

```

> Update a Model instance and return the data for that instance in 1 query:

```js
jennifer
  .$query()
  .patch({firstName: 'J.', lastName: 'Lawrence'})
  .first() // Ensures we're returned a single row in the promise resolution
  .returning('*')
  .then(jennifer => {
    console.log(jennifer.updatedAt); // NOW()-ish
    console.log(jennifer.firstName); // "J."
  });

```

> Delete all Persons named Jennifer and return the deleted instances in 1 query:

```js
Person
  .query()
  .delete()
  .where({firstName: 'Jenn'})
  .returning('*')
  .then(deletedJennifers => {
    console.log(deletedJennifers.length); // However many Jennifers there were
    console.log(deletedJennifers[0].lastName); // Maybe "Lawrence"
  });

```

> Delete all of Jennifer's dogs and return the deleted instances in 1 query:

```js
jennifer
  .$relatedQuery('pets')
  .delete()
  .where({'species': 'dog'})
  .returning('*')
  .then(jennsDeletedDogs => {
    console.log(jennsDeletedDogs.length); // However many dogs Jennifer had
    console.log(jennsDeletedDogs[0].name); // Maybe "Fido"
  });

```

Because PostgreSQL (and some others) support `returning('*')` chaining, you can actually `insert` a row, or
`update` / `patch` / `delete` a(n) existing row(s), __and__ receive the affected row(s) in a single query, thus improving efficiency. See the examples for more clarity.

## Polymorphic associations

```js
class Issue extends Model {
  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        filter: {commentableType: 'Issue'},
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
> query. It doesn't automatically set the type when you insert a new comment. You have to set the `commentableType`
> manually:

```js
someIssue
  .$relatedQuery('comments')
  .insert({text: 'blaa', commentableType: 'Issue'})
  .then(...)
```

Creating polymorphic associations isn't as easy as it could be at the moment, but it can be done using
custom filters for relations. Let's assume we have tables `Comment`, `Issue` and `PullRequest`. Both
`Issue` and `PullRequest` can have a list of comments. `Comment` has a column `commentableId` to hold
the foreign key and `commentableType` to hold the related model type. Check out the first example for
how to create relations for this setup ➔

## Timestamps

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

> ES5:

```js
Person.prototype.$beforeInsert = function () {
  this.created_at = new Date().toISOString();
};

Person.prototype.$beforeUpdate = function () {
  this.updated_at = new Date().toISOString();
};
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

// Instance of this is created when you call `query()` or `$query()`.
Person.QueryBuilder = MyQueryBuilder;
// Instance of this is created when you call `$relatedQuery()`.
Person.RelatedQueryBuilder = MyQueryBuilder;
```

> ES5:

```js
var QueryBuilder = require('objection').QueryBuilder;

function MyQueryBuilder() {
  QueryBuilder.apply(this, arguments);
}

QueryBuilder.extend(MyQueryBuilder);

// Some custom method.
MyQueryBuilder.prototype.upsert = function (model) {
  if (model.id) {
    return this.update(model).where('id', model.id);
  } else {
    return this.insert(model);
  }
};

// Instance of this is created when you call `query()` or `$query()`.
Person.QueryBuilder = MyQueryBuilder;
// Instance of this is created when you call `$relatedQuery()`.
Person.RelatedQueryBuilder = MyQueryBuilder;
```

> Now you can do this:

```js
Person.query().upsert(person).then(() => {
  ...
});
```

You can extend the [`QueryBuilder`](#querybuilder) returned by [`Model.query()`](#query), [`modelInstance.$relatedQuery()`](#_s_relatedquery)
and [`modelInstance.$query()`](#_s_query) methods by setting the model class's static [`QueryBuilder`](#querybuilder) and/or
[`RelatedQueryBuilder`](#relatedquerybuilder) property.

If you want to set the custom query builder for all model classes you can just set the `QueryBuilder`
property of the [`Model`](#model) base class. A cleaner option would be to create your own Model subclass, set its [`QueryBuilder`](#querybuilder)
property and inherit all your models from the custom Model class.

## Multi-tenancy

```js
app.use((req, res, next) => {
  // Function that parses the tenant id from path, header, query parameter etc.
  // and returns an instance of knex. You should cache the knex instances and
  // not create a new one for each query.
  var knex = getDatabaseForRequest(req);

  req.models = {
    Person: Person.bindKnex(knex),
    Movie: Movie.bindKnex(knex),
    Animal: Animal.bindKnex(knex)
  };

  next();
});
```

By default, the examples guide you to setup the database connection by setting the knex object of the [`Model`](#model) base
class. This doesn't fly if you want to select the database based on the request as it sets the connection globally.

If you have a different database for each tenant, a useful pattern is to add a middleware that adds the models to
`req.models` hash and then _always_ use the models through `req.models` instead of requiring them directly. What
[`bindKnex`](#bindknex) method actually does is that it creates an anonymous subclass of the model class and sets its
knex connection. That way the database connection doesn't change for the other requests that are currently being executed.

## SQL clause precedence and parentheses

```js
Person
  .query()
  .where('id', 1)
  .where(builder => {
    builder.where('foo', 2).orWhere('bar', 3);
  });
```

> SQL:

```sql
select * from "Person" where "id" = 1 and ("foo" = 2 or "bar" = 3)
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
  static get relationMappings() {
    return {
      pets: {
        relation: Model.BelongsToOneRelation,
        modelClass: Animal,
        join: {
          from: [
            'Person.firstName',
            'Person.lastName',
            'Person.dateOfBirth'
          ],
          to: [
            'Animal.ownerFirstName',
            'Animal.ownerLastName',
            'Animal.ownerDateOfBirth'
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
 * [`$values`](#_s_values)

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
exports.up = function (knex) {
  return knex.schema
    .createTable('Hero', function (table) {
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
    .createTable('Place', function (table) {
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
