# `class` QueryBuilder

::: warning
TODO: Improve this crap
:::

`QueryBuilder` is the most important component in objection. Every method that allows you to fetch or modify items in the database returns an instance of the `QueryBuilder`.

`QueryBuilder` is a wrapper around [knex QueryBuilder](http://knexjs.org#Builder). QueryBuilder has all the methods a knex QueryBuilder has and more. While knex QueryBuilder returns plain javascript objects, QueryBuilder returns Model subclass instances.

QueryBuilder is thenable, meaning that it can be used like a promise. You can return query builder from a [then](/api/query-builder/instance-methods.html#then) method of a promise and it gets chained just like a normal promise would.

The query is executed when one of its promise methods [then](/api/query-builder/instance-methods.html#then), [catch](/api/query-builder/instance-methods.html#catch), [map](/api/query-builder/instance-methods.html#map), [bind](/api/query-builder/instance-methods.html#bind) or [return](/api/query-builder/instance-methods.html#return) is called.
