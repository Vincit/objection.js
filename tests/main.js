var expect = require('expect.js');

describe('main module', function () {

  it('should be able to load using require', function () {
    var objection = require('../');
    expect(objection.Model).to.equal(require('../lib/Model'));
    expect(objection.ModelBase).to.equal(require('../lib/ModelBase'));
    expect(objection.QueryBuilder).to.equal(require('../lib/QueryBuilder'));
    expect(objection.RelationExpression).to.equal(require('../lib/RelationExpression'));
    expect(objection.ValidationError).to.equal(require('../lib/ValidationError'));
    expect(objection.OneToManyRelation).to.equal(require('../lib/relations/OneToManyRelation'));
    expect(objection.OneToOneRelation).to.equal(require('../lib/relations/OneToOneRelation'));
    expect(objection.ManyToManyRelation).to.equal(require('../lib/relations/ManyToManyRelation'));
    expect(objection.transaction).to.equal(require('../lib/transaction'));
  });

});
