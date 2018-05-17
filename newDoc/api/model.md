# class Model

## static tableName

<!-- The first simple example before the description -->
```js
class Person extends Model {
  static get tableName() {
    return 'persons';
  }
}
```

Name of the database table for this model.

Each model must set this.

<!-- Rest of the examples after under #### Examples header -->
#### Examples

Using ESNext static properties

```js
class Person extends Model {
  static tableName = 'persons';
}
```

## static relationMappings

## static jsonSchema

<!-- static properties like this -->
## static idColumn

<!-- static methods like this -->
## static query()

<!-- Instance methods like this -->
## $relatedQuery()
