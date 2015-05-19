var _ = require('lodash')
  , Promise = require('bluebird')
  , MoronQueryBuilder = require('./MoronQueryBuilder')
  , MoronValidationError = require('./MoronValidationError')
  , MoronEagerExpression = require('./MoronEagerExpression')
  , EagerType = MoronEagerExpression.EagerType;

function MoronEagerFetcher(opt) {
  this.modelClass = opt.modelClass;
  this.transaction = opt.transaction || opt.modelClass.transaction;
  this.models = opt.models;
  this.eager = opt.eager;
  this.parent = opt.parent || null;
  this.children = Object.create(null);
  this.promise = null;

  if (this.eager === EagerType.AllRecursive) {
    // The only special case we need to handle here.
    this.eager = _.mapValues(opt.modelClass.getRelations(), _.constant(EagerType.AllRecursive));
  }
}

MoronEagerFetcher.prototype.fetch = function () {
  if (this.promise) {
    return this.promise;
  }

  if (_.isEmpty(this.models) || !_.isObject(this.eager) || _.isEmpty(this.eager)) {
    this.promise = Promise.resolve(this.models);
  }

  if (!this.promise) {
    var self = this;

    this.promise = Promise.all(_.map(this.eager, function ($, relationName) {
      return self._fetchRelation(relationName);
    })).then(function () {
      return self.models;
    });
  }

  return this.promise;
};

MoronEagerFetcher.prototype._fetchRelation = function (relationName) {
  var self = this;
  var relation = this.modelClass.getRelation(relationName);
  var queryBuilder = MoronQueryBuilder.forClass(relation.relatedModelClass).transacting(this.transaction);

  return relation.find(queryBuilder, this.models).then(function (related) {
    var nextBranch = self._nextEagerBranch(relationName);

    if (!_.isEmpty(nextBranch) && !_.isEmpty(related)) {
      return self._fetchBranch(relationName, related, nextBranch);
    }
  });
};

MoronEagerFetcher.prototype._nextEagerBranch = function (relationName) {
  var relation = this.modelClass.getRelation(relationName);
  var branch = this.eager[relationName];

  if (branch === EagerType.AllRecursive) {
    branch = _.mapValues(relation.relatedModelClass.getRelations(), _.constant(EagerType.AllRecursive));
  } else if (branch === EagerType.Recursive) {
    branch = {};
    branch[relationName] = EagerType.Recursive;
  } else if (!_.isObject(branch)) {
    branch = {};
  }

  return branch;
};

MoronEagerFetcher.prototype._fetchBranch = function (relationName, related, branch) {
  var relation = this.modelClass.getRelation(relationName);

  this.children[relationName] = new MoronEagerFetcher({
    modelClass: relation.relatedModelClass,
    transaction: this.transaction,
    models: related,
    eager: branch,
    parent: this
  });

  return this.children[relationName].fetch();
};

module.exports = MoronEagerFetcher;
