[![Build Status](https://travis-ci.org/Vincit/objection.js.svg?branch=master)](https://travis-ci.org/Vincit/objection.js) [![Coverage Status](https://coveralls.io/repos/Vincit/objection.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/Vincit/objection.js?branch=master) [![Join the chat at https://gitter.im/Vincit/objection.js](https://badges.gitter.im/Vincit/objection.js.svg)](https://gitter.im/Vincit/objection.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


# [Objection.js](http://vincit.github.io/objection.js)

[Objection.js](http://vincit.github.io/objection.js) is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
for [Node.js](https://nodejs.org/) that aims to stay out of your way and make it as easy as possible to use the full
power of SQL and the underlying database engine.

Objection.js is built on the wonderful SQL query builder [knex](http://knexjs.org). All databases supported by knex
are supported by objection.js. **SQLite3**, **Postgres** and **MySQL** are [thoroughly tested](https://travis-ci.org/Vincit/objection.js).

What objection.js gives you:

 * **An easy declarative way of [defining models](http://vincit.github.io/objection.js/#models) and relations between them**
 * **Simple and fun way to [fetch, insert, update and delete](http://vincit.github.io/objection.js/#query-examples) objects using the full power of SQL**
 * **Powerful mechanisms for [eager loading](http://vincit.github.io/objection.js/#eager-loading) and [inserting](http://vincit.github.io/objection.js/#graph-inserts) object graphs**
 * **A way to [store complex documents](http://vincit.github.io/objection.js/#documents) as single rows**
 * **Completely [Promise](https://github.com/petkaantonov/bluebird) based API**
 * **Easy to use [transactions](http://vincit.github.io/objection.js/#transactions)**
 * **Optional [JSON schema](http://vincit.github.io/objection.js/#validation) validation**

What objection.js **doesn't** give you:

 * **A custom query DSL. SQL is used as a query language.**
 * **Automatic database schema creation and migration.**
    For simple things it is useful that the database schema is automatically generated from the model definitions,
    but usually just gets in your way when doing anything non-trivial. Objection.js leaves the schema related things
    to you. knex has a great [migration tool](http://knexjs.org/#Migrations) that we recommend for this job. Check
    out the [example project](https://github.com/Vincit/objection.js/tree/master/examples/express).

Objection.js uses Promises and coding practices that make it ready for the future. We use Well known
[OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) techniques and ES6 compatible classes and inheritance
in the codebase. You can even use things like ES7 [async/await](http://jakearchibald.com/2014/es7-async-functions/)
using a transpiler such as [Babel](https://babeljs.io/). Check out our [ES6](https://github.com/Vincit/objection.js/tree/master/examples/express-es6)
and [ES7](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) example projects.

Shortcuts:
 * [API reference](http://vincit.github.io/objection.js/#api-reference)
 * [Changelog](http://vincit.github.io/objection.js/#changelog)

Blog posts and tutorials:

 * [Introduction](https://www.vincit.fi/en/blog/introducing-moron-js-a-new-orm-for-node-js/) (objection.js was originally called moron.js)
 * [Eager loading](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/)
 * [Postgres JSON queries](https://www.vincit.fi/en/blog/by-the-power-of-json-queries/)
