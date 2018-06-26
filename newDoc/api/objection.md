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

[The model class](/api/model.html)

## transaction

```js
const { transaction } = require('objection');
```
[The transaction function](/guide/transactions.html)

## ref

```js
const { ref } = require('objection');
```

Factory function that returns a [ReferenceBuilder](/api/types.html#referencebuilder) instance, that makes it easier to refer to tables, columns, json attributes etc. [ReferenceBuilder](/api/types.html#referencebuilder) can also be used to type cast and alias the references.

See [FieldExpression](/api/types.html#fieldexpression) for more information about how to refer to json fields.

#### Examples

```js
const { ref } = require('objection');

await Model.query()
  .select([
    'id',
    ref('Model.jsonColumn:details.name').castText().as('name'),
    ref('Model.jsonColumn:details.age').castInt().as('age')
  ])
  .join(
    'OtherModel',
    ref('Model.jsonColumn:details.name').castText(),
    '=',
    ref('OtherModel.name')
  )
  .where('age', '>', ref('OtherModel.ageLimit'));
```

## raw

```js
const { raw } = require('objection');
```

Factory function that returns a [RawBuilder](/api/types.html#rawbuilder) instance. [RawBuilder](/api/types.html#rawbuilder) is a wrapper for knex raw method that doesn't depend on knex. Instances of [RawBuilder](/api/types.html#rawbuilder) are converted to knex raw instances lazily when the query is executed.

#### Examples

When using raw SQL segments in queries, it's a good idea to use placeholders instead of  adding user input directly to the SQL to avoid injection errors. Placeholders are sent to the database engine which then takes care of interpolating the SQL safely.

You can use `??` as a placeholder for identifiers (column names, aliases etc.) and `?` for values.

```js
const { raw } = require('objection');

const result = await Person
  .query()
  .select(raw('coalesce(sum(??), 0) as ??', ['age', 'ageSum']))
  .where('age', '<', raw('? + ?', [50, 25]));

console.log(result[0].ageSum);
```

You can also use named placeholders. `:someName:` for identifiers (column names, aliases etc.) and `:someName` for values.

```js
await Person
  .query()
  .select(raw('coalesce(sum(:sumColumn:), 0) as :alias:', {
    sumColumn: 'age',
    alias: 'ageSum'
  }))
  .where('age', '<', raw(':value1 + :value2', {
    value1: 50,
    value2: 25
  }));
```

You can nest `ref`, `raw`, `lit` and query builders (both knex and objection) in `raw` calls

```js
const { lit } = require('objection')

await Person
  .query()
  .select(raw('coalesce(:sumQuery, 0) as :alias:', {
    sumQuery: Person.query().sum('age'),
    alias: 'ageSum'
  }))
  .where('age', '<', raw(':value1 + :value2', {
    value1: lit(50)
    value2: knex.raw('25')
  }));
```

## lit

```js
const { lit } = require('objection')
```

Factory function that returns a [LiteralBuilder](/api/types.html#literalbuilder) instance. [LiteralBuilder](/api/types.html#literalbuilder) helps build literals of different types.

#### Examples

```js
const { lit, ref } = require('objection');

// Compare json objects
await Model
  .query()
  .where(ref('Model.jsonColumn:details'), '=', lit({name: 'Jennifer', age: 29}))

// Insert an array literal
await Model
  .query()
  .insert({
    numbers: lit([1, 2, 3]).asArray().castTo('real[]')
  })
```

## mixin

```js
const { mixin } = require('objection');
```

The mixin helper for applying multiple [plugins](/guide/plugins.html).

#### Examples

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

## compose

```js
const { compose } = require('objection');
```

The compose helper for applying multiple [plugins](/guide/plugins.html).

#### Examples

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

## snakeCaseMappers

```js
const { snakeCaseMappers } = require('objection');
```

Function for adding snake_case to camelCase conversion to objection models. Better documented [here](/recipes/snake-case-to-camel-case-conversion.html). The `snakeCaseMappers` function accepts an options object. The available options are:

Option|Type|Description
---------|-------|------------------------
upperCase|boolean|Set to `true` if your columns are UPPER_SNAKE_CASED.

#### Examples

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

Option|Type|Description
---------|-------|------------------------
upperCase|boolean|Set to `true` if your columns are UPPER_SNAKE_CASED.

#### Examples

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

const knex = Knex(Object.assign({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }
}, knexSnakeCaseMappers()));
```

## knexIdentifierMapping

```js
const { knexIdentifierMapping } = require('objection');
```

Like [knexSnakeCaseMappers](#nexsnakecasemappers), but can be used to make an arbitrary static mapping between column names and property names. In the examples, you would have identifiers `MyId`, `MyProp` and `MyAnotherProp` in the database and you would like to map them into `id`, `prop` and `anotherProp` in the code.

#### Examples

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

const knex = Knex(Object.assign({
  client: 'postgres',

  connection: {
    host: '127.0.0.1',
    user: 'objection',
    database: 'objection_test'
  }
}, knexIdentifierMapping({
  MyId: 'id',
  MyProp: 'prop',
  MyAnotherProp: 'anotherProp'
})));
```
