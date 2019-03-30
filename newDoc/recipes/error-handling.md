# Error handling

Objection throws four kinds of errors:

1. [ValidationError](/api/types.html#class-validationerror) when an input that could come from the outside world is invalid. These inputs
    include model instances and POJOs, eager expressions object graphs etc. [ValidationError](/api/types.html#class-validationerror) has
    a `type` property that can be used to distinguish between the different error types.

2. [NotFoundError](/api/types.html#class-notfounderror) when [throwIfNotFound](/api/query-builder/instance-methods.html#throwifnotfound) was called for a query and no
    results were found.

3. Database errors (unique violation error etc.) are thrown by the database client libraries and the error types depend on the
    library. You can use the [objection-db-errors](https://github.com/Vincit/objection-db-errors) plugin to handle these.

4. A basic javascript `Error` when a programming or logic error is detected. In these cases there is nothing the users
    can do and the only correct way to handle the error is to send a 500 response to the user and to fix the program.

## Examples

An example error handler function that handles all possible errors. This example uses the [objection-db-errors](https://github.com/Vincit/objection-db-errors) library. Note that you should never send the errors directly to the client as they may contain SQL and other information that reveals too much about the inner workings of your app.

```js
const {
  ValidationError,
  NotFoundError
} = require('objection');

const {
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError
} = require('objection-db-errors');

// In this example `res` is an express response object.
function errorHandler(err, res) {
  if (err instanceof ValidationError) {
    switch (err.type) {
      case 'ModelValidation':
        res.status(400).send({
          message: err.message,
          type: err.type,
          data: err.data
        });
        break;
      case 'RelationExpression':
        res.status(400).send({
          message: err.message,
          type: 'RelationExpression',
          data: {}
        });
        break;
      case 'UnallowedRelation':
        res.status(400).send({
          message: err.message,
          type: err.type,
          data: {}
        });
        break;
      case 'InvalidGraph':
        res.status(400).send({
          message: err.message,
          type: err.type,
          data: {}
        });
        break;
      default:
        res.status(400).send({
          message: err.message,
          type: 'UnknownValidationError',
          data: {}
        });
        break;
    }
  } else if (err instanceof NotFoundError) {
    res.status(404).send({
      message: err.message,
      type: 'NotFound',
      data: {}
    });
  } else if (err instanceof UniqueViolationError) {
    res.status(409).send({
      message: err.message,
      type: 'UniqueViolation',
      data: {
        columns: err.columns,
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof NotNullViolationError) {
    res.status(400).send({
      message: err.message,
      type: 'NotNullViolation',
      data: {
        column: err.column,
        table: err.table,
      }
    });
  } else if (err instanceof ForeignKeyViolationError) {
    res.status(409).send({
      message: err.message,
      type: 'ForeignKeyViolation',
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof CheckViolationError) {
    res.status(400).send({
      message: err.message,
      type: 'CheckViolation',
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof DataError) {
    res.status(400).send({
      message: err.message,
      type: 'InvalidData',
      data: {}
    });
  } else if (err instanceof DBError) {
    res.status(500).send({
      message: err.message,
      type: 'UnknownDatabaseError',
      data: {}
    });
  } else {
    res.status(500).send({
      message: err.message,
      type: 'UnknownError',
      data: {}
    });
  }
}
```
