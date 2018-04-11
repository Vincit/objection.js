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
 * **Powerful mechanisms for [eager loading](#eager-loading), [inserting](#graph-inserts) and [upserting](#graph-upserts) object graphs**
 * **A way to [store complex documents](#documents) as single rows**
 * **Completely [Promise](https://github.com/petkaantonov/bluebird) based API**
 * **Easy to use [transactions](#transactions)**
 * **Optional [JSON schema](#validation) validation**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
 * **Automatic database schema creation and migration from model definitions.**
    For simple things it is useful that the database schema is automatically generated from the model definitions,
    but usually just gets in your way when doing anything non-trivial. Objection.js leaves the schema related things
    to you. knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job. Check
    out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6).

Objection.js uses Promises and coding practices that make it ready for the future. We use Well known
[OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) techniques and ES2015 classes and inheritance
in the codebase. You can use things like [async/await](http://jakearchibald.com/2014/es7-async-functions/)
using node ">=7.6.0" or alternatively with a transpiler such as [Babel](https://babeljs.io/). Check out our [ES2015](https://github.com/Vincit/objection.js/tree/master/examples/express-es6)
and [ESNext](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) example projects.

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

const { Model } = require('objection');
const Knex = require('knex');

// Initialize knex.
const knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: 'example.db'
  }
});

// Give the knex object to objection.
Model.knex(knex);

// Person model.
class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    return {
      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'persons.id',
          to: 'persons.parentId'
        }
      }
    };
  }
}

async function createSchema() {
  // Create database schema. You should use knex migration files to do this. We
  // create it here for simplicity.
  await knex.schema.createTableIfNotExists('persons', table => {
    table.increments('id').primary();
    table.integer('parentId').references('persons.id');
    table.string('firstName');
  });
}

async function main() {
  // Create some people.
  const sylvester = await Person.query().insertGraph({
    firstName: 'Sylvester',

    children: [
      {
        firstName: 'Sage'
      },
      {
        firstName: 'Sophia'
      }
    ]
  });

  console.log('created:', sylvester);

  // Fetch all people named Sylvester and sort them by id.
  // Load `children` relation eagerly.
  const sylvesters = await Person.query()
    .where('firstName', 'Sylvester')
    .eager('children')
    .orderBy('id');

  console.log('sylvesters:', sylvesters);
}

createSchema().then(() => main()).catch(console.error);
```

To use objection.js all you need to do is [initialize knex](http://knexjs.org/#Installation-node) and give the
created object to objection.js using [`Model.knex(knex)`](#knex). Doing this installs the knex connection globally
for all models (even the ones that have not been created yet). If you need to use multiple databases check out our
[multi-tenancy recipe](#multi-tenancy).

The next step is to create some migrations and models and start using objection.js. The best way to get started is to
check out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6). The `express`
example project is a simple express server. The `client.js` file contains a bunch of http requests for you to
start playing with the REST API.

We also have an [ESNext version of the example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es7)
that uses [Babel](https://babeljs.io/) for ESNext --> ES2015 transpiling and a [typescript version](https://github.com/Vincit/objection.js/tree/master/examples/express-ts).

Also check out our [API reference](#api-reference) and [recipe book](#recipe-book).

# Models

> A working model with minimal amount of code:

```js
const { Model } = require('objection');

class MinimalModel extends Model {
  static get tableName() {
    return 'someTableName';
  }
}

module.exports = MinimalModel;
```

> ESNext:

```js
import { Model } from 'objection';

export default class MinimalModel extends Model {
  static tableName = 'someTableName';
}
```

> Model with custom methods, json schema validation and relations. This model is used in the examples:

```js
const { Model } = require('objection');

class Person extends Model {

  // Table name is the only required property.
  static get tableName() {
    return 'persons';
  }

  // Each model must have a column (or a set of columns) that uniquely
  // identifies the rows. The column(s) can be specified using the `idColumn`
  // property. `idColumn` returns `id` by default and doesn't need to be
  // specified unless the model's primary key is something else.
  static get idColumn() {
    return 'id';
  }

  // Methods can be defined for model classes just as you would for
  // any javascript class. If you want to include the result of these
  // method in the output json, see `virtualAttributes`.
  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for input validation. Whenever a model instance is created
  // either explicitly or implicitly it is checked against this schema.
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
    // Import models here to prevent require loops.
    const Animal = require('./Animal');
    const Movie = require('./Movie');

