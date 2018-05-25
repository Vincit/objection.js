# Indexing PostgreSQL JSONB columns

Good reading on the subject:

 * [JSONB type performance in PostgreSQL 9.4](https://blog.2ndquadrant.com/jsonb-type-performance-postgresql-9-4/) and
 * [Postgres 9.4 feature highlight - Indexing JSON data with jsonb data type](http://paquier.xyz/postgresql-2/postgres-9-4-feature-highlight-indexing-jsonb/).

## General Inverted Indexes a.k.a. GIN

This is the index type which makes all JSONB set operations fast. All `isSuperset` / `isSubset` / `hasKeys` / `hasValues` etc. queries can use this index to speed ’em up. Usually this is the index you want and it may take around 30% extra space on the DB server.

If one likes to use only the subset/superset operators with faster and smaller index one can give an extra `path_ops` parameter when creating the index: [“The path_ops index supports only the search path operator `@>` (see below), but produces a smaller and faster index for these kinds of searches.”](https://wiki.postgresql.org/wiki/What's_new_in_PostgreSQL_9.4). According to Marco Nenciarini’s post the speed up can be over 600% compared to full GIN index and the size of the index is reduced from ~30% -> ~20%.

Full GIN index to speed up all type of json queries:

```js
.raw('CREATE INDEX on ?? USING GIN (??)', ['Hero', 'details'])
```

Partial GIN index to speed up all subset / superset type of json queries:

```js
.raw('CREATE INDEX on ?? USING GIN (?? jsonb_path_ops)', ['Place', 'details'])
```

## Index on Expression

Another type of index one may use for JSONB field is to create an expression index for example for a certain JSON field inside a column.

You might want to use these if you are using lots of `.where(ref('jsonColumn:details.name').castText(), 'marilyn')` type of queries, which cannot be sped up with GIN index.

Use of these indexes are more limited, but they are also somewhat faster than using GIN and querying e.g. `{ field: value }` with subset operator. GIN indices also takes a lot of space in compared to expression index for certain field. So if you want to make just certain query to go extra fast you may consider using index on expression.

An expression index referring an internal `details.name` attribute of an object stored in `jsonColumn`:

```js
.raw("CREATE INDEX on ?? ((??#>>'{details,name}'))", ['Hero', 'jsonColumn'])
```

## Complete Migration Example and Created Tables / Indexes

Complete example how to try out different index choices.

Migration:

```js
exports.up = (knex) => {
  return knex.schema
    .createTable('Hero', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
      table.integer('homeId').unsigned()
        .references('id').inTable('Place');
    })
    .raw(
      'CREATE INDEX on ?? USING GIN (??)',
      ['Hero', 'details']
    )
    .raw(
      "CREATE INDEX on ?? ((??#>>'{type}'))",
      ['Hero', 'details']
    )
    .createTable('Place', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.jsonb('details');
    })
    .raw(
      'CREATE INDEX on ?? USING GIN (?? jsonb_path_ops)',
      ['Place', 'details']
    );
};
```

Results following schema:

```sql
objection-jsonb-example=# \d "Hero"
            Table "public.Hero"
 Column  |          Type
---------+------------------------
 id      | integer
 name    | character varying(255)
 details | jsonb
 homeId  | integer
Indexes:
    "Hero_pkey" PRIMARY KEY, btree (id)
    "Hero_details_idx" gin (details)
    "Hero_expr_idx" btree ((details #>> '{type}'::text[]))

objection-jsonb-example=# \d "Place"
           Table "public.Place"
 Column  |          Type
---------+------------------------
 id      | integer
 name    | character varying(255)
 details | jsonb
Indexes:
    "Place_pkey" PRIMARY KEY, btree (id)
    "Place_details_idx" gin (details jsonb_path_ops)
```

Expression index is used for example for following query:

```sql
explain select * from "Hero" where details#>>'{type}' = 'Hero';

                           QUERY PLAN
----------------------------------------------------------------
 Index Scan using "Hero_expr_idx" on "Hero"
   Index Cond: ((details #>> '{type}'::text[]) = 'Hero'::text)
```
