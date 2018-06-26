# module objection

```js
const objection = require('objection');
const { Model, ref } = require('objection');
```

The `objection module` is what you get when you import objection. It has a bunch of properties that are all documented elsewhere in the API docs.

## class Model

```js
const { Model } = require('objection');
```

[The model base class.](/api/model.html)

## transaction()

```js
const { transaction } = require('objection');
```
[The transaction function.](/guide/transactions.html)

## ref()

```js
const { ref } = require('objection');
```

Factory function that returns a [ReferenceBuilder](/api/types.html#referencebuilder) instance, that makes it easier to refer to tables, columns, json attributes etc. [ReferenceBuilder](/api/types.html#referencebuilder) can also be used to type cast and alias the references.

See [FieldExpression](/api/types.html#fieldexpression) for more information about how to refer to json fields.

### Examples

```js
const { ref } = require('objection');

await Model.query()
  .select([
    'id',
    ref('Model.jsonColumn:details.name').castText().as('name'),
    ref('Model.jsonColumn:details.age').castInt().as('age')
  ])
  .join('OtherModel', ref('Model.jsonColumn:details.name').castText(), '=', ref('OtherModel.name'))
  .where('age', '>', ref('OtherModel.ageLimit'));
```

## raw()

## lit()

## ref()
