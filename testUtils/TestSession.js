const knexUtils = require('../lib/utils/knexUtils');
const { map: promiseMap } = require('../lib/utils/promiseUtils');
const { delay, cloneDeep } = require('./testUtils');
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
    this.models = Object.fromEntries(
      Object.entries(this.unboundModels).map(([name, model]) => [name, model.bindKnex(this.knex)]),
    );
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

      static get modifiers() {
        return {
          orderById: (builder) => builder.orderBy('Model1.id'),
          'select:id': (builder) => builder.select(this.ref('id')),
          'select:model1Prop1': (builder) => builder.select('model1Prop1'),
          'select:model1Prop1Aliased': (builder) =>
            builder.select('model1Prop1 as aliasedInFilter'),
          'orderBy:model1Prop1': (builder) => builder.orderBy('model1Prop1'),
          idGreaterThan: (builder) => builder.where('id', '>', builder.context().filterArgs[0]),
        };
      }

      static get relationMappings() {
        return {
          model1Relation1: {
            relation: Model.BelongsToOneRelation,
            modelClass: Model1,
            join: {
              from: 'Model1.model1Id',
              to: 'Model1.id',
            },
          },

          model1Relation1Inverse: {
            relation: Model.HasOneRelation,
            modelClass: Model1,
            join: {
              from: 'Model1.id',
              to: 'Model1.model1Id',
            },
          },

          model1Relation2: {
            relation: Model.HasManyRelation,
            modelClass: Model2,
            join: {
              from: 'Model1.id',
              to: 'model2.model1_id',
            },
          },

          model1Relation3: {
            relation: Model.ManyToManyRelation,
            modelClass: Model2,
            join: {
              from: 'Model1.id',
              through: {
                from: 'Model1Model2.model1Id',
                to: 'Model1Model2.model2Id',
                extra: ['extra1', 'extra2'],
              },
              to: 'model2.id_col',
            },
          },
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
          orderById: (builder) => builder.orderBy('model2.id_col'),
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
                extra: { aliasedExtra: 'extra3' },
              },
              to: 'Model1.id',
            },
          },

          model2Relation2: {
            relation: Model.HasOneThroughRelation,
            modelClass: Model1,
            join: {
              from: 'model2.id_col',
              through: {
                from: 'Model1Model2One.model2Id',
                to: 'Model1Model2One.model1Id',
              },
              to: 'Model1.id',
            },
          },

          model2Relation3: {
            relation: Model.ManyToManyRelation,
            modelClass: Model3,
            join: {
              from: 'model2.id_col',
              through: {
                from: 'Model2Model3ManyToMany.model2Id',
                to: 'Model2Model3ManyToMany.model3Id',
              },
              to: 'model3.id',
            },
          },
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
          orderById: (builder) => builder.orderBy('model3.id'),
        };
      }
    }

    [
      ['$beforeInsert', 1],
      ['$afterInsert', 0],
      ['$beforeDelete', 1],
      ['$afterDelete', 1],
      ['$beforeUpdate', 1, (self, args) => (self.$beforeUpdateOptions = cloneDeep(args[0]))],
      ['$afterUpdate', 1, (self, args) => (self.$afterUpdateOptions = cloneDeep(args[0]))],
      ['$afterFind', 1],
    ].forEach((hook) => {
      Model1.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
      Model2.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
      Model3.prototype[hook[0]] = createHook(hook[0], hook[1], hook[2]);
    });

    return {
      Model1: Model1,
      Model2: Model2,
      Model3: Model3,
    };
  }

  createDb() {
    const knex = this.knex;
    const opt = this.opt;
    // SQL Server rejects `SET NULL` on the self reference of Model1 and on the
    // references that would be a second cascade path to the join tables, so
    // the references to Model1 have no foreign key constraint there.
    const referenceModel1 = (column) =>
      this.isMsSql() ? column : column.references('Model1.id').onDelete('SET NULL');

    return Promise.resolve()
      .then(() => knex.schema.dropTableIfExists('Model1Model2'))
      .then(() => knex.schema.dropTableIfExists('Model1Model2One'))
      .then(() => knex.schema.dropTableIfExists('Model2Model3ManyToMany'))
      .then(() => knex.schema.dropTableIfExists('model2'))
      .then(() => knex.schema.dropTableIfExists('Model1'))
      .then(() => knex.schema.dropTableIfExists('model3'))
      .then(() =>
        this.createTable('Model1', (table, { increments }) => {
          increments('id');
          referenceModel1(table.integer('model1Id').index().unsigned());
          table.string('model1Prop1');
          table.integer('model1Prop2');
        }),
      )
      .then(() =>
        this.createTable('model2', (table, { increments }) => {
          increments('id_col');
          referenceModel1(table.integer('model1_id').index().unsigned());
          table.string('model2_prop1');
          table.integer('model2_prop2');
        }),
      )
      .then(() =>
        this.createTable('model3', (table, { increments }) => {
          increments('id');
          table.string('model3Prop1');
          table.text('model3JsonProp');
        }),
      )
      .then(() =>
        this.createTable('Model1Model2', (table, { increments }) => {
          increments('id');
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
        }),
      )
      .then(() => {
        return knex.schema
          .createTable('Model1Model2One', (table) => {
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
          .createTable('Model2Model3ManyToMany', (table) => {
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
      .catch((cause) => {
        const { client, connection } = opt.knexConfig;
        const target =
          connection.filename || `${connection.host}:${connection.port}/${connection.database}`;
        const err = new Error(
          `Could not connect to ${client} at ${target}.` +
            ' Run `npm run db:up` to start the test databases with docker, or see' +
            ' "Running the tests" in doc/guide/contributing.md to use your own.',
        );

        const oldStack = err.stack;
        Object.defineProperties(err, {
          stack: {
            get() {
              return oldStack + `\n\nCaused by:\n${cause.stack}`;
            },
          },
        });

        throw err;
      });
  }

  populate(data) {
    return transaction(this.knex, (trx) => {
      return trx('Model1Model2')
        .delete()
        .then(() => trx('Model1Model2One').delete())
        .then(() => trx('Model2Model3ManyToMany').delete())
        .then(() => trx('model2').delete())
        .then(() => trx('Model1').delete())
        .then(() => trx('model3').delete())
        .then(() => this.models.Model1.query(trx).insertGraph(data))
        .then(() => {
          return promiseMap(['Model1', 'model2', 'model3', 'Model1Model2'], (table) => {
            const idCol = (
              Object.values(this.models).find((it) => it.getTableName() === table) || {
                getIdColumn: () => 'id',
              }
            ).getIdColumn();

            return trx(table)
              .max(idCol)
              .then((res) => {
                const maxId = parseInt(res[0][Object.keys(res[0])[0]], 10) || 0;

                // Reset sequence.
                if (knexUtils.isSqlite(trx)) {
                  return trx.raw(
                    'UPDATE sqlite_sequence SET seq = ' + maxId + ' WHERE name = "' + table + '"',
                  );
                } else if (knexUtils.isPostgres(trx)) {
                  return trx.raw(
                    'ALTER SEQUENCE "' + table + '_' + idCol + '_seq" RESTART WITH ' + (maxId + 1),
                  );
                } else if (knexUtils.isMsSql(trx)) {
                  return trx.raw(
                    `ALTER SEQUENCE [${getSequenceName(table)}] RESTART WITH ${maxId + 1}`,
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

  // Like `knex.schema.createTable()`, with an `increments()` for the callback
  // that creates an auto-incrementing primary key. SQL Server can't insert
  // explicit values into identity columns, which the tests do, so the values
  // come from a sequence there.
  createTable(tableName, callback) {
    const { knex } = this;

    if (!this.isMsSql()) {
      return knex.schema.createTable(tableName, (table) =>
        callback(table, { increments: (column) => table.increments(column) }),
      );
    }

    const sequence = getSequenceName(tableName);

    return knex.schema
      .raw(`DROP SEQUENCE IF EXISTS [${sequence}]`)
      .raw(`CREATE SEQUENCE [${sequence}] AS int START WITH 1`)
      .createTable(tableName, (table) =>
        callback(table, {
          increments: (column) =>
            table
              .integer(column)
              .notNullable()
              .primary()
              .defaultTo(knex.raw(`NEXT VALUE FOR [${sequence}]`)),
        }),
      );
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

  isMsSql() {
    return knexUtils.isMsSql(this.knex);
  }
}

TestSession.staticInitCalled = false;
TestSession.unhandledRejectionHandlers = [];
TestSession.hookCounter = 0;

// Creates a hook that waits for `ms` milliseconds and then
// increments a `${name}Called` property. The hook is asynchronous
// every other time it is called so that the synchronous path is
// also tested.
function getSequenceName(tableName) {
  return `${tableName}_id_seq`;
}

function createHook(name, ms, extraAction) {
  const hook = (model, args) => {
    // Increment the property so that it can be checked in the tests.
    inc(model, `${name}Called`);

    // Optionally run the extraAction function.
    (extraAction || (() => {}))(model, args);
  };

  return function () {
    const args = arguments;

    if (TestSession.hookCounter++ % 2 === 0) {
      return hook(this, args);
    } else {
      return delay(ms).then(() => hook(this, args));
    }
  };
}

function inc(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function registerUnhandledRejectionHandler() {
  process.on('unhandledRejection', (error) => {
    if (TestSession.unhandledRejectionHandlers.length === 0) {
      console.error(error.stack);
    }

    TestSession.unhandledRejectionHandlers.forEach((handler) => {
      handler(error);
    });
  });
}

module.exports = TestSession;
