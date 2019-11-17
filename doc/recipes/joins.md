# Joins

Again, [do as you would with a knex query builder](http://knexjs.org/#Builder-join):

```js
const people = await Person.query()
  .select('persons.*', 'parent.firstName as parentName')
  .join('persons as parent', 'persons.parentId', 'parent.id');

console.log(people[0].parentName);
```

Objection also has helpers like the [joinRelated](/api/query-builder/join-methods.html#joinrelated) method family:

```js
const people = await Person.query()
  .select('parent:parent.name as grandParentName')
  .joinRelated('parent.parent');

console.log(people[0].grandParentName);
```
