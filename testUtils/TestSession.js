'use strict';

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const Model = require('../').Model;
const knexUtils = require('../lib/utils/knexUtils');
const transaction = require('../').transaction;

class TestSession {

  static init() {
    if (this.staticInitCalled) {
      return;
    }

    convertPostgresBigIntegersToNumber();
    registerUnhandledRejectionHandler();

    this.staticInitCalled = true;
  }

  constructor(opt) {
    TestSession.init();

    this.opt = opt;
    this.knex = this.createKnex(opt);
    this.unboundModels = this.createModels();
    this.models = _.mapValues(this.unboundModels, model => model.bindKnex(this.knex));
  }

  createKnex() {
    return require('knex')(this.opt.knexConfig);
  }

  createModels() {
    const snakeCase = _.memoize(_.snakeCase);
    const camelCase = _.memoize(_.camelCase);

    class Model1 extends Model {
      static get tableName() {
        return 'Model1';
      }

      static get relationMappings() {
        return {
          model1Relation1: {
            relation: Model.BelongsToOneRelation,
            modelClass: Model1,
            join: {
              from: 'Model1.model1Id',
              to: 'Model1.id'
            }
          },

          model1Relation1Inverse: {
            relation: Model.HasOneRelation,
            modelClass: Model1,
            join: {
              from: 'Model1.id',
              to: 'Model1.model1Id'
            }
          },

          model1Relation2: {
            relation: Model.HasManyRelation,
            modelClass: Model2,
            join: {
              from: 'Model1.id',
              to: 'model_2.model_1_id'
            }
          },

          model1Relation3: {
            relation: Model.ManyToManyRelation,
            modelClass: Model2,
            join: {
              from: 'Model1.id',
              through: {
                from: 'Model1Model2.model1Id',
                to: 'Model1Model2.model2Id',
                extra: ['extra1', 'extra2']
              },
              to: 'model_2.id_col'
            }
          }
        };
      }
    }

    class Model2 extends Model {
      static get tableName() {
        return 'model_2';
      }

      static get idColumn() {
        return 'id_col';
      }

      $formatDatabaseJson(json) {
        json = super.$formatDatabaseJson(json);
        return _.mapKeys(json, (val, key) => snakeCase(key));
      }

      $parseDatabaseJson(json) {
        json = _.mapKeys(json, (val, key) => camelCase(key));
        return super.$parseDatabaseJson(json);
      }

      static get relationMappings() {
        return {
          model2Relation1: {
            relation: Model.ManyToManyRelation,
            modelClass: Model1,
            join: {
              from: 'model_2.id_col',
              through: {
                from: 'Model1Model2.model2Id',
                to: 'Model1Model2.model1Id',
                extra: {aliasedExtra: 'extra3'}
              },
              to: 'Model1.id'
            }
          },

          model2Relation2: {
            relation: Model.HasOneThroughRelation,
            modelClass: Model1,
            join: {
              from: 'model_2.id_col',
              through: {
                from: 'Model1Model2One.model2Id',
                to: 'Model1Model2One.model1Id'
              },
              to: 'Model1.id'
            }
          }
        };
      }
    }

    [
      ['$beforeInsert', 5],
      ['$afterInsert', 1],
      ['$beforeDelete', 1],
      ['$afterDelete', 1],
      ['$beforeUpdate', 5, (self, args) => self.$beforeUpdateOptions = _.cloneDeep(args[0])],
      ['$afterUpdate', 1, (self, args) => self.$afterUpdateOptions = _.cloneDeep(args[0])],
      ['$afterGet', 1]
    ].forEach(hook => {
      Model1.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
      Model2.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
    });

    return {
      Model1: Model1,
      Model2: Model2
    };
  }

