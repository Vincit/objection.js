# Query examples

The `Person` model used in the examples is defined [here](/guide/models.html#examples).

All queries are started with one of the [Model](/api/model.html) methods [query](/api/model.html#static-query), [$query](/api/model.html#query) or [$relatedQuery](/api/model.html#relatedquery). All these methods return a [QueryBuilder](/api/query-builder.html) instance that can be used just like a [knex QueryBuilder](http://knexjs.org/#Builder).

## Basic queries

### Find queries

Find queries can be created simply by calling [Model.query()](/api/model.html#static-query) and chaining query builder methods for the returned
[QueryBuilder](/api/query-builder.html) instance. The query is executed by calling the [then](/api/query-builder.html#then) method, which converts the query
into a Promise.

#### Examples

Fetch all people from the database:

```js
const people = await Person.query();

console.log(people[0] instanceof Person); // --> true
console.log('there are', people.length, 'People in total');
```

```sql
select "people".* from "people"
```

The return value of the [query](/api/model.html#static-query) method is an instance of [QueryBuilder](/api/query-builder.html) that has all the methods a [knex QueryBuilder](http://knexjs.org/#Builder) has. Here is a simple example that uses some of them:

```js
const middleAgedJennifers = await Person
  .query()
  .where('age', '>', 40)
  .where('age', '<', 60)
  .where('firstName', 'Jennifer')
  .orderBy('lastName')

console.log('The last name of the first middle aged Jennifer is');
console.log(middleAgedJennifers[0].lastName);
```

```sql
select "persons".* from "persons"
where "age" > 40
and "age" < 60
and "firstName" = 'Jennifer'
order by "lastName" asc
```

In addition to knex methods, the [QueryBuilder](/api/query-builder.html) has a lot of helpers for dealing with relations like the [joinRelation](/api/query-builder.html#joinrelation) method:

```js
const people = await Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent');

console.log(people[0].grandParentName)
```

```sql
select "parent:parent"."firstName" as "grandParentName"
from "persons"
inner join "persons" as "parent" on "parent"."id" = "persons"."parentId"
inner join "persons" as "parent:parent" on "parent:parent"."id" = "parent"."parentId"
```

The next example shows how easy it is to build complex queries:

```js
const people = await Person
  .query()
  .select('persons.*', 'Parent.firstName as parentFirstName')
  .join('persons as parent', 'persons.parentId', 'parent.id')
  .where('persons.age', '<', Person.query().avg('persons.age'))
  .whereExists(Animal.query().select(1).where('persons.id', ref('animals.ownerId')))
  .orderBy('persons.lastName');

console.log(people[0].parentFirstName);
```

```sql
select "persons".*, "parent"."firstName" as "parentFirstName"
from "persons"
inner join "persons" as "parent" on "persons"."parentId" = "parent"."id"
where "persons"."age" < (select avg("persons"."age") from "persons")
and exists (select 1 from "animals" where "persons"."id" = "animals"."ownerId")
order by "persons"."lastName" asc
```

Objection allows a bit more modern syntax with groupings and subqueries. Where knex requires you to use an old fashioned `function` an `this`, with objection you can use arrow functions:

```js
const nonMiddleAgedJennifers = await Person
  .query()
  .where(builder => builder.where('age', '<', 4).orWhere('age', '>', 60))
  .where('firstName', 'Jennifer')
  .orderBy('lastName')

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

Insert queries are created by chaining the [insert](/api/query-builder.html#insert) method to the query. See the [insertGraph](/api/query-builder.html#insertgraph) method for inserting object graphs.

#### Examples

```js
const jennifer = await Person
  .query()
  .insert({firstName: 'Jennifer', lastName: 'Lawrence'})

console.log(jennifer instanceof Person); // --> true
console.log(jennifer.firstName); // --> 'Jennifer'
console.log(jennifer.fullName()); // --> 'Jennifer Lawrence'
```

```sql
insert into "persons" ("firstName", "lastName") values ('Jennifer', 'Lawrence')
```

### Update queries

Update queries are created by chaining the [update](/api/query-builder.html#update) or [patch](/api/query-builder.html#patch) method to the query. The [patch](/api/query-builder.html#patch) and [update](/api/query-builder.html#update) methods return the number of updated rows. If you want the freshly updated model as a result you can use the helper method [patchAndFetchById](/api/query-builder.html#patchandfetchbyid) and [updateAndFetchById](/api/query-builder.html#updateandfetchbyid). On postgresql you can simply chain [`.returning('*')`](/api/query-builder.html#returning) or take a look at [this recipe] (/recipes/postgresql-quot-returning-quot-tricks) for more ideas. See [update](/api/query-builder.html#update) and [patch](/api/query-builder.html#patch) API documentation for discussion about their differences.

#### Examples

```js
const numUpdated = await Person.query()
  .patch({lastName: 'Dinosaur'})
  .where('age', '>', 60)

console.log('all people over 60 years old are now dinosaurs');
console.log(numUpdated, 'people were updated');
```

```sql
update "persons" set "lastName" = 'Dinosaur' where "age" > 60
```

```js
const updatedPerson = await Person
  .query()
  .patchAndFetchById(246, {lastName: 'Updated'});

console.log(updatedPerson.lastName); // --> Updated.
```

```sql
update "persons" set "lastName" = 'Updated' where "id" = 246
select "persons".* from "persons" where "id" = 246
```

### Delete queries

Delete queries are created by chaining the [delete](/api/query-builder.html/#delete) method to the query.

NOTE: The return value of the query will be the number of deleted rows. *If you're using Postgres take a look at [this recipe](/recipes/postgresql-quot-returning-quot-tricks) if you'd like the deleted rows to be returned as Model instances*.

#### Examples

```js
const numDeleted = await Person
  .query()
  .delete()
  .where(raw('lower("firstName")'), 'like', '%ennif%');

console.log(numDeleted, 'people were deleted');
```

```sql
delete from "persons" where lower("firstName") like '%ennif%'
```

## Relation queries

While the static [query](/api/model.html#static-query) method can be used to create a query to a whole table [$relatedQuery](/api/model.html#relatedquery) method can be used to query a single relation. [$relatedQuery](/api/model.html#relatedquery) returns an instance of [QueryBuilder](/api/query-builder.html) just like the [query](/api/model.html#static-query) method.

### Fetch queries

Simply call [$relatedQuery('pets')](/api/model.html#relatedquery) for a model _instance_ to fetch a relation for it. The relation name is given as the only argument. The return value is a [QueryBuilder](/api/query-builder.html) so you once again have all the query methods at your disposal. In many cases it's more convenient to use [eager loading](/guide/query-examples.html#eager-loading) to fetch relations. [$relatedQuery](/api/model.html#relatedquery) is better when you only need one relation and you need to filter the query extensively.

By default the fetched related models are assigned to the parent model to a property by the same name as the relation. For example in our `person.$relatedQuery('pets')` example query, the return value would be assigned to `person.pets`. This behaviour can be modified using [relatedFindQueryMutates](/api/model.html#static-relatedfindquerymutates). Also check out [$setRelated](/api/model.html#setrelated) and [$appendRelated](/api/model.html#appendrelated) helpers.

#### Examples

```js
// `person` is an instance of `Person` model.
const pets = await person
  .$relatedQuery('pets')
  .where('species', 'dog')
  .orderBy('name');

console.log(person.pets === pets); // --> true
console.log(pets[0] instanceof Animal); // --> true
```

```sql
select "animals".* from "animals"
where "species" = 'dog'
and "animals"."ownerId" = 1
order by "name" asc
```

### Insert queries

Chain the [insert](/api/query-builder.html#insert) method to a [$relatedQuery](/api/model.html#relatedquery) call to insert a related object for a model _instance_. The query inserts a new object to the related table and updates the needed tables to create the relation. In case of many-to-many relation a row is inserted to the join table etc. Also check out [insertGraph](/api/query-builder.html/api/query-builder.html#insertgraph) method for an alternative way to insert related models.

By default the inserted related models are appended to the parent model to a property by the same name as the relation. For example in our `person.$relatedQuery('pets').insert(obj)` example query, the return value would be appended to `person.pets`. This behaviour can be modified using [relatedInsertQueryMutates](/api/model.html#static-relatedinsertquerymutates). Also check out the [$setRelated](/api/model.html#setrelated) and
[$appendRelated](/api/model.html#appendrelated) helpers.

#### Examples

Add a pet for a person:

```js
// `person` is an instance of `Person` model.
const fluffy = await person
  .$relatedQuery('pets')
  .insert({name: 'Fluffy'});

console.log(person.pets.indexOf(fluffy) !== -1); // --> true
```

```sql
insert into "animals" ("name", "ownerId") values ('Fluffy', 1)
```

If you want to write columns to the join table of a many-to-many relation you first need to specify the columns in the `extra` array of the `through` object in [relationMappings](/api/model.html#static-relationmappings) (see the examples behind the link). For example, if you specified an array `extra: ['awesomeness']` in [relationMappings](/api/model.html#static-relationmappings) then `awesomeness` is written to the join table in the following example:

```js
// `person` is an instance of `Person` model.
const movie = await person
  .$relatedQuery('movies')
  .insert({name: 'The room', awesomeness: 9001});

console.log('best movie ever was added');
```

```sql
insert into "movies" ("name") values ('The room')
insert into "persons_movies" ("movieId", "personId", "awesomeness") values (14, 25, 9001)
```

### Update queries

See the [API documentation](/api/query-builder.html#update) of `update` method.

### Delete queries

See the [API documentation](/api/query-builder.html#delete) of `delete` method.

### Relate queries

See the [API documentation](/api/query-builder.html#relate) of `relate` method.

### Unrelate queries

See the [API documentation](/api/query-builder.html#unrelate) of `unrelate` method.

## Eager loading

You can fetch an arbitrary graph of relations for the results of any query by chaining the [eager](/api/query-builder.html#eager) method. [eager](/api/query-builder.html#eager) takes a [relation expression](/api/types.html#type-relationexpression) string as a parameter. In addition to making your life easier, eager queries avoid the "select N+1" problem and provide a great performance.

Because the eager expressions are strings (there's also an optional [object notation](#relationexpression-object-notation)) they can be easily passed for example as a query parameter of an HTTP request. However, allowing the client to execute expressions like this without any limitations is not very secure. Therefore the [QueryBuilder](/api/query-builder.html) has the [allowEager](/api/query-builder.html#alloweager) method. [allowEager](/api/query-builder.html#alloweager) can be used to  limit the allowed eager expression to a certain subset.

By giving expression `[pets, children.pets]` for [allowEager](/api/query-builder.html#alloweager) the value passed to [eager](/api/query-builder.html#eager) is allowed to be one of:

 * `'pets'`
 * `'children'`
 * `'children.pets'`
 * `'[pets, children]'`
 * `'[pets, children.pets]'`

Examples of expressions that would cause the query to be rejected:

 * `'movies'`
 * `'children.children'`
 * `'[pets, children.children]'`
 * `'notEvenAnExistingRelation'`

In addition to the [eager](/api/query-builder.html#eager) method, relations can be fetched using the [loadRelated](/api/model.html#static-loadrelated) and
[$loadRelated](/api/model.html#loadrelated) methods.

By default eager loading is done using multiple separate queries (for details see [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/)). You can choose to use a join based eager loading algorithm that only performs one single query to fetch the whole eager tree. You can select which algorithm to use per query using [eagerAlgorithm](/api/query-builder.html#eageralgorithm) method or per model by setting the [defaultEagerAlgorithm](/api/model.html#static-defaulteageralgorithm) property. All algorithms have their strengths and weaknesses, which are discussed in detail [here](/api/query-builder.html#eager).

#### Examples

Fetch the `pets` relation for all results of a query:

```js
const people = await Person
  .query()
  .eager('pets');

// Each person has the `.pets` property populated with Animal objects related
// through `pets` relation.
console.log(people[0].pets[0].name);
console.log(people[0].pets[0] instanceof Animal); // --> true
```

Fetch multiple relations on multiple levels:

```js
const people = await Person
  .query()
  .eager('[pets, children.[pets, children]]');

// Each person has the `.pets` property populated with Animal objects related
// through `pets` relation. The `.children` property contains the Person's
// children. Each child also has the `pets` and `children` relations eagerly
// fetched.
console.log(people[0].pets[0].name);
console.log(people[1].children[2].pets[1].name);
console.log(people[1].children[2].children[0].name);
```

Here's the previous query using the optional [object notation](/api/types.html#relationexpression-object-notation)

```js
const people = await Person
  .query()
  .eager({
    pets: true,
    children: {
      pets: true,
      children: true
    }
  });
```

Fetch one relation recursively:

```js
const people = await Person
  .query()
  .eager('[pets, children.^]');

// The children relation is from Person to Person. If we want to fetch the whole
// descendant tree of a person we can just say "fetch this relation recursively"
// using the `.^` notation.
console.log(people[0].children[0].children[0].children[0].children[0].firstName);
```

Limit recursion to 3 levels:

```js
const people = await Person
  .query()
  .eager('[pets, children.^3]');

console.log(people[0].children[0].children[0].children[0].firstName);
```

Relations can be modified using the [modifyEager](/api/query-builder.html#modifyeager) method:

```js
const people = await Person
  .query()
  .eager('[children.[pets, movies], movies]')
  .modifyEager('children.pets', builder => {
    // Only select pets older than 10 years old for children
    // and only return their names.
    builder.where('age', '>', 10).select('name');
  });
```

Relations can also be modified using named filters like this:

```js
const people = await Person
  .query()
  .eager('[pets(selectName, onlyDogs), children(orderByAge).[pets, children]]', {
    selectName: (builder) => {
      builder.select('name');
    },
    orderByAge: (builder) => {
      builder.orderBy('age');
    },
    onlyDogs: (builder) => {
      builder.where('species', 'dog');
    }
  });

console.log(people[0].children[0].pets[0].name);
console.log(people[0].children[0].movies[0].id);
```

Reusable named filters can be defined for models using [modifiers](/api/model.html#static-modifiers)

```js
// Person.js

class Person extends Model {
  static get modifiers() {
    return {
      defaultSelects(builder) {
        builder.select('id', 'firstName')
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

      onlyDogs(builder) {
        builder.where('species', 'dog');
      }
    };
  }
}

// somewhereElse.js

const people = await Person
  .query()
  .eager(`
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
const people = await Person
  .query()
  .eager(`[
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

Example usage for [allowEager](/api/query-builder.html#alloweager) in an express route:

```js
expressApp.get('/people', async (req, res, next) => {
  const people = await Person
    .query()
    .allowEager('[pets, children.pets]')
    .eager(req.query.eager);

  res.send(people);
});
```

Eager loading algorithm can be changed using the [eagerAlgorithm](/api/query-builder.html#eageralgorithm) method:

```js
const people = await Person
  .query()
  .eagerAlgorithm(Model.JoinEagerAlgorithm)
  .eager('[pets, children.pets]');
```

There are also shortcut methods for each of the eager algoriths:

```js
const people = await Person
  .query()
  .joinEager('[pets, children.pets]');
```

## Graph inserts

Arbitrary relation graphs can be inserted using the [insertGraph](/api/query-builder.html#insertgraph) method. This is best explained using examples, so check them out.

See the [allowInsert](/api/query-builder.html/#allowinsert) method if you need to limit which relations can be inserted using [insertGraph](/api/query-builder.html#insertgraph) method to avoid security issues. [allowInsert](/api/query-builder.html/#allowinsert) works like [allowEager](/api/query-builder.html/#allowinsert).

If you are using Postgres the inserts are done in batches for maximum performance. On other databases the rows need to be inserted one at a time. This is because postgresql is the only database engine that returns the identifiers of all inserted rows and not just the first or the last one.

[insertGraph](/api/query-builder.html#insertgraph) operation is __not__ atomic by default! You need to start a transaction and pass it to the query using any of the supported ways. See the section about [transactions](/guide/transactions.html) for more information.

You can read more about graph inserts from [this blog post](https://www.vincit.fi/en/blog/nested-eager-loading-and-inserts-with-objection-js/).


#### Examples

```js
// The return value of `insertGraph` is the input graph converted into
// model instances. Inserted objects have ids added to them and related
// rows have foreign keys set, but no other columns get fetched from
// the database. You can use `insertGraphAndFetch` for that.
const graph = await Person
  .query()
  .insertGraph({
    firstName: 'Sylvester',
    lastName: 'Stallone',

    children: [{
      firstName: 'Sage',
      lastName: 'Stallone',

      pets: [{
        name: 'Fluffy',
        species: 'dog'
      }]
    }]
  });
```

The query above will insert 'Sylvester', 'Sage' and 'Fluffy' into db and create relationships between them as defined in the [relationMappings](/api/model.html#static-relationmappings) of the models. Technically [insertGraph](/api/query-builder.html#insertgraph) builds a dependency graph from the object graph and inserts the models that don't depend on any other models until the whole graph is inserted.

If you need to refer to the same model in multiple places you can use the special properties `#id` and `#ref` like this:

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#id": 'silverLiningsPlaybook'
      name: 'Silver Linings Playbook',
      duration: 122
    }]
  }, {
    firstName: 'Bradley',
    lastName: 'Cooper',

    movies: [{
      "#ref": 'silverLiningsPlaybook'
    }]
  }]);
```

The query above will insert only one movie (the 'Silver Linings Playbook') but both 'Jennifer' and 'Bradley' will have the movie related to them through the many-to-many relation `movies`. The `#id` can be any string. There are no format or length requirements for them. It is quite easy to create circular dependencies using `#id` and `#ref`. Luckily [insertGraph](/api/query-builder.html#insertgraph) detects them and rejects the query with a clear error message.

You can refer to the properties of other models anywhere in the graph using expressions of format `#ref{<id>.<property>}` as long as the reference doesn't create a circular dependency. For example:

```js
await Person
  .query()
  .insertGraph([{
    "#id": 'jenniLaw',
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    pets: [{
      name: "I am the dog of #ref{jenniLaw.firstName} whose id is #ref{jenniLaw.id}",
      species: 'dog'
    }]
  }]);
```

The query above will insert a pet named `I am the dog of Jennifer whose id is 523` for Jennifer. If `#ref{}` is used within a string, the references are replaced with the referred values inside the string. If the reference string contains nothing but the reference, the referred value is copied to it's place preserving its type.

Existing rows can be related to newly inserted rows by using the `relate` option. `relate` can be `true` in which case all models in the graph that have an identifier get related. `relate` can also be an array of relation paths like `['children', 'children.movies.actors']` in which case only objects in those paths get related even if they have an idetifier.

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      id: 2636
    }]
  }], {
    relate: true
  });
```

The query above would create a new person `Jennifer Lawrence` and add an existing movie (id = 2636) to its `movies` relation. The next query would do the same:

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      id: 2636
    }]
  }], {
    relate: [
      'movies'
    ]
  });
```

If you need to mix inserts and relates inside a single relation, you can use the special property `#dbRef`

```js
await Person
  .query()
  .insertGraph([{
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    movies: [{
      "#dbRef": 2636
    }, {
      // This will be inserted with an id.
      id: 100,
      name: 'New movie'
    }]
  }]);
```

## Graph upserts

Arbitrary relation graphs can be upserted (insert + update + delete) using the [upsertGraph](/api/query-builder.html#upsertgraph) method. This is best explained using examples, so check them out.

By default [upsertGraph](/api/query-builder.html#upsertgraph) method updates the objects that have an id, inserts objects that don't have an id and deletes all objects that are not present. This functionality can be modified in many ways by providing [UpsertGraphOptions](/api/types.html#type-upsertgraphoptions) object as the second argument.

The [upsertGraph](/api/query-builder.html#upsertgraph) method works a little different than the other update and patch methods. When using [upsertGraph](/api/query-builder.html#upsertgraph) any `where` or `having` methods are ignored. The models are updated based on the id properties in the graph. This is also clarified in the examples.

[upsertGraph](/api/query-builder.html#upsertgraph) uses [insertGraph](/api/query-builder.html#insertgraph) under the hood for inserts. That means that you can insert object graphs for relations and use all [insertGraph](/api/query-builder.html#insertgraph) features like `#ref` references.

[upsertGraph](/api/query-builder.html#upsertgraph) operation is __not__ atomic by default! You need to start a transaction and pass it to the query using any of the supported ways. See the section about [transactions](/guide/transactions.html) for more information.

See the [allowUpsert](/api/query-builder.html#allowupsert) method if you need to limit  which relations can be modified using [upsertGraph](/api/query-builder.html#upsertgraph) method to avoid security issues. [allowUpsert](/api/query-builder.html#allowupsert) works like [allowInsert](/api/query-builder.html/#allowinsert).

#### Examples

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

By default [upsertGraph](/api/query-builder.html#upsertgraph) method updates the objects that have an id, inserts objects that don't have an id and deletes all objects that are not present. Off course the delete only applies to relations and not the root. Here's a basic example:

```js
// The return value of `upsertGraph` is the input graph converted into
// model instances. Inserted objects have ids added to them related
// rows have foreign keys set but no other columns get fetched from
// the database. You can use `upsertGraphAndFetch` for that.
const graph = await Person
  .query()
  .upsertGraph({
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
    pets: [{
      // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
      // that there is no id!
      name: 'Wolfgang',
      species: 'Dog'
    }, {
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat',
    }],

    // Notice that Wanderlust is missing from the list. It will get deleted.
    // It is also worth mentioning that the Wanderlust's `reviews` or any
    // other relations are NOT recursively deleted (unless you have
    // defined `ON DELETE CASCADE` or other hooks in the db).
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }, {
        // And insert a third one.
        stars: 4,
        title: '4 / 5',
        text: 'Would see again'
      }]
    }]
  });
```

By giving `relate: true` and/or `unrelate: true` options as the second argument, you can change the behaviour so that instead of inserting and deleting rows, they are related and/or unrelated. Rows with no id still get inserted, but rows that have an id and are not currently related, get related.

```js
const options = {
  relate: true,
  unrelate: true
};

await Person
  .query()
  .upsertGraph({
    // This updates the `Jennifer Aniston` person since the id property is present.
    id: 1,
    firstName: 'Jonnifer',

    // Unrelate the parent. This doesn't delete it.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [{
      // Jennifer just got a new pet. Insert it and relate it to Jennifer. Notice
      // that there is no id!
      name: 'Wolfgang',
      species: 'Dog'
    }, {
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat',
    }],

    // Notice that Wanderlust is missing from the list. It will get unrelated.
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }]
    }, {
      // This is some existing movie that isn't currently related to Jennifer.
      // It will get related.
      id: 1253
    }]
  }, options);
```

`relate` and `unrelate` (and all other [options](/api/types.html#type-upsertgraphoptions) can also be lists of relation paths. In that case the option is only applied for the listed relations.

```js
const options = {
  // Only enable `unrelate` functionality for these two paths.
  unrelate: ['pets', 'movies.reviews'],
  // Only enable `relate` functionality for 'movies' relation.
  relate: ['movies'],
  // Disable deleting for movies.
  noDelete: ['movies']
};

await Person
  .query()
  .upsertGraph({
    id: 1,

    // This gets deleted since `unrelate` list doesn't have 'parent' in it
    // and deleting is the default behaviour.
    parent: null,

    // Notice that Kat the Cat is not listed in `pets`. It will get unrelated.
    pets: [{
      // It turns out Doggo is a cat. Update it.
      id: 1,
      species: 'Cat'
    }],

    // Notice that Wanderlust is missing from the list. It will NOT get unrelated
    // or deleted since `unrelate` list doesn't contain `movies` and `noDelete`
    // list does.
    movies: [{
      id: 1,

      // Upsert graphs can be arbitrarily deep. This modifies the
      // reviews of "Horrible Bosses".
      reviews: [{
        // Update a review.
        id: 1,
        stars: 2,
        text: 'Even more Meh'
      }, {
        // And insert another one.
        stars: 5,
        title: 'Loved it',
        text: 'Best movie ever'
      }]
    }, {
      // This is some existing movie that isn't currently related to Jennifer.
      // It will get related.
      id: 1253
    }]
  }, options);
```

You can disable updates, inserts, deletes etc. for the whole [upsertGraph](/api/query-builder.html#upsertgraph) operation or for individual relations by using the `noUpdate`, `noInsert`, `noDelete` etc. options. See [UpsertGraphOptions](/api/types.html#type-upsertgraphoptions) docs for more info.
