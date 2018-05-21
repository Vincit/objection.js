const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const knexUtils = require('../lib/utils/knexUtils');
const { Model, transaction, snakeCaseMappers, ref } = require('../');

const chai = require('chai');
chai.use(require('chai-subset'));

class TestSession {
  static init() {
    if (this.staticInitCalled) {
      return;
    }

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
    class Model1 extends Model {
      static get tableName() {
        return 'Model1';
      }

      // Function instead of getter on purpose.
      static idColumn() {
        return 'id';
      }

      static get namedFilters() {
        return {
          'orderById': builder => builder.orderBy('Model1.id'),
          'select:id': builder => builder.select(this.ref('id')),
          'select:model1Prop1': builder => builder.select('model1Prop1'),
          'select:model1Prop1Aliased': builder => builder.select('model1Prop1 as aliasedInFilter'),
          'orderBy:model1Prop1': builder => builder.orderBy('model1Prop1'),
          idGreaterThan: builder => builder.where('id', '>', builder.context().filterArgs[0])
        };
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
              to: 'model2.model1_id'
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
              to: 'model2.id_col'
            }
          }
        };
      }
    }

    class Model2 extends Model {
      // Function instead of getter on purpose.
      static tableName() {
        return 'model2';
      }

      static get idColumn() {
        return 'id_col';
      }

      static get columnNameMappers() {
        return snakeCaseMappers();
      }

      static get modifiers() {
        return {
          orderById: builder => builder.orderBy('model2.id_col')
        };
      }

      static get relationMappings() {
        return {
          model2Relation1: {
            relation: Model.ManyToManyRelation,
            modelClass: Model1,
            join: {
              from: 'model2.id_col',
              through: {
                from: 'Model1Model2.model2Id',
                to: 'Model1Model2.model1Id',
                extra: { aliasedExtra: 'extra3' }
              },
              to: 'Model1.id'
            }
          },

          model2Relation2: {
            relation: Model.HasOneThroughRelation,
            modelClass: Model1,
            join: {
              from: 'model2.id_col',
              through: {
                from: 'Model1Model2One.model2Id',
                to: 'Model1Model2One.model1Id'
              },
              to: 'Model1.id'
            }
          },

          model2Relation3: {
            relation: Model.ManyToManyRelation,
            modelClass: Model3,
            join: {
              from: 'model2.id_col',
              through: {
                from: 'Model2Model3ManyToMany.model2Id',
                to: 'Model2Model3ManyToMany.model3Id'
              },
              to: 'model3.id'
            }
          }
        };
      }
    }

    class Model3 extends Model {
      // Function instead of getter on purpose.
      static tableName() {
        return 'model3';
      }

      static get idColumn() {
        return 'id';
      }

      static get jsonAttributes() {
        return ['model3JsonProp'];
      }

      static get modifiers() {
        return {
          orderById: builder => builder.orderBy('model3.id')
        };
      }
    }

    [
      ['$beforeInsert', 1],
      ['$afterInsert', 0],
      ['$beforeDelete', 1],
      ['$afterDelete', 1],
      ['$beforeUpdate', 1, (self, args) => (self.$beforeUpdateOptions = _.cloneDeep(args[0]))],
      ['$afterUpdate', 1, (self, args) => (self.$afterUpdateOptions = _.cloneDeep(args[0]))],
      ['$afterGet', 1]
    ].forEach(hook => {
      Model1.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
      Model2.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
      Model3.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
    });

    return {
      Model1: Model1,
      Model2: Model2,
      Model3: Model3
    };
  }

  createDb() {
    const knex = this.knex;
    const opt = this.opt;

    return Promise.resolve()
      .then(() => knex.schema.dropTableIfExists('Model1Model2'))
      .then(() => knex.schema.dropTableIfExists('Model1Model2One'))
      .then(() => knex.schema.dropTableIfExists('Model2Model3ManyToMany'))
      .then(() => knex.schema.dropTableIfExists('model2'))
      .then(() => knex.schema.dropTableIfExists('Model1'))
      .then(() => knex.schema.dropTableIfExists('model3'))
      .then(() => {
        return knex.schema
          .createTable('Model1', table => {
            table.increments('id').primary();
            table.integer('model1Id')
              .index()
              .unsigned()
              .references('Model1.id')
              .onDelete('SET NULL');
            table.string('model1Prop1');
            table.integer('model1Prop2');
          })
          .createTable('model2', table => {
            table.increments('id_col').primary();
            table.integer('model1_id')
              .index()
              .unsigned()
              .references('Model1.id')
              .onDelete('SET NULL');
            table.string('model2_prop1');
            table.integer('model2_prop2');
          })
          .createTable('model3', table => {
            table.increments('id').primary();
            table.string('model3Prop1');
            table.text('model3JsonProp');
          })
          .createTable('Model1Model2', table => {
            table.increments('id').primary();
            table.string('extra1');
            table.string('extra2');
            table.string('extra3');
            table
              .integer('model1Id')
              .unsigned()
              .notNullable()
              .references('id')
              .inTable('Model1')
              .onDelete('CASCADE')
              .index();
            table
              .integer('model2Id')
              .unsigned()
              .notNullable()
              .references('id_col')
              .inTable('model2')
              .onDelete('CASCADE')
              .index();
          })
          .createTable('Model1Model2One', table => {
            table
              .integer('model1Id')
              .unsigned()
              .notNullable()
              .references('id')
              .inTable('Model1')
              .onDelete('CASCADE')
              .index();
            table
              .integer('model2Id')
              .unsigned()
              .notNullable()
              .references('id_col')
              .inTable('model2')
              .onDelete('CASCADE')
              .index();
          })
          .createTable('Model2Model3ManyToMany', table => {
            table
              .integer('model2Id')
              .unsigned()
              .notNullable()
              .references('id_col')
              .inTable('model2')
              .onDelete('CASCADE')
              .index();
            table
              .integer('model3Id')
              .unsigned()
              .notNullable()
              .references('id')
              .inTable('model3')
              .onDelete('CASCADE')
              .index();
          });
      })
      .catch(cause => {
        const err = new Error(
          'Could not connect to ' +
            opt.knexConfig.client +
            '. Make sure the server is running and the database ' +
            opt.knexConfig.connection.database +
            ' is created. You can see the test database configurations from file ' +
            path.join(__dirname, 'index.js')
        );

        const oldStack = err.stack;
        Object.defineProperties(err, {
          stack: {
            get() {
              return oldStack + `\n\nCaused by:\n${cause.stack}`;
            }
          }
        });

        throw err;
      });
  }

  populate(data) {
    return transaction(this.knex, trx => {
      return trx('Model1Model2')
        .delete()
        .then(() => trx('Model1Model2One').delete())
        .then(() => trx('Model2Model3ManyToMany').delete())
        .then(() => trx('model2').delete())
        .then(() => trx('Model1').delete())
        .then(() => trx('model3').delete())
        .then(() => this.models.Model1.query(trx).insertGraph(data))
        .then(() => {
          return Promise.resolve(['Model1', 'model2', 'model3', 'Model1Model2']).map(table => {
            const idCol = (
              _.find(this.models, it => it.getTableName() === table) || { getIdColumn: () => 'id' }
            ).getIdColumn();

            return trx(table)
              .max(idCol)
              .then(res => {
                const maxId = parseInt(res[0][_.keys(res[0])[0]], 10) || 0;

                // Reset sequence.
                if (knexUtils.isSqlite(trx)) {
                  return trx.raw(
                    'UPDATE sqlite_sequence SET seq = ' + maxId + ' WHERE name = "' + table + '"'
                  );
                } else if (knexUtils.isPostgres(trx)) {
                  return trx.raw(
                    'ALTER SEQUENCE "' + table + '_' + idCol + '_seq" RESTART WITH ' + (maxId + 1)
                  );
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

  isSqlite() {
    return knexUtils.isSqlite(this.knex);
  }
}

TestSession.staticInitCalled = false;
TestSession.unhandledRejectionHandlers = [];
TestSession.hookCounter = 0;

// Creates a hook that waits for `delay` milliseconds and then
// increments a `${name}Called` property. The hook is asynchonous
// every other time it is called so that the synchronous path is
// also tested.
function createHook(name, delay, extraAction) {
  const hook = (model, args) => {
    // Increment the property so that it can be checked in the tests.
    inc(model, `${name}Called`);

    // Optionally run the extraAction function.
    (extraAction || _.noop)(model, args);
  };

  return function() {
    const args = arguments;

    if (TestSession.hookCounter++ % 2 === 0) {
      return hook(this, args);
    } else {
      return Promise.delay(delay).then(() => hook(this, args));
    }
  };
}

function inc(obj, key) {
  if (!_.has(obj, key)) {
    obj[key] = 1;
  } else {
    obj[key]++;
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
