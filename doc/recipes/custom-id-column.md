# Custom id column

Name of the identifier column can be changed by setting the static [idColumn](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-idcolumn) property of a model class. Composite key can be defined by using an array of column names.

```js
class Person extends Model {
  static get idColumn() {
    return 'person_id';
  }
}
```

Composite key:

```js
class Person extends Model {
  static get idColumn() {
    return ['someColumn', 'someOtherColumn'];
  }
}
```
