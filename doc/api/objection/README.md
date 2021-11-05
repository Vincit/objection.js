---
sidebar: auto
---

# `module` objection

```js
const objection = require('objection');
const { Model, ref } = require('objection');
```

The objection module is what you get when you import objection. It has a bunch of properties that are listed below.

## Model

```js
const { Model } = require('objection');
```

[The model class](/api/model/)

## initialize

```js
const { initialize } = require('objection');
```

For some queries objection needs to perform asynchronous operations in preparation, like fetch table metadata from the db. Objection does these preparations on-demand the first time such query is executed. However, some methods like `toKnexQuery` need these preparations to have been made so that the query can be built synchronously. In these cases you can use `initialize` to "warm up" the models and do all needed async preparations needed. You only need to call this function once if you choose to use it.

Calling this function is completely optional. If some method requires this to have been called, they will throw a clear error message asking you to do so. These cases are extremely rare, but this function is here for those cases.

You can also call this function if you want to be in control of when these async preparation operations get executed. It can be helpful for example in tests.

##### Examples

```js
const { initialize } = require('objection');

await initialize(knex, [Person, Movie, Pet, SomeOtherModelClass]);
```

If knex has been installed for the `Model` globally, you can omit the first argument.

```js
const { initialize } = require('objection');

await initialize([Person, Movie, Pet, SomeOtherModelClass]);
```

## transaction

```js
const { transaction } = require('objection');
```

[The transaction function](/guide/transactions.html)

## ref

```js
const { ref } = require('objection');
```

