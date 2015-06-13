# moron.js [![Build Status](https://travis-ci.org/Vincit/moron.js.svg?branch=master)](https://travis-ci.org/Vincit/moron.js) [![Coverage Status](https://coveralls.io/repos/Vincit/moron.js/badge.svg)](https://coveralls.io/r/Vincit/moron.js)
A Node.js ORM that doesn't get in your way.

Moron.js is an ORM built around the wonderful SQL query builder called [knex](http://knexjs.org). All databases
supported by knex are supported by moron.js. SQLite3, Postgres and MySQL are fully tested.

What moron.js gives you:

 * An easy declarative way of defining models and relations between them.
 * Simple and fun way to fetch, insert, update, patch and delete models using the full power of SQL.
 * [Powerful mechanism](http://vincit.github.io/moron.js/MoronRelationExpression.html) for loading arbitrarily big trees of relations.
 * [JSON schema](http://json-schema.org/) validation.
 * Fully [Promise](https://github.com/petkaantonov/bluebird) based API.
 * A way to [store documents](#documents) as single rows.

What moron.js doesn't give you:

 * A custom query DSL.

    Why create an inferior query language when we have SQL? All queries are generated using the knex's SQL query builder.

 * Automatic database schema creation/migration.

    Automatic schema creation is useful for the simple things, but usually just gets in your way when doing
    anything non-trivial. Moron.js leaves the schema and migration related things to you. knex has a great
    [migration API](http://knexjs.org/#Migrations).

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

The `express` example project is a simple express server. The `example-requests` file contains a bunch of curl
commands for you to start playing with the REST API.

```sh
cat example-requests
```

Also our [API documentation](http://vincit.github.io/moron.js) contains a lot of examples.

#Query examples

The Person model used in the examples is defined [here](#example-model).

All queries are started with one of the MoronModel methods [query()](http://vincit.github.io/moron.js/MoronModel.html#_P_query),
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
    console.log(jennifer.id);
    console.log(jennifer.firstName); // --> Jennifer
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
    console.log('there are', persons.length, 'in total');
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

Fetch relations eagerly:

```js
Person
  .query()
  .eager('[pets, children.pets]')
  .then(function (persons) {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation. The `.children` property contains the Person's
    // children. Each child also has the `pets` relation eagerly fetched.
    console.log(persons[0].pets[0].name);
    console.log(persons[3].children[2].pets[8].name);
  });
```

Transaction:

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

The `address` property of the Person model is defined as an object in the [Person.jsonSchema](#example-model).
MoronModel automatically converts the property to a JSON string when inserted to database and back to an object
when read from the database. The database column can be a normal text column. Postgresql has the json and jsonb
data types that should be used instead.

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

#Example model

Models are created by inheriting from the `MoronModel` base class. In moron.js the inheritance is done as transparently
as possible. There is no custom Class abstraction making you wonder what the hell is happening. Just plain old ugly
javascript inheritance :D.

```js
var MoronModel = require('moron').MoronModel;

/**
 * @Override MoronModel
 * @constructor
 */
function Person() {
  MoronModel.apply(this, arguments);
}

MoronModel.extend(Person);
module.exports = Person;

// Table name is the only required property.
Person.tableName = 'Person';

// This is not the database schema! Nothing is generated based on this. Whenever a
// Person object is created from a JSON object, the JSON is checked against this
// schema. For example when you call Person.fromJson({name: 'Matrix'});
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

