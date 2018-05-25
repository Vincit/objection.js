# Default values

You can set the default values for properties using the `default` property in [jsonSchema](/api/models.html#static-jsonschema).


```js
class Person extends Model {
  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        gender: {
          type: 'string',
          enum: ['Male', 'Female', 'Other'],
          default: 'Female'
        }
      }
    };
  }
}
```

Note that you can also set default values in the database. See the documentation of knex and the appropriate database engine for more info. If you need to se dynamic default values, you can use the [$beforeInsert](/api/model.html#beforeinsert) hook.
