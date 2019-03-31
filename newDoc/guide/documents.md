# Documents

Objection.js makes it easy to store non-flat documents as table rows. All properties of a model that are marked as objects or arrays in the model's [jsonSchema](/api/model/static-properties.html#static-jsonschema) are automatically converted to JSON strings in the database and back to objects when read from the database. The database columns for the object properties can be normal text columns. Postgresql has the `json` and `jsonb` data types that can be used instead for better performance and possibility to [query the documents](http://www.postgresql.org/docs/9.4/static/functions-json.html). If you don't want to use [jsonSchema](/api/model/static-properties.html#static-jsonschema) you can mark properties as objects using the [jsonAttributes](/api/model/static-properties.html#static-jsonattributes)
Model property.

The `address` property of the Person model is defined as an object in the [Person.jsonSchema](/api/model/static-properties.html#static-jsonschema):

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
