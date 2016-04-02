import _ from 'lodash';

const OVERWRITE_FOR_DATABASE_KEY = `@overwriteForDatabase`;

export function getDialect(knex) {
  return knex.client.dialect;
}

export function isPostgres(knex) {
  return getDialect(knex) === 'postgresql';
}

export function isMySql(knex) {
  return getDialect(knex) === 'mysql';
}

export function isSqlite(knex) {
  return getDialect(knex) === 'sqlite3';
}

export function isKnexQueryBuilder(knexQueryBuilder) {
  return knexQueryBuilder
    && knexQueryBuilder.client
    && _.isString(knexQueryBuilder.client.dialect);
}

export function overwriteForDatabase(input) {
  // If there is no input or if the input is a function, we assume that the
  // decorator was applied to a class instead of a method.
  let isClassDecorator = _.isUndefined(input) || _.isFunction(input);

  if (isClassDecorator) {
    // In case of class decorator, the input should be a function that returns
    // a knex instance that the method version can use.
    let getKnex = input;

    if (_.isUndefined(getKnex)) {
      // The default getter attempts to call a function called `knex`.
      getKnex = (inst) => inst.knex();
    }

    return overwriteForDatabaseClass(getKnex);
  } else {
    return overwriteForDatabaseMethod(input);
  }
}

function overwriteForDatabaseClass(getKnex) {
  return function (constructor) {
    if (constructor[OVERWRITE_FOR_DATABASE_KEY]) {
      // Knex getter is already registered. Do nothing.
      return;
    }

    Object.defineProperty(constructor, OVERWRITE_FOR_DATABASE_KEY, {
      enumerable: false,
      writable: false,
      value: { getKnex }
    });
  };
}

function overwriteForDatabaseMethod(input) {
  return function (target, property, descriptor) {
    const methodNameByDialect = input;
    const defaultImpl = descriptor.value;

    descriptor.value = function () {
      let knex = this.constructor[OVERWRITE_FOR_DATABASE_KEY].getKnex(this);
      let dialect = getDialect(knex);

      // Call the correct method based on the dialect.
      if (dialect in methodNameByDialect) {
        let methodName = methodNameByDialect[dialect];
        return this[methodName].apply(this, arguments);
      } else {
        return defaultImpl.apply(this, arguments);
      }
    };
  };
}
