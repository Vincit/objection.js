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
      ]
    };

    var model = Model.fromJson(inputJson);

    expect(model).to.eql(inputJson);

    var dbJson = model.$toDatabaseJson();

    expect(dbJson.prop1).to.equal('text');
    expect(dbJson.prop2).to.equal('{"subProp1":1000}');
    expect(dbJson.prop3).to.equal('[{"subProp2":true},{"subProp2":false}]');

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

  function modelClass(tableName) {
    function TestModel() {
      Model.apply(this, arguments);
    }
    Model.extend(TestModel);
    TestModel.tableName = tableName;
    return TestModel;
  }
});
