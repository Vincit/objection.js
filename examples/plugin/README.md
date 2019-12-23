# Objection.js example plugin

This project serves as the best practices example of an objection.js plugin.

The plugin adds a `session` method for `QueryBuilder` and extends a model
so that it sets `modifiedAt`, `modifiedBy`, `createdAt` and `createdBy` properties
automatically based on the given session.

Usage example:

```js
const Model = require('objection').Model;
const Session = require('path/to/this/example');

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
        // Our plugin set the following properties.
        console.log(person.createdAt);
        console.log(person.createdBy);

        res.send(person);
      })
  );
});
```
