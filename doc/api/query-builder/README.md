# `class` QueryBuilder

`QueryBuilder` is the most important component in objection. Every method that allows you to fetch or modify items in the database returns an instance of the `QueryBuilder`.

`QueryBuilder` is a wrapper around [knex QueryBuilder](http://knexjs.org#Builder). QueryBuilder has all the methods a knex QueryBuilder has and more. While knex QueryBuilder returns plain JavaScript objects, QueryBuilder returns Model subclass instances.

QueryBuilder is thenable, meaning that it can be used like a promise. You can `await` a query builder, and it will get executed. You can return query builder from a [then](/api/query-builder/other-methods.html#then) method of a promise and it gets chained just like a normal promise would.

See also

- [Custom query builder recipe](/recipes/custom-query-builder.html)
