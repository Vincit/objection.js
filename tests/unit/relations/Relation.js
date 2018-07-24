const _ = require('lodash');
const Knex = require('knex');
const expect = require('expect.js');
const objection = require('../../../');

const Model = objection.Model;
const Relation = objection.Relation;

describe('Relation', () => {
  let OwnerModel = null;
  let RelatedModel = null;
  let RelatedModelNamedExport = null;

  beforeEach(() => {
    delete require.cache[__dirname + '/files/OwnerModel.js'];
    delete require.cache[__dirname + '/files/RelatedModel.js'];

    OwnerModel = require(__dirname + '/files/OwnerModel');
    RelatedModel = require(__dirname + '/files/RelatedModel');
    RelatedModelNamedExport = require(__dirname + '/files/RelatedModelNamedExport').RelatedModel;
  });

  it('should accept a Model subclass as modelClass', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('should accept a path to a Model subclass as modelClass', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: __dirname + '/files/RelatedModel',
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('should accept a relative path to a Model subclass as modelClass (resolved using Model.modelPaths)', () => {
    OwnerModel.modelPaths = [__dirname + '/files/'];
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: 'RelatedModel',
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('multiple items in `Model.modelPaths` should work', () => {
    OwnerModel.modelPaths = [__dirname, __dirname + '/files/'];

    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: 'RelatedModel',
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('should accept a module with named exports', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: __dirname + '/files/RelatedModelNamedExport',
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModelNamedExport);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('should accept a composite key as an array of columns', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: ['OwnerModel.name', 'OwnerModel.dateOfBirth'],
        to: ['RelatedModel.ownerName', 'RelatedModel.ownerDateOfBirth']
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['name', 'dateOfBirth']);
    expect(relation.ownerProp.props).to.eql(['name', 'dateOfBirth']);
    expect(relation.relatedProp.cols).to.eql(['ownerName', 'ownerDateOfBirth']);
    expect(relation.relatedProp.props).to.eql(['ownerName', 'ownerDateOfBirth']);
  });

  it('should fail if relation property and the relation itself have the same name', () => {
    let relation = new Relation('foo', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.foo',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "OwnerModel.relationMappings.foo: join: relation name and join property 'foo' cannot have the same name. If you cannot change one or the other, you can use $parseDatabaseJson and $formatDatabaseJson methods to convert the column name."
      );
    });
  });

  it('should pass through erros thrown from jsonSchema getter', () => {
    Object.defineProperties(OwnerModel, {
      jsonSchema: {
        enumerable: true,
        get() {
          throw new Error('whoops, invalid json shchema getter');
        }
      }
    });

    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal('whoops, invalid json shchema getter');
    });
  });

  it('should fail if modelClass is not a subclass of Model', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: function SomeConstructor() {},
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: modelClass: is not a subclass of Model or a file path to a module that exports one. You may be dealing with a require loop. See the documentation section about require loops.'
      );
    });
  });

  it('should fail if modelClass resolves to a module that exports multiple model classes', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: __dirname + '/files/InvalidModelManyNamedModels',
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.match(
        /OwnerModel\.relationMappings\.testRelation: modelClass: path .*\/tests\/unit\/relations\/files\/InvalidModelManyNamedModels exports multiple models\. Don't know which one to choose\./
      );
    });
  });

  it('should fail if modelClass is missing', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: null,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: modelClass is not defined'
      );
    });
  });

  it('should fail if modelClass is an invalid file path', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: 'blaa',
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: modelClass: could not resolve blaa using modelPaths'
      );
    });
  });

  it('should fail if modelClass is a file path that points to a non-model', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: __dirname + '/files/InvalidModel',
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(
        /^OwnerModel\.relationMappings\.testRelation: modelClass: (.+)\/InvalidModel is an invalid file path to a model class$/.test(
          err.message
        )
      ).to.equal(true);
    });
  });

  it('should fail if relation is not defined', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: relation is not defined'
      );
    });
  });

  it('should fail if relation is not a Relation subclass', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: function() {},
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: relation is not a subclass of Relation'
      );
    });
  });

  it('should fail if OwnerModelClass is not a subclass of Model', () => {
    let relation = new Relation('testRelation', {});

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal("Relation: Relation's owner is not a subclass of Model");
    });
  });

  it('join.to should have format ModelName.columnName', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.to must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].'
      );
    });
  });

  it('join.to should point to either of the related model classes', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'SomeOtherModel.id',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "OwnerModel.relationMappings.testRelation: join: either `from` or `to` must point to the owner model table and the other one to the related table. It might be that specified table 'SomeOtherModel' is not correct"
      );
    });
  });

  it('join.from should have format ModelName.columnName', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'id',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join.from must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].'
      );
    });
  });

  it('join.from should point to either of the related model classes', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'SomeOtherModel.ownerId'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        "OwnerModel.relationMappings.testRelation: join: either `from` or `to` must point to the owner model table and the other one to the related table. It might be that specified table 'SomeOtherModel' is not correct"
      );
    });
  });

  it('should fail if join object is missing', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}'
      );
    });
  });

  it('should fail if join.from is missing', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}'
      );
    });
  });

  it('should fail if join.to is missing', () => {
    let relation = new Relation('testRelation', OwnerModel);

    expect(() => {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id'
        }
      });
    }).to.throwException(err => {
      expect(err.message).to.equal(
        'OwnerModel.relationMappings.testRelation: join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}'
      );
    });
  });

  it('the values of `join.to` and `join.from` can be swapped', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: 'RelatedModel.ownerId',
        to: 'OwnerModel.id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['ownerId']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('relatedCol and ownerCol should be in database format', () => {
    let relation = new Relation('testRelation', OwnerModel);

    Object.defineProperty(OwnerModel, 'tableName', {
      get() {
        return 'owner_model';
      }
    });

    OwnerModel.prototype.$parseDatabaseJson = json => {
      return _.mapKeys(json, (value, key) => {
        return _.camelCase(key);
      });
    };

    Object.defineProperty(RelatedModel, 'tableName', {
      get() {
        return 'related-model';
      }
    });

    RelatedModel.prototype.$parseDatabaseJson = json => {
      return _.mapKeys(json, (value, key) => {
        return _.camelCase(key);
      });
    };

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: 'owner_model.id_col',
        to: 'related-model.owner-id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id_col']);
    expect(relation.ownerProp.props).to.eql(['idCol']);
    expect(relation.relatedProp.cols).to.eql(['owner-id']);
    expect(relation.relatedProp.props).to.eql(['ownerId']);
  });

  it('should allow relations on tables under a schema', () => {
    let relation = new Relation('testRelation', OwnerModel);

    Object.defineProperty(OwnerModel, 'tableName', {
      get() {
        return 'schema1.owner_model';
      }
    });

    Object.defineProperty(RelatedModel, 'tableName', {
      get() {
        return 'schema2.related_model';
      }
    });

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: 'schema1.owner_model.id',
        to: 'schema2.related_model.owner_id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerProp.cols).to.eql(['id']);
    expect(relation.ownerProp.props).to.eql(['id']);
    expect(relation.relatedProp.cols).to.eql(['owner_id']);
    expect(relation.relatedProp.props).to.eql(['owner_id']);
  });

  it('joinModelClass should return null for relations without join models', () => {
    let relation = new Relation('testRelation', OwnerModel);

    relation.setMapping({
      relation: Relation,
      modelClass: RelatedModel,
      join: {
        from: 'RelatedModel.ownerId',
        to: 'OwnerModel.id'
      }
    });

    const knex = Knex({ client: 'pg' });
    expect(relation.joinModelClass).to.equal(null);
  });
});
