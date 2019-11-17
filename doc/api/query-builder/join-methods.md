# Join Methods

## joinRelated()

```js
queryBuilder = queryBuilder.joinRelated(relationExpression, opt);
```

Joins a set of relations described by `relationExpression`. See the examples for more info.

##### Arguments

| Argument           | Type                                                      | Description                                       |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------- |
| relationExpression | [RelationExpression](/api/types/#type-relationexpression) | An expression describing which relations to join. |
| opt                | object                                                    | Optional options. See the examples.               |

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

##### Examples

Join one relation:

```js
await Person.query()
  .joinRelated('pets')
  .where('pets.species', 'dog');
```

Give an alias for a single relation:

```js
await Person.query()
  .joinRelated('pets', { alias: 'p' })
  .where('p.species', 'dog');
```

Join two relations:

```js
await Person.query()
  .joinRelated('[pets, parent]')
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

You can also use the [object notation](/api/types/#relationexpression-object-notation)

```js
await Person.query()
  .joinRelated({
    pets: true,
    parent: true
  })
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

Join multiple nested relations. Note that when referring to nested relations `:` must be used as a separator instead of `.`. This limitation comes from the way knex parses table references.

```js
await Person.query()
  .select('persons.id', 'parent:parent.name as grandParentName')
  .joinRelated('[pets, parent.[pets, parent]]')
  .where('parent:pets.species', 'dog');
```

Give aliases for a bunch of relations:

```js
await Person.query()
  .select('persons.id', 'pr:pr.name as grandParentName')
  .joinRelated('[pets, parent.[pets, parent]]', {
    aliases: {
      parent: 'pr',
      pets: 'pt'
    }
  })
  .where('pr:pt.species', 'dog');
```

You can also give aliases using the relation expression:

```js
await Person.query()
  .select('persons.id', 'pr:pr.name as grandParentName')
  .joinRelated('[pets as pt, parent as pr.[pets as pt, parent as pr]]')
  .where('pr:pt.species', 'dog');
```

## innerJoinRelated()

Alias for [joinRelated](/api/query-builder/join-methods.html#joinrelated).

## outerJoinRelated()

Outer join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## leftJoinRelated()

Left join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## leftOuterJoinRelated()

Left outer join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## rightJoinRelated()

Right join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## rightOuterJoinRelated()

Left outer join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## fullOuterJoinRelated()

Full outer join version of the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method.

## join()

See [knex documentation](http://knexjs.org/#Builder-join)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## joinRaw()

See [knex documentation](http://knexjs.org/#Builder-joinRaw)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## innerJoin()

See [knex documentation](http://knexjs.org/#Builder-innerJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## leftJoin()

See [knex documentation](http://knexjs.org/#Builder-leftJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## leftOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-leftOuterJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## rightJoin()

See [knex documentation](http://knexjs.org/#Builder-rightJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## rightOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-rightOuterJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## outerJoin()

See [knex documentation](http://knexjs.org/#Builder-outerJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## fullOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-fullOuterJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |

## crossJoin()

See [knex documentation](http://knexjs.org/#Builder-crossJoin)

##### Return value

| Type                                | Description                        |
| ----------------------------------- | ---------------------------------- |
| [QueryBuilder](/api/query-builder/) | `this` query builder for chaining. |
