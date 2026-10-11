'use strict';

const { wrapError, DBError, UniqueViolationError } = require('db-errors');

// db-errors only recognizes mssql unique key violations, but primary key
// violations have the same error number, with a different message (#2688).
const MSSQL_PRIMARY_KEY_REGEX =
  /Violation of PRIMARY KEY constraint '(.+)'\. Cannot insert duplicate key in object '(.+)\.(.+)'\. The duplicate key value is \((.+)\)/;

function wrapDbError(err) {
  if (!isTediousError(err)) {
    return wrapError(err);
  }

  // db-errors parses the errors of the `mssql` package, which wraps the errors
  // of tedious and keeps their number and class in `originalError.info`. knex
  // uses tedious directly, so its errors are passed on in that shape.
  const wrapped = wrapError({
    code: err.code,
    originalError: { message: err.message, info: { number: err.number, class: err.class } },
  });

  if (!(wrapped instanceof DBError)) {
    return err;
  }

  wrapped.nativeError = err;

  const match = wrapped.constructor === DBError && MSSQL_PRIMARY_KEY_REGEX.exec(err.message);

  if (match) {
    return new UniqueViolationError({
      nativeError: err,
      client: 'mssql',
      table: match[3],
      schema: match[2],
      constraint: match[1],
    });
  }

  return wrapped;
}

function isTediousError(err) {
  return err?.code === 'EREQUEST' && Number.isInteger(err.number);
}

module.exports = {
  wrapDbError,
};
