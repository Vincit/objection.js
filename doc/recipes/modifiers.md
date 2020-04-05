# Modifiers

Modifiers allow you to easily reuse snippets of query logic. A modifier is simply a function that takes a [QueryBuilder](/api/query-builder/) as the first argument and optionally any number of arguments after that. Modifier functions can then mutate the query passed in, but they must always be synchronous. Here's a contrived example:

```js
function filterGender(query, gender) {
  query.where('gender', gender);
}
```

Model classes have the static [modifiers](/api/model/static-properties.md#static-modifiers) property that can be used to store these modifiers:

```js
class Person extends Model {
  static modifiers = {
    defaultSelects(query) {
      query.select('id', 'firstName');
    },

    filterGender(query, gender) {
      query.where('gender', gender);
    }
  };
}
```

Modifiers defined in the [modifiers](/api/model/static-properties.md#static-modifiers) object can then be used in many ways.

## Usage in a query

You can apply any modifier using the [modify](/api/query-builder/other-methods.md#modify) method:

```js
const women = await Person.query()
  .modify('defaultSelects')
  .modify('filterGender', 'female');
```

## Usage with eager loading

You can pass modifier names as "arguments" to the relation names in [relation expressions](/api/types/#type-relationexpression). See the [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) and [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) methods' docs for more info and examples.

```js
const people = await Person.query().withGraphFetched(
  'children(defaultSelects)'
);
```

Note that you can only use modifiers registered for the relation's model class. In the previous example `children` is of class `Person`, so you can use `defaultSelects` that was registered for the `Person` model. In the following example, `filterDogs` must have been specified in `Pet` model's `modifiers` object.

```js
const people = await Person.query().withGraphFetched(
  '[children(defaultSelects), pets(onlyDogs)]'
);
```

You can register new modifiers for a query using the [modifiers](/api/query-builder/other-methods.md#modifiers) query builder method. This also allows you to bind arguments to existing modifiers like this

```js
const people = await Person.query()
  .withGraphFetched('children(defaultSelects, filterWomen)')
  .modifiers({
    filterWomen: query => query.modify('filterGender', 'female')
  });
```

## Usage in joinRelated

```js
const women = await Person.query().joinRelated('children(defaultSelects)');
```

Query builder [modifiers](/api/query-builder/other-methods.md#modifiers) can also be used with `joinRelated` just like with `withGraphFetched` and `withGraphJoined`.

## Other usages

- Relation mappings' [modify](/api/types/#type-relationmapping) properties.

## Modifier best practices

You can refer to column names using strings just like we did in the previous example and you won't run into trouble in most cases. In some cases however modifiers may be used in contexts where it's not clear to which table the column names refer and objection doesn't (and in many cases could not) deduce that information from the query. If you want to play it safe, and make the modifiers usable in as many situations as possible, you can use the [Model.ref](/api/model/static-methods.md#static-ref) helper refer to columns. Like this:

```js
class Person extends Model {
  static modifiers = {
    defaultSelects(query) {
      const { ref } = Person;
      query.select(ref('id'), ref('firstName'));
    },

    filterGender(query, gender) {
      const { ref } = Person;
      query.where(ref('gender'), gender);
    }
  };
}
```

When `ref` is used, the modifiers work even when you have specified an alias for a table in a query.
