# Custom validation

If you want to use the json schema validation but add some custom validation on top of it you can override the [$beforeValidate](/api/model.html#beforevalidate) or [$afterValidate](/api/model.html#aftervalidate) method.

If you need to do validation on insert or update you can throw exceptions from the [$beforeInsert](/api/model.html#beforeinsert) and [$beforeUpdate](/api/model.html#beforeupdate) methods.

If you don't want to use the built-in json schema validation, you can just ignore the [jsonSchema](/api/model.html#jsonschema) property. It is completely optional. If you want to use some other validation library you need to implement a custom [Validator](/api/types.html#class-validator) (see the example).

## Examples

Additional validation:

```js
class Person extends Model {
  $beforeInsert() {
    if (this.id) {
      throw new objection.ValidationError({
        message: 'identifier should not be defined before insert',
        type: 'MyCustomError',
        data: someObjectWithSomeData
      });
    }
  }
}
```

Modifying the [Ajv](https://github.com/epoberezkin/ajv) bases JSON schema validation:

```js
const AjvValidator = require('objection').AjvValidator;

class Model {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => {
        // Here you can modify the `Ajv` instance.
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }
}
```

Replace JSON schema validation with any other validation scheme by implementing a custom [Validator](/api/types.html#class-validator):

```js
// MyCustomValidator.js

const { Validator } = require('objection');

class MyCustomValidator extends Validator {
  validate(args) {
    // The model instance. May be empty at this point.
    const model = args.model;

    // The properties to validate. After validation these values will
    // be merged into `model` by objection.
    const json = args.json;

    // `ModelOptions` object. If your custom validator sets default
    // values or has the concept of required properties, you need to
    // check the `opt.patch` boolean. If it is true we are validating
    // a patch object (an object with a subset of model's properties).
    const opt = args.options;

    // A context object shared between the validation methods. A new
    // object is created for each validation operation. You can store
    // whatever you need in this object.
    const ctx = args.ctx;

    // Do your validation here and throw any exception if the
    // validation fails.
    doSomeValidationAndThrowIfFails(json);

    // You need to return the (possibly modified) json.
    return json;
  }

  beforeValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.beforeValidate(args);
  }

  afterValidate(args) {
    // Takes the same arguments as `validate`. Usually there is no need
    // to override this.
    return super.afterValidate(args);
  }
}

// BaseModel.js

const Model = require('objection').Model;

// Override the `createValidator` method of a `Model` to use the
// custom validator.
class BaseModel extends Model {
  static createValidator() {
    return new MyCustomValidator();
  }
}
```
