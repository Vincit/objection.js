# Joins

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join):

```js
const people = await Person
  .query()
  .select('persons.*', 'parent.firstName as parentName')
  .join('persons as parent', 'persons.parentId', 'parent.id');

console.log(people[0].parentName);
```

Objection also has helpers like the [joinRelation](/api/query-builder.html#joinrelation) method family:

```js
const people = await Person
  .query()
  .select('parent:parent.name as grandParentName')
  .joinRelation('parent.parent');

console.log(people[0].grandParentName);
```
