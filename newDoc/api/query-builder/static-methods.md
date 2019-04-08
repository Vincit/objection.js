# Static Methods

## forClass()

```js
const builder = QueryBuilder.forClass(modelClass);
```

Create QueryBuilder for a Model subclass. You rarely need to call this. Query builders are created using the [Model.query()](/api/model/static-methods.html#query) and other query methods.

##### Arguments

Argument|Type|Description
--------|----|--------------------
modelClass|ModelClass|A Model class constructor

##### Return value

Type|Description
----|-----------------------------
[QueryBuilder](/api/query-builder/)|The created query builder

## parseRelationExpression()

```js
const exprObj = QueryBuilder.parseRelationExpression(expr);
```

Parses a string relation expression into the [object notation](/api/types/#relationexpression-object-notation).

##### Arguments

Argument|Type|Description
--------|----|--------------------
expr|[RelationExpression](/api/types/#type-relationexpression)|A relation expression string or object.

##### Return value

Type|Description
----|-----------------------------
object|The relation expression in object notation.