Factory function that returns a [ReferenceBuilder](/api/types/#class-referencebuilder) instance, that makes it easier to refer to tables, columns, json attributes etc. [ReferenceBuilder](/api/types/#class-referencebuilder) can also be used to type cast and alias the references.

See [FieldExpression](/api/types/#type-fieldexpression) for more information about how to refer to json fields.

##### Examples

```js
const { ref } = require('objection');

await Model.query()
  .select([
    'id',
    ref('Model.jsonColumn:details.name')
      .castText()
      .as('name'),
    ref('Model.jsonColumn:details.age')
      .castInt()
      .as('age')
  ])
  .join(
    'OtherModel',
    ref('Model.jsonColumn:details.name').castText(),
    '=',
    ref('OtherModel.name')
  )
  .where('age', '>', ref('OtherModel.ageLimit'));
```

`withGraphJoined` and `joinRelated` methods also use `:` as a separator which can lead to ambiquous queries when combined with json references. For example:

```
jsonColumn:details.name
```

Can mean two things:

1. column `name` of the relation `jsonColumn.details`
2. field `name` of the `details` object inside `jsonColumn` column

When used with `withGraphJoined` and `joinRelated` you can use the `from` method of the `ReferenceBuilder` to specify the table:

```js
await Person.query()
  .withGraphJoined('children.children')
  .where(ref('jsonColumn:details.name').from('children:children'), 'Jennifer');
```

## raw

```js
const { raw } = require('objection');
```

Factory function that returns a [RawBuilder](/api/types/#class-rawbuilder) instance. [RawBuilder](/api/types/#class-rawbuilder) is a wrapper for knex raw method that doesn't depend on knex. Instances of [RawBuilder](/api/types/#class-rawbuilder) are converted to knex raw instances lazily when the query is executed.

Also see [the raw query recipe](/recipes/raw-queries.html).

##### Examples

When using raw SQL segments in queries, it's a good idea to use placeholders instead of adding user input directly to the SQL to avoid injection errors. Placeholders are sent to the database engine which then takes care of interpolating the SQL safely.

You can use `??` as a placeholder for identifiers (column names, aliases etc.) and `?` for values.

```js
const { raw } = require('objection');

const result = await Person.query()
  .select(raw('coalesce(sum(??), 0) as ??', ['age', 'ageSum']))
  .where('age', '<', raw('? + ?', [50, 25]));

console.log(result[0].ageSum);
```

You can use `raw` in insert and update queries too:

```js
await Person.query().patch({
  age: raw('age + ?', 10)
});
```

You can also use named placeholders. `:someName:` for identifiers (column names, aliases etc.) and `:someName` for values.

```js
await Person.query()
  .select(
    raw('coalesce(sum(:sumColumn:), 0) as :alias:', {
      sumColumn: 'age',
      alias: 'ageSum'
    })
  )
  .where(
    'age',
    '<',
    raw(':value1 + :value2', {
      value1: 50,
      value2: 25
    })
  );
```

You can nest `ref`, `raw`, `val` and query builders (both knex and objection) in `raw` calls

```js
const { val } = require('objection')

await Person
  .query()
  .select(raw('coalesce(:sumQuery, 0) as :alias:', {
    sumQuery: Person.query().sum('age'),
    alias: 'ageSum'
  }))
  .where('age', '<', raw(':value1 + :value2', {
    value1: val(50)
    value2: knex.raw('25')
  }));
```

## val

```js
const { val } = require('objection');
```

Factory function that returns a [ValueBuilder](/api/types/#class-valuebuilder) instance. [ValueBuilder](/api/types/#class-valuebuilder) helps build values of different types.

##### Examples

```js
const { val, ref } = require('objection');

// Compare json objects
await Model.query().where(
  ref('Model.jsonColumn:details'),
  '=',
  val({ name: 'Jennifer', age: 29 })
);

// Insert an array.
await Model.query().insert({
  numbers: val([1, 2, 3])
    .asArray()
    .castTo('real[]')
});
```

## fn

```js
const { fn } = require('objection');
```

Factory function that returns a [FunctionBuilder](/api/types/#class-functionbuilder) instance. `fn` helps calling SQL functions. The signature is:

```js
const functionBuilder = fn(functionName, ...args);
```

For example:

```js
fn('coalesce', ref('age'), 0);
```

The `fn` function also has shortcuts for most common functions:

```js
fn.now();
fn.now(precision);
fn.coalesce(...args);
fn.concat(...args);
fn.sum(...args);
fn.avg(...args);
fn.min(...args);
fn.max(...args);
fn.count(...args);
fn.upper(...args);
fn.lower(...args);
```

All arguments are interpreted as values by default. Use `ref` to refer to columns. you can also pass `raw` instances, other `fn` instances, `QueryBuilders` knex builders, knex raw and anything else just like to any other objection method.

##### Examples

```js
const { fn, ref } = require('objection');

// Compare nullable numbers
await Model.query().where(fn('coalesce', ref('age'), 0), '>', 30);

// The same example using the fn.coalesce shortcut
await Model.query().where(fn.coalesce(ref('age'), 0), '>', 30);
```

Note that it can often be cleaner to use `raw` or `whereRaw`:

```js
await Model.query().whereRaw('coalesce(age, 0) > ?', 30);
```

## mixin

```js
const { mixin } = require('objection');
```

The mixin helper for applying multiple [plugins](/guide/plugins.html).

##### Examples

```js
const { mixin, Model } = require('objection');

class Person extends mixin(Model, [
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({ foo: 'bar' })
]) {}
```

## compose

```js
const { compose } = require('objection');
```

The compose helper for applying multiple [plugins](/guide/plugins.html).

##### Examples

```js
const { compose, Model } = require('objection');

const mixins = compose(
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({ foo: 'bar' })
);

class Person extends mixins(Model) {}
```

## snakeCaseMappers

```js
const { snakeCaseMappers } = require('objection');
```

Function for adding snake_case to camelCase conversion to objection models. Better documented [here](/recipes/snake-case-to-camel-case-conversion.html). The `snakeCaseMappers` function accepts an options object. The available options are:

| Option                            | Type    | Default | Description                                                                                                                                             |
| --------------------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| upperCase                         | boolean | `false` | Set to `true` if your columns are UPPER_SNAKE_CASED.                                                                                                    |
| underscoreBeforeDigits            | boolean | `false` | When `true`, will place an underscore before digits (`foo1Bar2` becomes `foo_1_bar_2`). When `false`, `foo1Bar2` becomes `foo1_bar2`.                   |
| underscoreBetweenUppercaseLetters | boolean | `false` | When `true`, will place underscores between consecutive uppercase letters (`fooBAR` becomes `foo_b_a_r`). When `false`, `fooBAR` will become `foo_bar`. |

##### Examples

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers();
  }
}
```

If your columns are UPPER_SNAKE_CASE

```js
const { Model, snakeCaseMappers } = require('objection');

class Person extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers({ upperCase: true });
  }
}
```

## knexSnakeCaseMappers

```js
const { knexSnakeCaseMappers } = require('objection');
```

Function for adding a snake_case to camelCase conversion to `knex`. Better documented [here](/recipes/snake-case-to-camel-case-conversion.html). The `knexSnakeCaseMappers` function accepts an options object. The available options are:

| Option                            | Type    | Default | Description                                                                                                                                             |
| --------------------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| upperCase                         | boolean | `false` | Set to `true` if your columns are UPPER_SNAKE_CASED.                                                                                                    |
| underscoreBeforeDigits            | boolean | `false` | When `true`, will place an underscore before digits (`foo1Bar2` becomes `foo_1_bar_2`). When `false`, `foo1Bar2` becomes `foo1_bar2`.                   |
| underscoreBetweenUppercaseLetters | boolean | `false` | When `true`, will place underscores between consecutive uppercase letters (`fooBAR` becomes `foo_b_a_r`). When `false`, `fooBAR` will become `foo_bar`. |

##### Examples

```js
const { knexSnakeCaseMappers } = require('objection');
const Knex = require('knex');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  ...knexSnakeCaseMappers()
});
```

If your columns are UPPER_SNAKE_CASE

```js
const { knexSnakeCaseMappers } = require('objection');
const Knex = require('knex');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  ...knexSnakeCaseMappers({ upperCase: true })
});
```

For older nodes:

```js
const Knex = require('knex');
const knexSnakeCaseMappers = require('objection').knexSnakeCaseMappers;

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  },

  ...knexSnakeCaseMappers()
});
```

## knexIdentifierMapping

```js
const { knexIdentifierMapping } = require('objection');
```

Like [knexSnakeCaseMappers](/api/objection/#knexsnakecasemappers), but can be used to make an arbitrary static mapping between column names and property names. In the examples, you would have identifiers `MyId`, `MyProp` and `MyAnotherProp` in the database and you would like to map them into `id`, `prop` and `anotherProp` in the code.

##### Examples

```js
const { knexIdentifierMapping } = require('objection');
const Knex = require('knex');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  ...knexIdentifierMapping({
    MyId: 'id',
    MyProp: 'prop',
    MyAnotherProp: 'anotherProp'
  })
});
```

Note that you can pretty easily define the conversions in some static property of your model. In this example we have added a property `column` to jsonSchema and use that to create the mapping object.

```js
const { knexIdentifierMapping } = require('objection');
const Knex = require('knex');
const path = require('path')
const fs = require('fs');

