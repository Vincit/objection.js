var _ = require('lodash')
  , Promise = require('bluebird')
  , MoronQueryBuilder = require('./MoronQueryBuilder')
  , MoronValidationError = require('./MoronValidationError')
  , MoronRelationExpression = require('./MoronRelationExpression');

function MoronEagerFetcher(opt) {
  this.modelClass = opt.modelClass;
  this.transaction = opt.transaction || opt.modelClass.transaction;
  this.models = opt.models;
  this.eager = opt.eager;
  this.parent = opt.parent || null;
  this.children = Object.create(null);
  this.promise = null;
}

MoronEagerFetcher.prototype.fetch = function () {
  if (this.promise) {
    return this.promise;
  }

  if (_.isEmpty(this.models)) {
    this.promise = Promise.resolve([]);
  }

  if (!this.promise) {
    var self = this;

    this.promise = Promise.all(_.compact(_.map(this.modelClass.getRelations(), function (relation) {
      var eager = self.eager.relation(relation.name);

      if (eager) {
        return self._fetchRelation(relation, eager);
      }
    }))).then(function () {
      return self.models;
    });
  }

  return this.promise;
};

MoronEagerFetcher.prototype._fetchRelation = function (relation, eager) {
  var self = this;
  var queryBuilder = MoronQueryBuilder.forClass(relation.relatedModelClass).transacting(this.transaction);

  return relation.find(queryBuilder, this.models).then(function (related) {
    return self._fetchBranch(relation, related, eager);
  });
};

MoronEagerFetcher.prototype._fetchBranch = function (relation, related, eager) {
  this.children[relation.name] = new MoronEagerFetcher({
    modelClass: relation.relatedModelClass,
    transaction: this.transaction,
    models: related,
    eager: eager,
    parent: this
  });

  return this.children[relation.name].fetch();
};

module.exports = MoronEagerFetcher;
