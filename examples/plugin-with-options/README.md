# Objection.js example plugin with options

This project serves as the best practices example of an objection.js plugin that takes options.

The plugin adds a `session` method for `QueryBuilder` and extends a model
so that it sets `modifiedAt`, `modifiedBy`, `createdAt` and `createdBy` properties
automatically based on the given session.

This example is exactly the same as the [plugin](https://github.com/Vincit/objection.js/tree/master/examples/plugin)
example but this one accepts options. The only difference is that the main module is a factory method that accepts options
and returns a mixin.

Usage example:

```js
const Model = require('objection').Model;

const Session = require('path/to/this/example')({
  setCreatedBy: false,
  setModifiedBy: false
});

class Person extends Session(Model) {
  static get tableName() {
    return 'Person';
  }
}

module.exports = Person;
```

```js
// expressjs route.
router.post('/persons', (req, res) => {
  return (
    Person.query()
      // The following method was added by our plugin.
      .session(req.session)
      .insert(req.body)
      .then(person => {
        // Our plugin set the following property.
        console.log(person.createdAt);
        // This wasn't set because of the `setCreatedBy: false` option.
        console.log(person.createdBy); // -->  undefined

        res.send(person);
      })
  );
});
```
