'use strict';

var _ = require('lodash');
var knex = require('knex');
var expect = require('expect.js');
var Model = require('../../../').Model;
var QueryBuilder = require('../../../').QueryBuilder;

describe('Model', function () {

  it('should parse relations into Model instances and remove them from database representation', function () {
    var Model1 = modelClass('Model1');
    var Model2 = modelClass('Model2');

    Model1.relationMappings = {
      relation1: {
        relation: Model.HasManyRelation,
        modelClass: Model2,
        join: {
          from: 'Model1.id',
          to: 'Model2.model1Id'
        }
      },
      relation2: {
        relation: Model.BelongsToOneRelation,
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

  it('relationMappings can be a function', function () {
    var Model1 = modelClass('Model1');
    var Model2 = modelClass('Model2');

    Model1.relationMappings = function () {
      return {
        relation1: {
          relation: Model.HasManyRelation,
          modelClass: Model2,
          join: {
            from: 'Model1.id',
            to: 'Model2.model1Id'
          }
        }
      };
    };

    expect(Model1.getRelation('relation1').relatedModelClass).to.equal(Model2);
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

  it('if pickJsonSchemaProperties = false, should select all properties even if jsonSchema is defined', function () {
    var Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'number'},
        prop2: {type: 'string'}
      }
    };

    Model.pickJsonSchemaProperties = false;

    var model = Model.fromJson({
      prop1: 10,
      prop2: '10',
      prop3: 'should not be removed',
      prop4: {also: 'this'}
    });

    var json = model.$toDatabaseJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should not be removed');
    expect(json.prop4).to.eql({also: 'this'});

    expect(model.prop1).to.equal(10);
    expect(model.prop2).to.equal('10');
    expect(model.prop3).to.equal('should not be removed');
    expect(model.prop4).to.eql({also: 'this'});

    json = model.$toJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should not be removed');
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
        relation: Model.BelongsToOneRelation,
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
        relation: Model.BelongsToOneRelation,
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
    expect(sql).to.eql('SELECT * FROM "Model" where "id" = 10');
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

  it('loadRelated should return a QueryBuilder', function () {
    var Model = modelClass('Model1');
    expect(Model.loadRelated([], '[]')).to.be.a(QueryBuilder);
  });

  it('$loadRelated should return a QueryBuilder', function () {
    var Model = modelClass('Model1');
    expect(Model.fromJson({}).$loadRelated('[]')).to.be.a(QueryBuilder);
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

  it('should use Model.QueryBuilder to create `query()` and `$query()`', function () {
    function MyQueryBuilder() {
      QueryBuilder.apply(this, arguments);
    }

    QueryBuilder.extend(MyQueryBuilder);

    var Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.HasManyRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.someId'
        }
      }
    };

    Model.QueryBuilder = MyQueryBuilder;

    expect(Model.query()).to.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$query()).to.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$relatedQuery('someRelation')).to.not.be.a(MyQueryBuilder);
  });

  it('should use Model.RelatedQueryBuilder to create `$relatedQuery()`', function () {
    function MyQueryBuilder() {
      QueryBuilder.apply(this, arguments);
    }

    QueryBuilder.extend(MyQueryBuilder);

    var Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.HasManyRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.someId'
        }
      }
    };

    Model.RelatedQueryBuilder = MyQueryBuilder;

    expect(Model.query()).to.not.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$query()).to.not.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$relatedQuery('someRelation')).to.be.a(MyQueryBuilder);
  });

  describe('traverse() and $traverse()', function () {
    var Model1;
    var Model2;
    var model;

    beforeEach(function () {
      Model1 = modelClass('Model1');
      Model2 = modelClass('Model2');

      Model1.relationMappings = {
        relation1: {
          relation: Model.HasManyRelation,
          modelClass: Model2,
          join: {
            from: 'Model1.id',
            to: 'Model2.model1Id'
          }
        },
        relation2: {
          relation: Model.BelongsToOneRelation,
          modelClass: Model1,
          join: {
            from: 'Model1.id',
            to: 'Model1.model1Id'
          }
        }
      };
    });

    beforeEach(function () {
      model = Model1.fromJson({
        id: 1,
        model1Id: 2,
        relation1: [
          {id: 4, model1Id: 1},
          {id: 5, model1Id: 1}
        ],
        relation2: {
          id: 2,
          model1Id: 3,
          relation1: [
            {id: 6, model1Id: 2},
            {id: 7, model1Id: 2}
          ],
          relation2: {
            id: 3,
            model1Id: null,
            relation1: [
              {id: 8, model1Id: 3},
              {id: 9, model1Id: 3},
              {id: 10, model1Id: 3},
              {id: 11, model1Id: 3},
              {id: 12, model1Id: 3},
              {id: 13, model1Id: 3},
              {id: 14, model1Id: 3},
              {id: 15, model1Id: 3},
              {id: 16, model1Id: 3},
              {id: 17, model1Id: 3},
              {id: 18, model1Id: 3},
              {id: 19, model1Id: 3},
              {id: 20, model1Id: 3},
              {id: 21, model1Id: 3},
              {id: 22, model1Id: 3},
              {id: 23, model1Id: 3},
              {id: 24, model1Id: 3},
              {id: 25, model1Id: 3}
            ]
          }
        }
      });
    });

    it('traverse(modelArray, traverser) should traverse through the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      Model1.traverse([model], function (model) {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse callback should be passed the model, its parent (if any) and the relation it is in (if any)', function () {
      Model1.traverse([model], function (model, parent, relationName) {
        if (model instanceof Model1) {
          if (model.id === 1) {
            expect(parent).to.equal(null);
            expect(relationName).to.equal(null);
          } else if (model.id === 2) {
            expect(parent.id).to.equal(1);
            expect(relationName).to.equal('relation2');
          } else if (model.id === 3) {
            expect(parent.id).to.equal(2);
            expect(relationName).to.equal('relation2');
          } else {
            throw new Error('should never get here');
          }
        } else if (model instanceof Model2) {
          if (model.id >= 4 && model.id <= 5) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(1);
            expect(relationName).to.equal('relation1');
          } else if (model.id >= 6 && model.id <= 7) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(2);
            expect(relationName).to.equal('relation1');
          } else if (model.id >= 8 && model.id <= 25) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(3);
            expect(relationName).to.equal('relation1');
          } else {
            throw new Error('should never get here');
          }
        }
      });
    });

    it('traverse(singleModel, traverser) should traverse through the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      Model1.traverse(model, function (model) {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse(null, singleModel, traverser) should traverse through the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      Model1.traverse(null, model, function (model) {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse(ModelClass, model, traverser) should traverse through all ModelClass instances in the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      Model1.traverse(Model2, model, function (model) {
        model2Ids.push(model.id);
      }).traverse(Model1, model, function (model) {
        model1Ids.push(model.id);
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('$traverse(traverser) should traverse through the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      model.$traverse(function (model) {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('$traverse(ModelClass, traverser) should traverse through the ModelClass instances in the relation tree', function () {
      var model1Ids = [];
      var model2Ids = [];

      model.$traverse(Model1, function (model) {
        model1Ids.push(model.id);
      }).$traverse(Model2, function (model) {
        model2Ids.push(model.id);
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

  });

  it('$validate should run run hooks and strip relations', function () {
    var Model1 = modelClass('Model1');

    Model1.prototype.$parseJson = function (json, opt) {
      json = Model.prototype.$parseJson.apply(this, arguments);
      json.foo = parseInt(json.foo);
      return json;
    };

    Model1.prototype.$formatJson = function (json, opt) {
      json = Model.prototype.$formatJson.apply(this, arguments);
      json.foo = json.foo.toString();
      return json;
    };

    Model1.jsonSchema = {
      type: 'object',
      properties: {
        foo: {type: 'integer'}
      }
    };

    Model1.relationMappings = {
      someRelation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Model1,
        join: {
          from: 'Model1.id',
          to: 'Model1.someId'
        }
      }
    };

    var model = Model1.fromJson({foo: '10'});
    model.someRelation = Model1.fromJson({foo: '20'});

    expect(model.foo).to.equal(10);
    model.$validate();
    expect(model.foo).to.equal(10);

    expect(model.$toJson().foo).to.equal('10');
  });

  it('fn() should be a shortcut to knex.fn', function () {
    var Model1 = modelClass('Model1');
    Model1.knex({fn: {a: 1}});
    expect(Model1.fn()).to.eql({a: 1});
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
