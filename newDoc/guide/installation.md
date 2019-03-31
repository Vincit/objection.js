# Installation

Objection.js can be installed using `npm` or `yarn`. Objection uses [knex](https://knexjs.org/) as its database access layer, so you also need to install it.

```bash
npm install objection knex
yarn add objection knex
```

You also need to install one of the following depending on the database you want to use:

```bash
npm install pg
npm install sqlite3
npm install mysql
npm install mysql2
```

You can use the `next` tag to install an alpha/beta/RC version:

```bash
npm install objection@next
```
