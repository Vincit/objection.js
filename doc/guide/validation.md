# Validation

[JSON schema](http://json-schema.org/) validation can be enabled by setting the [jsonSchema](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/static-properties.md#static-jsonschema) property of a model class. The validation is ran each time a [Model](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/) instance is created.

You rarely need to call [$validate](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#validate) method explicitly, but you can do it when needed. If validation fails a [ValidationError](https://github.com/Vincit/objection.js/tree/v1/doc/api/types/#class-validationerror) will be thrown. Since we use Promises, this usually means that a promise will be rejected with an instance of [ValidationError](https://github.com/Vincit/objection.js/tree/v1/doc/api/types/#class-validationerror).

See [the recipe book](https://github.com/Vincit/objection.js/tree/v1/doc/recipes/custom-validation.md) for instructions if you want to use some other validation library.

## Examples

All these will trigger the validation:

```js
Person.fromJson({firstName: 'jennifer', lastName: 'Lawrence'});
await Person.query().insert({firstName: 'jennifer', lastName: 'Lawrence'});
await Person.query().update({firstName: 'jennifer', lastName: 'Lawrence'}).where('id', 10);

// Patch operation ignores the `required` property of the schema
// and only validates the given properties. This allows a subset
// of model's properties to be updated.
await Person.query().patch({age: 24}).where('age', '<', 24);

await Person.insertGraph({
  firstName: 'Jennifer',
  pets: [{
    name: 'Fluffy'
  }]
});

await Person.upsertGraph({
  id: 1,
  pets: [{
    name: 'Fluffy II'
  }]
});
```

Validation errors provide detailed error message:

```js
try {
  await Person.query().insert({firstName: 'jennifer'});
} catch (err) {
  console.log(err instanceof objection.ValidationError); // --> true
  console.log(err.data); // --> {lastName: [{message: 'required property missing', ...}]}
}
```

Error parameters returned by [ValidationError](https://github.com/Vincit/objection.js/tree/v1/doc/api/types/#class-validationerror) could be used to provide custom error messages:

```js
try {
  await Person.query().insert({firstName: 'jennifer'});
} catch (err) {
  let lastNameErrors = err.data.lastName;

  for (let i = 0; i < lastNameErrors.length; ++i) {
    let lastNameError = lastNameErrors[i];

    if (lastNameError.keyword === "required") {
      console.log('This field is required!');
    } else if (lastNameError.keyword === "minLength") {
      console.log('Must be longer than ' + lastNameError.params.limit)
    } else {
      console.log(lastNameError.message); // Fallback to default error message
    }
  }
}
```
