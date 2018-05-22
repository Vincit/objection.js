# Custom id column

Name of the identifier column can be changed by setting the static [idColumn](/api/model.html#static-idcolumn) property of a model class. Composite key can be defined by using an array of column names.

::: multi-language example begin
::: multi-language section ES2015 begin

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

::: multi-language section ES2015 end
::: multi-language section ESNext begin

```js
class Person extends Model {
  static idColumn = 'person_id';
}
```

Composite key:

```js
class Person extends Model {
  static idColumn = ['someColumn', 'someOtherColumn'];
}
```

::: multi-language section ESNext end
::: multi-language example end