    return {
      pets: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model
        // subclass constructor or an absolute file path
        // to a module that exports one.
        modelClass: Animal,
        join: {
          from: 'persons.id',
          to: 'animals.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'persons.id',
          // ManyToMany relation needs the `through` object
          // to describe the join table.
          through: {
            // If you have a model class for the join table
            // you need to specify it like this:
            // modelClass: PersonMovie,
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'persons.id',
          to: 'persons.parentId'
        }
      },

      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'persons.parentId',
          to: 'persons.id'
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
  static tableName = 'persons';

  // Each model must have a column (or a set of columns) that uniquely
  // identifies the rows. The colum(s) can be specified using the `idColumn`
  // property. `idColumn` returns `id` by default and doesn't need to be
  // specified unless the model's primary key is something else.
  static idColumn = 'id';

  // Methods can be defined for model classes just as you would for
  // any javascript class. If you want to include the result of these
  // method in the output json, see `virtualAttributes`.
  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  // Optional JSON schema. This is not the database schema!
  // Nothing is generated based on this. This is only used
  // for input validation. Whenever a model instance is created
  // either explicitly or implicitly it is checked against this schema.
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
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: __dirname + '/Movie',
      join: {
        from: 'persons.id',
        // ManyToMany relation needs the `through` object
        // to describe the join table.
        through: {
          // If you have a model class for the join table
          // you need to specify it like this:
          // modelClass: PersonMovie,
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    },

    children: {
      relation: Model.HasManyRelation,
      modelClass: Person,
      join: {
        from: 'persons.id',
        to: 'persons.parentId'
      }
    },

    parent: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'persons.parentId',
        to: 'persons.id'
      }
    }
  };
}
```

Models are created by inheriting from the [`Model`](#model) class. A `Model` subclass represents a database table
and instances of that class represent table rows. A `Model` class can define [relationships](#relations) (aka. relations, associations)
to other models using the static [`relationMappings`](#relationmappings) property.

In objection, all configuration is done through `Model` classes and there is no global configuration or state. This allows you
to create isolated components and for example to use multiple different databases with different configurations in one
app. Most of the time you want the same configuration for all models and a good pattern is to create a `BaseModel`
superclass and inherit all your models from that. You can then add all shared configuration to `BaseModel`. See the
[Reference --> Model --> Static properties](#tablename) section for all available configuration options.

Models can optionally define a [`jsonSchema`](#jsonschema) object that is used for input validation. Every time
a `Model` instance is created, it is validated against the `jsonSchema`. Note that `Model` instances are implicitly
created whenever you call `insert(obj)`, `insertGraph(obj)`, `patch(obj)` or any other method that takes model properties
(no validation is done when reading from the database).

Each model must have an identifier column. The identifier column name can be set using the [`idColumn`](#idcolumn) property.
`idColumn` defaults to `"id"`. If your table's identifier is something else, you need to set [`idColumn`](#idcolumn).
Composite id can be set by giving an array of column names. Composite keys are first class citizens in objection.

# Relations

> `BelongsToOneRelation`: Use this relation when the source model has the foreign key

```js
class Animal extends Model {
  static tableName = 'animals';

  static relationMappings = {
    owner: {
      relation: Model.BelongsToOneRelation,
      modelClass: Person,
      join: {
        from: 'animals.ownerId',
        to: 'persons.id'
      }
    }
  }
}
```

> `HasManyRelation`: Use this relation when the related model has the foreign key

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    animals: {
      relation: Model.HasManyRelation,
      modelClass: Animal,
      join: {
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    }
  }
}
```

> `HasOneRelation`: Just like `HasManyRelation` but for one related row

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    animal: {
      relation: Model.HasOneRelation,
      modelClass: Animal,
      join: {
        from: 'persons.id',
        to: 'animals.ownerId'
      }
    }
  }
}
```

> `ManyToManyRelation`: Use this relation when the model is related to a list of other models through a join table

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: Movie,
      join: {
        from: 'persons.id',
        through: {
          // persons_movies is the join table.
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    }
  }
}
```

> `HasOneThroughRelation`: Use this relation when the model is related to a single model through a join table

```js
class Person extends Model {
  static tableName = 'persons';

  static relationMappings = {
    movie: {
      relation: Model.HasOneThroughRelation,
      modelClass: Movie,
      join: {
        from: 'persons.id',
        through: {
          // persons_movies is the join table.
          from: 'persons_movies.personId',
          to: 'persons_movies.movieId'
        },
        to: 'movies.id'
      }
    }
  }
}
```

