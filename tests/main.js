var expect = require('expect.js');

describe('main module', function () {

  it('should be able to load using require', function () {
    var objection = require('../');
    expect(objection.Model).to.equal(require('../lib/model/Model'));
    expect(objection.ModelBase).to.equal(require('../lib/model/ModelBase').default);
    expect(objection.QueryBuilder).to.equal(require('../lib/queryBuilder/QueryBuilder'));
    expect(objection.RelationExpression).to.equal(require('../lib/queryBuilder/RelationExpression'));
    expect(objection.ValidationError).to.equal(require('../lib/ValidationError'));
    expect(objection.OneToManyRelation).to.equal(require('../lib/relations/OneToManyRelation'));
    expect(objection.OneToOneRelation).to.equal(require('../lib/relations/OneToOneRelation'));
    expect(objection.ManyToManyRelation).to.equal(require('../lib/relations/ManyToManyRelation'));
    expect(objection.transaction).to.equal(require('../lib/transaction'));
    expect(objection.Promise).to.equal(require('bluebird'));
  });

});