// Path to your model folder.
const MODELS_PATH = path.join(__dirname, 'models');

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }

  // Go through all models and add conversions using the custom property
  // `column` in json schema.
  ...knexIdentifierMapping(fs.readdirSync(MODELS_PATH)
    .filter(it => it.endsWith('.js'))
    .map(it => require(path.join(MODELS_PATH, it)))
    .reduce((mapping, modelClass) => {
      const properties = modelClass.jsonSchema.properties;
      return Object.keys(properties).reduce((mapping, propName) => {
        mapping[properties[propName].column] = propName;
        return mapping;
      }, mapping);
    }, {});
  )
});
```

For older nodes:

```js
const Knex = require('knex');
const knexIdentifierMapping = require('objection').knexIdentifierMapping;

const knex = Knex({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  },

  ...knexIdentifierMapping({
    MyId: 'id',
    MyProp: 'prop',
    MyAnotherProp: 'anotherProp'
  })
});
```

## ValidationError

```js
const { ValidationError } = require('objection');
```

The [ValidationError](/api/types/#class-validationerror) class.

## NotFoundError

```js
const { NotFoundError } = require('objection');
```

The [NotFoundError](/api/types/#class-notfounderror) class.

## DBError

```js
const { DBError } = require('objection');
```

The [DBError](https://github.com/Vincit/db-errors#dberror) from [db-errors](https://github.com/Vincit/db-errors) library.

## ConstraintViolationError

```js
const { ConstraintViolationError } = require('objection');
```

The [ConstraintViolationError](https://github.com/Vincit/db-errors#constraintviolationerror) from [db-errors](https://github.com/Vincit/db-errors) library.

## UniqueViolationError

```js
const { UniqueViolationError } = require('objection');
```

The [UniqueViolationError](https://github.com/Vincit/db-errors#uniqueviolationerror) from [db-errors](https://github.com/Vincit/db-errors) library.

## NotNullViolationError

```js
const { NotNullViolationError } = require('objection');
```

The [NotNullViolationError](https://github.com/Vincit/db-errors#notnullviolationerror) from [db-errors](https://github.com/Vincit/db-errors) library.

## ForeignKeyViolationError

```js
const { ForeignKeyViolationError } = require('objection');
```

The [ForeignKeyViolationError](https://github.com/Vincit/db-errors#foreignkeyviolationerror) from [db-errors](https://github.com/Vincit/db-errors) library.

## CheckViolationError

```js
const { CheckViolationError } = require('objection');
```

The [CheckViolationError](https://github.com/Vincit/db-errors#checkviolationerror) from [db-errors](https://github.com/Vincit/db-errors) library.

## DataError

```js
const { DataError } = require('objection');
```

The [DataError](https://github.com/Vincit/db-errors#dataerror) from [db-errors](https://github.com/Vincit/db-errors) library.
