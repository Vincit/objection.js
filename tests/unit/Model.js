var knex = require('knex');
var expect = require('expect.js');
var Model = require('../../lib/Model');

describe('Model', function () {

  it('should parse relations into Model instances and remove them from database representation', function () {
    var Model1 = modelClass('Model1');
    var Model2 = modelClass('Model2');

    Model1.relationMappings = {
      relation1: {
        relation: Model.OneToManyRelation,
        modelClass: Model2,
        join: {
          from: 'Model1.id',
          to: 'Model2.model1Id'
        }
      },
      relation2: {
        relation: Model.OneToOneRelation,
        modelClass: Model1,
        join: {
          from: 'Model1.id',
          to: 'Model1.model1Id'
        }
      }
    };

    var model = Model1.fromJson({
      id: 10,
      model1Id: 13,
      relation1: [
        {id: 11, model1Id: 10},
        {id: 12, model1Id: 10}
      ],
      relation2: {id: 13, model1Id: null}
    });

    expect(model.relation1[0]).to.be.a(Model2);
    expect(model.relation1[1]).to.be.a(Model2);
    expect(model.relation2).to.be.a(Model1);

    var json = model.$toDatabaseJson();

    expect(json).to.not.have.property('relation1');
    expect(json).to.not.have.property('relation2');

    json = model.$toJson();

    expect(json).to.have.property('relation1');
    expect(json).to.have.property('relation2');
  });

  it('if jsonSchema is given, should remove all but schema properties from database representation', function () {
    var Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'number'},
        prop2: {type: 'string'}
      }
    };

    var model = Model.fromJson({
      prop1: 10,
      prop2: '10',
      prop3: 'should be removed',
      prop4: {also: 'this'}
    });

    var json = model.$toDatabaseJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal(undefined);
    expect(json.prop4).to.equal(undefined);

    expect(model.prop1).to.equal(10);
    expect(model.prop2).to.equal('10');
    expect(model.prop3).to.equal('should be removed');
    expect(model.prop4).to.eql({also: 'this'});

    json = model.$toJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should be removed');
    expect(json.prop4).to.eql({also: 'this'});
  });

  it('should convert objects to json based on jsonSchema type', function () {
    var Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'string'},
        prop2: {
          type: 'object',
          properties: {
            subProp1: {type: 'number'}
          }
        },
        prop3: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subProp2: {type: 'boolean'}
            }
          }
        },
        prop4: {
          anyOf: [{
            type: 'array'
          }, {
            type: 'string'
          }]
        },
        prop5: {
          oneOf: [{
            type: 'object'
          }, {
            type: 'string'
          }]
        }
      }
    };

    var inputJson = {
      prop1: 'text',
      prop2: {
        subProp1: 1000
      },
      prop3: [
        {subProp2: true},
        {subProp2: false}
      ],
      prop4: [
        1, 2, 3
      ],
      prop5: {
        subProp3: 'str'
      }
    };

    var model = Model.fromJson(inputJson);

    expect(model).to.eql(inputJson);

    var dbJson = model.$toDatabaseJson();

    expect(dbJson.prop1).to.equal('text');
    expect(dbJson.prop2).to.equal('{"subProp1":1000}');
    expect(dbJson.prop3).to.equal('[{"subProp2":true},{"subProp2":false}]');
    expect(dbJson.prop4).to.equal('[1,2,3]');
    expect(dbJson.prop5).to.equal('{"subProp3":"str"}');

    var model2 = Model.fromDatabaseJson(dbJson);

    expect(model2).to.eql(inputJson);
  });

  it('should convert objects to json based on jsonAttributes array', function () {
    var Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'string'},
        prop2: {
          type: 'object',
          properties: {
            subProp1: {type: 'number'}
          }
        },
        prop3: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subProp2: {type: 'boolean'}
            }
          }
        }
      }
    };

    Model.jsonAttributes = ['prop2'];

    var inputJson = {
      prop1: 'text',
      prop2: {
        subProp1: 1000
      },
      prop3: [
        {subProp2: true},
        {subProp2: false}
      ]
    };

    var model = Model.fromJson(inputJson);

    expect(model).to.eql(inputJson);

    var dbJson = model.$toDatabaseJson();

    expect(dbJson.prop1).to.equal('text');
    expect(dbJson.prop2).to.equal('{"subProp1":1000}');
    expect(dbJson.prop3).to.eql(inputJson.prop3);

    var model2 = Model.fromDatabaseJson(dbJson);

    expect(model2).to.eql(inputJson);
  });

  it('formatter() should return a knex formatter', function () {
    var Model = modelClass('Model');

    Model.knex(knex({client: 'sqlite3'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('"SomeTable"."id"');

    Model.knex(knex({client: 'pg'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('"SomeTable"."id"');

    Model.knex(knex({client: 'mysql'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('`SomeTable`.`id`');
  });

  it('$setJson should do nothing if a non-object is given', function () {
    var Model = modelClass('Model');
    var model = Model.fromJson({a: 1, b: 2});
    model.$setJson(null);
    expect(model).to.eql({a: 1, b: 2});
  });

  it('$toJson should return result without relations if true is given as argument', function () {
    var Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.OneToOneRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.model1Id'
        }
      }
    };

    var model = Model.fromJson({a: 1, b: 2, someRelation: {a: 3, b: 4}});

    expect(model.$toJson(false)).to.eql({a: 1, b: 2, someRelation: {a: 3, b: 4}});
    expect(model.$toJson(true)).to.eql({a: 1, b: 2});
  });

  it('null relations should be null in the result', function () {
    var Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.OneToOneRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.model1Id'
        }
      }
    };

    var model = Model.fromJson({a: 1, b: 2, someRelation: null});
    expect(model.someRelation).to.equal(null);
  });

  it('raw method should be a shortcut to knex().raw', function () {
    var Model = modelClass('Model');
    Model.knex(knex({client: 'pg'}));

    var sql = Model.raw('SELECT * FROM "Model" where "id" = ?', [10]).toString();
    expect(sql).to.eql('SELECT * FROM "Model" where "id" = \'10\'');
  });

  it('knex instance is inherited from super classes', function () {
    var Model1 = modelClass('Model');

    function Model2() { Model1.apply(this, arguments); }
    Model1.extend(Model2);

    function Model3() { Model2.apply(this, arguments); }
    Model2.extend(Model3);

    var knexInstance = knex({client: 'pg'});
    Model1.knex(knexInstance);

    expect(Model2.knex()).to.equal(knexInstance);
    expect(Model3.knex()).to.equal(knexInstance);
  });

  it('ensureModel should return null for null input', function () {
    var Model = modelClass('Model');
    expect(Model.ensureModel(null)).to.equal(null);
  });

  it('ensureModelArray should return [] for null input', function () {
    var Model = modelClass('Model');
    expect(Model.ensureModelArray(null)).to.eql([]);
  });

  it('ensureModelArray should throw if an instance of another model is given in the array', function () {
    var Model1 = modelClass('Model1');
    var Model2 = modelClass('Model2');
    expect(function () {
      Model1.ensureModelArray([Model2.fromJson({})]);
    }).to.throwException();
  });

  it('loadRelated should throw if an invalid expression is given', function () {
    var Model = modelClass('Model1');
    expect(function () {
      Model.loadRelated([], 'notAValidExpression.');
    }).to.throwException();
  });

  it('loadRelated should throw if an invalid expression is given', function () {
    var Model = modelClass('Model1');
    expect(function () {
      Model.loadRelated([], 'notAValidExpression.');
    }).to.throwException();
  });

  it('id returned by generateId should be used on insert', function () {
    var Model = modelClass('Model');
    var knexInstance = knex({client: 'pg'});
    Model.knex(knexInstance);
    Model.generateId = function () {
      return 'generated_id';
    };
    expect(Model.query().insert({a: 1}).toSql()).to.equal('insert into "Model" ("a", "id") values (\'1\', \'generated_id\') returning "id"');
  });

  it('inserting multiple models should only work with postgres', function () {
    var Model = modelClass('Model');

    var knexInstance = knex({client: 'pg'});
    Model.knex(knexInstance);

    expect(function () {
      Model.query().insert([{a: 1}, {a: 2}]).build();
    }).to.not.throwException();

    var knexInstance = knex({client: 'sqlite3'});
    Model.knex(knexInstance);

    expect(function () {
      Model.query().insert([{a: 1}, {a: 2}]).build();
    }).to.throwException();

    var knexInstance = knex({client: 'mysql'});
    Model.knex(knexInstance);

    expect(function () {
      Model.query().insert([{a: 1}, {a: 2}]).build();
    }).to.throwException();
  });

  function modelClass(tableName) {
    function TestModel() {
      Model.apply(this, arguments);
    }
    Model.extend(TestModel);
    TestModel.tableName = tableName;
    return TestModel;
  }
});
