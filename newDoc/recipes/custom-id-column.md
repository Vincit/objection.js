# Custom id column

Name of the identifier column can be changed by setting the static [idColumn](/api/model.html#static-idcolumn) property of a model class. Composite key can be defined by using an array of column names.

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
