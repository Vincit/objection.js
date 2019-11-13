# Composite keys

Composite (compound) keys are fully supported. Just give an array of columns where you would normally give a single column name. Composite primary key can be specified by setting an array of column names to the [idColumn](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-idcolumn) of a model class.

Here's a list of methods that may help working with composite keys:

 * [whereComposite](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#wherecomposite)
 * [whereInComposite](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#whereincomposite)
 * [findById](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#findbyid)
 * [findByIds](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#findbyids)
 * [deleteById](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/mutate-methods.md#deletebyid)
 * [updateAndFetchById](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/mutate-methods.md#updateandfetchbyid)
 * [patchAndFetchById](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/mutate-methods.md#patchandfetchbyid)
 * [$id](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#id)

## Examples

Specifying a composite primary key for a model:

```js
class Person extends Model {
  static get idColumn() {
    return ['firstName', 'lastName', 'dateOfBirth'];
  }
}
```

Specifying a relation using a composite primary key and a composite foreign key:

```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }

  static get relationMappings() {
    return {
      pets: {
        relation: Model.BelongsToOneRelation,
        modelClass: Animal,
        join: {
          from: [
            'persons.firstName',
            'persons.lastName',
            'persons.dateOfBirth'
          ],
          to: [
            'animals.ownerFirstName',
            'animals.ownerLastName',
            'animals.ownerDateOfBirth'
          ]
        }
      }
    };
  }
};
```

[findById](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#findbyid):

```js
await Person
  .query()
  .findById([1, 'something', 7])
```


[whereComposite](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#wherecomposite):

```js
await Person
  .query()
  .whereComposite(['foo', 'bar'], [1, 'barValue']);
```

[whereInComposite](https://github.com/Vincit/objection.js/tree/v1/doc/api/query-builder/find-methods.md#whereincomposite):

```js
await Person
  .query()
  .whereInComposite(['foo', 'bar'], [
    [1, 'barValue1'],
    [2, 'barValue2']
  ]);
```
