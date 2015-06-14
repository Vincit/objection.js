[![Build Status](https://travis-ci.org/Vincit/moron.js.svg?branch=master)](https://travis-ci.org/Vincit/moron.js) [![Coverage Status](https://coveralls.io/repos/Vincit/moron.js/badge.svg)](https://coveralls.io/r/Vincit/moron.js)

#Introduction

Moron.js is a Node.js ORM built around the wonderful SQL query builder [knex](http://knexjs.org). All databases
supported by knex are supported by moron.js. **SQLite3**, **Postgres** and **MySQL** are [fully tested](https://travis-ci.org/Vincit/moron.js).

What moron.js gives you:

 * An easy declarative way of [defining models](#models) and relations between them
 * Simple and fun way to [fetch, insert, update and delete](#query-examples) models using the full power of SQL
 * A way to [store complex documents](#documents) as single rows
 * Powerful mechanism for loading arbitrarily large [trees of relations](#eager-queries)
 * Completely [Promise](https://github.com/petkaantonov/bluebird) based API
 * Simple [transactions](#transactions)
 * [JSON schema](http://json-schema.org/) validation

What moron.js doesn't give you:

 * A custom query DSL. SQL is used everywhere
 * Automatic database schema creation and migration
    Automatic schema creation and migration is useful for the simple things, but usually just gets in your
    way when doing anything non-trivial. Moron.js leaves the schema and migration related things to you.
    knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job.

API documentation can be found [here](http://vincit.github.io/moron.js).

#Topics

- [Installation](#installation)
- [Getting started](#getting-started)
- [Query examples](#query-examples)
- [Eager queries](#eager-queries)
- [Transactions](#transactions)
- [Documents](#documents)
- [Models](#models)

#Installation

```sh
npm install moron
```

#Getting started

Best way to get started is to use one of the example projects:

```sh
git clone git@github.com:Vincit/moron.js.git
cd moron/examples/express
sh install.sh
npm start
```

The `express` example project is a simple express server. The `example-requests.sh` file contains a bunch of curl
commands for you to start playing with the REST API.

```sh
cat example-requests.sh
```

Also our [API documentation](http://vincit.github.io/moron.js) contains a lot of examples.

#Query examples

The Person model used in the examples is defined [here](#models).

All queries are started with one of the [MoronModel](http://vincit.github.io/moron.js/MoronModel.html) methods [query()](http://vincit.github.io/moron.js/MoronModel.html#_P_query),
[$query()](http://vincit.github.io/moron.js/MoronModel.html#Squery) or [$relatedQuery()](http://vincit.github.io/moron.js/MoronModel.html#SrelatedQuery).
All these methods return a [MoronQueryBuilder](http://vincit.github.io/moron.js/MoronQueryBuilder.html) instance that can be used just like
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

The `.query()` method has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has. Here
is a simple example that uses some of them:

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
can be used to query a single relation. `.$relatedQuery()` returns an instance of `MoronQueryBuilder` just like
the `.query()` method.

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

#Eager queries

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

The expressions can be arbitrarily deep. See the full description [here](http://vincit.github.io/moron.js/MoronRelationExpression.html).

Because the eager expressions are strings they can be easily passed for example as a query parameter of an HTTP
request. However using such expressions opens the whole database through the API. This is not very secure. Therefore
the [MoronQueryBuilder](http://vincit.github.io/moron.js/MoronQueryBuilder.html) has the `.allowEager` method.
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

In addition to the `.eager` method relations can be fetched using the `loadRelated` and `$loadRelated` methods of
[MoronModel](http://vincit.github.io/moron.js/MoronModel.html).

#Transactions

Transactions are started by calling the [moron.transaction](http://vincit.github.io/moron.js/global.html#transaction)
function. Give all the models you want to use in the transaction as parameters to the `transaction` function. The model
classes are bound to a newly created transaction and passed to the callback function. Inside this callback all queries
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

#Documents

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

#Models

Models are created by inheriting from the [MoronModel](http://vincit.github.io/moron.js/MoronModel.html) base class.
In moron.js the inheritance is done as transparently as possible. There is no custom Class abstraction making you
wonder what the hell is happening. Just plain old ugly javascript inheritance.

```js
var MoronModel = require('moron').MoronModel;

/**
 * @override MoronModel
 * @constructor
 */
function Person() {
  MoronModel.apply(this, arguments);
}

MoronModel.extend(Person);
module.exports = Person;

// You can add custom functionality to MoronModels just as you would
// to any javascript class.
Person.prototype.fullName = function () {
  return this.firstName + ' ' + this.lastName;
};

// Table name is the only required property.
Person.tableName = 'Person';

// This is not the database schema! Nothing is generated based on this. Whenever a
// Person object is created from a JSON object, the JSON is checked against this
// schema. For example when you call Person.fromJson({firstName: 'Jennifer'});
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
    relation: MoronModel.OneToManyRelation,
    // The related model. This can be either a MoronModel subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: __dirname + '/Animal',
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
    }
  },

  movies: {
    relation: MoronModel.ManyToManyRelation,
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
    relation: MoronModel.OneToManyRelation,
    modelClass: Person,
    join: {
      from: 'Person.id',
      to: 'Person.parentId'
    }
  }
};
```

