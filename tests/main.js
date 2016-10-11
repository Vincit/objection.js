var expect = require('expect.js');

require('source-map-support').install();

describe('main module', function () {

  it('should be able to load using require', function () {
    var objection = require('../');
    expect(objection.Model).to.equal(require('../lib/model/Model').default);
    expect(objection.ModelBase).to.equal(require('../lib/model/ModelBase').default);
    expect(objection.QueryBuilder).to.equal(require('../lib/queryBuilder/QueryBuilder').default);
    expect(objection.QueryBuilderBase).to.equal(require('../lib/queryBuilder/QueryBuilderBase').default);
    expect(objection.QueryBuilderOperation).to.equal(require('../lib/queryBuilder/operations/QueryBuilderOperation').default);
    expect(objection.RelationExpression).to.equal(require('../lib/queryBuilder/RelationExpression').default);
    expect(objection.ValidationError).to.equal(require('../lib/ValidationError').default);
    expect(objection.Relation).to.equal(require('../lib/relations/Relation').default);
    expect(objection.HasManyRelation).to.equal(require('../lib/relations/hasMany/HasManyRelation').default);
    expect(objection.HasOneRelation).to.equal(require('../lib/relations/hasOne/HasOneRelation').default);
    expect(objection.BelongsToOneRelation).to.equal(require('../lib/relations/belongsToOne/BelongsToOneRelation').default);
    expect(objection.ManyToManyRelation).to.equal(require('../lib/relations/manyToMany/ManyToManyRelation').default);
    expect(objection.transaction).to.equal(require('../lib/transaction').default);
    expect(objection.transaction.start).to.equal(require('../lib/transaction').default.start);
    expect(objection.Promise).to.equal(require('bluebird'));
  });

});
