var expect = require('expect.js');

describe('main module', function () {

  it('should be able to load using require', function () {
    var objection = require('../');
    expect(objection.Model).to.equal(require('../lib/model/Model').default);
    expect(objection.ModelBase).to.equal(require('../lib/model/ModelBase').default);
    expect(objection.QueryBuilder).to.equal(require('../lib/queryBuilder/QueryBuilder').default);
    expect(objection.QueryBuilderBase).to.equal(require('../lib/queryBuilder/QueryBuilderBase').default);
    expect(objection.RelationExpression).to.equal(require('../lib/queryBuilder/RelationExpression').default);
    expect(objection.ValidationError).to.equal(require('../lib/ValidationError'));
    expect(objection.Relation).to.equal(require('../lib/relations/Relation').default);
    expect(objection.OneToManyRelation).to.equal(require('../lib/relations/OneToManyRelation').default);
    expect(objection.OneToOneRelation).to.equal(require('../lib/relations/OneToOneRelation').default);
    expect(objection.ManyToManyRelation).to.equal(require('../lib/relations/ManyToManyRelation').default);
    expect(objection.transaction).to.equal(require('../lib/transaction'));
    expect(objection.Promise).to.equal(require('bluebird'));
  });

});