> Solutions to require loops

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    // Solution 1:
    //
    // relationMappings getter is accessed lazily when you execute your first query
    // that needs it. Therefore if you `require` your models inside the getter, you
    // don't end up with a require loop. Note that only one end of the relation needs
    // to be required like this, not both. `relationMappings` can also be a method or
    // a thunk if you prefer those instead of getters.
    const Animal = require('./Animal');

    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'persons.id',
          to: 'animals.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        // Solution 2:
        //
        // Absolute file path to a module that exports the model class. This is similar
        // to solution 1, but objection calls `require` under the hood. The downside here
        // is that you need to give an absolute file path because of the way `require` works.
        modelClass: `${__dirname}/Movie`,
        join: {
          from: 'persons.id',
          through: {
            // persons_movies is the join table.
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        // Solution 3:
        //
        // Use only a module name and define a `modelPaths` property for your model (or a superclass
        // of your model). Search for `modelPaths` from the docs for more info.
        modelClass: 'Movie',
        join: {
          from: 'persons.id',
          through: {
            from: 'persons_movies.personId',
            to: 'persons_movies.movieId'
          },
          to: 'movies.id'
        }
      }
    };
  }
}
```

We already went through how to create relationships (aka. relations, associations) in the [models](#models) section's examples
but here's a list of all the available relation types in a nicely searchable place. See [this](#relationmapping) API doc
section for full documentation of the relation mapping parameters.

Relationships are a very basic concept in relational databases and if you aren't familiar with it, you should spend some
time googling it first. Basically there are three ways to create a relationship between two tables `A` and `B`:

1. `A` table has a column that holds the `B` table's id. This relationship is called a `BelongsToOneRelation` in objection.
   We can say that `A` belongs to one `B`.

2. `B` table has a column that holds the `A` table's id. This relationship is called a `HasManyRelation` in objection.
   We can say that `A` has many `B`'s.

3. `C` table has columns for both `A` and `B` tables' identifiers. This relationship is called `ManyToManyRelation` in objection.
   Each row in `C` joins one `A` with one `B`. Therefore an `A` row can be related to multiple `B` rows and a `B` row can be related to
   multiple `A` rows.

While relations are usually created between the primary key of one table and a foreign key reference of another table, objection
has no such limitations. You can create relationship using any two columns (or any sets of columns). You can even create relation
using values nested deep inside json columns.

If you have used other ORM's you may notice that objection's `relationMappings` are really verbose. There are couple of reasons for that:

1. For a new user, this style underlines what is happening, and which columns and tables are involved.

2. You only need defined relations once. Writing a couple of lines more for clarity shouldn't impact your productivity.

Vocabulary for the relation descriptions:

 * source model: The model for which you are writing the `relationMapping` for.
 * related model: The model at the other end of the relation.

**Require loops**

Require loops (circular dependencies, circular requires) are a very common problem when defining relations. Whenever a module `A`
`requires` or `imports` module `B` that immediately (synchronously) `requires` or `imports` module `A`, you create a require loop
that node.js or objection cannot solve automatically. A require loop usually leads to the other imported value to be an empty object
which causes all kinds of problems. Objection attempts to detect these situations and mention the words `require loop` in the
thrown error. Objection offers multiple solutions to this problem. See the circular dependency solutions examples in this section.
In addition to objection's solutions, you can always organize your code so that such loops are not created.




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
const people = await Person.query();

console.log(people[0] instanceof Person); // --> true
console.log('there are', people.length, 'People in total');
```

```sql
select "people".* from "people"
```

