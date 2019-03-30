---
sidebar: auto
---

# Types

## `type` RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation`, `Model.ManyToManyRelation` and `Model.HasOneThroughRelation`.
modelClass|[Model](/api/model/)<br>string|Constructor of the related model class, an absolute path to a module that exports one or a path relative to [modelPaths](/api/model/static-properties.html#static-modelpaths) that exports a model class.
join|[RelationJoin](#type-relationjoin)|Describes how the models are related to each other. See [RelationJoin](#type-relationjoin).
modify|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Optional modifier for the relation query. If specified as a function, it will be called each time before fetching the relation. If specified as a string, named filter with specified name will be applied each time when fetching the relation. If specified as an object, it will be used as an additional query parameter - e. g. passing {name: 'Jenny'} would additionally narrow fetched rows to the ones with the name 'Jenny'.
filter|function([QueryBuilder](/api/query-builder/))<br>string<br>object|Alias for modify.
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted model instance. This function can be async.

## `type` RelationJoin

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the owner table. Must be given with the table name. For example `persons.id`. Composite key can be specified using an array of columns e.g. `['persons.a', 'persons.b']`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The relation column in the related table. Must be given with the table name. For example `movies.id`. Composite key can be specified using an array of columns e.g. `['movies.a', 'movies.b']`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [ref](/api/objection/#ref) helper.
through|[RelationThrough](#type-relationthrough)|Describes the join table if the models are related through one.

## `type` RelationThrough

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `from` property of the `RelationJoin`. For example `Person_movies.actorId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection/#ref)<br>Array|The column that is joined to `to` property of the `RelationJoin`. For example `Person_movies.movieId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [ref](/api/objection/#ref) helper.
modelClass|string<br>ModelClass|If you have a model class for the join table, you should specify it here. This is optional so you don't need to create a model class if you don't want to.
extra|string[]<br>Object|Columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert. The values can be aliased by providing an object `{propertyName: 'columnName', otherPropertyName: 'otherColumnName'} instead of array`
beforeInsert|function([Model](/api/model/),&nbsp;[QueryContext](/api/query-builder/instance-methods.html#context))|Optional insert hook that is called for each inserted join table model instance. This function can be async.

## `type` ModelOptions

Property|Type|Description
--------|----|-----------
patch|boolean|If true the json is treated as a patch and the `required` field of the json schema is ignored in the validation. This allows us to create models with a subset of required properties for patch operations.
skipValidation|boolean|If true the json schema validation is skipped
old|object|The old values for methods like `$beforeUpdate` and `$beforeValidate`.

## `type` CloneOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored

## `type` ToJsonOptions

Property|Type|Description
--------|----|-----------
shallow|boolean|If true, relations are ignored. Default is false.
virtuals|boolean<br>string[]|If false, virtual attributes are omitted from the output. Default is true. You can also pass an array of property names and only those virtual properties get picked. You can even pass in property/function names that are not included in the static `virtualAttributes` array.

## `type` EagerOptions

Property|Type|Description
--------|----|-----------
minimize|boolean|If true the aliases of the joined tables and columns in a join based eager loading are minimized. This is sometimes needed because of identifier length limitations of some database engines. objection throws an exception when a query exceeds the length limit. You need to use this only in those cases.
separator|string|Separator between relations in nested join based eager query. Defaults to `:`. Dot (`.`) cannot be used at the moment because of the way knex parses the identifiers.
aliases|Object|Aliases for relations in a join based eager query. Defaults to an empty object.
joinOperation|string|Which join type to use `['leftJoin', 'innerJoin', 'rightJoin', ...]` or any other knex join method name. Defaults to `leftJoin`.

## `type` RelationExpression

## `class` ValidationError

## `class` NotFoundError
