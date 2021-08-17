---
sidebarDepth: 3
---

# Query examples

The `Person` model used in the examples is defined [here](/guide/models.html#examples).

All queries are started with one of the [Model](/api/model/) methods [query](/api/model/static-methods.html#static-query), [\$query](/api/model/instance-methods.html#query), [relatedQuery](/api/model/static-methods.html#static-relatedquery) or [\$relatedQuery](/api/model/instance-methods.html#relatedquery). All these methods return a [QueryBuilder](/api/query-builder/) instance that can be used just like a [knex QueryBuilder](http://knexjs.org/#Builder) but they also have a bunch of methods added by objection.

Note that you can chain [debug()](/api/query-builder/other-methods.html#debug) to any query to get the executed SQL printed to console.

## Basic queries

### Find queries

Find queries can be created by calling [Model.query()](/api/model/static-methods.html#static-query) and chaining query builder methods for the returned
[QueryBuilder](/api/query-builder/) instance.

In addition to the examples here, you can find more examples behind these links.

- [subqueries](/recipes/subqueries.html)
- [raw queries](/recipes/raw-queries.html)
- [precedence and parentheses](/recipes/precedence-and-parentheses.html)

There's also a large amount of examples in the [API documentation](/api/query-builder/).

##### Examples

Fetch an item by id:

```js
const person = await Person.query().findById(1);

console.log(person.firstName);
console.log(person instanceof Person); // --> true
```

```sql
select "persons".* from "persons" where "persons"."id" = 1
```

Fetch all people from the database:

```js
const people = await Person.query();

console.log(people[0] instanceof Person); // --> true
console.log('there are', people.length, 'People in total');
```

```sql
select "persons".* from "persons"
```

The return value of the [query](/api/model/static-methods.html#static-query) method is an instance of [QueryBuilder](/api/query-builder/) that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has and a lot more. Here is a simple example that uses some of them:

```js
const middleAgedJennifers = await Person.query()
  .select('age', 'firstName', 'lastName')
  .where('age', '>', 40)
  .where('age', '<', 60)
  .where('firstName', 'Jennifer')
  .orderBy('lastName');

console.log('The last name of the first middle aged Jennifer is');
console.log(middleAgedJennifers[0].lastName);
```

```sql
select "age", "firstName", "lastName"
from "persons"
where "age" > 40
and "age" < 60
and "firstName" = 'Jennifer'
order by "lastName" asc
```

The next example shows how easy it is to build complex queries:

```js
const people = await Person.query()
  .select('persons.*', 'parent.firstName as parentFirstName')
  .innerJoin('persons as parent', 'persons.parentId', 'parent.id')
  .where('persons.age', '<', Person.query().avg('persons.age'))
  .whereExists(
    Animal.query()
      .select(1)
      .whereColumn('persons.id', 'animals.ownerId')
  )
  .orderBy('persons.lastName');

console.log(people[0].parentFirstName);
```

```sql
select "persons".*, "parent"."firstName" as "parentFirstName"
from "persons"
inner join "persons"
  as "parent"
  on "persons"."parentId" = "parent"."id"
where "persons"."age" < (
  select avg("persons"."age")
  from "persons"
)
and exists (
  select 1
  from "animals"
  where "persons"."id" = "animals"."ownerId"
)
order by "persons"."lastName" asc
```

In addition to knex methods, the [QueryBuilder](/api/query-builder/) has a lot of helpers for dealing with relations like the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method:

```js
const people = await Person.query()
  .select('parent:parent.name as grandParentName')
  .joinRelated('parent.parent');

console.log(people[0].grandParentName);
```

```sql
select "parent:parent"."firstName" as "grandParentName"
from "persons"
inner join "persons"
  as "parent"
  on "parent"."id" = "persons"."parentId"
inner join "persons"
  as "parent:parent"
  on "parent:parent"."id" = "parent"."parentId"
```

Objection allows a bit more modern syntax with groupings and subqueries. Where knex requires you to use an old fashioned `function` an `this`, with objection you can use arrow functions:

```js
const nonMiddleAgedJennifers = await Person.query()
  .where(builder => builder.where('age', '<', 40).orWhere('age', '>', 60))
  .where('firstName', 'Jennifer')
  .orderBy('lastName');

console.log('The last name of the first non middle aged Jennifer is');
console.log(nonMiddleAgedJennifers[0].lastName);
```

```sql
select "persons".* from "persons"
where ("age" < 40 or "age" > 60)
and "firstName" = 'Jennifer'
order by "lastName" asc
```

### Insert queries

Insert queries are created by chaining the [insert](/api/query-builder/mutate-methods.html#insert) method to the query. See the [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method for inserting object graphs.

In addition to the examples here, you can find more examples behind these links.

- [insert API reference](/api/query-builder/mutate-methods.html#insert)
- [graph inserts](/guide/query-examples.html#graph-inserts)

##### Examples

```js
const jennifer = await Person.query().insert({
  firstName: 'Jennifer',
  lastName: 'Lawrence'
});

console.log(jennifer instanceof Person); // --> true
console.log(jennifer.firstName); // --> 'Jennifer'
console.log(jennifer.fullName()); // --> 'Jennifer Lawrence'
```

```sql
insert into "persons" ("firstName", "lastName") values ('Jennifer', 'Lawrence')
```

Just like with any query, you can mix in `raw` statements, subqueries, `knex.raw` instances etc.

```js
const jennifer = await Person.query().insert({
  firstName: 'Average',
  lastName: 'Person',
  age: Person.query().avg('age')
});
```

### Update queries

Update queries are created by chaining the [update](/api/query-builder/mutate-methods.html#update) or [patch](/api/query-builder/mutate-methods.html#patch) method to the query. [patch](/api/query-builder/mutate-methods.html#patch) and [update](/api/query-builder/mutate-methods.html#update) return the number of updated rows. If you want the freshly updated item as a result you can use the helper method [patchAndFetchById](/api/query-builder/mutate-methods.html#patchandfetchbyid) and [updateAndFetchById](/api/query-builder/mutate-methods.html#updateandfetchbyid). On postgresql you can simply chain [.returning('\*')](/api/query-builder/find-methods.html#returning) or take a look at [this recipe](/recipes/returning-tricks.html) for more ideas. See [update](/api/query-builder/mutate-methods.html#update) and [patch](/api/query-builder/mutate-methods.html#patch) API documentation for discussion about their differences.

In addition to the examples here, you can find more examples behind these links.

- [patch API reference](/api/query-builder/mutate-methods.html#patch)
- [raw queries](/recipes/raw-queries.html)

##### Examples

Update an item by id:

```js
const numUpdated = await Person.query()
  .findById(1)
  .patch({
    firstName: 'Jennifer'
  });
```

```sql
update "persons" set "firstName" = 'Jennifer' where "id" = 1
```

Update multiple items:

```js
const numUpdated = await Person.query()
  .patch({ lastName: 'Dinosaur' })
  .where('age', '>', 60);

console.log('all people over 60 years old are now dinosaurs');
console.log(numUpdated, 'people were updated');
```

```sql
update "persons" set "lastName" = 'Dinosaur' where "age" > 60
```

Update and fetch an item:

```js
const updatedPerson = await Person.query().patchAndFetchById(246, {
  lastName: 'Updated'
});

console.log(updatedPerson.lastName); // --> Updated.
```

```sql
update "persons" set "lastName" = 'Updated' where "id" = 246
select "persons".* from "persons" where "id" = 246
```

### Delete queries

Delete queries are created by chaining the [delete](/api/query-builder/mutate-methods.html#delete) method to the query.

NOTE: The return value of the query will be the number of deleted rows. _If you're using Postgres take a look at [this recipe](/recipes/returning-tricks.html) if you'd like the deleted rows to be returned as Model instances_.

##### Examples

Delete an item by id:

```js
const numDeleted = await Person.query().deleteById(1);
```

```sql
delete from "persons" where id = 1
```

Delete multiple items:

```js
const numDeleted = await Person.query()
  .delete()
  .where(raw('lower("firstName")'), 'like', '%ennif%');

console.log(numDeleted, 'people were deleted');
```

```sql
delete from "persons" where lower("firstName") like '%ennif%'
```

You can always use [subqueries](/recipes/subqueries.html), [raw](/api/objection/#raw), [ref](/api/objection/#ref), [lit](/api/objection/#lit) and all query building methods with [delete](/api/query-builder/mutate-methods.html#delete) queries, just like with every query in objection. With some databases, you cannot use joins with deletes (db restriction, not objection). You can replace joins with subqueries like this:

```js
// This query deletes all people that have a pet named "Fluffy".
await Person.query()
  .delete()
  .whereIn(
    'id',
    Person.query()
      .select('persons.id')
      .joinRelated('pets')
      .where('pets.name', 'Fluffy')
  );
```

```sql
delete from "persons"
where "id" in (
  select "persons.id"
  from "persons"
  join "pets" on "pets.ownerId" = "persons.id"
  where "pets.name" = 'Fluffy'
)
```

```js
// This is another way to implement the previous query.
await Person.query()
  .delete()
  .whereExists(Person.relatedQuery('pets').where('pets.name', 'Fluffy'));
```

```sql
delete from "persons"
where exists (
  select "pets".*
  from "pets"
  where "pets.ownerId" = "persons.id"
  and "pets.name" = 'Fluffy'
)
```

## Relation queries

While the static [query](/api/model/static-methods.html#static-query) method can be used to create a query to a whole table [relatedQuery](/api/model/static-methods.html#static-relatedquery) and its instance method counterpart [\$relatedQuery](/api/model/instance-methods.html#relatedquery) can be used to query items related to another item. Both of these methods return an instance of [QueryBuilder](/api/query-builder/) just like the [query](/api/model/static-methods.html#static-query) method.

### Relation find queries

Simply call [\$relatedQuery('relationName')](/api/model/instance-methods.html#relatedquery) for a model _instance_ to fetch a relation for it. The relation name is given as the only argument. The return value is a [QueryBuilder](/api/query-builder/) so you once again have all the query methods at your disposal. In many cases it's more convenient to use [eager loading](/guide/query-examples.html#eager-loading) to fetch relations. [\$relatedQuery](/api/model/instance-methods.html#relatedquery) is better when you only need one relation and you need to filter the query extensively.

The static method [relatedQuery](/api/model/static-methods.html#static-relatedquery) can be used to create related queries for multiple items using identifiers, model instances or even subqueries. This allows you to build complex queries by composing simple pieces.

In addition to the examples here, you can find more examples behind these links.

- [relation subqueries](/recipes/relation-subqueries.html)
- [relatedQuery](/api/model/static-methods.html#static-relatedquery)

##### Examples

This example fetches the person's pets. `'pets'` is the name of a relation defined in [relationMappings](/api/model/static-properties.html#static-relationmappings).

```js
const person = await Person.query().findById(1);
```

```sql
select "persons".* from "persons" where "persons"."id" = 1
```

```js
const dogs = await person
  .$relatedQuery('pets')
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" = 1
order by "name" asc
```

The above example needed two queries to find pets of a person. You can do this with one single query using the static [relatedQuery](/api/model/static-methods.html#static-relatedquery) method:

```js
const dogs = await Person.relatedQuery('pets')
  .for(1)
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" = 1
order by "name" asc
```

With `HasManyRelation`s and `BelongsToOneRelation`s the `relatedQuery` helper may just seem like unnecessary bloat. You can of course simply write the SQL directly. The following code should be clear to anyone even without any objection experience:

```js
const dogs = await Pet.query()
  .where('species', 'dog')
  .where('ownerId', 1)
  .orderBy('name')
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "ownerId" = 1
order by "name" asc
```

The `relatedQuery` helper comes in handy with `ManyToManyRelation` where the needed SQL is more complex. it also provides a unified API for all kinds of relations. You can write the same code regardless of the relation type. Or you may simply prefer the `relatedQuery` style. Now back to the examples :)

If you want to fetch dogs for multiple people in one query, you can pass an array of identifiers to the `for` method like this:

```js
const dogs = await Person.relatedQuery('pets')
  .for([1, 2])
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" in (1, 2)
order by "name" asc
```

You can even give it a subquery! The following example fetches all dogs of all people named Jennifer using one single query:

```js
// Note that there is no `await` here. This query does not get executed.
// jennifersSubQuery is of type QueryBuilder<Person>.
const jennifersSubQuery = Person.query().where('name', 'Jennifer');

// This is the only executed query in this example.
const dogs = await Person.relatedQuery('pets')
  .for(jennifersSubQuery)
  .where('species', 'dog')
  .orderBy('name');
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" in (
  select "persons"."id"
  from "persons"
  where "name" = 'Jennifer'
)
order by "name" asc
```

### Relation insert queries

Chain the [insert](/api/query-builder/mutate-methods.html#insert) method to a [relatedQuery](/api/model/static-methods.html#static-relatedquery) or [\$relatedQuery](/api/model/instance-methods.html#relatedquery) call to insert a related object for an item. The query inserts a new object to the related table and updates the needed tables to create the relationship. In case of many-to-many relation a row is inserted to the join table etc. Also check out [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method for an alternative way to insert related models.


##### Examples

Add a pet for a person:

```js
const person = await Person.query().findById(1);
```

```sql
select "persons".* from "persons" where "persons"."id" = 1
```

```js
const fluffy = await person.$relatedQuery('pets').insert({ name: 'Fluffy' });
```

```sql
insert into "animals" ("name", "ownerId") values ('Fluffy', 1)
```

Just like with [relation find queries](#relation-find-queries), you can save a query and add a pet for a person using one single query by utilizing the static `relatedQuery` method:

```js
const fluffy = await Person.relatedQuery('pets')
  .for(1)
  .insert({ name: 'Fluffy' });
```

```sql
insert into "animals" ("name", "ownerId") values ('Fluffy', 1)
```

If you want to write columns to the join table of a many-to-many relation you first need to specify the columns in the `extra` array of the `through` object in [relationMappings](/api/model/static-properties.html#static-relationmappings) (see the examples behind the link). For example, if you specified an array `extra: ['awesomeness']` in [relationMappings](/api/model/static-properties.html#static-relationmappings) then `awesomeness` is written to the join table in the following example:

```js
const movie = await Person.relatedQuery('movies')
  .for(100)
  .insert({ name: 'The room', awesomeness: 9001 });

console.log('best movie ever was added');
```

```sql
insert into "movies" ("name")
values ('The room')

insert into "persons_movies" ("movieId", "personId", "awesomeness")
values (14, 100, 9001)
```

See [this recipe](/recipes/extra-properties.html) for more information about `extra` properties.

### Relation relate queries

Relating means attaching a existing item to another item through a relationship defined in the [relationMappings](/api/model/static-properties.html#static-relationmappings).

In addition to the examples here, you can find more examples behind these links.

- [relate method](/api/query-builder/mutate-methods.html#relate)

##### Examples

In the following example we relate an actor to a movie. In this example the relation between `Person` and `Movie` is a many-to-many relation but `relate` also works for all other relation types.

```js
const actor = await Person.query().findById(100);
```

```sql
select "persons".* from "persons" where "persons"."id" = 100
```

```js
const movie = await Movie.query().findById(200);
```

```sql
select "movies".* from "movies" where "movies"."id" = 200
```

```js
await actor.$relatedQuery('movies').relate(movie);
```

```sql
insert into "persons_movies" ("personId", "movieId") values (100, 200)
```

You can also pass the id `200` directly to `relate` instead of passing a model instance. A more objectiony way of doing this would be to once again utilize the static [relatedQuery](/api/model/static-methods.html#static-relatedquery) method:

```js
await Person.relatedQuery('movies')
  .for(100)
  .relate(200);
```

```sql
insert into "persons_movies" ("personId", "movieId") values (100, 200)
```

Actually in this case, the cleanest way of all would be to just insert a row to the `persons_movies` table. Note that you can create models for pivot (join) tables too. There's nothing wrong with that.

Here's one more example that relates four movies to the first person whose first name Arnold. Note that this query only works on Postgres because on other databases it would require multiple queries.

```js
await Person.relatedQuery('movies')
  .for(
    Person.query()
      .where('firstName', 'Arnold')
      .limit(1)
  )
  .relate([100, 200, 300, 400]);
```

### Relation unrelate queries

Unrelating is the inverse of [relating](#relation-relate-queries). For example if an actor is related to a movie through a `movies` relation, unrelating them means removing this association, but neither the movie nor the actor get deleted from the database.

##### Examples

The first example `unrelates` all movies whose name starts with the string 'Terminator' from an actor.

```js
const actor = await Person.query().findById(100);
```

```sql
select "persons".* from "persons" where "persons"."id" = 100
```

```js
await actor
  .$relatedQuery('movies')
  .unrelate()
  .where('name', 'like', 'Terminator%');
```

```sql
delete from "persons_movies"
where "persons_movies"."personId" = 100
where "persons_movies"."movieId" in (
  select "movies"."id" from "movies" where "name" like 'Terminator%'
)
```

The same using the static [relatedQuery](/api/model/static-methods.html#static-relatedquery) method:

```js
await Person.relatedQuery('movies')
  .for(100)
  .unrelate()
  .where('name', 'like', 'Terminator%');
```

```sql
delete from "persons_movies"
where "persons_movies"."personId" = 100
and "persons_movies"."movieId" in (
  select "movies"."id"
  from "movies"
  where "name" like 'Terminator%'
)
```

The next query removes all Terminator movies from Arnold Schwarzenegger:

```js
// Once again, note that we don't await this query. This query
// is not executed. It's a placeholder that will be used to build
// a subquery when the `relatedQuery` gets executed.
const arnold = Person.query().findOne({
  firstName: 'Arnold',
  lastName: 'Schwarzenegger'
});

await Person.relatedQuery('movies')
  .for(arnold)
  .unrelate()
  .where('name', 'like', 'Terminator%');
```

```sql
delete from "persons_movies"
where "persons_movies"."personId" in (
  select "persons"."id"
  from "persons"
  where "firstName" = 'Arnold'
  and "lastName" = 'Schwarzenegger'
)
and "persons_movies"."movieId" in (
  select "movies"."id"
  from "movies"
  where "name" like 'Terminator%'
)
```

### Relation update queries

Relation update queries work just like the normal update queries, but the query is automatically filtered so that only the related items are affected.

See the [API documentation](/api/query-builder/mutate-methods.html#update) of `update` method.

##### Examples

```js
await Person.relatedQuery('pets')
  .for([1, 2])
  .patch({ name: raw(`concat(name, ' the doggo')`) })
  .where('species', 'dog');
```

```sql
update "animals"
set "name" = concat(name, ' the doggo')
where "animals"."ownerId" in (1, 2)
and "species" = 'dog'
```

### Relation delete queries

Relation delete queries work just like the normal delete queries, but the query is automatically filtered so that only the related items are affected.

See the [API documentation](/api/query-builder/mutate-methods.html#delete) of `delete` method.

##### Examples

```js
await Person.relatedQuery('pets')
  .for([1, 2])
  .delete()
  .where('species', 'dog');
```

```sql
delete from "animals"
where "animals"."ownerId" in (1, 2)
and "species" = 'dog'
```

## Eager loading

You can fetch an arbitrary graph of relations for the results of any query by chaining the [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) or [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) method. Both methods take a [relation expression](/api/types/#type-relationexpression) as the first argument. In addition to making your life easier, eager loading avoids the "N+1 selects" problem and provide a great performance.

Because the relation expressions are strings (there's also an optional [object notation](/api/types/#relationexpression-object-notation)) they can be easily passed, for example, as a query parameter of an HTTP request. However, allowing the client to execute expressions like this without any limitations is not very secure. Therefore the [QueryBuilder](/api/query-builder/) has the [allowGraph](/api/query-builder/eager-methods.html#allowgraph) method. [allowGraph](/api/query-builder/eager-methods.html#allowgraph) can be used to limit the allowed relation expression to a certain subset.

By giving the expression `[pets, children.pets]` for [allowGraph](/api/query-builder/eager-methods.html#allowgraph) the value passed to [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) is allowed to be one of:

- `'pets'`
- `'children'`
- `'children.pets'`
- `'[pets, children]'`
- `'[pets, children.pets]'`

Examples of expressions that would cause an error:

- `'movies'`
- `'children.children'`
- `'[pets, children.children]'`
- `'notEvenAnExistingRelation'`

In addition to the [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) and [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) methods, relations can be fetched using the [fetchGraph](/api/model/static-properties.html#static-fetchgraph) and
[\$fetchGraph](/api/model/instance-methods.html#fetchgraph) methods.

[withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) uses multiple queries to load the related items. (for details see [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/). Note that [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched) used to be called `eager`.). [withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) uses joins and only performs one single query to fetch the whole relation graph. This doesn't mean that `withGraphJoined` is faster though. See the performance discussion [here](/api/query-builder/eager-methods.html#withgraphfetched). You should only use `withGraphJoined` if you actually need the joins to be able to reference the nested tables. When in doubt use [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched).

##### Examples

Fetch the `pets` relation for all results of a query:

```js
const people = await Person.query().withGraphFetched('pets');

// Each person has the `pets` property populated with Animal objects related
// through the `pets` relation.
console.log(people[0].pets[0].name);
console.log(people[0].pets[0] instanceof Animal); // --> true
```

Fetch multiple relations on multiple levels:

```js
const people = await Person.query().withGraphFetched(
  '[pets, children.[pets, children]]'
);

// Each person has the `pets` property populated with Animal objects related
// through the `pets` relation. The `children` property contains the Person's
// children. Each child also has the `pets` and `children` relations eagerly
// fetched.
console.log(people[0].pets[0].name);
console.log(people[1].children[2].pets[1].name);
console.log(people[1].children[2].children[0].name);
```

Here's the previous query using the [object notation](/api/types/#relationexpression-object-notation)

```js
const people = await Person.query().withGraphFetched({
  pets: true,
  children: {
    pets: true,
    children: true
  }
});
```

Fetch one relation recursively:

```js
const people = await Person.query().withGraphFetched('[pets, children.^]');

// The children relation is from Person to Person. If we want to fetch the whole
// descendant tree of a person we can just say "fetch this relation recursively"
// using the `.^` notation.
console.log(
  people[0].children[0].children[0].children[0].children[0].firstName
);
```

Limit recursion to 3 levels:

```js
const people = await Person.query().withGraphFetched('[pets, children.^3]');

console.log(people[0].children[0].children[0].children[0].firstName);
```

Relations can be modified using the [modifyGraph](/api/query-builder/other-methods.html#modifygraph) method:

```js
const people = await Person.query()
  .withGraphFetched('[children.[pets, movies], movies]')
  .modifyGraph('children.pets', builder => {
    // Only select pets older than 10 years old for children
    // and only return their names.
    builder.where('age', '>', 10).select('name');
  });
```

Relations can also be modified using modifiers like this:

```js
const people = await Person.query()
  .withGraphFetched(
    '[pets(selectName, onlyDogs), children(orderByAge).[pets, children]]'
  )
  .modifiers({
    selectName: builder => {
      builder.select('name');
    },

    orderByAge: builder => {
      builder.orderBy('age');
    },

    onlyDogs: builder => {
      builder.where('species', 'dog');
    }
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Reusable modifiers can be defined for models using [modifiers](/api/model/static-properties.html#static-modifiers)

```js
// Person.js

class Person extends Model {
  static get modifiers() {
    return {
      defaultSelects(builder) {
        builder.select('id', 'firstName');
      },

      orderByAge(builder) {
        builder.orderBy('age');
      }
    };
  }
}

// Animal.js

class Animal extends Model {
  static get modifiers() {
    return {
      orderByName(builder) {
        builder.orderBy('name');
      },

      // Note that this modifier takes an argument.
      onlySpecies(builder, species) {
        builder.where('species', species);
      }
    };
  }
}

// somewhereElse.js

const people = await Person.query().modifiers({
  // This way you can bind arguments to modifiers.
  onlyDogs: query => query.modify('onlySpecies', 'dog')
}).withGraphFetched(`
    children(defaultSelects, orderByAge).[
      pets(onlyDogs, orderByName),
      movies
    ]
  `);

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Relations can be aliased using `as` keyword:

```js
const people = await Person.query().withGraphFetched(`[
    children(orderByAge) as kids .[
      pets(filterDogs) as dogs,
      pets(filterCats) as cats

      movies.[
        actors
      ]
    ]
  ]`);

console.log(people[0].kids[0].dogs[0].name);
console.log(people[0].kids[0].movies[0].id);
```

Example usage for [allowGraph](/api/query-builder/eager-methods.html#allowgraph) in an express route:

```js
expressApp.get('/people', async (req, res) => {
  const people = await Person.query()
    .allowGraph('[pets, children.pets]')
    .withGraphFetched(req.query.eager);

  res.send(people);
});
```

[withGraphJoined](/api/query-builder/eager-methods.html#withgraphjoined) can be used just like [withGraphFetched](/api/query-builder/eager-methods.html#withgraphfetched). In addition you can refer to the related items from the root query because they are all joined:

```js
const people = await Person.query()
  .withGraphJoined('[pets, children.pets]')
  .where('pets.age', '>', 10)
  .where('children:pets.age', '>', 10);
```

## Graph inserts

Arbitrary relation graphs can be inserted using the [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method. This is best explained using examples, so check them out.

See the [allowGraph](/api/query-builder/eager-methods.html#allowgraph) method if you need to limit which relations can be inserted using [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) method to avoid security issues.

If you are using Postgres the inserts are done in batches for maximum performance. On other databases the rows need to be inserted one at a time. This is because postgresql is the only database engine that returns the identifiers of all inserted rows and not just the first or the last one.

[insertGraph](/api/query-builder/mutate-methods.html#insertgraph) operation is **not** atomic by default! You need to start a transaction and pass it to the query using any of the supported ways. See the section about [transactions](/guide/transactions.html) for more information.

You can read more about graph inserts from [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).

##### Examples

```js
// The return value of `insertGraph` is the input graph converted into
// model instances. Inserted objects have ids added to them and related
// rows have foreign keys set, but no other columns get fetched from
// the database. You can use `insertGraphAndFetch` for that.
const graph = await Person.query().insertGraph({
  firstName: 'Sylvester',
  lastName: 'Stallone',

  children: [
    {
      firstName: 'Sage',
      lastName: 'Stallone',

      pets: [
        {
          name: 'Fluffy',
          species: 'dog'
        }
      ]
    }
  ]
});
```

The query above will insert 'Sylvester', 'Sage' and 'Fluffy' into db and create relationships between them as defined in the [relationMappings](/api/model/static-properties.html#static-relationmappings) of the models. Technically [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) builds a dependency graph from the object graph and inserts the models that don't depend on any other models until the whole graph is inserted.

If you need to refer to the same model in multiple places you can use the special properties `#id` and `#ref` like this:

```js
await Person.query().insertGraph(
  [
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          '#id': 'silverLiningsPlaybook',
          name: 'Silver Linings Playbook',
          duration: 122
        }
      ]
    },
    {
      firstName: 'Bradley',
      lastName: 'Cooper',

      movies: [
        {
          '#ref': 'silverLiningsPlaybook'
        }
      ]
    }
  ],
  { allowRefs: true }
);
```

Note that you need to also set the `allowRefs` option to true for this to work.

The query above will insert only one movie (the 'Silver Linings Playbook') but both 'Jennifer' and 'Bradley' will have the movie related to them through the many-to-many relation `movies`. The `#id` can be any string. There are no format or length requirements for them. It is quite easy to create circular dependencies using `#id` and `#ref`. Luckily [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) detects them and rejects the query with a clear error message.

You can refer to the properties of other models anywhere in the graph using expressions of format `#ref{<id>.<property>}` as long as the reference doesn't create a circular dependency. For example:

```js
await Person
  .query()
  .insertGraph([
    {
      "#id": 'jenni',
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      pets: [{
        name: "I am the dog of #ref{jenni.firstName} whose id is #ref{jenni.id}",
        species: 'dog'
      }
    ],
    { allowRefs: true }
  }]);
```

Again, make sure you set the `allowRefs` option to true.

The query above will insert a pet named `I am the dog of Jennifer whose id is 523` for Jennifer. If `#ref{}` is used within a string, the references are replaced with the referred values inside the string. If the reference string contains nothing but the reference, the referred value is copied to its place preserving its type.

Existing rows can be related to newly inserted rows by using the `relate` option. `relate` can be `true` in which case all models in the graph that have an identifier get related. `relate` can also be an array of relation paths like `['children', 'children.movies.actors']` in which case only objects in those paths get related even if they have an idetifier.

```js
await Person.query().insertGraph(
  [
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          id: 2636
        }
      ]
    }
  ],
  {
    relate: true
  }
);
```

The query above would create a new person `Jennifer Lawrence` and add an existing movie (id = 2636) to its `movies` relation. The next query would do the same:

```js
await Person.query().insertGraph(
  [
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          id: 2636
        }
      ]
    }
  ],
  {
    relate: ['movies']
  }
);
```

The `relate` option can also contain nested relations:

```js
await Person.query().insertGraph(
  [
    {
      firstName: 'Jennifer',
      lastName: 'Lawrence',

      movies: [
        {
          name: 'Silver Linings Playbook',
          duration: 122,

          actors: [
            {
              id: 2516
            }
          ]
        }
      ]
    }
  ],
  {
    relate: ['movies.actors']
  }
);
```

If you need to mix inserts and relates inside a single relation, you can use the special property `#dbRef`

```js
await Person.query().insertGraph([
  {
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [
      {
        '#dbRef': 2636
      },
      {
        // This will be inserted with an id.
        id: 100,
        name: 'New movie'
      }
    ]
  }
]);
```

## Graph upserts

Arbitrary relation graphs can be upserted (insert + update + delete) using the [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method. This is best explained using examples, so check them out.

By default [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method updates the objects that have an id, inserts objects that don't have an id and deletes all objects that are not present. This functionality can be modified in many ways by providing [UpsertGraphOptions](/api/types/#type-upsertgraphoptions) object as the second argument.

The [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method works a little different than the other update and patch methods. When using [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) any `where` or `having` methods are ignored. The models are updated based on the id properties in the graph. This is also clarified in the examples.

[upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) uses [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) under the hood for inserts. That means that you can insert object graphs for relations and use all [insertGraph](/api/query-builder/mutate-methods.html#insertgraph) features like `#ref` references.

[upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) operation is **not** atomic by default! You need to start a transaction and pass it to the query using any of the supported ways. See the section about [transactions](/guide/transactions.html) for more information.

See the [allowGraph](/api/query-builder/eager-methods.html#allowgraph) method if you need to limit which relations can be modified using [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method to avoid security issues.

::: warning
WARNING!

Before you start using `upsertGraph` beware that it's not the silver bullet it seems to be. If you start using it because it seems to provide a "mongodb API" for a relational database, you are using it for a wrong reason!

Our suggestion is to first try to write any code without it and only use `upsertGraph` if it saves you **a lot** of code and makes things simpler. Over time you'll learn where `upsertGraph` helps and where it makes things more complicated. Don't use it by default for everything. You can search through the objection issues to see what kind of problems `upsertGraph` can cause if used too much.

For simple things `upsertGraph` calls are easy to understand and remain readable. When you start passing it a bunch of options it becomes increasingly difficult for other developers (and even yourself) to understand.

It's also really easy to create a server that doesn't work well with multiple users by overusing `upsertGraph`. That's because you can easily get into a situation where you override other user's changes if you always upsert large graphs at a time. Always try to update the minimum amount of rows and columns and you'll save yourself a lot of trouble in the long run.
:::

##### Examples

For the following examples, assume this is the content of the database:

```js
[{
  id: 1,
  firstName: 'Jennifer',
  lastName: 'Aniston',

  // This is a BelongsToOneRelation
  parent: {
    id: 2,
    firstName: 'Nancy',
    lastName: 'Dow'
  },

  // This is a HasManyRelation
  pets: [{
    id: 1,
    name: 'Doggo',
    species: 'Dog',
  }, {
    id: 2,
    name: 'Kat',
    species: 'Cat',
  }],

  // This is a ManyToManyRelation
  movies: [{
    id: 1,
    name: 'Horrible Bosses',

    reviews: [{
      id: 1,
      title: 'Meh',
      stars: 3,
      text: 'Meh'
    }]
  }, {
    id: 2
    name: 'Wanderlust',

    reviews: [{
      id: 2,
      title: 'Brilliant',
      stars: 5,
      text: 'Makes me want to travel'
    }]
  }]
}]
```

By default [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) method updates the objects that have an id, inserts objects that don't have an id and deletes all objects that are not present. Of course the delete only applies to relations and not the root. Here's a basic example:

```js
// The return value of `upsertGraph` is the input graph converted into
// model instances. Inserted objects have ids added to them related
// rows have foreign keys set but no other columns get fetched from
// the database. You can use `upsertGraphAndFetch` for that.
const graph = await Person.query().upsertGraph({
  // This updates the `Jennifer Aniston` person since the id property is present.
  id: 1,
  firstName: 'Jonnifer',

  parent: {
    // This also gets updated since the id property is present. If no id was given
    // here, Nancy Dow would get deleted, a new Person John Aniston would
    // get inserted and related to Jennifer.
    id: 2,
    firstName: 'John',
    lastName: 'Aniston'
  },

  // Notice that Kat the Cat is not listed in `pets`. It will get deleted.
  pets: [
    {
      // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
      // that there is no id!
      name: 'Wolfgang',
      species: 'Dog'
    },
    {
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat'
    }
  ],

  // Notice that Wanderlust is missing from the list. It will get deleted.
  // It is also worth mentioning that the Wanderlust's `reviews` or any
  // other relations are NOT recursively deleted (unless you have
  // defined `ON DELETE CASCADE` or other hooks in the db).
  movies: [
    {
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [
        {
          // Update a review.
          id: 1,
          stars: 2,
          text: 'Even more Meh'
        },
        {
          // And insert another one.
          stars: 5,
          title: 'Loved it',
          text: 'Best movie ever'
        },
        {
          // And insert a third one.
          stars: 4,
          title: '4 / 5',
          text: 'Would see again'
        }
      ]
    }
  ]
});
```

By giving `relate: true` and/or `unrelate: true` options as the second argument, you can change the behaviour so that instead of inserting and deleting rows, they are related and/or unrelated. Rows with no id still get inserted, but rows that have an id and are not currently related, get related.

```js
const options = {
  relate: true,
  unrelate: true
};

await Person.query().upsertGraph(
  {
    // This updates the `Jennifer Aniston` person since the id property is present.
    id: 1,
    firstName: 'Jonnifer',

    // Unrelate the parent. This doesn't delete it.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [
      {
        // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
        // that there is no id!
        name: 'Wolfgang',
        species: 'Dog'
      },
      {
        // It turns out Doggo is a cat. Update it.
        id: 1,
        species: 'Cat'
      }
    ],

    // Notice that Wanderlust is missing from the list. It will get unrelated.
    movies: [
      {
        id: 1,

        // Upsert graphs can be arbitrarily deep. This modifies the
        // reviews of "Horrible Bosses".
        reviews: [
          {
            // Update a review.
            id: 1,
            stars: 2,
            text: 'Even more Meh'
          },
          {
            // And insert another one.
            stars: 5,
            title: 'Loved it',
            text: 'Best movie ever'
          }
        ]
      },
      {
        // This is some existing movie that isn't currently related to Jennifer.
        // It will get related.
        id: 1253
      }
    ]
  },
  options
);
```

`relate` and `unrelate` (and all other [options](/api/types/#type-upsertgraphoptions) can also be lists of relation paths. In that case the option is only applied for the listed relations.

```js
const options = {
  // Only enable `unrelate` functionality for these two paths.
  unrelate: ['pets', 'movies.reviews'],
  // Only enable `relate` functionality for 'movies' relation.
  relate: ['movies'],
  // Disable deleting for movies.
  noDelete: ['movies']
};

await Person.query().upsertGraph(
  {
    id: 1,

    // This gets deleted since `unrelate` list doesn't have 'parent' in it
    // and deleting is the default behaviour.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [
      {
        // It turns out Doggo is a cat. Update it.
        id: 1,
        species: 'Cat'
      }
    ],

    // Notice that Wanderlust is missing from the list. It will NOT get unrelated
    // or deleted since `unrelate` list doesn't contain `movies` and `noDelete`
    // list does.
    movies: [
      {
        id: 1,

        // Upsert graphs can be arbitrarily deep. This modifies the
        // reviews of "Horrible Bosses".
        reviews: [
          {
            // Update a review.
            id: 1,
            stars: 2,
            text: 'Even more Meh'
          },
          {
            // And insert another one.
            stars: 5,
            title: 'Loved it',
            text: 'Best movie ever'
          }
        ]
      },
      {
        // This is some existing movie that isn't currently related to Jennifer.
        // It will get related.
        id: 1253
      }
    ]
  },
  options
);
```

You can disable updates, inserts, deletes etc. for the whole [upsertGraph](/api/query-builder/mutate-methods.html#upsertgraph) operation or for individual relations by using the `noUpdate`, `noInsert`, `noDelete` etc. options. See [UpsertGraphOptions](/api/types/#type-upsertgraphoptions) docs for more info.
