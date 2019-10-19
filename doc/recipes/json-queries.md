# JSON queries

You can use the [ref](/api/objection/#ref) function from the main module to refer to json columns in queries. There is also a bunch of query building methods that have `Json` in their names. Check them out too.

See [FieldExpression](/api/types/#type-fieldexpression) for more information about how to refer to json fields.

Json queries currently only work with postgres.

```js
const { ref } = require('objection');

await Person.query()
  .select([
    'id',
    ref('jsonColumn:details.name')
      .castText()
      .as('name'),
    ref('jsonColumn:details.age')
      .castInt()
      .as('age')
  ])
  .join(
    'animals',
    ref('persons.jsonColumn:details.name').castText(),
    '=',
    ref('animals.name')
  )
  .where('age', '>', ref('animals.jsonData:details.ageLimit'));
```

Individual json fields can be updated like this:

```js
await Person.query().patch({
  'jsonColumn:details.name': 'Jennifer',
  'jsonColumn:details.age': 29
});
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
