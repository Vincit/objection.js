---
title: Objection.js

toc_footers:
  - <a href='https://github.com/Vincit/objection.js/'>Github repository</a>

includes:
  - RECIPES
  - API
  - CHANGELOG

search: true
---

<a href="https://github.com/Vincit/objection.js"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>

# Introduction

[![Build Status](https://travis-ci.org/Vincit/objection.js.svg?branch=master)](https://travis-ci.org/Vincit/objection.js) [![Coverage Status](https://coveralls.io/repos/Vincit/objection.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/Vincit/objection.js?branch=master) [![Join the chat at https://gitter.im/Vincit/objection.js](https://badges.gitter.im/Vincit/objection.js.svg)](https://gitter.im/Vincit/objection.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Objection.js is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for [Node.js](https://nodejs.org/)
that aims to stay out of your way and make it as easy as possible to use the full power of SQL and the underlying
database engine while keeping magic to a minimum.

Objection.js is built on an SQL query builder called [knex](http://knexjs.org). All databases supported by knex
are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * **An easy declarative way of [defining models](#models) and relationships between them**
 * **Simple and fun way to [fetch, insert, update and delete](#query-examples) objects using the full power of SQL**
 * **Powerful mechanisms for [eager loading](#eager-loading) and [inserting object graphs](#graph-inserts)**
 * **A way to [store complex documents](#documents) as single rows**
 * **Completely [Promise](https://github.com/petkaantonov/bluebird) based API**
 * **Easy to use [transactions](#transactions)**
 * **Optional [JSON schema](#validation) validation**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
 * **Automatic database schema creation and migration.**
    For simple things it is useful that the database schema is automatically generated from the model definitions,
    but usually just gets in your way when doing anything non-trivial. Objection.js leaves the schema related things
    to you. knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job. Check
    out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6).

Objection.js uses Promises and coding practices that make it ready for the future. We use Well known
[OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) techniques and ES2015 compatible classes and inheritance
in the codebase. You can use things like [async/await](http://jakearchibald.com/2014/es7-async-functions/)
using a transpiler such as [Babel](https://babeljs.io/). Check out our [ES2015](https://github.com/Vincit/objection.js/tree/master/examples/express-es6)
and [ESNext](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) example projects.

Blog posts and tutorials:

 * [Introduction](https://www.vincit.fi/en/blog/introducing-moron-js-a-new-orm-for-node-js/) (objection.js was originally called moron.js)
 * [Eager loading](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/)
 * [Postgres JSON queries](https://www.vincit.fi/en/blog/by-the-power-of-json-queries/)

# Installation

```shell
npm install knex objection
```

> You also need to install one of the following depending on the database you want to use:

```shell
npm install pg
npm install sqlite3
npm install mysql
npm install mysql2
npm install mariasql
```

> You can use the `next` tag to install an alpha/beta/RC version:

```shell
npm install objection@next
```

Objection.js can be installed using `npm`.

# Getting started

> Install example project:

```shell
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express-es6
npm install
# We use knex for migrations in this example.
npm install knex -g
knex migrate:latest
npm start
```

> If installing the example project seems like too much work, here is a simple standalone example. Just copy this into a file and run it:

```js
// run the following command to install:
// npm install objection knex sqlite3

const objection = require('objection');
const Model = objection.Model;
const Knex = require('knex');

// Initialize knex connection.
const knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: 'example.db'
  }
});

// Give the connection to objection.
Model.knex(knex);

// Create database schema. You should use knex migration files to do this. We
// create it here for simplicity.
const schemaPromise = knex.schema.createTableIfNotExists('Person', table => {
  table.increments('id').primary();
  table.string('firstName');
});

// Person model.
class Person extends Model {
  static get tableName() {
    return 'Person';
  }
}

schemaPromise.then(() => {

  // Create a person.
  return Person.query().insert({firstName: 'Sylvester'});

}).then(person => {

  console.log('created:', person.firstName, 'id:', person.id);
  // Fetch all people named Sylvester.
  return Person.query().where('firstName', 'Sylvester');

}).then(sylvesters => {

  console.log('sylvesters:', sylvesters);

});
```

To use objection.js all you need to do is [initialize knex](http://knexjs.org/#Installation-node) and give the
connection to objection.js using [`Model.knex(knex)`](#knex). Doing this installs the knex connection globally for all models.
If you need to use multiple databases check out our [multi-tenancy recipe](#multi-tenancy).

The next step is to create some migrations and models and start using objection.js. The best way to get started is to
check out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6). The `express`
example project is a simple express server. The `example-requests.sh` file contains a bunch of curl commands for you to
start playing with the REST API.

We also have an [ESNext version of the example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es7)
that uses [Babel](https://babeljs.io/) for ESNext --> ES5 transpiling and a [typescript version](https://github.com/Vincit/objection.js/tree/master/examples/express-ts).

Also check out our [API reference](#api-reference) and [recipe book](#recipe-book).

Blog posts and tutorials:

 * [Introduction](https://www.vincit.fi/en/blog/introducing-moron-js-a-new-orm-for-node-js/) (objection.js was originally called moron.js)
 * [Eager loading](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/)
 * [Postgres JSON queries](https://www.vincit.fi/en/blog/by-the-power-of-json-queries/)

# Models

> A working model with minimal amount of code:

```js
const Model = require('objection').Model;

class MinimalModel extends Model {
  static get tableName() {
    return 'SomeTableName';
  }
}

module.exports = MinimalModel;
```

> ESNext:

```js
import { Model } from 'objection';

export default class MinimalModel extends Model {
  static tableName = 'SomeTableName';
}
```

> Model with custom methods, json schema validation and relations. This model is used in the examples:

```js
class Person extends Model {

  // Table name is the only required property.
  static get tableName() {
    return 'Person';
  }

  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for validation. Whenever a model instance is created
  // it is checked against this schema.
  // http://json-schema.org/.
  static get jsonSchema () {
    return {
      type: 'object',
      required: ['firstName', 'lastName'],

      properties: {
        id: {type: 'integer'},
        parentId: {type: ['integer', 'null']},
        firstName: {type: 'string', minLength: 1, maxLength: 255},
        lastName: {type: 'string', minLength: 1, maxLength: 255},
        age: {type: 'number'},

        // Properties defined as objects or arrays are
        // automatically converted to JSON strings when
        // writing to database and back to objects and arrays
        // when reading from database. To override this
        // behaviour, you can override the
        // Person.jsonAttributes property.
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
  }

  // This object defines the relations to other models.
  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model
        // subclass constructor or an absolute file path
        // to a module that exports one. We use the file
        // path version here to prevent require loops.
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
          // ManyToMany relation needs the `through` object
          // to describe the join table.
          through: {
            // If you have a model class for the join table
            // you need to specify it like this:
            // modelClass: PersonMovie,
            from: 'Person_Movie.personId',
            to: 'Person_Movie.movieId'
          },
          to: 'Movie.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'Person.id',
          to: 'Person.parentId'
        }
      },

      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Person.parentId',
          to: 'Person.id'
        }
      }
    };
  }
}
```

> ESNext:

```js
class Person extends Model {
  // Table name is the only required property.
  static tableName = 'Person';

  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for validation. Whenever a model instance is created
  // it is checked against this schema.
  // http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['firstName', 'lastName'],

    properties: {
      id: {type: 'integer'},
      parentId: {type: ['integer', 'null']},
      firstName: {type: 'string', minLength: 1, maxLength: 255},
      lastName: {type: 'string', minLength: 1, maxLength: 255},
      age: {type: 'number'},

      // Properties defined as objects or arrays are
      // automatically converted to JSON strings when
      // writing to database and back to objects and arrays
      // when reading from database. To override this
      // behaviour, you can override the
      // Person.jsonAttributes property.
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
  static relationMappings = {
    pets: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model
      // subclass constructor or an absolute file path
      // to a module that exports one. We use the file
      // path version here to prevent require loops.
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
        // ManyToMany relation needs the `through` object
        // to describe the join table.
        through: {
          // If you have a model class for the join table
          // you need to specify it like this:
          // modelClass: PersonMovie,
          from: 'Person_Movie.personId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    },

    children: {
      relation: Model.HasManyRelation,
      modelClass: Person,
      join: {
        from: 'Person.id',
        to: 'Person.parentId'
      }
    },

    parent: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'Person.parentId',
        to: 'Person.id'
      }
    }
  };
}
```

Models are created by inheriting from the [`Model`](#model) base class.

# Relations

> `BelongsToOneRelation`: Use this relation when the source model has the foreign key

```js
class Animal extends Model {
  static relationMappings = {
    owner: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'animal.ownerId',
        to: 'person.id'
      }
    }
  }
}
```

> `HasManyRelation`: Use this relation when the related model has the foreign key

```js
class Person extends Model {
  static relationMappings = {
    animals: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'person.id',
        to: 'animal.ownerId'
      }
    }
  }
}
```

> `HasOneRelation`: Just like `HasManyRelation` but for one related row

```js
class Person extends Model {
  static relationMappings = {
    animals: {
      relation: Model.HasOneRelation,
      modelClass: Animal,
      join: {
        from: 'person.id',
        to: 'animal.ownerId'
      }
    }
  }
}
```

> `ManyToManyRelation`: Use this relation when the model is related to a list of other models through a join table

```js
class Person extends Model {
  static relationMappings = {
    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'Person.id',
        through: {
          // Person_Movie is the join table.
          from: 'Person_Movie.personId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    }
  }
}
```

> `HasOneThroughRelation`: Use this relation when the model is related to a single model through a join table

```js
class Person extends Model {
  static relationMappings = {
    movie: {
      relation: Model.HasOneThroughRelation,
      modelClass: Movie,
      join: {
        from: 'Person.id',
        through: {
          // Person_Movie is the join table.
          from: 'Person_Movie.personId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    }
  }
}
```

We already went through how to create relations in the [models](#models) section but here's a list of all the
available relation types in a nicely searchable place. See the [this](#relationmapping) API doc section for full
documentation of the relation mapping parameters.

Vocabulary for the relation descriptions:

 * source model: The model for which you are writing the `relationMapping` for.
 * related model: The model at the other end of the relation.

# Query examples

The `Person` model used in the examples is defined [here](#models).

All queries are started with one of the [`Model`](#model) methods [`query`](#query), [`$query`](#_s_query) or [`$relatedQuery`](#_s_relatedquery).
All these methods return a [`QueryBuilder`](#querybuilder) instance that can be used just like a [knex QueryBuilder](http://knexjs.org/#Builder).

## Table queries

Each model class inherits the static [`query`](#query) method from the [`Model`](#model) base class. Use [`query`](#query) to create queries
to the table the model class represents. The return value of the [`query`](#query) method is an instance of [`QueryBuilder`](#querybuilder)
that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has and more.

### Fetch queries

> Fetch all people from the database:

```js
Person
  .query()
  .then(people => {
    console.log(people[0] instanceof Person); // --> true
    console.log('there are', people.length, 'People in total');
  })
  .catch(err => {
    console.log('oh noes');
  });
```

```sql
select * from "Person"
```

> The return value of the [`query`](#query) method is an instance of [`QueryBuilder`](#querybuilder)
> that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has. Here is a simple example
> that uses some of them:

```js
Person
  .query()
  .where('age', '>', 40)
  .andWhere('age', '<', 60)
  .andWhere('firstName', 'Jennifer')
  .orderBy('lastName')
  .then(middleAgedJennifers => {
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

> In addition to knex methods, the [`QueryBuilder`](#querybuilder) has a lot of helpers for dealing with
> relations like the [`joinRelation`](#joinrelation) method:

```js
Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent')
  .then(people => {
    console.log(people[0].grandParentName)
  });
```

```sql
select "parent:parent"."firstName" as "grandParentName"
from "Person"
inner join "Person" as "parent" on "parent"."id" = "Person"."parentId"
inner join "Person" as "parent:parent" on "parent:parent"."id" = "parent"."parentId"
```

> The next example shows how easy it is to build complex queries:

```js
Person
  .query()
  .select('Person.*', 'Parent.firstName as parentFirstName')
  .join('Person as Parent', 'Person.parentId', 'Parent.id')
  .where('Person.age', '<', Person.query().avg('Person.age'))
  .whereExists(Animal.query().select(1).whereRef('Person.id', 'Animal.ownerId'))
  .orderBy('Person.lastName')
  .then(people => {
    console.log(people[0].parentFirstName);
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

Fetch queries can be created simply by calling [`Model.query()`](#query) and chaining query builder methods for the returned
[`QueryBuilder`](#querybuilder) instance. The query is executed by calling the [`then`](#then) method, which converts the query
into a [`Promise`](http://bluebirdjs.com/docs/getting-started.html).

### Insert queries

```js
Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
  .then(jennifer => {
    console.log(jennifer instanceof Person); // --> true
    console.log(jennifer.firstName); // --> 'Jennifer'
    console.log(jennifer.fullName()); // --> 'Jennifer Lawrence'
  })
  .catch(err => {
    console.log('oh noes');
  });
```

```sql
insert into "Person" ("firstName", "lastName") values ('Jennifer', 'Lawrence')
```

Insert queries are created by chaining the [`insert`](#insert) method to the query. See the [`insertGraph`](#insertgraph) method
for inserting object graphs.

### Update queries

```js
Person
  .query()
  .patch({lastName: 'Dinosaur'})
  .where('age', '>', 60)
  .then(numUpdated => {
    console.log('all people over 60 years old are now dinosaurs');
    console.log(numUpdated, 'people were updated');
  })
  .catch(err => {
    console.log(err.stack);
  });
```

```sql
update "Person" set "lastName" = 'Dinosaur' where "age" > 60
```

```js
Person
  .query()
  .patchAndFetchById(246, {lastName: 'Updated'})
  .then(updated => {
    console.log(updated.lastName); // --> Updated.
  })
  .catch(err => {
    console.log(err.stack);
  });
```

```sql
update "Person" set "lastName" = 'Updated' where "id" = 246
select * from "Person" where "id" = 246
```

Update queries are created by chaining the [`update`](#update) or [`patch`](#patch) method to the query. The [`patch`](#patch) and [`update`](#update)
methods return the number of updated rows. If you want the freshly updated model as a result you can use the helper
method [`patchAndFetchById`](#patchandfetchbyid) and [`updateAndFetchById`](#updateandfetchbyid). On postgresql you can
simply chain `.returning('*')` or take a look at [this recipe](#postgresql-quot-returning-quot-tricks) for more ideas.

### Delete queries

```js
Person
  .query()
  .delete()
  .where(Person.raw('lower("firstName")'), 'like', '%ennif%')
  .then(numDeleted => {
    console.log(numDeleted, 'people were deleted');
  })
  .catch(err => {
    console.log(err.stack);
  });
```

```sql
delete from "Person" where lower("firstName") like '%ennif%'
```

Delete queries are created by chaining the [`delete`](#delete) method to the query.  
NOTE: The return value of the query will be the number of deleted rows. *If you're using Postgres take a look at [this recipe](#postgresql-quot-returning-quot-tricks) if you'd like the deleted rows to be returned as Model instances*.

## Relation queries

While the static [`query`](#query) method can be used to create a query to a whole table [`$relatedQuery`](#_s_relatedquery)
method can be used to query a single relation. [`$relatedQuery`](#_s_relatedquery) returns an instance of [`QueryBuilder`](#querybuilder)
just like the [`query`](#query) method.

### Fetch queries

```js
// `person` is an instance of `Person` model.
person
  .$relatedQuery('pets')
  .where('species', 'dog')
  .orderBy('name')
  .then(pets => {
    console.log(person.pets === pets); // --> true
    console.log(pets[0] instanceof Animal); // --> true
  });
```

```sql
select * from "Animal"
where "species" = 'dog'
and "Animal"."ownerId" = 1
order by "name" asc
```

Simply call [`$relatedQuery('pets')`](#_s_relatedquery) for a model _instance_ to fetch a relation for it. The relation name is
given as the only argument. The return value is a [`QueryBuilder`](#querybuilder) so you once again have all the query methods
at your disposal. In many cases it's more convenient to use [`eager loading`](#eager-loading) to fetch relations.

### Insert queries

> Add a pet for a person:

```js
// `person` is an instance of `Person` model.
person
  .$relatedQuery('pets')
  .insert({name: 'Fluffy'})
  .then(fluffy => {
    console.log(person.pets.indexOf(fluffy) !== -1); // --> true
  });
```

```sql
insert into "Animal" ("name", "ownerId") values ('Fluffy', 1)
```

> If you want to write columns to the join table of a many-to-many relation you first need to specify the columns in
> the `extra` array of the `through` object in [`relationMappings`](#relationmappings) (see the examples behind the link).
> For example, if you specified an array `extra: ['awesomeness']` in `relationMappings` then `awesomeness` is written to
> the join table in the following example:

```js
// `person` is an instance of `Person` model.
person
  .$relatedQuery('movies')
  .insert({name: 'The room', awesomeness: 9001})
  .then(movie => {
    console.log('best movie ever was added');
  });
```

```sql
insert into "Movie" ("name") values ('The room')
insert into "Person_Movie" ("movieId", "personId", "awesomeness") values (14, 25, 9001)
```

Chain the [`insert`](#insert) method to the [`$relatedQuery('pets')`](#_s_relatedquery) call to insert a related object for a model
_instance_. The query inserts the new object to the related table and updates the needed tables to create the relation.
In case of many-to-many relation a row is inserted to the join table etc.


### Update queries

See the [API documentation](#update) of `update` method.

### Delete queries

See the [API documentation](#delete) of `delete` method.

### Relate queries

See the [API documentation](#relate) of `relate` method.

### Unrelate queries

See the [API documentation](#unrelate) of `unrelate` method.

# Eager queries

## Eager loading

> Fetch the `pets` relation for all results of a query:

```js
Person
  .query()
  .eager('pets')
  .then(people => {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation.
    console.log(people[0].pets[0].name);
    console.log(people[0].pets[0] instanceof Animal); // --> true
  });
```

> Fetch multiple relations on multiple levels:

```js
Person
  .query()
  .eager('[pets, children.[pets, children]]')
  .then(people => {
    // Each person has the `.pets` property populated with Animal objects related
    // through `pets` relation. The `.children` property contains the Person's
    // children. Each child also has the `pets` and `children` relations eagerly
    // fetched.
    console.log(people[0].pets[0].name);
    console.log(people[1].children[2].pets[1].name);
    console.log(people[1].children[2].children[0].name);
  });
```

> Fetch one relation recursively:

```js
Person
  .query()
  .eager('[pets, children.^]')
  .then(people => {
    // The children relation is from Person to Person. If we want to fetch the whole
    // descendant tree of a person we can just say "fetch this relation recursively"
    // using the `.^` notation.
    console.log(people[0].children[0].children[0].children[0].children[0].firstName);
  });
```

> Limit recursion to 3 levels:

```js
Person
  .query()
  .eager('[pets, children.^3]')
  .then(people => {
    console.log(people[0].children[0].children[0].children[0].firstName);
  });
```

> Relations can be filtered using the [`modifyEager`](#modifyeager) method:

```js
Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    // Only select pets older than 10 years old for children.
    builder.where('age', '>', 10);
  })
```

> Relations can also be filtered using named filters like this:

```js
Person
  .query()
  .eager('[pets(orderByName, onlyDogs), children(orderByAge).[pets, children]]', {
    orderByName: (builder) => {
      builder.orderBy('name');
    },
    orderByAge: (builder) => {
      builder.orderBy('age');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  })
  .then(people => {
    console.log(people[0].children[0].pets[0].name);
    console.log(people[0].children[0].movies[0].id);
  });
```

> Reusable named filters can be defined for models using [`namedFilters`](#namedfilters)

```js
// Person.js

class Person extends Model {
  static get namedFilters() {
    return {
      orderByAge: (builder) => {
        builder.orderBy('age');
      }
    };
  }
}

// Animal.js

class Animal extends Model {
  static get namedFilters() {
    return {
      orderByName: (builder) => {
        builder.orderBy('name');
      },
      onlyDogs: (builder) => {
        builder.where('species', 'dog');
      }
    };
  }
}

// somewhereElse.js

Person
  .query()
  .eager('children(orderByAge).[pets(onlyDogs, orderByName), movies]')
  .then(people => {
    console.log(people[0].children[0].pets[0].name);
    console.log(people[0].children[0].movies[0].id);
  });
```

> Relations can be aliased using `as` keyword:

```js
Person
  .query()
  .eager(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`)
  .then(people => {
    console.log(people[0].kids[0].dogs[0].name);
    console.log(people[0].kids[0].movies[0].id);
  });
```

> Example usage for [`allowEager`](#alloweager) in an express route:

```js
expressApp.get('/people', (req, res, next) => {
  Person
    .query()
    .allowEager('[pets, children.pets]')
    .eager(req.query.eager)
    .then(people => res.send(people))
    .catch(next);
});
```

> Eager loading algorithm can be changed using the [`eagerAlgorithm`](#eageralgorithm) method:

```js
Person
  .query()
  .eagerAlgorithm(Model.JoinEagerAlgorithm)
  .eager('[pets, children.pets]');
```

You can fetch an arbitrary graph of relations for the results of any query by chaining the [`eager`](#eager) method.
[`eager`](#eager) takes a [relation expression](#relationexpression) string as a parameter. In addition to making your
life easier, eager queries avoid the "select N+1" problem and provide a great performance.

Because the eager expressions are strings they can be easily passed for example as a query parameter of an HTTP
request. However, allowing the client to pass expressions like this without any limitations is not very secure.
Therefore the [`QueryBuilder`](#querybuilder) has the [`allowEager`](#alloweager) method. [`allowEager`](#alloweager)
can be used to  limit the allowed eager expression to a certain subset.

By giving expression `[pets, children.pets]` for [`allowEager`](#alloweager) the value passed to [`eager`](#eager) is allowed
to be one of:

 * `'pets'`
 * `'children'`
 * `'children.pets'`
 * `'[pets, children]'`
 * `'[pets, children.pets]'`

Examples of expressions that would cause the query to be rejected:

 * `'movies'`
 * `'children.children'`
 * `'[pets, children.children]'`
 * `'notEvenAnExistingRelation'`

In addition to the [`eager`](#eager) method, relations can be fetched using the [`loadRelated`](#loadrelated) and
[`$loadRelated`](#_s_loadrelated) methods.

By default eager loading is done using multiple separate queries (for details see [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/)).
You can choose to use a join based eager loading algorithm that only performs one single query to fetch thw whole
eager tree. You can select which algorithm to use per query using [`eagerAlgorithm`](#eageralgorithm) method or
per model by setting the [`defaultEagerAlgorithm`](#defaulteageralgorithm) property. All algorithms
have their strengths and weaknesses, which are discussed in detail [here](#eager).

## Graph inserts

```js
Person
  .query()
  .insertGraph({
    firstName: 'Sylvester',
    lastName: 'Stallone',

    children: [{
      firstName: 'Sage',
      lastName: 'Stallone',

      pets: [{
        name: 'Fluffy',
        species: 'dog'
      }]
    }]
  });
```

> The query above will insert 'Sylvester', 'Sage' and 'Fluffy' into db and create relationships between them as defined
> in the [`relationMappings`](#relationmappings) of the models. Technically [`insertGraph`](#insertgraph)
> builds a dependency graph from the object graph and inserts the models that don't depend on any other models until
> the whole graph is inserted.

> If you need to refer to the same model in multiple places you can use the special properties `#id` and `#ref` like this:

```js
Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#id": 'silverLiningsPlaybook'
      name: 'Silver Linings Playbook',
      duration: 122
    }]
  }, {
    firstName: 'Bradley',
    lastName: 'Cooper',

    movies: [{
      "#ref": 'silverLiningsPlaybook'
    }]
  }]);
```

> The query above will insert only one movie (the 'Silver Linings Playbook') but both 'Jennifer' and 'Bradley' will have
> the movie related to them through the many-to-many relation `movies`. The `#id` can be any string. There are no format
> or length requirements for them. It is quite easy to create circular dependencies using `#id` and `#ref`. Luckily
> [`insertGraph`](#insertgraph) detects them and rejects the query with a clear error message.

> You can refer to the properties of other models anywhere in the graph using expressions of format `#ref{<id>.<property>}`
> as long as the reference doesn't create a circular dependency. For example:

```js
Person
  .query()
  .insertGraph([{
    "#id": 'jenniLaw',
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    pets: [{
      name: "I am the dog of #ref{jenniLaw.firstName} whose id is #ref{jenniLaw.id}",
      species: 'dog'
    }]
  }]);
```

> The query above will insert a pet named `I am the dog of Jennifer whose id is 523` for Jennifer. If `#ref{}` is used
> within a string, the references are replaced with the referred values inside the string. If the reference string
> contains nothing but the reference, the referred value is copied to it's place preserving its type.

Arbitrary relation graphs can be inserted using the [`insertGraph`](#insertgraph) method. This is best explained using
examples, so check them out ➔.

See the [`allowInsert`](#allowinsert) method if you need to limit  which relations can be inserted using
[`insertGraph`](#insertgraph) method to avoid security issues. [`allowInsert`](#allowinsert)
works like [`allowEager`](#allowinsert).

If you are using Postgres the inserts are done in batches for maximum performance. On other databases the rows need to
be inserted one at a time. This is because postgresql is the only database engine that returns the identifiers of all
inserted rows and not just the first or the last one.

You can read more about graph inserts from [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

# Transactions

There are two ways to work with transactions in objection:

1. [Passing around a transaction object](#passing-around-a-transaction-object)
2. [Binding models to a transaction](#binding-models-to-a-transaction)

## Passing around a transaction object

```js
const knex = Person.knex();

objection.transaction(knex, trx => {
  return Person
    .query(trx)
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(jennifer => {
      return jennifer
        .$relatedQuery('pets', trx)
        .insert({name: 'Scrappy'});
    });
}).then(scrappy => {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(err => {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

> ESNext

```js
const knex = Person.knex();

try {
  const scrappy = await objection.transaction(knex, async (trx) => {
    const jennifer = await Person
      .query(trx)
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'})

    return jennifer
      .$relatedQuery('pets', trx)
      .insert({name: 'Scrappy'});
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}

console.log('Jennifer and Scrappy were successfully inserted');
```

> Note that you can pass either a normal knex instance or a transaction to `query`, `$relatedQuery` etc.
> allowing you to build helper functions and services that can be used with or without a transaction.
> When a transation is not wanted, just pass in the normal knex instance:

```js
// `db` can be either a transaction or a knex instance or even
// `null` or `undefined` if you have globally set the knex 
// instance using `Model.knex(knex)`.
function insertPersonAndPet(person, pet, db) {
  return Person
    .query(db)
    .insert(person)
    .then(person => {
      return person
        .$relatedQuery('pets', db)
        .insert(pet);
    });
}
```

A transaction is started by calling `objection.transaction` method. You need to pass a knex instance as the first argument.
If you don't have the knex instance otherwise available you can always access it through any `Model` using `Model.knex()`
provided that you have set the knex instance globally using `Model.knex(knex)` at some point.

The second argument is a callback that gets passed a transaction object. The transaction object is actually just a
[knex transaction object](http://knexjs.org/#Transactions) and you can start the transaction just as well using
`knex.transaction` function. You then need to pass the transaction to all queries you want to execute in that
transaction. [query](#query), [$query](#_s_query) and [$relatedQuery](#_s_relatedquery) accept a transaction
as their last argument.

The transaction is committed if the promise returned from the callback is resolved successfully. If the returned Promise
is rejected or an error is thrown inside the callback the transaction is rolled back.

Transactions in javascript are a bit of a PITA if you are used to threaded frameworks and languages like java. In those
a single chain of operations (for example a single request) is handled in a dedicated thread. Transactions are usually 
started for the whole thread and every database operation you perform after the start automatically takes part in the  
transaction because they can access the thread local transaction and the framework can be sure that no other chain of
operations (no other request) uses the same transaction.

In javascript there are no threads. We need to explicitly take care that our operations are executed in the correct
transaction. Based on our experience the most transparent and least error-prone way to do this is to explicitly pass
a transaction object to each operation explicitly.

## Binding models to a transaction

```js
objection.transaction(Person, Animal, (Person, Animal) => {
  // Person and Animal inside this function are bound to a newly
  // created transaction. The Person and Animal outside this function
  // are not! Even if you do `require('./models/Person')` inside this
  // function and start a query using the required `Person` it will
  // NOT take part in the tranaction. Only the actual objects passed
  // to this function are bound to the transaction.

  return Person
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(() => {
      return Animal
        .query()
        .insert({name: 'Scrappy'});
    });

}).then(scrappy => {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(err => {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

> You only need to give the [`transaction`](#transaction) function the model classes you use explicitly. All the
> related model classes are implicitly bound to the same transaction:

```js
objection.transaction(Person, Person => {

  return Person
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(jennifer => {
      // This creates a query using the `Animal` model class but we
      // don't need to give `Animal` as one of the arguments to the
      // transaction function because `jennifer` is an instance of
      // the `Person` that is bound to a transaction.
      return jennifer
        .$relatedQuery('pets')
        .insert({name: 'Scrappy'});
    });

}).then(scrappy => {
  console.log('Jennifer and Scrappy were successfully inserted');
}).catch(err => {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
});
```

> The only way you can mess up with the transactions is if you _explicitly_ start a query using a model class
> that is not bound to the transaction:

```js
const Person = require('./models/Person');
const Animal = require('./models/Animal');

objection.transaction(Person, BoundPerson => {

  // This will be executed inside the transaction.
  return BoundPerson
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
    .then(jennifer => {
      // OH NO! This query is executed outside the transaction
      // since the `Animal` class is not bound to the transaction.
      return Animal
        .query()
        .insert({name: 'Scrappy'});
    })
    .then(() => {
      // OH NO! This query is executed outside the transaction
      // since the `Person` class is not bound to the transaction.
      // BoundPerson !== Person.
      return Person
        .query()
        .insert({firstName: 'Bradley'});
    });

});
```

> The transaction object is always passed as the last argument to the callback:

```js
objection.transaction(Person, (Person, trx) => {
  // `trx` is the knex transaction object.
  // It can be passed to `transacting`, `query` etc.
  // methods, or used as a knex query builder.

  var q1 = trx('Person').insert({firstName: 'Jennifer', lastName: 'Lawrence'});
  var q2 = Animal.query(trx).insert({name: 'Scrappy'});
  var q3 = Animal.query().transacting(trx).insert({name: 'Fluffy'});

  return Promise.all([q1, q2, q3]);

}).spread((jennifer, scrappy, fluffy) => {
  console.log('Jennifer, Scrappy and Fluffy were successfully inserted');
}).catch(err => {
  console.log('Something went wrong. Jennifer, Scrappy and Fluffy were not inserted');
});
```

The second way to use transactions avoids passing around a transaction object by "binding" model
classes to a transaction. You pass all models you want to bind as arguments to the `objection.transaction` 
method and as the last argument you provide a callback that receives __copies__ of the models that have 
been bound to a newly started transaction. All queries started through the bound copies take part in the 
transaction and you don't need to pass around a transaction object. Note that the models passed to the 
callback are actual copies of the models passed as arguments to `objection.transaction` and starting a 
query through any other object will __not__ be executed inside a transaction.

Originally we advertised this way of doing transactions as a remedy to the transaction passing
plaque but it has turned out to be pretty error-prone. This approach is handy for single inline
functions that do a handful of operations, but becomes tricky when you have to call services
and helper methods that also perform database queries. To get the helpers and service functions
to participate in the transaction you need to pass around the bound copies of the model classes.
If you `require` the same models in the helpers and start queries through them, they will __not__
be executed in the transaction since the required models are not the bound copies, but the original
models from which the copies were taken.

# Documents

> The `address` property of the Person model is defined as an object in the [Person.jsonSchema](#models):

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
  .then(jennifer => {
    console.log(jennifer.address.city); // --> Tampere
    return Person.query().where('id', jennifer.id);
  })
  .then(jenniferFromDb => {
    console.log(jenniferFromDb.address.city); // --> Tampere
  })
  .catch(err => {
    console.log('oh noes');
  });
```

Objection.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as
objects or arrays in the model's [`jsonSchema`](#jsonschema) are automatically converted to JSON strings in the database and
back to objects when read from the database. The database columns for the object properties can be normal
text columns. Postgresql has the `json` and `jsonb` data types that can be used instead for better performance
and possibility to [write queries](http://www.postgresql.org/docs/9.4/static/functions-json.html) to the documents.

# Validation

> All these will trigger the validation:

```js
Person.fromJson({firstName: 'jennifer', lastName: 'Lawrence'});
Person.query().insert({firstName: 'jennifer', lastName: 'Lawrence'});
Person.query().update({firstName: 'jennifer', lastName: 'Lawrence'}).where('id', 10);
// Patch operation ignores the `required` property of the schema and only validates the
// given properties. This allows a subset of model's properties to be updated.
Person.query().patch({age: 24}).where('age', '<', 24);
```

> Validation errors provide detailed error message:

```js
Person.query().insert({firstName: 'jennifer'}).catch(err => {
  console.log(err instanceof objection.ValidationError); // --> true
  console.log(err.data); // --> {lastName: [{message: 'required property missing', ...}]}
});
```

> Error parameters returned by [`ValidationError`](#validationerror) could be used to provide custom error messages:

```js
Person.query().insert({firstName: 'jennifer'}).catch(err => {
  let lastNameErrors = err.data['lastName'];
  for (let i = 0; i < lastNameErrors.length; ++i) {
    let lastNameError = lastNameErrors[i];
    if (lastNameError.keyword === "required") {
      console.log('This field is required!');
    } else if (lastNameError.keyword === "minLength") {
      console.log('Must be longer than ' + lastNameError.params.limit)
    } else {
      console.log(lastNameError.message); // Fallback to default error message
    }
  }
});
```

[JSON schema](http://json-schema.org/) validation can be enabled by setting the [`jsonSchema`](#jsonschema) property
of a model class. The validation is ran each time a [`Model`](#model) instance is created.

You rarely need to call [`$validate`](#_s_validate) method explicitly, but you can do it when needed. If validation fails a
[`ValidationError`](#validationerror) will be thrown. Since we use Promises, this usually means that a promise will be rejected
with an instance of [`ValidationError`](#validationerror).

See [the recipe book](#custom-validation) for instructions if you want to use some other validation library.

# Plugins

## List of plugins and modules for objection

A curated list of good plugins and modules for objection. Only plugins that follow [the best practices](#plugin-development-best-practices) 
are accepted on this list. Other modules like plugins for other frameworks and things that cannot be implemented following the best 
practices are an exception to this rule. If you are a developer or otherwise know of a good plugin/module for objection, please 
create a pull request or an issue to get it added to this list.

  * [objection-guid](https://github.com/seegno/objection-guid) - automatic guid for your models
  * [objection-password](https://github.com/scoutforpets/objection-password) - automatic password hashing for your models
  * [objection-visibility](https://github.com/oscaroox/objection-visibility) - whitelist/blacklist your model properties

## Plugin development best practices

> Mixin is just a function that takes a class and returns an extended subclass.

```js
function SomeMixin(Model) {
  return SomeExtendedModel extends Model {
    // Your modifications.
  }
}
```

> Mixins can be then applied like this:

```js
class Person extends SomeMixin(Model) {

}
```

> Multiple mixins:

```js
class Person extends SomeMixin(SomeOtherMixin(Model)) {

}
```

When possible, objection.js plugins should be implemented as [class mixins](http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/). 
A mixin is simply a function that takes a class as an argument and returns a subclass. Plugins should 
avoid modifying `objection.Model`, `objection.QueryBuilder` or any other global variables directly.
See the [example plugin](https://github.com/Vincit/objection.js/tree/master/examples/plugin) for more
info. There is also [another example](https://github.com/Vincit/objection.js/tree/master/examples/plugin-with-options)
that should be followed if your plugin needs options or configuration parameters.

# Contribution guide

## Issues

You can use [github issues](https://github.com/Vincit/objection.js/issues) to request features and file bug reports.
An issue is also a good place to ask questions. We are happy to help out if you have reached a dead end, but please try
to solve the problem yourself first. The [gitter chat](https://gitter.im/Vincit/objection.js) is also a good place to
ask for help.

When creating an issue there are couple of things you need to remember:

1. **Update to the latest version of objection if possible and see if the problem remains.** If updating is not an
option you can still request critical bug fixes for older versions.

2. **Describe your problem.** What is happening and what you expect to happen.

3. **Provide enough information about the problem for others to reproduce it.** The fastest way to get your bug fixed or
problem solved is to create a simple standalone app or a test case that demonstrates your problem. If that's too much
work then at least provide the code that fails with enough context and any possible stack traces. Please bear in mind
that objection has hundreds of tests and if you run into a problem, say with `insert` function, it probably doesn't mean
that `insert` is totally and completely broken, but some small part of it you are using is. That's why enough context
is necessary.

## Pull requests

If you have found a bug or want to add a feature, pull requests are always welcome! It's better to create an issue
first to open a discussion if the feature is something that should be added to objection. In case of bugfixes it's also
a good idea to open an issue indicating that you are working on a fix.

For a pull request to get merged it needs to have the following things:

1. A good description of what the PR fixes or adds. You can just add a link to the corresponding issue.

2. Test(s) that verifies the fix/feature. It's possible to create a PR without tests and ask for someone else to write
them but in that case it may take a long time or forever until someone finds time to do it. Untested code will never get
merged!

3. For features you also need to write documentation.

## Development guide

### Development setup

> clone

```shell
git clone git@github.com:<your-account>/objection.js.git objection
```

> create users and databases

```shell
psql -U postgres -c "CREATE USER objection SUPERUSER"
psql -U postgres -c "CREATE DATABASE objection_test"
mysql -u root -e "CREATE USER objection"
mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO objection"
mysql -u root -e "CREATE DATABASE objection_test"
```

1. Fork objection in github

2. Clone objection

3. Install MySQL and PostgreSQL

4. Create test users and databases

5. Run `npm test` in objection's root to see if everything works.

### Develop

Code and tests need to be written in ES2015 subset supported by node 4.0.0. The best way to make sure of this is
to develop with the correct node version. [nvm](https://github.com/creationix/nvm) is a great tool for swapping
between node versions.
