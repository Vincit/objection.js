[![Build Status](https://travis-ci.org/Vincit/objection.js.svg?branch=master)](https://travis-ci.org/Vincit/objection.js) [![Coverage Status](https://coveralls.io/repos/github/Vincit/objection.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/Vincit/objection.js?branch=master) [![Join the chat at https://gitter.im/Vincit/objection.js](https://badges.gitter.im/Vincit/objection.js.svg)](https://gitter.im/Vincit/objection.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# [Objection.js](https://vincit.github.io/objection.js)

Objection.js is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for [Node.js](https://nodejs.org/) that aims to stay out of your way and make it as easy as possible to use the full power of SQL and the underlying database engine while still making the common stuff easy and enjoyable.

Even though ORM is the best commonly known acronym to describe objection, a more accurate description is to call it **a relational query builder**. You get all the benefits of an SQL query builder but also a powerful set of tools for working with relations.

Objection.js is built on an SQL query builder called [knex](http://knexjs.org). All databases supported by knex are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * **An easy declarative way of [defining models](https://vincit.github.io/objection.js/guide/models.html) and relationships between them**
 * **Simple and fun way to [fetch, insert, update and delete](https://vincit.github.io/objection.js/guide/query-examples.html#basic-queries) objects using the full power of SQL**
 * **Powerful mechanisms for [eager loading](https://vincit.github.io/objection.js/guide/query-examples.html#eager-loading), [inserting](https://vincit.github.io/objection.js/guide/query-examples.html#graph-inserts) and [upserting](https://vincit.github.io/objection.js/guide/query-examples.html#graph-upserts) object graphs**
 * **Easy to use [transactions](https://vincit.github.io/objection.js/guide/transactions.html)**
 * **Official [TypeScript](https://github.com/Vincit/objection.js/blob/master/typings/objection/index.d.ts) support**
 * **Optional [JSON schema](https://vincit.github.io/objection.js/guide/validation.html) validation**
  * **A way to [store complex documents](https://vincit.github.io/objection.js/guide/documents.html) as single rows**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
  This doesn't mean you have to write SQL strings though. A query builder based on [knex](http://knexjs.org) is
    used to build the SQL. However, if the query builder fails you for some reason, raw SQL strings can be easily
    written using the [raw](https://vincit.github.io/objection.js/api/objection/#raw) helper function.
 * **Automatic database schema creation and migration from model definitions.**
    For simple things it is useful that the database schema is automatically generated from the model definitions,
    but usually just gets in your way when doing anything non-trivial. Objection.js leaves the schema related things
    to you. knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job. Check
    out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6).

The best way to get started is to clone our [ES2015](https://github.com/Vincit/objection.js/tree/master/examples/express-es6), [ESNext](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) or [typescript](https://github.com/Vincit/objection.js/tree/master/examples/express-ts) example project.

Check out [this issue](https://github.com/Vincit/objection.js/issues/1069) to see who is using objection and what they think about it.

Shortcuts:
 * [Who uses objection.js](https://github.com/Vincit/objection.js/issues/1069)
 * [API reference](https://vincit.github.io/objection.js/api/query-builder/)
 * [Example projects](https://github.com/Vincit/objection.js/tree/master/examples)
 * [Changelog](https://vincit.github.io/objection.js/changelog/)
 * [Contribution guide](https://vincit.github.io/objection.js/guide/contributing.html)
 * [Plugins](https://vincit.github.io/objection.js/guide/plugins.html)