  createDb() {
    const knex = this.knex;
    const opt = this.opt;

    return Promise.resolve()
      .then(() => knex.schema.dropTableIfExists('Model1Model2'))
      .then(() => knex.schema.dropTableIfExists('Model1Model2One'))
      .then(() => knex.schema.dropTableIfExists('Model1'))
      .then(() => knex.schema.dropTableIfExists('model_2'))
      .then(() => {
        return knex.schema
          .createTable('Model1', table => {
            table.bigincrements('id').primary();
            table.biginteger('model1Id').index();
            table.string('model1Prop1');
            table.integer('model1Prop2');
          })
          .createTable('model_2', table => {
            table.bigincrements('id_col').primary();
            table.biginteger('model_1_id').index();
            table.string('model_2_prop_1');
            table.integer('model_2_prop_2');
          })
          .createTable('Model1Model2', table => {
            table.bigincrements('id').primary();
            table.string('extra1');
            table.string('extra2');
            table.string('extra3');
            table.biginteger('model1Id').unsigned().notNullable().references('id').inTable('Model1').onDelete('CASCADE').index();
            table.biginteger('model2Id').unsigned().notNullable().references('id_col').inTable('model_2').onDelete('CASCADE').index();
          })
          .createTable('Model1Model2One', table => {
            table.biginteger('model1Id').unsigned().notNullable().references('id').inTable('Model1').onDelete('CASCADE').index();
            table.biginteger('model2Id').unsigned().notNullable().references('id_col').inTable('model_2').onDelete('CASCADE').index();
          });
      })
      .catch(() => {
        throw new Error('Could not connect to '
          + opt.knexConfig.client
          + '. Make sure the server is running and the database '
          + opt.knexConfig.connection.database
          + ' is created. You can see the test database configurations from file '
          + path.join(__dirname, 'index.js'));
      });
  }

  populate(data) {
    return transaction(this.knex, (trx) => {
      return trx('Model1Model2')
        .delete()
        .then(() => trx('Model1Model2One').delete())
        .then(() => trx('Model1').delete())
        .then(() => trx('model_2').delete())
        .then(() => this.models.Model1.query(trx).insertGraph(data))
        .then(() => {
          return Promise.resolve(['Model1', 'model_2', 'Model1Model2']).map(table => {
            const idCol = (_.find(this.models, {tableName: table}) || {idColumn: 'id'}).idColumn;

            return trx(table).max(idCol).then(res => {
              const maxId = parseInt(res[0][_.keys(res[0])[0]], 10) || 0;

              // Reset sequence.
              if (knexUtils.isSqlite(trx)) {
                return trx.raw('UPDATE sqlite_sequence SET seq = ' + maxId + ' WHERE name = "' + table + '"');
              } else if (knexUtils.isPostgres(trx)) {
                return trx.raw('ALTER SEQUENCE "' + table + '_' + idCol + '_seq" RESTART WITH ' + (maxId + 1));
              } else if (knexUtils.isMySql(trx)) {
                return trx.raw('ALTER TABLE ' + table + ' AUTO_INCREMENT = ' + (maxId + 1));
              } else {
                throw new Error('sequence truncate not implemented for the given database');
              }
            });
          });
        })
        .then(() => data);
    });
  }

  destroy() {
    return this.knex.destroy();
  }

  addUnhandledRejectionHandler(handler) {
    const handlers = TestSession.unhandledRejectionHandlers;
    handlers.push(handler);
  }

  removeUnhandledRejectionHandler(handler) {
    const handlers = TestSession.unhandledRejectionHandlers;
    handlers.splice(handlers.indexOf(handler), 1);
  }

  isPostgres() {
    return knexUtils.isPostgres(this.knex);
  }

  isMySql() {
    return knexUtils.isMySql(this.knex);
  }
}

TestSession.staticInitCalled = false;
TestSession.unhandledRejectionHandlers = [];

// Creates an asynchronous hook that waits for `delay` milliseconds
// and then increments a `${name}Called` property.
function createHook(name, delay, extraAction) {
  return function () {
    const args = arguments;

    return Promise.delay(delay).then(() => {
      inc(this, `${name}Called`);
      (extraAction || _.noop)(this, args);
    });
  };
}

function inc(obj, key) {
  if (!_.has(obj, key)) {
    obj[key] = 1;
  } else {
    obj[key]++;
  }
}

function convertPostgresBigIntegersToNumber() {
  let pgTypes;

  try {
    pgTypes = require('pg').types;
  } catch (err) {
    // pg not installed. ignore.
  }

  if (pgTypes) {
    const MaxSafeInteger = Math.pow(2, 53) - 1;

    // Convert big integers to numbers.
    pgTypes.setTypeParser(20, val => {
      if (val === null) {
        return null;
      }
      const number = parseInt(val, 10);
      if (number > MaxSafeInteger) {
        throw new Error('node-pg: bigint overflow: ' + number);
      }
      return number;
    });
  }
}

function registerUnhandledRejectionHandler() {
  Promise.onPossiblyUnhandledRejection(error => {
    if (_.isEmpty(TestSession.unhandledRejectionHandlers)) {
      console.error(error.stack);
    }

    TestSession.unhandledRejectionHandlers.forEach(handler => {
      handler(error);
    });
  });
}

module.exports = TestSession;