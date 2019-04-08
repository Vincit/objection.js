# Join Methods

## joinRelation()

```js
queryBuilder = queryBuilder.joinRelation(relationExpression, opt);
```

Joins a set of relations described by `relationExpression`. See the examples for more info.

##### Arguments

Argument|Type|Description
--------|----|--------------------
relationExpression|[RelationExpression](/api/types/#type-relationexpression)|An expression describing which relations to join.
opt|object|Optional options. See the examples.

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

##### Examples

Join one relation:

```js
await Person
  .query()
  .joinRelation('pets')
  .where('pets.species', 'dog');
```

Give an alias for a single relation:

```js
await Person
  .query()
  .joinRelation('pets', { alias: 'p' })
  .where('p.species', 'dog');
```

Join two relations:

```js
await Person
  .query()
  .joinRelation('[pets, parent]')
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

You can also use the [object notation](/api/types/#relationexpression-object-notation)

```js
await Person
  .query()
  .joinRelation({
    pets: true,
    parent: true
  })
  .where('pets.species', 'dog')
  .where('parent.name', 'Arnold');
```

Join two multiple and nested relations. Note that when referring to nested relations `:` must be used as a separator instead of `.`. This limitation comes from the way knex parses table references.

```js
await Person
  .query()
  .select('persons.id', 'parent:parent.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]')
  .where('parent:pets.species', 'dog');
```

Give aliases for a bunch of relations:

```js
await Person
  .query()
  .select('persons.id', 'pr:pr.name as grandParentName')
  .joinRelation('[pets, parent.[pets, parent]]', {
    aliases: {
      parent: 'pr',
      pets: 'pt'
    }
  })
  .where('pr:pt.species', 'dog');
```

## innerJoinRelation()

Alias for [joinRelation](/api/query-builder/join-methods.html#joinrelation).

## outerJoinRelation()

Outer join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## leftJoinRelation()

Left join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## leftOuterJoinRelation()

Left outer join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## rightJoinRelation()

Right join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## rightOuterJoinRelation()

Left outer join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## fullOuterJoinRelation()

Full outer join version of the [joinRelation](/api/query-builder/join-methods.html#joinrelation) method.

## join()

See [knex documentation](http://knexjs.org/#Builder-join)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## joinRaw()

See [knex documentation](http://knexjs.org/#Builder-joinRaw)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## innerJoin()

See [knex documentation](http://knexjs.org/#Builder-innerJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## leftJoin()

See [knex documentation](http://knexjs.org/#Builder-leftJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## leftOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-leftOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## rightJoin()

See [knex documentation](http://knexjs.org/#Builder-rightJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## rightOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-rightOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## outerJoin()

See [knex documentation](http://knexjs.org/#Builder-outerJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## fullOuterJoin()

See [knex documentation](http://knexjs.org/#Builder-fullOuterJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.

## crossJoin()

See [knex documentation](http://knexjs.org/#Builder-crossJoin)

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|`this` query builder for chaining.
