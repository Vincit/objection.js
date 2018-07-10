# Types

## `type` RelationMapping

Property|Type|Description
--------|----|-----------
relation|function|The relation type. One of `Model.BelongsToOneRelation`, `Model.HasOneRelation`, `Model.HasManyRelation`, `Model.ManyToManyRelation` and `Model.HasOneThroughRelation`.
modelClass|[Model](/api/model.html)<br>string|Constructor of the related model class, an absolute path to a module that exports one or a path relative to [modelPaths](/api/model.html#static-modelpaths) that exports a model class.
join|[RelationJoin](#type-relationjoin)|Describes how the models are related to each other. See [RelationJoin](#type-relationjoin).
modify|function([QueryBuilder](/api/query-builder.html))<br>string<br>object|Optional modifier for the relation query. If specified as a function, it will be called each time before fetching the relation. If specified as a string, named filter with specified name will be applied each time when fetching the relation. If specified as an object, it will be used as an additional query parameter - e. g. passing {name: 'Jenny'} would additionally narrow fetched rows to the ones with the name 'Jenny'.
filter|function([QueryBuilder](/api/query-builder.html))<br>string<br>object|Alias for modify.
beforeInsert|function([Model](/api/model.html),&nbsp;[QueryContext](/api/query-builder.html#context))|Optional insert hook that is called for each inserted model instance. This function can be async.

## `type` RelationJoin

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection.html#ref)<br>Array|The relation column in the owner table. Must be given with the table name. For example `persons.id`. Composite key can be specified using an array of columns e.g. `['persons.a', 'persons.b']`. Note that neither this nor `to` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [`ref`](#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection.html#ref)<br>Array|The relation column in the related table. Must be given with the table name. For example `movies.id`. Composite key can be specified using an array of columns e.g. `['movies.a', 'movies.b']`. Note that neither this nor `from` need to be foreign keys or primary keys. You can join any column to any column. You can even join nested json fields using the [`ref`](#ref) helper.
through|[RelationThrough](#type-relationthrough)|Describes the join table if the models are related through one.

## `type` RelationThrough

Property|Type|Description
--------|----|-----------
from|string<br>[ReferenceBuilder](/api/objection.html#ref)<br>Array|The column that is joined to `from` property of the `RelationJoin`. For example `Person_movies.actorId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [`ref`](#ref) helper.
to|string<br>[ReferenceBuilder](/api/objection.html#ref)<br>Array|The column that is joined to `to` property of the `RelationJoin`. For example `Person_movies.movieId` where `Person_movies` is the join table. Composite key can be specified using an array of columns e.g. `['persons_movies.a', 'persons_movies.b']`. You can join nested json fields using the [`ref`](/api/objection.html#ref) helper.
modelClass|string<br>ModelClass|If you have a model class for the join table, you should specify it here. This is optional so you don't need to create a model class if you don't want to.
extra|string[]<br>Object|Columns listed here are automatically joined to the related objects when they are fetched and automatically written to the join table instead of the related table on insert. The values can be aliased by providing an object `{propertyName: 'columnName', otherPropertyName: 'otherColumnName'} instead of array`
beforeInsert|function([Model](/api/model.html),&nbsp;[QueryContext](/api/query-builder.html#context))|Optional insert hook that is called for each inserted join table model instance. This function can be async.

## `type` RelationExpression

## `class` ValidationError

## `class` NotFoundError
