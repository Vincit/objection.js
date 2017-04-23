'use strict';

var _ = require('lodash');
var path = require('path');
var utils = require('../../lib/utils/knexUtils');
var transaction = require('../../').transaction;
var knexUtils = require('../../lib/utils/knexUtils');
var Promise = require('bluebird');
var expect = require('expect.js');
var Model = require('../../').Model;

var unhandledRejectionHandlers = [];

Promise.onPossiblyUnhandledRejection(function (error) {
  if (_.isEmpty(unhandledRejectionHandlers)) {
    console.error(error.stack);
  }

  _.each(unhandledRejectionHandlers, function (handler) {
    handler(error);
  });
});

module.exports.initialize = function (opt) {
  var knex = require('knex')(opt.knexConfig);

  class Model1 extends Model {

  }

  class Model2 extends Model {

  }

  Model1.tableName = 'Model1';
  Model2.tableName = 'model_2';

  var snakeCaseCache = Object.create(null);
  var snakeCase = function (key) {
    var out = snakeCaseCache[key];

    if (!out) {
      out = _.snakeCase(key);
      snakeCaseCache[key] = out;
    }

    return out;
  };

  var camelCaseCache = Object.create(null);
  var camelCase = function (key) {
    var out = camelCaseCache[key];

    if (!out) {
      out = _.camelCase(key);
      camelCaseCache[key] = out;
    }

    return out;
  };

  Model2.prototype.$formatDatabaseJson = function (json) {
    json = Model.prototype.$formatDatabaseJson.call(this, json);

    var keys = Object.keys(json);
    var jsonOut = {};

    for (var i = 0, l = keys.length; i < l; ++i) {
      var key = keys[i];
      jsonOut[snakeCase(key)] = json[key];
    }

    return jsonOut;
  };

  Model2.prototype.$parseDatabaseJson = function (json) {
    var keys = Object.keys(json);
    var jsonOut = {};

    for (var i = 0, l = keys.length; i < l; ++i) {
      var key = keys[i];
      jsonOut[camelCase(key)] = json[key];
    }

    return Model.prototype.$parseDatabaseJson.call(this, jsonOut);
  };

  Model1.prototype.$beforeInsert = function () {
    var self = this;
    return Promise.delay(5).then(function () {
      inc(self, '$beforeInsertCalled');
    });
  };

  Model1.prototype.$afterInsert = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterInsertCalled');
    });
  };

  Model1.prototype.$beforeDelete = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$beforeDeleteCalled');
    });
  };

  Model1.prototype.$afterDelete = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterDeleteCalled');
    });
  };

  Model1.prototype.$beforeUpdate = function (options) {
    var self = this;
    return Promise.delay(5).then(function () {
      inc(self, '$beforeUpdateCalled');
      self.$beforeUpdateOptions = _.cloneDeep(options);
    });
  };

  Model1.prototype.$afterUpdate = function (options) {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterUpdateCalled');
      self.$afterUpdateOptions = _.cloneDeep(options);
    });
  };

  Model1.prototype.$afterGet = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterGetCalled');
    });
  };

  Model2.prototype.$beforeInsert = function () {
    var self = this;
    return Promise.delay(5).then(function () {
      inc(self, '$beforeInsertCalled');
    });
  };

  Model2.prototype.$afterInsert = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterInsertCalled');
    });
  };

  Model2.prototype.$beforeUpdate = function (options) {
    var self = this;
    return Promise.delay(5).then(function () {
      inc(self, '$beforeUpdateCalled');
      self.$beforeUpdateOptions = options;
    });
  };

  Model2.prototype.$beforeDelete = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$beforeDeleteCalled');
    });
  };

  Model2.prototype.$afterDelete = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterDeleteCalled');
    });
  };

  Model2.prototype.$afterUpdate = function (options) {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterUpdateCalled');
      self.$afterUpdateOptions = options;
    });
  };

  Model2.prototype.$afterGet = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      inc(self, '$afterGetCalled');
    });
  };

  Model1.relationMappings = {
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

  Model2.relationMappings = {
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

  Model1.idColumn = 'id';
  Model2.idColumn = 'id_col';

  convertPostgresBigIntegersToNumber();

  return {
    opt: opt,
    knex: knex,

    unboundModels: {
      Model1: Model1,
      Model2: Model2
    },

    models: {
      Model1: Model1.bindKnex(knex),
      Model2: Model2.bindKnex(knex)
    },

    createDb: module.exports.createDb,
    populate: module.exports.populate,
    destroy: module.exports.destroy,

    isPostgres: function () {
      return utils.isPostgres(this.knex);
    },

    isMySql: function () {
      return utils.isMySql(this.knex);
    },

    addUnhandledRejectionHandler: function (handler) {
      unhandledRejectionHandlers.push(handler);
    },

    removeUnhandledRejectionHandler: function (handler) {
      unhandledRejectionHandlers.splice(unhandledRejectionHandlers.indexOf(handler), 1);
    }
  };
};

module.exports.createDb = function () {
  var session = this;

  return Promise.resolve()
    .then(function () {
      return session.knex.schema.dropTableIfExists('Model1Model2');
    })
    .then(function () {
      return session.knex.schema.dropTableIfExists('Model1Model2One');
    })
    .then(function () {
      return session.knex.schema.dropTableIfExists('Model1');
    })
    .then(function () {
      return session.knex.schema.dropTableIfExists('model_2');
    })
    .then(function () {
      return session.knex.schema
        .createTable('Model1', function (table) {
          table.bigincrements('id').primary();
          table.biginteger('model1Id').index();
          table.string('model1Prop1');
          table.integer('model1Prop2');
        })
        .createTable('model_2', function (table) {
          table.bigincrements('id_col').primary();
          table.biginteger('model_1_id').index();
          table.string('model_2_prop_1');
          table.integer('model_2_prop_2');
        })
        .createTable('Model1Model2', function (table) {
          table.bigincrements('id').primary();
          table.string('extra1');
          table.string('extra2');
          table.string('extra3');
          table.biginteger('model1Id').unsigned().notNullable().references('id').inTable('Model1').onDelete('CASCADE').index();
          table.biginteger('model2Id').unsigned().notNullable().references('id_col').inTable('model_2').onDelete('CASCADE').index();
        })
        .createTable('Model1Model2One', function (table) {
          table.biginteger('model1Id').unsigned().notNullable().references('id').inTable('Model1').onDelete('CASCADE').index();
          table.biginteger('model2Id').unsigned().notNullable().references('id_col').inTable('model_2').onDelete('CASCADE').index();
        })
    })
    .catch(function (err) {
      throw new Error('Could not connect to '
        + session.opt.knexConfig.client
        + '. Make sure the server is running and the database '
        + session.opt.knexConfig.connection.database
        + ' is created. You can see the test database configurations from file '
        + path.join(__dirname, 'index.js'));
    });
};

module.exports.destroy = function () {
  return this.knex.destroy();
};

module.exports.populate = function (data) {
  var session = this;

  return transaction(session.models.Model1, function (Model1, trx) {
    return trx('Model1Model2')
      .delete()
      .then(function () {
        return trx('Model1Model2One').delete();
      })
      .then(function () {
        return trx('Model1').delete();
      })
      .then(function () {
        return trx('model_2').delete();
      })
      .then(function () {
        return Model1.query().insertGraph(data);
      })
      .then(function () {
        return Promise.resolve(['Model1', 'model_2', 'Model1Model2']).map(function (table) {
          var idCol = (_.find(session.models, {tableName: table}) || {idColumn: 'id'}).idColumn;

          return trx(table).max(idCol).then(function (res) {
            var maxId = parseInt(res[0][_.keys(res[0])[0]], 10) || 0;

            // Reset sequence.
            if (utils.isSqlite(trx)) {
              return trx.raw('UPDATE sqlite_sequence SET seq = ' + maxId + ' WHERE name = "' + table + '"');
            } else if (utils.isPostgres(trx)) {
              return trx.raw('ALTER SEQUENCE "' + table + '_' + idCol + '_seq" RESTART WITH ' + (maxId + 1));
            } else if (utils.isMySql(trx)) {
              return trx.raw('ALTER TABLE ' + table + ' AUTO_INCREMENT = ' + (maxId + 1));
            } else {
              throw new Error('sequence truncate not implemented for the given database');
            }
          });
        });
      })
      .then(function () {
        return data;
      });
  });
};

/**
 * Expect that `result` contains all attributes of `partial` and their values equal.
 *
 * Example:
 *
 * ```js
 * // doesn't throw.
 * expectPartialEqual({a: 1, b: 2}, {a: 1});
 * // doesn't throw.
 * expectPartialEqual([{a: 1, b: 2}, {a: 2, b: 4}], [{a: 1}, {b: 4}]);
 * // Throws
 * expectPartialEqual({a: 1}, {b: 1});
 * // Throws
 * expectPartialEqual({a: 1}, {a: 2});
 * ```
 */
module.exports.expectPartialEqual = function expectPartialEqual(result, partial) {
  if (_.isArray(result) && _.isArray(partial)) {
    expect(result).to.have.length(partial.length);
    _.each(result, function (value, idx) {
      expectPartialEqual(result[idx], partial[idx]);
    });
  } else if (_.isObject(result) && !_.isArray(partial) && _.isObject(partial) && !_.isArray(result)) {
    var partialKeys = _.keys(partial);
    expect(_.pick(result, partialKeys)).to.eql(partial);
  } else {
    throw new Error('result and partial must both be arrays or objects');
  }
};

function convertPostgresBigIntegersToNumber() {
  var pgTypes;
  try {
    pgTypes = require('pg').types;
  } catch (err) {
    // pg not installed. ignore.
  }

  if (pgTypes) {
    var MaxSafeInteger = Math.pow(2, 53) - 1;
    // Convert big integers to numbers.
    pgTypes.setTypeParser(20, function (val) {
      if (val === null) {
        return null;
      }
      var number = parseInt(val, 10);
      if (number > MaxSafeInteger) {
        throw new Error('node-pg: bigint overflow: ' + number);
      }
      return number;
    });
  }
}

function inc(obj, key) {
  if (!_.has(obj, key)) {
    obj[key] = 1;
  } else {
    obj[key]++;
  }
}