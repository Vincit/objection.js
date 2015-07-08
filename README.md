[![Build Status](https://travis-ci.org/Vincit/moron.js.svg?branch=master)](https://travis-ci.org/Vincit/moron.js) [![Coverage Status](https://coveralls.io/repos/Vincit/moron.js/badge.svg)](https://coveralls.io/r/Vincit/moron.js)

# Introduction

Moron.js is a Node.js ORM built around the wonderful SQL query builder [knex](http://knexjs.org). All databases
supported by knex are supported by moron.js. **SQLite3**, **Postgres** and **MySQL** are [fully tested](https://travis-ci.org/Vincit/moron.js).

I wrote an [introductory blog post](http://www.vincit.fi/en/blog/introducing-moron-js-a-new-orm-for-node-js/)
explaining what moron.js does better than other Node.js ORMs.

What moron.js gives you:

 * An easy declarative way of [defining models](#models) and relations between them
 * Simple and fun way to [fetch, insert, update and delete](#query-examples) models using the full power of SQL
 * Powerful mechanism for loading arbitrarily large [trees of relations](#eager-queries)
 * A way to [store complex documents](#documents) as single rows
 * Completely [Promise](https://github.com/petkaantonov/bluebird) based API
 * Simple [transactions](#transactions)
 * [JSON schema](#validation) validation

What moron.js doesn't give you:

 * A custom query DSL. SQL is used everywhere
 * Automatic database schema creation and migration.
    It is useful for the simple things, but usually just gets in your way when doing anything non-trivial.
    Moron.js leaves the schema related things to you. knex has a great [migration tool](http://knexjs.org/#Migrations)
    that we recommend for this job.

Moron.js uses Promises and coding practices that make it ready for future. You can already use things like ES7 [async/await](http://jakearchibald.com/2014/es7-async-functions/)
and ES6 classes using a transpiler such as [Babel](https://babeljs.io/). Check out our [ES7 example project](https://github.com/Vincit/moron.js/tree/master/examples/express-es7).

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
- [API Documentation](http://vincit.github.io/moron.js/Model.html)
- [Recipe book](RECIPES.md)

# Installation

```sh
npm install moron
```

# Getting started

Best way to get started is to use one of the example projects:

```sh
git clone git@github.com:Vincit/moron.js.git moron
cd moron/examples/express
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
git clone git@github.com:Vincit/moron.js.git moron
cd moron/examples/express-es7
npm install
# We use knex for migrations in this example.
npm install knex -g
knex migrate:latest
# This runs the Babel transpiler and executes the app.
npm start
```

Also check out our [API documentation](http://vincit.github.io/moron.js/Model.html) and [recipe book](RECIPES.md).

# Query examples

The Person model used in the examples is defined [here](#models).

All queries are started with one of the [Model](http://vincit.github.io/moron.js/Model.html) methods [query()](http://vincit.github.io/moron.js/Model.html#_P_query),
[$query()](http://vincit.github.io/moron.js/Model.html#Squery) or [$relatedQuery()](http://vincit.github.io/moron.js/Model.html#SrelatedQuery).
All these methods return a [QueryBuilder](http://vincit.github.io/moron.js/QueryBuilder.html) instance that can be used just like
a [knex QueryBuilder](http://knexjs.org/#Builder).

Insert a Person model to the database:

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

Fetch all Persons from the database:

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

The return value of the `.query()` method is an instance of [QueryBuilder](http://vincit.github.io/moron.js/QueryBuilder.html)
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

Update models:

```js
Person
  .query()
  .patch({lastName: 'Dinosaur'});
  .where('age', '>', 60)
  .then(function (patch) {
    console.log('all persons over 60 years old are now dinosaurs');
    console.log(patch.lastName); // --> Dinosaur.
  })
  .catch(function (err) {
    console.log(err.stack);
  });
```

While the static `.query()` method can be used to create a query to a whole table `.$relatedQuery()` method
can be used to query a single relation. `.$relatedQuery()` returns an instance of [QueryBuilder](http://vincit.github.io/moron.js/QueryBuilder.html)
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

Insert a related model:

```js
Person
  .query()
  .where('id', 100)
  .first()
  .then(function (person) {
    return person.$relatedQuery('pets').insert({name: 'Fluffy'});
  })
  .then(function (fluffy) {
    console.log(fully.id);
  })
  .catch(function (err) {
    console.log('something went wrong with finding the person OR inserting the pet');
    console.log(err.stack);
  });
```

# Eager queries

Okay I said there is no custom DSL but actually we have teeny-tiny one for fetching relations eagerly. The following
examples demonstrate how to use it:

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

The expressions can be arbitrarily deep. See the full description [here](http://vincit.github.io/moron.js/RelationExpression.html).

Because the eager expressions are strings they can be easily passed for example as a query parameter of an HTTP
request. However, using such expressions opens the whole database through the API. This is not very secure. Therefore
the [QueryBuilder](http://vincit.github.io/moron.js/QueryBuilder.html) has the `.allowEager` method.
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

The example above allows `req.query.eager` to be one of `'pets'`, `'children'`, `'children.pets'`, `'[pets, children]'` and
`'[pets, children.pets]'`. Examples of failing eager expressions are `'movies'`, `'children.children'` and `'notEvenAnExistingRelation'`.

In addition to the `.eager` method, relations can be fetched using the `loadRelated` and `$loadRelated` methods of
[Model](http://vincit.github.io/moron.js/Model.html).

# Transactions

Transactions are started by calling the [moron.transaction](http://vincit.github.io/moron.js/global.html#transaction)
function. Give all the models you want to use in the transaction as parameters to the `transaction` function. The model
classes are bound to a newly created transaction and passed to the callback function. Inside this callback, all queries
started through them take part in the same transaction.

The transaction is committed if the returned Promise is resolved successfully. If the returned Promise is rejected
the transaction is rolled back.

```js
moron.transaction(Person, Animal, function (Person, Animal) {

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
moron.transaction(Person, function (Person) {

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

moron.transaction(Person, function (Person) {

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

Moron.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as
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

You rarely need to call [$validate](http://vincit.github.io/moron.js/Model.html#Svalidate) method explicitly, but you
can do it when needed. If validation fails a [ValidationError](http://vincit.github.io/moron.js/ValidationError.html)
will be thrown. Since we use Promises, this usually means that a promise will be rejected with an instance of
`ValidationError`.

```js
Person.query().insert({firstName: 'jennifer'}).catch(function (err) {
  console.log(err instanceof moron.ValidationError); // --> true
  console.log(err.data); // --> {lastName: 'required property missing'}
});
```

See [the recipe book](https://github.com/Vincit/moron.js/blob/master/RECIPES.md#custom-validation) for instructions
if you want to use some other validation library.

# Models

Models are created by inheriting from the [Model](http://vincit.github.io/moron.js/Model.html) base class.
In moron.js the inheritance is done as transparently as possible. There is no custom Class abstraction making you
wonder what the hell is happening. Just plain old ugly javascript inheritance.

```js
var Model = require('moron').Model;

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
[this](https://github.com/Vincit/moron.js/blob/master/tests/integration/index.js) file for the
test database configurations. If you don't want to run the tests against all databases you can
just comment out configurations from the `testDatabaseConfigs` list.

