var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , Model = require('../../../lib/model/Model')
  , Relation = require('../../../lib/relations/Relation');

describe('Relation', function () {
  var OwnerModel = null;
  var RelatedModel = null;

  beforeEach(function () {
    delete require.cache[__dirname + '/files/OwnerModel.js'];
    delete require.cache[__dirname + '/files/RelatedModel.js'];

    OwnerModel = require(__dirname + '/files/OwnerModel');
    RelatedModel = require(__dirname + '/files/RelatedModel');
  });

  it('should accept a Model subclass as modelClass', function () {
    var relation = new Relation('testRelation', OwnerModel);

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
    expect(relation.ownerCol).to.equal('id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
  });

  it('should accept a path to a Model subclass as modelClass', function () {
    var relation = new Relation('testRelation', OwnerModel);

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
    expect(relation.ownerCol).to.equal('id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
  });

  it('should fail if modelClass is not a subclass of Model', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: function SomeConstructor() {},
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.modelClass is not a subclass of Model or a file path to a module that exports one.');
    });
  });

  it('should fail if modelClass is missing', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: null,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.modelClass is not defined');
    });
  });

  it('should fail if modelClass is an invalid file path', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: 'blaa',
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.modelClass is an invalid file path to a model class.');
    });
  });

  it('should fail if modelClass is a file path that points to a non-model', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: __dirname + '/files/InvalidModel',
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.modelClass is a valid path to a module, but the module doesn\'t export a Model subclass.');
    });
  });

  it('should fail if relation is not defined', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.relation is not defined');
    });
  });

  it('should fail if relation is not a Relation subclass', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: function () {},
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.relation is not a subclass of Relation');
    });
  });

  it('should fail if OwnerModelClass is not a subclass of Model', function () {
    var relation = new Relation('testRelation', {});

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('Relation\'s owner is not a subclass of Model');
    });
  });

  it('join.to should have format ModelName.columnName', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.to must have format TableName.columnName. For example `SomeTable.id`.');
    });
  });

  it('join.to should point to either of the related model classes', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'SomeOtherModel.id',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join: either `from` or `to` must point to the owner model table.');
    });
  });

  it('join.from should have format ModelName.columnName', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'id',
          to: 'RelatedModel.ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.from must have format TableName.columnName. For example `SomeTable.id`.');
    });
  });

  it('join.from should point to either of the related model classes', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'SomeOtherModel.ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join: either `from` or `to` must point to the related model table.');
    });
  });

  it('should fail if join object is missing', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel
      });
    }).to.throwException(function (err) {
        expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
      });
  });

  it('should fail if join.from is missing', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
    });
  });

  it('should fail if join.to is missing', function () {
    var relation = new Relation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: Relation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
    });
  });

  it('the values of `join.to` and `join.from` can be swapped', function () {
    var relation = new Relation('testRelation', OwnerModel);

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
    expect(relation.ownerCol).to.equal('id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
  });

  it('relatedCol and ownerCol should be in database format', function () {
    var relation = new Relation('testRelation', OwnerModel);

    OwnerModel.tableName = 'owner_model';
    OwnerModel.prototype.$parseDatabaseJson = function (json) {
      return _.mapKeys(json, function (value, key) {
        return _.camelCase(key);
      });
    };

    RelatedModel.tableName = 'related-model';
    RelatedModel.prototype.$parseDatabaseJson = function (json) {
      return _.mapKeys(json, function (value, key) {
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
    expect(relation.ownerCol).to.equal('id_col');
    expect(relation.ownerProp).to.equal('idCol');
    expect(relation.relatedCol).to.equal('owner-id');
    expect(relation.relatedProp).to.equal('ownerId');
  });

});
