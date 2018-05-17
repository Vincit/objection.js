---
home: true
heroText: Objection.js
tagline: An SQL-friendly ORM for Node.js
actionText: Get Started →
actionLink: /guide/installation
footer: MIT Licensed | Copyright © 2015-present Sami Koskimäki
---

Objection.js is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for [Node.js](https://nodejs.org/) that aims to stay out of your way and make it as easy as possible to use the full power of SQL and the underlying database engine while keeping magic to a minimum.

Objection.js is built on an SQL query builder called [knex](http://knexjs.org). All databases supported by knex are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * **An easy declarative way of [defining models](/guide/models.html) and relationships between them**
 * **Simple and fun way to [fetch, insert, update and delete](/guide/query-examples.html#simple-queries) objects using the full power of SQL**
 * **Powerful mechanisms for [eager loading](/guide/query-examples.html#eager-loading), [inserting](/guide/query-examples.html#graph-inserts) and [upserting](/guide/query-examples.html#graph-upserts) object graphs**
 * **A way to [store complex documents](/guide/documents.html) as single rows**
 * **Completely [Promise](https://github.com/petkaantonov/bluebird) based API**
 * **Easy to use [transactions](/guide/transactions.html)**
 * **Optional [JSON schema](/guide/validation.html) validation**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
 * **Automatic database schema creation and migration from model definitions.**
    For simple things it is useful that the database schema is automatically generated from the model definitions,
    but usually just gets in your way when doing anything non-trivial. Objection.js leaves the schema related things
    to you. knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job. Check
    out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6).

Objection.js uses Promises and coding practices that make it ready for the future. We use Well known [OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) techniques and ES2015 classes and inheritance in the codebase. You can use things like [async/await](http://jakearchibald.com/2014/es7-async-functions/) using node ">=7.6.0" or alternatively with a transpiler such as [Babel](https://babeljs.io/). Check out our [ES2015](https://github.com/Vincit/objection.js/tree/master/examples/express-es6) and [ESNext](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) example projects.