> The return value of the [`query`](#query) method is an instance of [`QueryBuilder`](#querybuilder)
> that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has. Here is a simple example
> that uses some of them:

```js
const middleAgedJennifers = await Person
  .query()
  .where('age', '>', 40)
  .andWhere('age', '<', 60)
  .andWhere('firstName', 'Jennifer')
  .orderBy('lastName')

console.log('The last name of the first middle aged Jennifer is');
console.log(middleAgedJennifers[0].lastName);
```

```sql
select "persons".* from "persons"
where "age" > 40
and "age" < 60
and "firstName" = 'Jennifer'
order by "lastName" asc
```

> In addition to knex methods, the [`QueryBuilder`](#querybuilder) has a lot of helpers for dealing with
> relations like the [`joinRelation`](#joinrelation) method:

```js
const people = await Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent');

console.log(people[0].grandParentName)
```

```sql
select "parent:parent"."firstName" as "grandParentName"
from "persons"
inner join "persons" as "parent" on "parent"."id" = "persons"."parentId"
inner join "persons" as "parent:parent" on "parent:parent"."id" = "parent"."parentId"
```

> The next example shows how easy it is to build complex queries:

```js
const people = await Person
  .query()
  .select('persons.*', 'Parent.firstName as parentFirstName')
  .join('persons as parent', 'persons.parentId', 'parent.id')
  .where('persons.age', '<', Person.query().avg('persons.age'))
  .whereExists(Animal.query().select(1).where('persons.id', ref('animals.ownerId')))
  .orderBy('persons.lastName');

console.log(people[0].parentFirstName);
```

```sql
select "persons".*, "parent"."firstName" as "parentFirstName"
from "persons"
inner join "persons" as "parent" on "persons"."parentId" = "parent"."id"
where "persons"."age" < (select avg("persons"."age") from "persons")
and exists (select 1 from "animals" where "persons"."id" = "animals"."ownerId")
order by "persons"."lastName" asc
```

Fetch queries can be created simply by calling [`Model.query()`](#query) and chaining query builder methods for the returned
[`QueryBuilder`](#querybuilder) instance. The query is executed by calling the [`then`](#then) method, which converts the query
into a [`Promise`](http://bluebirdjs.com/docs/getting-started.html).

### Insert queries

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})

console.log(jennifer instanceof Person); // --> true
console.log(jennifer.firstName); // --> 'Jennifer'
console.log(jennifer.fullName()); // --> 'Jennifer Lawrence'
```

```sql
insert into "persons" ("firstName", "lastName") values ('Jennifer', 'Lawrence')
```

Insert queries are created by chaining the [`insert`](#insert) method to the query. See the [`insertGraph`](#insertgraph) method
for inserting object graphs.

### Update queries

```js
const numUpdated = await Person.query()
  .patch({lastName: 'Dinosaur'})
  .where('age', '>', 60)

console.log('all people over 60 years old are now dinosaurs');
console.log(numUpdated, 'people were updated');
```

```sql
update "persons" set "lastName" = 'Dinosaur' where "age" > 60
```

```js
const updatedPerson = await Person
  .query()
  .patchAndFetchById(246, {lastName: 'Updated'});

console.log(updatedPerson.lastName); // --> Updated.
```

```sql
update "persons" set "lastName" = 'Updated' where "id" = 246
select "persons".* from "persons" where "id" = 246
```

Update queries are created by chaining the [`update`](#update) or [`patch`](#patch) method to the query. The [`patch`](#patch) and [`update`](#update)
methods return the number of updated rows. If you want the freshly updated model as a result you can use the helper
method [`patchAndFetchById`](#patchandfetchbyid) and [`updateAndFetchById`](#updateandfetchbyid). On postgresql you can
simply chain `.returning('*')` or take a look at [this recipe](#postgresql-quot-returning-quot-tricks) for more ideas.

### Delete queries

```js
const numDeleted = await Person
  .query()
  .delete()
  .where(raw('lower("firstName")'), 'like', '%ennif%');

console.log(numDeleted, 'people were deleted');
```

```sql
delete from "persons" where lower("firstName") like '%ennif%'
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
const pets = await person
  .$relatedQuery('pets')
  .where('species', 'dog')
  .orderBy('name');

console.log(person.pets === pets); // --> true
console.log(pets[0] instanceof Animal); // --> true
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" = 1
order by "name" asc
```

Simply call [`$relatedQuery('pets')`](#_s_relatedquery) for a model _instance_ to fetch a relation for it. The relation name is
given as the only argument. The return value is a [`QueryBuilder`](#querybuilder) so you once again have all the query methods
at your disposal. In many cases it's more convenient to use [`eager loading`](#eager-loading) to fetch relations. `$relatedQuery`
is better when you only need one relation and you need to filter the query extensively.

By default the fetched related models are assigned to the parent model to a property by the same name as the relation. For example
in our `person.$relatedQuery('pets')` example query, the return value would be assigned to `person.pets`. This behaviour
can be modified using [`relatedFindQueryMutates`](#relatedfindquerymutates). Also check out [`$setRelated`](#_s_setrelated) and
[`$appendRelated`](#_s_appendrelated) helpers.

### Insert queries

> Add a pet for a person:

```js
// `person` is an instance of `Person` model.
const fluffy = await person
  .$relatedQuery('pets')
  .insert({name: 'Fluffy'});

console.log(person.pets.indexOf(fluffy) !== -1); // --> true
```

```sql
insert into "animals" ("name", "ownerId") values ('Fluffy', 1)
```

> If you want to write columns to the join table of a many-to-many relation you first need to specify the columns in
> the `extra` array of the `through` object in [`relationMappings`](#relationmappings) (see the examples behind the link).
> For example, if you specified an array `extra: ['awesomeness']` in `relationMappings` then `awesomeness` is written to
> the join table in the following example:

```js
// `person` is an instance of `Person` model.
const movie = await person
  .$relatedQuery('movies')
  .insert({name: 'The room', awesomeness: 9001});

console.log('best movie ever was added');
```

```sql
insert into "movies" ("name") values ('The room')
insert into "persons_movies" ("movieId", "personId", "awesomeness") values (14, 25, 9001)
```

Chain the [`insert`](#insert) method to the [`$relatedQuery`](#_s_relatedquery) call to insert a related object for a model
_instance_. The query inserts a new object to the related table and updates the needed tables to create the relation.
In case of many-to-many relation a row is inserted to the join table etc. Also check out [`insertGraph`](#graph-inserts)
method for an alternative way to insert related models.

By default the inserted related models are appended to the parent model to a property by the same name as the relation. For example
in our `person.$relatedQuery('pets').insert(obj)` example query, the return value would be appended to `person.pets`. This behaviour
can be modified using [`relatedInsertQueryMutates`](#relatedinsertquerymutates). Also check out the [`$setRelated`](#_s_setrelated) and
[`$appendRelated`](#_s_appendrelated) helpers.


### Update queries

See the [API documentation](#update) of `update` method.

### Delete queries

See the [API documentation](#delete) of `delete` method.

### Relate queries

See the [API documentation](#relate) of `relate` method.

### Unrelate queries

See the [API documentation](#unrelate) of `unrelate` method.

# Eager loading

> Fetch the `pets` relation for all results of a query:

```js
const people = await Person
  .query()
  .eager('pets');

// Each person has the `.pets` property populated with Animal objects related
// through `pets` relation.
console.log(people[0].pets[0].name);
console.log(people[0].pets[0] instanceof Animal); // --> true
```

> Fetch multiple relations on multiple levels:

```js
const people = await Person
  .query()
  .eager('[pets, children.[pets, children]]');

// Each person has the `.pets` property populated with Animal objects related
// through `pets` relation. The `.children` property contains the Person's
// children. Each child also has the `pets` and `children` relations eagerly
// fetched.
console.log(people[0].pets[0].name);
console.log(people[1].children[2].pets[1].name);
console.log(people[1].children[2].children[0].name);
```

> Here's the previous query using the optional [object notation](#relationexpression-object-notation)

```js
const people = await Person
  .query()
  .eager({
    pets: true,
    children: {
      pets: true,
      children: true
    }
  });
```

> Fetch one relation recursively:

```js
const people = await Person
  .query()
  .eager('[pets, children.^]');

// The children relation is from Person to Person. If we want to fetch the whole
// descendant tree of a person we can just say "fetch this relation recursively"
// using the `.^` notation.
console.log(people[0].children[0].children[0].children[0].children[0].firstName);
```

> Limit recursion to 3 levels:

```js
const people = await Person
  .query()
  .eager('[pets, children.^3]');

console.log(people[0].children[0].children[0].children[0].firstName);
```

> Relations can be filtered using the [`modifyEager`](#modifyeager) method:

```js
const people = await Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    // Only select pets older than 10 years old for children.
    builder.where('age', '>', 10);
  });
```

> Relations can also be filtered using named filters like this:

```js
const people = await Person
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
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
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

const people = await Person
  .query()
  .eager('children(orderByAge).[pets(onlyDogs, orderByName), movies]');

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

> Relations can be aliased using `as` keyword:

```js
const people = await Person
  .query()
  .eager(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

console.log(people[0].kids[0].dogs[0].name);
console.log(people[0].kids[0].movies[0].id);
```

> Example usage for [`allowEager`](#alloweager) in an express route:

```js
expressApp.get('/people', async (req, res, next) => {
  const people = await Person
    .query()
    .allowEager('[pets, children.pets]')
    .eager(req.query.eager);

  res.send(people);
});
```

> Eager loading algorithm can be changed using the [`eagerAlgorithm`](#eageralgorithm) method:

```js
const people = await Person
  .query()
  .eagerAlgorithm(Model.JoinEagerAlgorithm)
  .eager('[pets, children.pets]');
```

You can fetch an arbitrary graph of relations for the results of any query by chaining the [`eager`](#eager) method.
[`eager`](#eager) takes a [relation expression](#relationexpression) string as a parameter. In addition to making your
life easier, eager queries avoid the "select N+1" problem and provide a great performance.

Because the eager expressions are strings (there's also an optional [object notation](#relationexpression-object-notation))
they can be easily passed for example as a query parameter of an HTTP
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
You can choose to use a join based eager loading algorithm that only performs one single query to fetch the whole
eager tree. You can select which algorithm to use per query using [`eagerAlgorithm`](#eageralgorithm) method or
per model by setting the [`defaultEagerAlgorithm`](#defaulteageralgorithm) property. All algorithms
have their strengths and weaknesses, which are discussed in detail [here](#eager).

# Graph inserts

```js
// The return value of `insertGraph` is the input graph converted into model instances.
// Inserted objects have ids added to them and related rows have foreign keys set, but
// no other columns get fetched from the database. You can use `insertGraphAndFetch`
// for that.
const graph = await Person
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
await Person
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
await Person
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

> Existing rows can be related to newly inserted rows by using the `relate` option. `relate` can be `true` in which case
> all models in the graph that have an identifier get related. `relate` can also be an array of relation paths like
> `['children', 'children.movies.actors']` in which case only objects in those paths get related even if they have an idetifier.

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      id: 2636
    }]
  }], {
    relate: true
  });
```

> The query above would create a new person `Jennifer Lawrence` and add an existing movie (id = 2636) to its
> `movies` relation. The next query would do the same:

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      id: 2636
    }]
  }], {
    relate: [
      'movies'
    ]
  });
```

> If you need to mix inserts and relates inside a single relation, you can use the special property `#dbRef`

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#dbRef": 2636
    }, {
      // This will be inserted with an id.
      id: 100,
      name: 'New movie'
    }]
  }]);
