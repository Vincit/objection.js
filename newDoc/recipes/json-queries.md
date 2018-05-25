# JSON queries

You can use the [ref](/api/objection.html#ref) function from the main module to refer to json columns in queries. There is also a bunch of query building methods that have `Json` in their names. Check them out too.

See [FieldExpression](/api/types.html#type-fieldexpression) for more information about how to refer to json fields.

Json queries currently only work with postgres.

```js
const { ref } = require('objection');

await Person
  .query()
  .select([
    'id',
    ref('jsonColumn:details.name').castText().as('name'),
    ref('jsonColumn:details.age').castInt().as('age')
  ])
  .join('animals', ref('persons.jsonColumn:details.name').castText(), '=', ref('animals.name'))
  .where('age', '>', ref('animals.jsonData:details.ageLimit'));
```

Individual json fields can be updated like this:

```js
await Person
  .query()
  .patch({
    'jsonColumn:details.name': 'Jennifer',
    'jsonColumn:details.age': 29
  });
```
