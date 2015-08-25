[![Build Status](https://travis-ci.org/Vincit/objection.js.svg?branch=master)](https://travis-ci.org/Vincit/objection.js) [![Coverage Status](https://coveralls.io/repos/Vincit/objection.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/Vincit/objection.js?branch=master)

# Introduction

Objection.js is a Node.js ORM built around the wonderful SQL query builder [knex](http://knexjs.org). All databases
supported by knex are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * An easy declarative way of [defining models](#models) and relations between them
 * Simple and fun way to [fetch, insert, update and delete](#query-examples) models using the full power of SQL
 * Powerful mechanism for loading arbitrarily large [trees of relations](#eager-queries)
 * A way to [store complex documents](#documents) as single rows
 * Completely [Promise](https://github.com/petkaantonov/bluebird) based API
 * Easy to use [transactions](#transactions)
 * [JSON schema](#validation) validation

What objection.js **doesn't** give you:

 * A custom query DSL. SQL is used as a query language.
 * Automatic database schema creation and migration.
    It is useful for the simple things, but usually just gets in your way when doing anything non-trivial.
    Objection.js leaves the schema related things to you. knex has a great [migration tool](http://knexjs.org/#Migrations)
    that we recommend for this job.

Objection.js uses Promises and coding practices that make it ready for the future. You can already use things like ES7
[async/await](http://jakearchibald.com/2014/es7-async-functions/) and ES6 classes using a transpiler such as
[Babel](https://babeljs.io/). Check out our [ES7 example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es7).

# Topics

- [Installation](#installation)
- [Getting started](#getting-started)
- [Query examples](#query-examples)
- [Eager queries](#eager-queries)
- [Transactions](#transactions)
- [Documents](#documents)
- [Validation](#validation)
- [Models](#models)
- [Testing](#testing)
- [API Documentation](http://vincit.github.io/objection.js/Model.html)
- [Recipe book](RECIPES.md)
- [Changelog](#changelog)

# Installation

```sh
npm install knex objection
```

You also need to install one of the following depending on the database you want to use:

```sh
npm install pg
npm install sqlite3
npm install mysql
npm install mysql2
npm install mariasql
```

# Getting started

To use objection.js all you need to do is [initialize knex](http://knexjs.org/#Installation-node) and give the
connection to objection.js using `Model.knex(knex)`:

```js
var Knex = require('knex');
var Model = require('objection').Model;

var knex = Knex({
  client: 'postgres',
  connection: {
    host: '127.0.0.1',
    database: 'your_database'
  }
});

Model.knex(knex);
```

The next step is to create some migrations and models and start using objection.js. The best way to get started is to
use the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express):

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express
npm install
# We use knex for migrations in this example.
npm install knex -g
knex migrate:latest
npm start
```

The `express` example project is a simple express server. The `example-requests.sh` file contains a bunch of curl
commands for you to start playing with the REST API.

```sh
cat example-requests.sh
```

We also have an ES7 version of the express example project. It uses [Babel](https://babeljs.io/) for the ES7 --> ES5
transpiling.

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express-es7
npm install
# We use knex for migrations in this example.
npm install knex -g
knex migrate:latest
# This runs the Babel transpiler and executes the app.
npm start
```

Also check out our [API documentation](http://vincit.github.io/objection.js/Model.html) and [recipe book](RECIPES.md).

# Query examples

The `Person` model used in the examples is defined [here](#models).

All queries are started with one of the [Model](http://vincit.github.io/objection.js/Model.html) methods [query()](http://vincit.github.io/objection.js/Model.html#_P_query),
[$query()](http://vincit.github.io/objection.js/Model.html#Squery) or [$relatedQuery()](http://vincit.github.io/objection.js/Model.html#SrelatedQuery).
All these methods return a [QueryBuilder](http://vincit.github.io/objection.js/QueryBuilder.html) instance that can be used just like
a [knex QueryBuilder](http://knexjs.org/#Builder).

Insert a person to the database:

```js
Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .then(function (jennifer) {
    console.log(jennifer instanceof Person); // --> true
    console.log(jennifer.firstName); // --> 'Jennifer'
    console.log(jennifer.fullName()); // --> 'Jennifer Lawrence'
  })
  .catch(function (err) {
    console.log('oh noes');
  });
```

```sql
insert into "Person" ("firstName", "lastName") values ('Jennifer', 'Lawrence')
```

Fetch all persons from the database:

```js
Person
  .query()
  .then(function (persons) {
    console.log(persons[0] instanceof Person); // --> true
    console.log('there are', persons.length, 'Persons in total');
  })
  .catch(function (err) {
    console.log('oh noes');
  });
```

```sql
select * from "Person"
```

The return value of the `.query()` method is an instance of [QueryBuilder](http://vincit.github.io/objection.js/QueryBuilder.html)
that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has. Here is a simple example that uses some of them:

```js
Person
  .query()
  .where('age', '>', 40)
  .andWhere('age', '<', 60)
  .andWhere('firstName', 'Jennifer')
  .orderBy('lastName')
  .then(function (middleAgedJennifers) {
    console.log('The last name of the first middle aged Jennifer is');
    console.log(middleAgedJennifers[0].lastName);
  });
```

```sql
select * from "Person"
where "age" > 40
and "age" < 60
and "firstName" = 'Jennifer'
order by "lastName" asc
```

The next example shows how easy it is to build complex queries:

```js
Person
  .query()
  .select('Person.*', 'Parent.firstName as parentFirstName')
  .join('Person as Parent', 'Person.parentId', 'Parent.id')
  .where('Person.age', '<', Person.query().avg('Person.age'))
  .whereExists(Animal.query().select(1).whereRef('Person.id', 'Animal.ownerId'))
  .orderBy('Person.lastName')
  .then(function (persons) {
    console.log(persons[0].parentFirstName);
  });
```

```sql
select "Person".*, "Parent"."firstName" as "parentFirstName"
from "Person"
inner join "Person" as "Parent" on "Person"."parentId" = "Parent"."id"
where "Person"."age" < (select avg("Person"."age") from "Person")
and exists (select 1 from "Animal" where "Person"."id" = "Animal"."ownerId")
order by "Person"."lastName" asc
```

Update models:

```js
Person
  .query()
  .patch({lastName: 'Dinosaur'})
  .where('age', '>', 60)
  .then(function (patch) {
    console.log('all persons over 60 years old are now dinosaurs');
    console.log(patch.lastName); // --> Dinosaur.
  })
  .catch(function (err) {
    console.log(err.stack);
  });
```

```sql
update "Person" set "lastName" = 'Dinosaur' where "age" > 60
```

While the static `.query()` method can be used to create a query to a whole table `.$relatedQuery()` method
can be used to query a single relation. `.$relatedQuery()` returns an instance of [QueryBuilder](http://vincit.github.io/objection.js/QueryBuilder.html)
just like the `.query()` method.

```js
var jennifer;
Person
  .query()
  .where('firstName', 'Jennifer')
  .first()
  .then(function (person) {
    jennifer = person;
    return jennifer
      .$relatedQuery('pets')
      .where('species', 'dog')
      .orderBy('name');
  })
  .then(function (jennifersDogs) {
    console.log(jennifersDogs[0] instanceof Animal); // --> true
    console.log(jennifer.pets === jennifersDogs); // --> true
    console.log('Jennifer has', jennifersDogs.length, 'dogs');
  })
  .catch(function (err) {
    console.log(err.stack);
  });
```

```sql
select * from "Person" where "firstName" = 'Jennifer'

select * from "Animal"
where "species" = 'dog'
and "Animal"."ownerId" = 1
order by "name" asc
```

Insert a related model:

```js
Person
  .query()
  .where('id', 1)
  .first()
  .then(function (person) {
    return person.$relatedQuery('pets').insert({name: 'Fluffy'});
  })
  .then(function (fluffy) {
    console.log(fluffy.id);
  })
  .catch(function (err) {
    console.log('something went wrong with finding the person OR inserting the pet');
    console.log(err.stack);
  });
```

```sql
select * from "Person" where "id" = 1

insert into "Animal" ("name", "ownerId") values ('Fluffy', 1)
```

# Eager queries

Okay I said there is no custom DSL but actually we have teeny-tiny one for fetching relations eagerly, as it isn't
something that can be done easily using SQL. The following examples demonstrate how to use it:

Fetch one relation:

```js
Person
  .query()
  .eager('pets')
  .then(function (persons) {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation.
    console.log(persons[0].pets[0].name);
    console.log(persons[0].pets[0] instanceof Animal); // --> true
  });
```

Fetch multiple relations on multiple levels:

```js
Person
  .query()
  .eager('[pets, children.[pets, children]]')
  .then(function (persons) {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation. The `.children` property contains the Person's
    // children. Each child also has the `pets` and `children` relations eagerly
    // fetched.
    console.log(persons[0].pets[0].name);
    console.log(persons[1].children[2].pets[1].name);
    console.log(persons[1].children[2].children[0].name);
  });
```

Fetch one relation recursively:

```js
Person
  .query()
  .eager('[pets, children.^]')
  .then(function (persons) {
    // The children relation is from Person to Person. If we want to fetch the whole
    // descendant tree of a person we can just say "fetch this relation recursively"
    // using the `.^` notation.
    console.log(persons[0].children[0].children[0].children[0].children[0].firstName);
  });
```

The expressions can be arbitrarily deep. See the full description [here](http://vincit.github.io/objection.js/RelationExpression.html).

Because the eager expressions are strings they can be easily passed for example as a query parameter of an HTTP
request. However, using such expressions opens the whole database through the API. This is not very secure. Therefore
the [QueryBuilder](http://vincit.github.io/objection.js/QueryBuilder.html) has the `.allowEager` method.
allowEager can be used to limit the allowed eager expression to a certain subset. Like this:

```js
expressApp.get('/persons', function (req, res, next) {
  Person
    .query()
    .allowEager('[pets, children.pets]')
    .eager(req.query.eager)
    .then(function (persons) { res.send(persons); })
    .catch(next);
});
```

The example above allows `req.query.eager` to be one of:

 * `'pets'`
 * `'children'`
 * `'children.pets'`
 * `'[pets, children]'`
 * `'[pets, children.pets]'`.

Examples of failing eager expressions are:

 * `'movies'`
 * `'children.children'`
 * `'[pets, children.children]'`
 * `'notEvenAnExistingRelation'`.

In addition to the `.eager` method, relations can be fetched using the `loadRelated` and `$loadRelated` methods of
[Model](http://vincit.github.io/objection.js/Model.html).

# Transactions

Transactions are started by calling the [objection.transaction](http://vincit.github.io/objection.js/global.html#transaction)
function. Give all the models you want to use in the transaction as parameters to the `transaction` function. The model
classes are bound to a newly created transaction and passed to the callback function. Inside this callback, all queries
started through them take part in the same transaction.

The transaction is committed if the returned Promise is resolved successfully. If the returned Promise is rejected
the transaction is rolled back.

```js
objection.transaction(Person, Animal, function (Person, Animal) {

  return Person
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(function () {
      return Animal
        .query()
        .insert({name: 'Scrappy'});
    });

}).then(function (scrappy) {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(function (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

You only need to give the `transaction` function the model classes you use explicitly. All the related model classes
are implicitly bound to the same transaction.

```js
objection.transaction(Person, function (Person) {

  return Person
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(function (jennifer) {
      // This creates a query using the `Animal` model class but we
      // don't need to give `Animal` as one of the arguments to the
      // transaction function.
      return jennifer
        .$relatedQuery('pets')
        .insert({name: 'Scrappy'});
    });

}).then(function (scrappy) {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(function (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

The only way you can mess up with the transactions is if you _explicitly_ start a query using a model class that is not
bound to the transaction:

```js
var Person = require('./models/Person');
var Animal = require('./models/Animal');

objection.transaction(Person, function (Person) {

  return Person
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(function (jennifer) {
      // OH NO! This query is executed outside the transaction
      // since the `Animal` class is not bound to the transaction.
      return Animal
        .query()
        .insert({name: 'Scrappy'});
    });

});
```

# Documents

Objection.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as
objects or arrays in the model's `jsonSchema` are automatically converted to JSON strings in the database and
back to objects when read from the database. The database columns for the object properties can be normal
text columns. Postgresql has the `json` and `jsonb` data types that can be used instead for better performance
and possibility to [make queries](http://www.postgresql.org/docs/9.4/static/functions-json.html) to the documents.

The `address` property of the Person model is defined as an object in the [Person.jsonSchema](#models):

```js
Person
  .query()
  .insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    age: 24,
    address: {
      street: 'Somestreet 10',
      zipCode: '123456',
      city: 'Tampere'
    }
  })
  .then(function (jennifer) {
    console.log(jennifer.address.city); // --> Tampere
    return Person.query().where('id', jennifer.id);
  })
  .then(function (jenniferFromDb) {
    console.log(jenniferFromDb.address.city); // --> Tampere
  })
  .catch(function (err) {
    console.log('oh noes');
  });
```

# Validation

[JSON schema](http://json-schema.org/) validation can be enabled by setting the [jsonSchema](#models) property
of a model class. The validation is ran each time a `Model` instance is created. For example all these will trigger
the validation:

```js
Person.fromJson({firstName: 'jennifer', lastName: 'Lawrence'});
Person.query().insert({firstName: 'jennifer', lastName: 'Lawrence'});
Person.query().update({firstName: 'jennifer', lastName: 'Lawrence'}).where('id', 10);
// Patch operation ignores the `required` property of the schema and only validates the
// given properties. This allows a subset of model's properties to be updated.
Person.query().patch({age: 24}).where('age', '<', 24);
```

You rarely need to call [$validate](http://vincit.github.io/objection.js/Model.html#Svalidate) method explicitly, but you
can do it when needed. If validation fails a [ValidationError](http://vincit.github.io/objection.js/ValidationError.html)
will be thrown. Since we use Promises, this usually means that a promise will be rejected with an instance of
`ValidationError`.

```js
Person.query().insert({firstName: 'jennifer'}).catch(function (err) {
  console.log(err instanceof objection.ValidationError); // --> true
  console.log(err.data); // --> {lastName: 'required property missing'}
});
```

See [the recipe book](https://github.com/Vincit/objection.js/blob/master/RECIPES.md#custom-validation) for instructions
if you want to use some other validation library.

# Models

Models are created by inheriting from the [Model](http://vincit.github.io/objection.js/Model.html) base class.
In objection.js the inheritance is done as transparently as possible. There is no custom Class abstraction making you
wonder what the hell is happening. Just plain old ugly javascript inheritance.

## Minimal model

A working model with minimal amount of code:

```js
var Model = require('objection').Model;

function MinimalModel() {
  Model.apply(this, arguments);
}

// Inherit `Model`. This gives your model all those methods like `MinimalModel.query()`
// and `MinimalModel.fromJson()`.
Model.extend(MinimalModel);

// After the js class boilerplate, all you need to do is set the table name.
MinimalModel.tableName = 'SomeTableName';

module.exports = MinimalModel;
```

## A model with custom methods, json schema validation and relations

This is the model used in the examples:

```js
var Model = require('objection').Model;

function Person() {
  Model.apply(this, arguments);
}

Model.extend(Person);
module.exports = Person;

// You can add custom functionality to Models just as you would
// to any javascript class.
Person.prototype.fullName = function () {
  return this.firstName + ' ' + this.lastName;
};

// Table name is the only required property.
Person.tableName = 'Person';

// Optional JSON schema. This is not the database schema! Nothing is generated
// based on this. This is only used for validation. Whenever a model instance
// is created it is checked against this schema. http://json-schema.org/.
Person.jsonSchema = {
  type: 'object',
  required: ['firstName', 'lastName'],

  properties: {
    id: {type: 'integer'},
    parentId: {type: ['integer', 'null']},
    firstName: {type: 'string', minLength: 1, maxLength: 255},
    lastName: {type: 'string', minLength: 1, maxLength: 255},
    age: {type: 'number'},

    address: {
      type: 'object',
      properties: {
        street: {type: 'string'},
        city: {type: 'string'},
        zipCode: {type: 'string'}
      }
    }
  }
};

// This object defines the relations to other models.
Person.relationMappings = {
  pets: {
    relation: Model.OneToManyRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: __dirname + '/Animal',
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
    }
  },

  movies: {
    relation: Model.ManyToManyRelation,
    modelClass: __dirname + '/Movie',
    join: {
      from: 'Person.id',
      // ManyToMany relation needs the `through` object to describe the join table.
      through: {
        from: 'Person_Movie.personId',
        to: 'Person_Movie.movieId'
      },
      to: 'Movie.id'
    }
  },

  parent: {
    relation: Model.OneToOneRelation,
    modelClass: Person,
    join: {
      from: 'Person.parentId',
      to: 'Person.id'
    }
  },

  children: {
    relation: Model.OneToManyRelation,
    modelClass: Person,
    join: {
      from: 'Person.id',
      to: 'Person.parentId'
    }
  }
};
```

# Testing

To run the tests, all you need to do is configure the databases and run `npm test`. Check out
[this](https://github.com/Vincit/objection.js/blob/master/tests/integration/index.js) file for the
test database configurations. If you don't want to run the tests against all databases you can
just comment out configurations from the `testDatabaseConfigs` list.

# Changelog

## 0.2.0

### What's new

 * New name `objection.js`.
 * `$beforeInsert`, `$afterInsert`, `$beforeUpdate` and `$afterUpdate` hooks for `Model`.
 * Postgres jsonb query methods: `whereJsonEquals`, `whereJsonSupersetOf`, `whereJsonSubsetOf` and friends.
 * `whereRef` query method.
 * Expose `knex.raw()` through `Model.raw()`.
 * Expose `knex.client.formatter()` through `Model.formatter()`.
 * `QueryBuilder` can be used to make sub queries just like knex's `QueryBuilder`.
 * Possibility to use a custom `QueryBuilder` subclass by overriding `Model.QueryBuilder`.
 * Filter queries/objects for relations.
 * A pile of bug fixes.

### Breaking changes

 * Project was renamed to objection.js. Migrate simply by replacing `moron` with `objection`.

## 0.1.0

First release.