```

Arbitrary relation graphs can be inserted using the [`insertGraph`](#insertgraph) method. This is best explained using
examples, so check them out ➔.

See the [`allowInsert`](#allowinsert) method if you need to limit  which relations can be inserted using
[`insertGraph`](#insertgraph) method to avoid security issues. [`allowInsert`](#allowinsert)
works like [`allowEager`](#allowinsert).

If you are using Postgres the inserts are done in batches for maximum performance. On other databases the rows need to
be inserted one at a time. This is because postgresql is the only database engine that returns the identifiers of all
inserted rows and not just the first or the last one.

`insertGraph` operation is __not__ atomic by default! You need to start a transaction and pass it to the query using any
of the supported ways. See the section about [transactions](#transactions) for more information.

You can read more about graph inserts from [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

# Graph upserts

> For the following examples, assume this is the content of the database:

```js
[{
  id: 1,
  firstName: 'Jennifer',
  lastName: 'Aniston',

  // This is a BelongsToOneRelation
  parent: {
    id: 2,
    firstName: 'Nancy',
    lastName: 'Dow'
  },

  // This is a HasManyRelation
  pets: [{
    id: 1,
    name: 'Doggo',
    species: 'Dog',
  }, {
    id: 2,
    name: 'Kat',
    species: 'Cat',
  }],

  // This is a ManyToManyRelation
  movies: [{
    id: 1,
    name: 'Horrible Bosses',

    reviews: [{
      id: 1,
      title: 'Meh',
      stars: 3,
      text: 'Meh'
    }]
  }, {
    id: 2
    name: 'Wanderlust',

    reviews: [{
      id: 2,
      title: 'Brilliant',
      stars: 5,
      text: 'Makes me want to travel'
    }]
  }]
}]
```

> By default `upsertGraph` method updates the objects that have an id, inserts objects that don't have an id and deletes
> all objects that are not present. Off course the delete only applies to relations and not the root. Here's a basic example:

```js
// The return value of `upsertGraph` is the input graph converted into model instances.
// Inserted objects have ids added to them related rows have foreign keys set but no other
// columns get fetched from the database. You can use `upsertGraphAndFetch` for that.
const graph = await Person
  .query()
  .upsertGraph({
    // This updates the `Jennifer Aniston` person since the id property is present.
    id: 1,
    firstName: 'Jonnifer',

    parent: {
      // This also gets updated since the id property is present. If no id was given
      // here, Nancy Dow would get deleted, a new Person John Aniston would
      // get inserted and related to Jennifer.
      id: 2,
      firstName: 'John',
      lastName: 'Aniston'
    },

    // Notice that Kat the Cat is not listed in `pets`. It will get deleted.
    pets: [{
      // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
      // that there is no id!
      name: 'Wolfgang',
      species: 'Dog'
    }, {
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat',
    }],

    // Notice that Wanderlust is missing from the list. It will get deleted.
    // It is also worth mentioning that the Wanderlust's `reviews` or any
    // other relations are NOT recursively deleted (unless you have
    // defined `ON DELETE CASCADE` or other hooks in the db).
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }, {
        // And insert a third one.
        stars: 4,
        title: '4 / 5',
        text: 'Would see again'
      }]
    }]
  });
