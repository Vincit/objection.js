import _ from 'lodash';

/**
 * @ignore
 */
export function getDialect(knex) {
  return knex.client.dialect;
}

/**
 * @ignore
 */
export function isPostgres(knex) {
  return getDialect(knex) === 'postgresql';
}

/**
 * @ignore
 */
export function isMySql(knex) {
  return getDialect(knex) === 'mysql';
}

/**
 * @ignore
 */
export function isSqlite(knex) {
  return getDialect(knex) === 'sqlite3';
}

/**
 * @ignore
 */
export function isKnexQueryBuilder(knexQueryBuilder) {
  return knexQueryBuilder
    && knexQueryBuilder.client
    && _.isString(knexQueryBuilder.client.dialect);
}

/**
 * @ignore
 */
export function overwriteForDatabase(input) {
  if (!input) {
    input = (inst) => inst.knex();
  }

  if (_.isFunction(input)) {
    return overwriteForDatabaseClass(input);
  } else {
    return overwriteForDatabaseMethod(input);
  }
}

/**
 * @ignore
 */
function overwriteForDatabaseClass(input) {
  return function (constructor) {
    const getKnex = input;

    if (constructor['@overwriteForDatabase']) {
      return;
    }

    Object.defineProperty(constructor, '@overwriteForDatabase', {
      enumerable: false,
      writable: false,
      value: { getKnex }
    });
  };
}

/**
 * @ignore
 */
function overwriteForDatabaseMethod(input) {
  return function (target, property, descriptor) {
    const methodNameByDialect = input;
    const defaultImpl = descriptor.value;

    descriptor.value = function () {
      let knex = this.constructor['@overwriteForDatabase'].getKnex(this);
      let dialect = getDialect(knex);

      if (dialect in methodNameByDialect) {
        let methodName = methodNameByDialect[dialect];
        return this[methodName].apply(this, arguments);
      } else {
        return defaultImpl.apply(this, arguments);
      }
    };
  };
}
