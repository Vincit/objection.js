const expect = require('expect.js');

describe('main module', () => {
  it('should be able to load using require', () => {
    let objection = require('../');

    expect(objection.QueryBuilderBase).to.equal(
      require('../lib/queryBuilder/QueryBuilderBase').QueryBuilderBase
    );
    expect(objection.QueryBuilderOperation).to.equal(
      require('../lib/queryBuilder/operations/QueryBuilderOperation').QueryBuilderOperation
    );
    expect(objection.RelationExpression).to.equal(
      require('../lib/queryBuilder/RelationExpression').RelationExpression
    );
    expect(objection.ValidationError).to.equal(
      require('../lib/model/ValidationError').ValidationError
    );
    expect(objection.NotFoundError).to.equal(require('../lib/model/NotFoundError').NotFoundError);
    expect(objection.Relation).to.equal(require('../lib/relations/Relation').Relation);
    expect(objection.HasManyRelation).to.equal(
      require('../lib/relations/hasMany/HasManyRelation').HasManyRelation
    );
    expect(objection.HasOneRelation).to.equal(
      require('../lib/relations/hasOne/HasOneRelation').HasOneRelation
    );
    expect(objection.BelongsToOneRelation).to.equal(
      require('../lib/relations/belongsToOne/BelongsToOneRelation').BelongsToOneRelation
    );
    expect(objection.HasOneThroughRelation).to.equal(
      require('../lib/relations/hasOneThrough/HasOneThroughRelation').HasOneThroughRelation
    );
    expect(objection.ManyToManyRelation).to.equal(
      require('../lib/relations/manyToMany/ManyToManyRelation').ManyToManyRelation
    );
    expect(objection.transaction).to.equal(require('../lib/transaction').transaction);
    expect(objection.transaction.start).to.equal(require('../lib/transaction').transaction.start);
    expect(objection.ref).to.equal(require('../lib/queryBuilder/ReferenceBuilder').ref);
    expect(objection.raw).to.equal(require('../lib/queryBuilder/RawBuilder').raw);
    expect(objection.lit).to.equal(require('../lib/queryBuilder/LiteralBuilder').lit);
    expect(objection.Promise).to.equal(require('bluebird'));
    expect(objection.mixin).to.equal(require('../lib/utils/mixin').mixin);
    expect(objection.compose).to.equal(require('../lib/utils/mixin').compose);
    expect(objection.lodash).to.equal(require('lodash'));
    expect(Object.getPrototypeOf(objection.Validator)).to.equal(
      require('../lib/model/Validator').Validator
    );
    expect(Object.getPrototypeOf(objection.AjvValidator)).to.equal(
      require('../lib/model/AjvValidator').AjvValidator
    );
    expect(Object.getPrototypeOf(objection.Model)).to.equal(require('../lib/model/Model').Model);
    expect(Object.getPrototypeOf(objection.QueryBuilder)).to.equal(
      require('../lib/queryBuilder/QueryBuilder').QueryBuilder
    );
  });
});
