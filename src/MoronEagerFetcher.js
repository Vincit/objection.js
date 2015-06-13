var _ = require('lodash')
  , Promise = require('bluebird')
  , MoronQueryBuilder = require('./MoronQueryBuilder')
  , MoronValidationError = require('./MoronValidationError')
  , MoronRelationExpression = require('./MoronRelationExpression');

/**
 * @constructor
 * @ignore
 */
function MoronEagerFetcher(opt) {
  this.modelClass = opt.modelClass;
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
    return this.promise;
  }

  var self = this;

  this.promise = Promise.all(_.compact(_.map(this.modelClass.getRelations(), function (relation) {
    var nextEager = self.eager.relation(relation.name);

    if (nextEager) {
      return self._fetchRelation(relation, nextEager);
    }
  }))).then(function () {
    return self.models;
  });

  return this.promise;
};

MoronEagerFetcher.prototype._fetchRelation = function (relation, nextEager) {
  var self = this;
  var queryBuilder = MoronQueryBuilder.forClass(relation.relatedModelClass);

  return relation.find(queryBuilder, this.models).then(function (related) {
    return self._fetchNextEager(relation, related, nextEager);
  });
};

MoronEagerFetcher.prototype._fetchNextEager = function (relation, related, eager) {
  this.children[relation.name] = new MoronEagerFetcher({
    modelClass: relation.relatedModelClass,
    models: related,
    eager: eager,
    parent: this
  });

  return this.children[relation.name].fetch();
};

module.exports = MoronEagerFetcher;