```

> By giving `relate: true` and/or `unrelate: true` options as the second argument, you can change the behaviour so that instead of
> inserting and deleting rows, they are related and/or unrelated. Rows with no id still get inserted, but rows that have an id and
> are not currently related, get related.

```js
const options = {
  relate: true,
  unrelate: true
};

await Person
  .query()
  .upsertGraph({
    // This updates the `Jennifer Aniston` person since the id property is present.
    id: 1,
    firstName: 'Jonnifer',

    // Unrelate the parent. This doesn't delete it.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [{
      // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
      // that there is no id!
      name: 'Wolfgang',
      species: 'Dog'
    }, {
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat',
    }],

    // Notice that Wanderlust is missing from the list. It will get unrelated.
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }]
    }, {
      // This is some existing movie that isn't currently related to Jennifer.
      // It will get related.
      id: 1253
    }]
  }, options);
```

> `relate` and `unrelate` (and all other [options](#upsertgraphoptions)) can also be lists of relation paths. In that
> case the option is only applied for the listed relations.

```js
const options = {
  // Only enable `unrelate` functionality for these two paths.
  unrelate: ['pets', 'movies.reviews'],
  // Only enable `relate` functionality for 'movies' relation.
  relate: ['movies'],
  // Disable deleting for movies.
  noDelete: ['movies']
};

await Person
  .query()
  .upsertGraph({
    id: 1,

    // This gets deleted since `unrelate` list doesn't have 'parent' in it
    // and deleting is the default behaviour.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [{
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat'
    }],

    // Notice that Wanderlust is missing from the list. It will NOT get unrelated
    // or deleted since `unrelate` list doesn't contain `movies` and `noDelete`
    // list does.
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }]
    }, {
      // This is some existing movie that isn't currently related to Jennifer.
      // It will get related.
      id: 1253
    }]
  }, options);
```

> You can disable updates, inserts, deletes etc. for the whole `upsertGraph` operation or for
> individual relations by using the `noUpdate`, `noInsert`, `noDelete` etc. options. See
> [`UpsertGraphOptions`](#upsertgraphoptions) docs for more info.

Arbitrary relation graphs can be upserted (insert + update + delete) using the [`upsertGraph`](#upsertgraph) method. This is best explained using
examples, so check them out ➔.

By default `upsertGraph` method updates the objects that have an id, inserts objects that don't have an id and deletes all objects that are not
present. This functionality can be modified in many ways by providing [`UpsertGraphOptions`](#upsertgraphoptions) object as the second argument.

The `upsertGraph` method works a little different than the other update and patch methods. When using `upsertGraph` any `where` or `having` methods
are ignored. The models are updated based on the id properties in the graph. This is also clarified in the examples.

`upsertGraph` uses `insertGraph` under the hood for inserts. That means that you can insert object graphs for relations and use all `insertGraph`
features like `#ref` references.

