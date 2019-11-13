# Documents

Objection.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as objects or arrays in the model's [jsonSchema](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-jsonschema) are automatically converted to JSON strings in the database and back to objects when read from the database. The database columns for the object properties can be normal text columns. Postgresql has the `json` and `jsonb` data types that can be used instead for better performance and possibility to [query the documents](http://www.postgresql.org/docs/9.4/static/functions-json.html). If you don't want to use [jsonSchema](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-jsonschema) you can mark properties as objects using the [jsonAttributes](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-jsonattributes)
Model property.

The `address` property of the Person model is defined as an object in the [Person.jsonSchema](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-jsonschema):

```js
const jennifer = await Person
  .query()
  .insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    age: 24,
    address: {
      street: 'Somestreet 10',
      zipCode: '123456',
      city: 'Tampere'
    }
  });

const jenniferFromDb = await Person
  .query()
  .findById(jennifer.id);

console.log(jennifer.address.city); // --> Tampere
console.log(jenniferFromDb.address.city); // --> Tampere
```
