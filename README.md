# moron.js [![Build Status](https://travis-ci.org/Vincit/moron.js.svg?branch=master)](https://travis-ci.org/Vincit/moron.js) [![Coverage Status](https://coveralls.io/repos/Vincit/moron.js/badge.svg)](https://coveralls.io/r/Vincit/moron.js)
A Node.js ORM that doesn't get in your way

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

An example model:

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