`upsertGraph` operation is __not__ atomic by default! You need to start a transaction and pass it to the query using any
of the supported ways. See the section about [transactions](#transactions) for more information.

See the [`allowUpsert`](#allowupsert) method if you need to limit  which relations can be modified using
[`upsertGraph`](#upsertgraph) method to avoid security issues. [`allowUpsert`](#allowupsert)
works like [`allowInsert`](#allowinsert).

# Transactions

There are two ways to work with transactions in objection:

1. [Passing around a transaction object](#passing-around-a-transaction-object)
2. [Binding models to a transaction](#binding-models-to-a-transaction)

## Passing around a transaction object

```js
const { transaction } = require('objection');
// You can access `knex` instance anywhere you want.
// One way is to get it through any model.
const knex = Person.knex();

try {
  const scrappy = await transaction(knex, async (trx) => {
    const jennifer = await Person
      .query(trx)
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

    const scrappy = await jennifer
      .$relatedQuery('pets', trx)
      .insert({name: 'Scrappy'});

    return scrappy;
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

> Alternatively `transaction.start` can be used.

```js
const { transaction } = require('objection');
// You can access `knex` instance anywhere you want.
// One way is to get it through any model.
const knex = Person.knex();

let trx;
try {
  trx = await transaction.start(knex);

  const jennifer = await Person
    .query(trx)
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

  const scrappy = await jennifer
    .$relatedQuery('pets', trx)
    .insert({name: 'Scrappy'});

  await trx.commit();
} catch (err) {
  await trx.rollback();

  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

> Note that you can pass either a normal knex instance or a transaction to `query`, `$relatedQuery` etc.
> allowing you to build helper functions and services that can be used with or without a transaction.
> When a transaction is not wanted, just pass in the normal knex instance:

```js
// `db` can be either a transaction or a knex instance or even
// `null` or `undefined` if you have globally set the knex
// instance using `Model.knex(knex)`.
async function insertPersonAndPet(person, pet, db) {
  const person = await Person
    .query(db)
    .insert(person);

  return person
    .$relatedQuery('pets', db)
    .insert(pet);
}

// All following 3 ways to call insertPersonAndPet work:

// 1.
const trx = await transaction.start(Person.knex());
await insertPersonAndPet(person, pet, trx);
await trx.commit();

// 2.
await insertPersonAndPet(person, pet, trx);

// 3.
await insertPersonAndPet(person, pet);
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

Another way to start a trasnsaction is the `transaction.start` function. See the examples.

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
const { transaction } = require('objection');

try {
  const scrappy = await transaction(Person, Animal, async (Person, Animal) => {
    // Person and Animal inside this function are bound to a newly
    // created transaction. The Person and Animal outside this function
    // are not! Even if you do `require('./models/Person')` inside this
    // function and start a query using the required `Person` it will
    // NOT take part in the transaction. Only the actual objects passed
    // to this function are bound to the transaction.

    await Person
      .query()
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

    return Animal
      .query()
      .insert({name: 'Scrappy'});
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

> You only need to give the [`transaction`](#transaction) function the model classes you use explicitly. All the
> related model classes are implicitly bound to the same transaction:

```js
const { transaction } = require('objection');

try {
  const scrappy = await transaction(Person, async (Person) => {
    const jennifer = await Person
      .query()
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'})

    // This creates a query using the `Animal` model class but we
    // don't need to give `Animal` as one of the arguments to the
    // transaction function because `jennifer` is an instance of
    // the `Person` that is bound to a transaction.
    return jennifer
      .$relatedQuery('pets')
      .insert({name: 'Scrappy'});
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

> The only way you can mess up with the transactions is if you _explicitly_ start a query using a model class
> that is not bound to the transaction:

```js
const { transaction } = require('objection');
const Person = require('./models/Person');
const Animal = require('./models/Animal');

await transaction(Person, async (BoundPerson) => {
  // This will be executed inside the transaction.
  const jennifer = await BoundPerson
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

  // OH NO! This query is executed outside the transaction
  // since the `Animal` class is not bound to the transaction.
  await Animal
    .query()
    .insert({name: 'Scrappy'});

  // OH NO! This query is executed outside the transaction
  // since the `Person` class is not bound to the transaction.
  // BoundPerson !== Person.
  await Person
    .query()
    .insert({firstName: 'Bradley'});
});
```

> The transaction object is always passed as the last argument to the callback:

```js
const { transaction } = require('objection');

await transaction(Person, async (Person, trx) => {
  // `trx` is the knex transaction object.
  // It can be passed to `transacting`, `query` etc.
  // methods, or used as a knex query builder.

  const jennifer = await trx('persons').insert({firstName: 'Jennifer', lastName: 'Lawrence'});
  const scrappy = await Animal.query(trx).insert({name: 'Scrappy'});
  const fluffy = await Animal.query().transacting(trx).insert({name: 'Fluffy'});

  return {
    jennifer,
    scrappy,
    fluffy
  };
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
const jennifer = await Person
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
  });

const jenniferFromDb = await Person
  .query()
  .findById(jennifer.id);

console.log(jennifer.address.city); // --> Tampere
console.log(jenniferFromDb.address.city); // --> Tampere
```

Objection.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as
objects or arrays in the model's [`jsonSchema`](#jsonschema) are automatically converted to JSON strings in the database and
back to objects when read from the database. The database columns for the object properties can be normal
text columns. Postgresql has the `json` and `jsonb` data types that can be used instead for better performance
and possibility to [write queries](http://www.postgresql.org/docs/9.4/static/functions-json.html) to the documents.
If you don't want to use `jsonSchema` you can mark properties as objects using the [`jsonAttributes`](#jsonattributes)
Model property.

# Validation

> All these will trigger the validation:

```js
Person.fromJson({firstName: 'jennifer', lastName: 'Lawrence'});
await Person.query().insert({firstName: 'jennifer', lastName: 'Lawrence'});
await Person.query().update({firstName: 'jennifer', lastName: 'Lawrence'}).where('id', 10);
// Patch operation ignores the `required` property of the schema and only validates the
// given properties. This allows a subset of model's properties to be updated.
await Person.query().patch({age: 24}).where('age', '<', 24);
```

> Validation errors provide detailed error message:

```js
try {
  await Person.query().insert({firstName: 'jennifer'});
} catch (err) {
  console.log(err instanceof objection.ValidationError); // --> true
  console.log(err.data); // --> {lastName: [{message: 'required property missing', ...}]}
}
```

> Error parameters returned by [`ValidationError`](#validationerror) could be used to provide custom error messages:

```js
try {
  await Person.query().insert({firstName: 'jennifer'});
} catch (err) {
  let lastNameErrors = err.data.lastName;

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
}
```

[JSON schema](http://json-schema.org/) validation can be enabled by setting the [`jsonSchema`](#jsonschema) property
of a model class. The validation is ran each time a [`Model`](#model) instance is created.

You rarely need to call [`$validate`](#_s_validate) method explicitly, but you can do it when needed. If validation fails a
[`ValidationError`](#validationerror) will be thrown. Since we use Promises, this usually means that a promise will be rejected
with an instance of [`ValidationError`](#validationerror).

See [the recipe book](#custom-validation) for instructions if you want to use some other validation library.

# Plugins

A curated list of plugins and modules for objection. Only plugins that follow [the best practices](#plugin-development-best-practices)
are accepted on this list. Other modules like plugins for other frameworks and things that cannot be implemented following the best
practices are an exception to this rule. If you are a developer or otherwise know of a good plugin/module for objection, please
create a pull request or an issue to get it added to this list.

## 3rd party plugins

  * [objection-dynamic-finder](https://github.com/snlamm/objection-dynamic-finder) - dynamic finders for your models
  * [objection-db-errors](https://github.com/Vincit/objection-db-errors) - better database errors for your queries
  * [objection-guid](https://github.com/seegno/objection-guid) - automatic guid for your models
  * [objection-password](https://github.com/scoutforpets/objection-password) - automatic password hashing for your models
  * [objection-soft-delete](https://github.com/griffinpp/objection-soft-delete) - Soft delete functionality with minimal configuration
  * [objection-unique](https://github.com/seegno/objection-unique) - Unique validation for your models
  * [objection-visibility](https://github.com/oscaroox/objection-visibility) - whitelist/blacklist your model properties

## Other 3rd party modules

 * [objection-filter](https://github.com/tandg-digital/objection-filter) - API filtering on data and related models
 * [objection-graphql](https://github.com/vincit/objection-graphql) - Automatically generates rich graphql schema for objection models

## Plugin development best practices

> Mixin is just a function that takes a class and returns an extended subclass.

```js
function SomeMixin(Model) {
  // The returned class should have no name.
  return class extends Model {
    // Your modifications.
  };
}
```

> Mixins can be then applied like this:

```js
class Person extends SomeMixin(Model) {

}
```

> This __doesn't__ work since mixins never modify the input:

```js
// This does absolutely nothing.
SomeMixin(Model);

// Doesn't work!
class Person extends Model {

}
```

> Multiple mixins:

```js
class Person extends SomeMixin(SomeOtherMixin(Model)) {

}
```

> There are a couple of helpers in objection main module for applying multiple mixins.

```js
const { mixin, Model } = require('objection');

class Person extends mixin(Model, [
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({foo: 'bar'})
]) {

}
```

```js
const { compose, Model } = require('objection');

const mixins = compose(
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({foo: 'bar'})
);

class Person extends mixins(Model) {

}
```

> Mixins can also be used as decorators:

```js
@SomeMixin
@MixinWithOptions({foo: 'bar'})
class Person extends Model {

}
```

When possible, objection.js plugins should be implemented as [class mixins](http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/).
A mixin is simply a function that takes a class as an argument and returns a subclass. Plugins should
avoid modifying `objection.Model`, `objection.QueryBuilder` or any other global variables directly.
See the [example plugin](https://github.com/Vincit/objection.js/tree/master/examples/plugin) for more
info. There is also [another example](https://github.com/Vincit/objection.js/tree/master/examples/plugin-with-options)
that should be followed if your plugin takes options or configuration parameters.

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

Code and tests need to be written in ES2015 subset supported by node 6.0.0. The best way to make sure of this is
to develop with the correct node version. [nvm](https://github.com/creationix/nvm) is a great tool for swapping
between node versions. `prettier` is used to format the code. Remember to run `npm run prettier` before committing
code.
