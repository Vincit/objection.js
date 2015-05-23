var _ = require('lodash')
  , knex = require('knex')
  , expect = require('expect.js')
  , MoronModel = require('../../../lib/MoronModel')
  , MoronRelation = require('../../../lib/relations/MoronRelation');

describe('MoronRelation', function () {
  var OwnerModel = null;
  var RelatedModel = null;

  beforeEach(function () {
    delete require.cache[__dirname + '/files/OwnerModel.js'];
    delete require.cache[__dirname + '/files/RelatedModel.js'];

    OwnerModel = require(__dirname + '/files/OwnerModel');
    RelatedModel = require(__dirname + '/files/RelatedModel');
  });

  it('should accept a MoronModel subclass as modelClass', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: MoronRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('OwnerModel.id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('RelatedModel.ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal(null);
    expect(relation.joinTableOwnerCol).to.equal(null);
    expect(relation.joinTableRelatedCol).to.equal(null);
  });

  it('should fail if modelClass is not a subclass of MoronModel', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: function SomeConstructor() {},
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.modelClass is not a subclass of MoronModel or a file path to a module that exports one.');
    });
  });

  it('should fail if OwnerModelClass is not a subclass of MoronModel', function () {
    var relation = new MoronRelation('testRelation', {});

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'OwnerModel.id',
          to: 'ownerId'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('Relation\'s owner is not a subclass of MoronModel');
    });
  });

  it('join.to should have format ModelName.columnName', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel
      });
    }).to.throwException(function (err) {
        expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
      });
  });

  it('should fail if join.from is missing', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
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
    var relation = new MoronRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: MoronRelation,
      modelClass: RelatedModel,
      join: {
        from: 'RelatedModel.ownerId',
        to: 'OwnerModel.id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('OwnerModel.id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('RelatedModel.ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal(null);
    expect(relation.joinTableOwnerCol).to.equal(null);
    expect(relation.joinTableRelatedCol).to.equal(null);
  });

  it('should accept a path to a MoronModel subclass as modelClass', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: MoronRelation,
      modelClass: __dirname + '/files/RelatedModel',
      join: {
        from: 'OwnerModel.id',
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('OwnerModel.id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('RelatedModel.ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal(null);
    expect(relation.joinTableOwnerCol).to.equal(null);
    expect(relation.joinTableRelatedCol).to.equal(null);
  });

  it('relatedCol and ownerCol should be in database format', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

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
      relation: MoronRelation,
      modelClass: RelatedModel,
      join: {
        from: 'owner_model.id_col',
        to: 'related-model.owner-id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('owner_model.id_col');
    expect(relation.ownerProp).to.equal('idCol');
    expect(relation.relatedCol).to.equal('related-model.owner-id');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal(null);
    expect(relation.joinTableOwnerCol).to.equal(null);
    expect(relation.joinTableRelatedCol).to.equal(null);
  });

  it('should accept a join table in join.through object', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: MoronRelation,
      modelClass: RelatedModel,
      join: {
        from: 'OwnerModel.id',
        through: {
          from: 'JoinTable.ownerId',
          to: 'JoinTable.relatedId'
        },
        to: 'RelatedModel.ownerId'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('OwnerModel.id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('RelatedModel.ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.equal('JoinTable.ownerId');
    expect(relation.joinTableRelatedCol).to.equal('JoinTable.relatedId');
  });

  it('should be able to swap join.through.from and join.through.to', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    relation.setMapping({
      relation: MoronRelation,
      modelClass: RelatedModel,
      join: {
        from: 'RelatedModel.ownerId',
        through: {
          from: 'JoinTable.relatedId',
          to: 'JoinTable.ownerId'
        },
        to: 'OwnerModel.id'
      }
    });

    expect(relation.ownerModelClass).to.equal(OwnerModel);
    expect(relation.relatedModelClass).to.equal(RelatedModel);
    expect(relation.ownerCol).to.equal('OwnerModel.id');
    expect(relation.ownerProp).to.equal('id');
    expect(relation.relatedCol).to.equal('RelatedModel.ownerId');
    expect(relation.relatedProp).to.equal('ownerId');
    expect(relation.joinTable).to.equal('JoinTable');
    expect(relation.joinTableOwnerCol).to.equal('JoinTable.ownerId');
    expect(relation.joinTableRelatedCol).to.equal('JoinTable.relatedId');
  });

  it('should fail if join.through.to is missing', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.through must be an object that describes the join table. For example: {from: \'JoinTable.someId\', to: \'JoinTable.someOtherId\'}');
    });
  });

  it('should fail if join.through.from is missing', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.through must be an object that describes the join table. For example: {from: \'JoinTable.someId\', to: \'JoinTable.someOtherId\'}');
    });
  });

  it('join.through.from should have format JoinTable.columnName', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'relatedId',
            to: 'JoinTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.through.from must have format JoinTable.columnName. For example `JoinTable.someId`.');
    });
  });


  it('join.through.to should have format JoinTable.columnName', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId',
            to: 'ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.through.to must have format JoinTable.columnName. For example `JoinTable.someId`.');
    });
  });

  it('join.through `to` and `from` should point to the same table', function () {
    var relation = new MoronRelation('testRelation', OwnerModel);

    expect(function () {
      relation.setMapping({
        relation: MoronRelation,
        modelClass: RelatedModel,
        join: {
          from: 'RelatedModel.ownerId',
          through: {
            from: 'JoinTable.relatedId',
            to: 'OtherTable.ownerId'
          },
          to: 'OwnerModel.id'
        }
      });
    }).to.throwException(function (err) {
      expect(err.message).to.equal('OwnerModel.relationMappings.testRelation.join.through `from` and `to` must point to the same join table.');
    });
  });

});
