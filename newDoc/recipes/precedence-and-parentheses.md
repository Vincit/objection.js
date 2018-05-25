# Precedence and parentheses

You can add parentheses to queries by passing a function to any of the the [where*](/api/query-builder.html#where) methods.

```js
await Person
  .query()
  .where('stuff', 1)
  .where(builder => {
    builder.where('foo', 2).orWhere('bar', 3);
  });
```

The generated SQL:

```sql
select * from "persons" where "stuff" = 1 and ("foo" = 2 or "bar" = 3)
```
