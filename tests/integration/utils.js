var _ = require('lodash');
var os = require('os');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var MoronModel = require('../../lib/MoronModel');

module.exports.initialize = function (opt) {
  opt = _.defaults(opt || {}, {
    modelIdProperties: {
      Model1: 'id',
      Model2: 'id'
    }
  });

  function Model1() {
    MoronModel.apply(this, arguments);
  }

  function Model2() {
    MoronModel.apply(this, arguments);
  }

  MoronModel.makeSubclass(Model1);
  MoronModel.makeSubclass(Model2);

  Model1.tableName = 'Model1';
  Model1.relationMappings = {
    model1Relation1: {
      relation: MoronModel.HasOneRelation,
      modelClass: Model1,
      joinColumn: 'model1Id'
    },
    model1Relation2: {
      relation: MoronModel.HasManyRelation,
      modelClass: Model2,
      joinColumn: 'model1Id'
    }
  };

  Model2.tableName = 'Model2';
  Model2.relationMappings = {
    model2Relation1: {
      relation: MoronModel.ManyToManyRelation,
      modelClass: Model1,
      join: {
        table: 'Model1Model2',
        ownerIdColumn: 'model2Id',
        relatedIdColumn: 'model1Id'
      }
    }
  };

  var dbFile = path.join(os.tmpdir(), 'test.db');
  removeFile(dbFile);

  var knex = require('knex')({
    client: 'sqlite3',
    connection: {
      filename: dbFile
    }
  });

  Model1.knex = knex;
  Model2.knex = knex;

  Model1.idProperty = opt.modelIdProperties.Model1;
  Model2.idProperty = opt.modelIdProperties.Model2;

  return knex.schema.createTable('Model1', function (table) {
    table.bigincrements(Model1.idProperty);
    table.biginteger('model1Id');
    table.string('model1Prop1');
    table.integer('model1Prop2');
  }).createTable('Model2', function (table) {
    table.bigincrements(Model2.idProperty);
    table.biginteger('model1Id');
    table.string('model2Prop1');
    table.integer('model2Prop2');
  }).createTable('Model1Model2', function (table) {
    table.bigincrements('id');
    table.biginteger('model1Id').notNullable();
    table.biginteger('model2Id').notNullable();
  }).then(function () {
    return {
      opt: opt,
      knex: knex,
      dbFile: dbFile,
      models: {
        Model1: Model1,
        Model2: Model2
      }
    };
  });
};

module.exports.destroy = function (session) {
  return session.knex.destroy().then(function () {
    removeFile(session.dbFile);
  });
};

module.exports.populate = function (session, data) {
  var rows = {};
  var models = session.models;

  _.each(data, function (jsonModel) {
    createRows(jsonModel, models.Model1, rows);
  });

  return Promise.all(_.map(rows, function (rows, table) {
    return session.knex(table).delete().then(function () {
      return session.knex(table).insert(rows).returning('id');
    }).then(function () {
      var maxId = _.max(_.pluck(rows, 'id')) + 1;
      if (maxId && _.isFinite(maxId)) {
        return session.knex.raw('UPDATE sqlite_sequence SET seq = ' + (maxId + 1) + ' WHERE name = "' + table + '"');
      }
    });
  })).then(function () {
    return {
      rows: rows,
      tree: data
    };
  })
};

function createRows(model, ModelClass, rows) {
  var relations = ModelClass.getRelations();

  _.each(relations, function (relation, relationName) {
    if (!_.has(model, relationName)) {
      return;
    }

    if (relation instanceof MoronModel.HasOneRelation) {

      model[relation.relatedJoinColumn] = model[relationName][relation.relatedModelClass.idProperty];
      createRows(model[relationName], relation.relatedModelClass, rows);

    } else if (relation instanceof MoronModel.HasManyRelation) {

      _.each(model[relationName], function (relatedModel) {
        relatedModel[relation.ownerJoinColumn] = model[ModelClass.idProperty];
        createRows(relatedModel, relation.relatedModelClass, rows);
      });

    } else if (relation instanceof MoronModel.ManyToManyRelation) {
      var joinTable = [ModelClass.name, relation.relatedModelClass.name].sort().join('');

      _.each(model[relationName], function (relatedModel) {
        var joinRow = {};

        joinRow[relation.relatedJoinColumn] = relatedModel[relation.relatedModelClass.idProperty];
        joinRow[relation.ownerJoinColumn] = model[ModelClass.idProperty];

        rows[joinTable] = rows[joinTable] || [];
        rows[joinTable].push(joinRow);

        createRows(relatedModel, relation.relatedModelClass, rows);
      });
    } else {
      throw new Error('unsupported relation type');
    }
  });

  rows[ModelClass.name] = rows[ModelClass.name] || [];
  rows[ModelClass.name].push(_.omit(model, _.keys(relations)));
}

function removeFile(file) {
  try {
    fs.unlinkSync(file);
  } catch (err) {
    // ignore.
  }
}
