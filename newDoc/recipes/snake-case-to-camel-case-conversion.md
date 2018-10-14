# Snake case to camel case conversion

You may want to use snake_cased names in database and camelCased names in code. There are two ways to achieve this:

1. _Conversion in knex using [knexSnakeCaseMappers](/api/objection.html#knexsnakecasemappers)_. When the conversion is done on knex level __everything__ is converted to camel case including properties and identifiers in [relationMappings](/api/model.html#static-relationmappings) and queries. When this method is used, objection has no idea the database is defined in snake case. All it ever sees is camel cased properties, identifiers and tables. This is because the conversion is done using knex's `postProcessResponse` and `wrapIdentifier` hooks which are executed by knex before objection receives the data.

2. _Conversion in objection using [snakeCaseMappers](/api/objection.html#snakecasemappers)_. When the conversion is done on objection level only database columns of the returned rows (model instances) are convered to camel case. You still need to use snake case in [relationMappings](/api/model.html#static-relationmappings) and queries. Note that [insert](/api/query-builder.html#insert), [patch](/api/query-builder.html#patch), [update](/api/query-builder.html#update) and their variants still take objects in camel case. The reasoning is that objects passed to those methods usually come from the client that also uses camel case.

Let's assume this is our schema:

```js
exports.up = knex => {
  return knex.schema.createTable('persons_table', table => {
    table.increments('id_column').primary();
    table.string('first_name');
    table.string('last_name');
    table.integer('parent_id').references('persons_table.id_column');
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists('persons_table');
};
```

**knexSnakeCaseMappers:**

```js
const Knex = require('knex');
const { Model, knexSnakeCaseMappers } = require('objection');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  // If your columns are UPPER_SNAKE_CASE you can use
  // knexSnakeCaseMappers({ upperCase: true })
  ...knexSnakeCaseMappers()
});

...

// When `knexSnakeCaseMappers` is used, you need to define tables,
// columns and relation mappings using camelCase.
class Person extends Model {
  static get tableName() {
    return 'personsTable';
  }

  static get idColumn() {
    return 'idColumn';
  }

  static get relationMappings() {
    return {
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'personsTable.parentId',
          to: 'personsTable.idColumn'
        }
      }
    };
  }
}

...

// All column names in queries need to be camel case too.
await Person.query().where('firstName', 'Jennifer');
```

**snakeCaseMappers:**

```js
const { Model, snakeCaseMappers } = require('objection');

// When `snakeCaseMappers` is used, you still define tables,
// columns and relation mappings using snake_case.
class Person extends Model {
  static get columnNameMappers() {
    // If your columns are UPPER_SNAKE_CASE you can
    // use snakeCaseMappers({ upperCase: true })
    return snakeCaseMappers();
  }

  static get tableName() {
    return 'persons_table';
  }

  static get idColumn() {
    return 'id_column';
  }

  static get relationMappings() {
    return {
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'persons_table.parent_id',
          to: 'persons_table.id_column'
        }
      }
    };
  }
}

...

// Queries need to use the database casing.
await Person.query().where('first_name', 'Jennifer');
```
