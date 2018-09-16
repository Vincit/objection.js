[![Build Status](https://travis-ci.org/Vincit/objection.js.svg?branch=master)](https://travis-ci.org/Vincit/objection.js) [![Coverage Status](https://coveralls.io/repos/github/Vincit/objection.js/badge.svg?branch=master)](https://coveralls.io/github/Vincit/objection.js?branch=master) [![Join the chat at https://gitter.im/Vincit/objection.js](https://badges.gitter.im/Vincit/objection.js.svg)](https://gitter.im/Vincit/objection.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# [Objection.js](https://vincit.github.io/objection.js)

[Objection.js](https://vincit.github.io/objection.js) is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
for [Node.js](https://nodejs.org/) that aims to stay out of your way and make it as easy as possible to use the full
power of SQL and the underlying database engine while keeping magic to a minimum.

Objection.js is built on an SQL query builder called [knex](http://knexjs.org). All databases supported by knex
are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * **An easy declarative way of [defining models](https://vincit.github.io/objection.js/#models) and relationships between them**
 * **Simple and fun way to [fetch, insert, update and delete](https://vincit.github.io/objection.js/#query-examples) objects using the full power of SQL**
 * **Powerful mechanisms for [eager loading](https://vincit.github.io/objection.js/#eager-loading), [inserting](https://vincit.github.io/objection.js/#graph-inserts) and [upserting](https://vincit.github.io/objection.js/#graph-upserts) object graphs**
 * **A way to [store complex documents](https://vincit.github.io/objection.js/#documents) as single rows**
 * **Completely [Promise](https://github.com/petkaantonov/bluebird) based API**
 * **Easy to use [transactions](https://vincit.github.io/objection.js/#transactions)**
 * **Optional [JSON schema](https://vincit.github.io/objection.js/#validation) validation**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
 This doesn't mean you have to write SQL strings though. A query builder based on [`knex`](http://knexjs.org) is
    used to build the SQL. However, if the query builder fails you for some reason, raw SQL strings can be easily
    written using the [raw](http://vincit.github.io/objection.js/#raw) helper function.
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

Shortcuts:
 * [API reference](https://vincit.github.io/objection.js/#api-reference)
 * [Changelog](https://vincit.github.io/objection.js/#changelog)
 * [Contribution guide](https://vincit.github.io/objection.js/#contribution-guide)
 * [Plugins](https://vincit.github.io/objection.js/#plugins)
