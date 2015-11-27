var _ = require('lodash');
var path = require('path');
var utils = require('../../lib/utils');
var Promise = require('bluebird');
var Model = require('../../lib/Model');
var expect = require('expect.js');

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

  function Model1() {
    Model.apply(this, arguments);
  }

  function Model2() {
    Model.apply(this, arguments);
  }

  Model.extend(Model1);
  Model.extend(Model2);

  Model1.tableName = 'Model1';
  Model2.tableName = 'model_2';

  Model2.prototype.$formatDatabaseJson = function (json) {
    json = Model.prototype.$formatDatabaseJson.call(this, json);

    return _.mapKeys(json, function (value, key) {
      return _.snakeCase(key);
    });
  };

  Model2.prototype.$parseDatabaseJson = function (json) {
    json = _.mapKeys(json, function (value, key) {
      return _.camelCase(key);
    });

    return Model.prototype.$parseDatabaseJson.call(this, json);
  };

  Model1.prototype.$beforeInsert = function () {
    var self = this;
    return Promise.delay(5).then(function () {
      self.$beforeInsertCalled = true;
    });
  };

  Model1.prototype.$afterInsert = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      self.$afterInsertCalled = true;
    });
  };

  Model1.prototype.$beforeUpdate = function (options) {
    var self = this;
    return Promise.delay(5).then(function () {
      self.$beforeUpdateCalled = true;
      self.$beforeUpdateOptions = options;
    });
  };

  Model1.prototype.$afterUpdate = function (options) {
    var self = this;
    return Promise.delay(1).then(function () {
      self.$afterUpdateCalled = true;
      self.$afterUpdateOptions = options;
    });
  };

  Model2.prototype.$beforeInsert = function () {
    var self = this;
    return Promise.delay(5).then(function () {
      self.$beforeInsertCalled = true;
    });
  };

  Model2.prototype.$afterInsert = function () {
    var self = this;
    return Promise.delay(1).then(function () {
      self.$afterInsertCalled = true;
    });
  };

  Model2.prototype.$beforeUpdate = function (options) {
    var self = this;
    return Promise.delay(5).then(function () {
      self.$beforeUpdateCalled = true;
      self.$beforeUpdateOptions = options;
    });
  };

  Model2.prototype.$afterUpdate = function (options) {
    var self = this;
    return Promise.delay(1).then(function () {
      self.$afterUpdateCalled = true;
      self.$afterUpdateOptions = options;
    });
  };

  Model1.relationMappings = {
    model1Relation1: {
      relation: Model.OneToOneRelation,
      modelClass: Model1,
      join: {
        from: 'Model1.model1Id',
        to: 'Model1.id'
      }
    },
    model1Relation2: {
      relation: Model.OneToManyRelation,
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
          to: 'Model1Model2.model2Id'
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
          to: 'Model1Model2.model1Id'
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

    models: {
      Model1: Model1.bindKnex(knex),
      Model2: Model2.bindKnex(knex)
    },

    createDb: module.exports.createDb,
    populate: module.exports.populate,
    destroy: module.exports.destroy,

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

  return session.knex.schema
    .dropTableIfExists('Model1Model2')
    .dropTableIfExists('Model1')
    .dropTableIfExists('model_2')
    .createTable('Model1', function (table) {
      table.bigincrements('id').primary();
      table.biginteger('model1Id');
      table.string('model1Prop1');
      table.integer('model1Prop2');
    })
    .createTable('model_2', function (table) {
      table.bigincrements('id_col').primary();
      table.biginteger('model_1_id');
      table.string('model_2_prop_1');
      table.integer('model_2_prop_2');
    })
    .createTable('Model1Model2', function (table) {
      table.bigincrements('id').primary();
      table.biginteger('model1Id').unsigned().notNullable().references('id').inTable('Model1').onDelete('CASCADE');
      table.biginteger('model2Id').unsigned().notNullable().references('id_col').inTable('model_2').onDelete('CASCADE');
    })
    .catch(function () {
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
  var insert = {};
  var models = this.models;
  var session = this;

  _.each(data, function (jsonModel) {
    createRows(jsonModel, models.Model1, insert);
  });

  return session.knex('Model1Model2').delete()
    .then(function () {
      return session.knex('Model1').delete();
    })
    .then(function () {
      return session.knex('model_2').delete();
    })
    .then(function () {
      return Promise.resolve(['Model1', 'model_2', 'Model1Model2']).each(function (table) {
        var rows = insert[table] || [];

        if (_.isEmpty(rows)) {
          return;
        }

        return session.knex(table).insert(rows).then(function () {
          var idCol = (_.find(session.models, {tableName: table}) || {idColumn: 'id'}).idColumn;
          var maxId = _.max(_.pluck(rows, idCol));

          // Reset sequence.
          if (utils.isSqlite(session.knex)) {
            if (maxId && _.isFinite(maxId)) {
              return session.knex.raw('UPDATE sqlite_sequence SET seq = ' + maxId + ' WHERE name = "' + table + '"');
            }
          } else if (utils.isPostgres(session.knex)) {
            if (maxId && _.isFinite(maxId)) {
              return session.knex.raw('ALTER SEQUENCE "' + table  + '_' + idCol + '_seq" RESTART WITH ' + (maxId + 1));
            }
          } else if (utils.isMySql(session.knex)) {
            if (maxId && _.isFinite(maxId)) {
              return session.knex.raw('ALTER TABLE ' + table + ' AUTO_INCREMENT = ' + (maxId + 1));
            }
          } else {
            throw new Error('sequence truncate not implemented for the given database');
          }
        });
      });
    })
    .then(function () {
      return {
        rows: insert,
        tree: data
      };
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

function createRows(model, ModelClass, rows) {
  var relations = ModelClass.getRelations();
  model = ModelClass.ensureModel(model);

  _.each(relations, function (relation, relationName) {
    if (!_.has(model, relationName)) {
      return;
    }

    if (relation instanceof Model.OneToOneRelation) {

      var related = relation.relatedModelClass.ensureModel(model[relationName]);
      model[relation.ownerProp] = related.$id();

      createRows(related, relation.relatedModelClass, rows);

    } else if (relation instanceof Model.OneToManyRelation) {

      _.each(model[relationName], function (relatedJson) {
        var related = relation.relatedModelClass.ensureModel(relatedJson);
        related[relation.relatedProp] = model.$id();

        createRows(related, relation.relatedModelClass, rows);
      });

    } else if (relation instanceof Model.ManyToManyRelation) {
      var joinTable = [
        _.capitalize(_.camelCase(ModelClass.tableName)),
        _.capitalize(_.camelCase(relation.relatedModelClass.tableName))
      ].sort().join('');

      _.each(model[relationName], function (relatedJson) {
        var joinRow = {};
        var related = relation.relatedModelClass.ensureModel(relatedJson);

        joinRow[relation.joinTableRelatedCol] = related.$id();
        joinRow[relation.joinTableOwnerCol] = model.$id();

        rows[joinTable] = rows[joinTable] || [];
        rows[joinTable].push(joinRow);

        createRows(related, relation.relatedModelClass, rows);
      });
    } else {
      throw new Error('unsupported relation type');
    }
  });

  rows[ModelClass.tableName] = rows[ModelClass.tableName] || [];
  rows[ModelClass.tableName].push(model.$toDatabaseJson());
}

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
