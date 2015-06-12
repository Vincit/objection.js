# moron.js [![Build Status](https://travis-ci.org/Vincit/moron.js.svg?branch=master)](https://travis-ci.org/Vincit/moron.js) [![Coverage Status](https://coveralls.io/repos/Vincit/moron.js/badge.svg)](https://coveralls.io/r/Vincit/moron.js)
A Node.js ORM that doesn't get in your way.

Moron.js is an ORM built around the wonderful SQL query builder called [knex](http://knexjs.org). All databases
supported by knex are supported by moron.js. The list includes SQLite3, Postgres and MySQL.

What moron.js gives you:

 * An easy declarative way of defining models and relations between them.
 * Simple and fun way to fetch, insert, update, patch and delete models using SQL.
 * Powerful mechanism for loading arbitrarily big trees of relations.
 * JSON schema validation.

What moron.js doesn't give you:

 * A custom query DSL. All queries are generated using the knex's SQL query builder.
 * Automatic database schema creation. Moron.js leaves this to you. knex has a [great tool](http://knexjs.org/#Migrations) for this.

#Installation

```sh
npm install moron
```

#Getting started

Best way to get started is to download the example project [here](). Unzip the project and `cd` to the folder. Then
write the commands:

```sh
sh install.sh
node app.js
```

The example project is a simple express server. The `example-requests` file contains a bunch of example curl commands
for you to start playing with the REST API.

```sh
cat example-requests
```

Also our [API documentation](http://vincit.github.io/moron.js) contains a lot of examples.

#Examples

Fetch all Person models from the database:

```js
Person.query().then(function (persons) {
  console.log(persons[0] instanceof Person); // --> true
  console.log('there are', persons.length, 'in total');
}).catch(function (err) {
  console.log('oh noes');
});
```

Query with a where clause:

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

Fetch relations eagerly:

```js
Person
  .query()
  .eager('[pets, children.pets]')
  .then(function (persons) {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation. The `.children` property contains the Person's
    // children. Each children also has the `pets` relation eagerly fetched.
    console.log(persons[0].pets[0].name);
    console.log(persons[3].children[2].pets[8].name);
  });
```

Transaction:

```js
moron.transaction(Person, Animal, function (Person, Animal) {
  return Person
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(function () {
      return Animal.insert({name: 'Scrappy'});
    });
}).then(function (fluffy) {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(function (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

The [example project](#Getting started) contains more examples.

#Example model

Models are created by inheriting from the `MoronModel` base class. In moron.js the inheritance is done as transparently
as possible. There is no custom Class abstraction making you wonder what the hell is happening. Just plain old ugly
javascript inheritance :D.

```js
var MoronModel = require('moron').MoronModel;

function Person() {
  MoronModel.apply(this, arguments);
}

module.exports = MoronModel.extend(Person);

// Table name is the only required property.
Person.tableName = 'Person';

// This is not the database schema! Nothing is generated based on this. This a schema
// for the JSON objects from which Persons are created.
Person.jsonSchema = {
  type: 'object',
  required: ['firstName', 'lastName'],

  properties: {
    id: {type: 'integer'},
    parentId: {type: ['integer', 'null']},
    firstName: {type: 'string', minLength: 1, maxLength: 255},
    firstName: {type: 'string', minLength: 1, maxLength: 255},
    age: {type: 'number'}
  }
};

// This object defines the relations to other models. Person has two relations `pets`
// and `children`.
Person.relationMappings = {
  pets: {
    relation: MoronModel.OneToManyRelation,
    // The related model. This can be either a MoronModel subclass constructor or an
    // absolute file path to a module that exports one.
    modelClass: __dirname + '/Animal',
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
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

