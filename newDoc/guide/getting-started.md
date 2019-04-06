# Getting started

To use objection.js all you need to do is [initialize knex](http://knexjs.org/#Installation-node) and give the created knex instance to objection.js using [Model.knex(knex)](/api/model/static-methods.html#static-knex). Doing this installs the knex instance globally for all models (even the ones that have not been created yet). If you need to use multiple databases check out our [multi-tenancy recipe](/recipes/multitenancy-using-multiple-databases.html).

The next step is to create some migrations and models and start using objection.js. The best way to get started is to check out one of our example projects:

* [The minimal example](https://github.com/Vincit/objection.js/tree/master/examples/minimal) contains the bare minimum for you to start testing out things with objection.

```bash
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/minimal
npm install
npm start
```

* [The express example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es6) is a simple [express](https://expressjs.com/) server. The `client.js` file contains a bunch of http requests for you to start playing with the REST API.

```bash
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express-es6
npm install
npm start
```

We also have an [ESNext version of the example project](https://github.com/Vincit/objection.js/tree/master/examples/express-es7) that uses [Babel](https://babeljs.io/) for ESNext --> ES2015 transpiling and a [typescript version](https://github.com/Vincit/objection.js/tree/master/examples/express-ts).

Also check out our [API reference](/api/query-builder/) and [recipe book](/recipes/raw-queries.html).

If installing the example project seems like too much work, here is a simple standalone example. Just copy this into a file and run it:

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

// Give the knex instance to objection.
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
  if (await knex.schema.hasTable('persons')) {
    return;
  }

  // Create database schema. You should use knex migration files
  // to do this. We create it here for simplicity.
  await knex.schema.createTable('persons', table => {
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

createSchema()
  .then(() => main())
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });
```
