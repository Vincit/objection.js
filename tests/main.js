const expect = require('expect.js');

describe('main module', () => {
  it('should be able to load using require', () => {
    let objection = require('../');
    expect(objection.Model).to.equal(require('../lib/model/Model'));
    expect(objection.QueryBuilder).to.equal(require('../lib/queryBuilder/QueryBuilder'));
    expect(objection.QueryBuilderBase).to.equal(require('../lib/queryBuilder/QueryBuilderBase'));
    expect(objection.QueryBuilderOperation).to.equal(
      require('../lib/queryBuilder/operations/QueryBuilderOperation')
    );
    expect(objection.RelationExpression).to.equal(
      require('../lib/queryBuilder/RelationExpression')
    );
    expect(objection.ValidationError).to.equal(require('../lib/model/ValidationError'));
    expect(objection.NotFoundError).to.equal(require('../lib/model/NotFoundError'));
    expect(objection.Relation).to.equal(require('../lib/relations/Relation'));
    expect(objection.HasManyRelation).to.equal(require('../lib/relations/hasMany/HasManyRelation'));
    expect(objection.HasOneRelation).to.equal(require('../lib/relations/hasOne/HasOneRelation'));
    expect(objection.BelongsToOneRelation).to.equal(
      require('../lib/relations/belongsToOne/BelongsToOneRelation')
    );
    expect(objection.HasOneThroughRelation).to.equal(
      require('../lib/relations/hasOneThrough/HasOneThroughRelation')
    );
    expect(objection.ManyToManyRelation).to.equal(
      require('../lib/relations/manyToMany/ManyToManyRelation')
    );
    expect(objection.transaction).to.equal(require('../lib/transaction'));
    expect(objection.transaction.start).to.equal(require('../lib/transaction').start);
    expect(objection.ref).to.equal(require('../lib/queryBuilder/ReferenceBuilder').ref);
    expect(objection.raw).to.equal(require('../lib/queryBuilder/RawBuilder').raw);
    expect(objection.lit).to.equal(require('../lib/queryBuilder/LiteralBuilder').lit);
    expect(objection.Promise).to.equal(require('bluebird'));
    expect(objection.Validator).to.equal(require('../lib/model/Validator'));
    expect(objection.AjvValidator).to.equal(require('../lib/model/AjvValidator'));
    expect(objection.mixin).to.equal(require('../lib/utils/mixin').mixin);
    expect(objection.compose).to.equal(require('../lib/utils/mixin').compose);
    expect(objection.lodash).to.equal(require('lodash'));
  });
});
