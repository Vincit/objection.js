'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , QueryBuilder = require('./QueryBuilder')
  , ValidationError = require('./ValidationError')
  , RelationExpression = require('./RelationExpression');

/**
 * @constructor
 * @ignore
 */
function EagerFetcher(opt) {
  this.modelClass = opt.modelClass;
  this.models = opt.models;
  this.eager = opt.eager;
  this.filters = opt.filters || {};
  this.parent = opt.parent || null;
  this.children = Object.create(null);
  this.promise = null;
}

EagerFetcher.prototype.fetch = function () {
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
      var filterNames = self.eager.args(relation.name);
      return self._fetchRelation(relation, filterNames, nextEager);
    }
  }))).then(function () {
    return self.models;
  });

  return this.promise;
};

EagerFetcher.prototype._fetchRelation = function (relation, filterNames, nextEager) {
  var self = this;
  var ModelClass = relation.relatedModelClass;
  var QueryBuilder = relation.relatedModelClass.RelatedQueryBuilder;
  var queryBuilder = QueryBuilder.forClass(ModelClass);

  relation.find(queryBuilder, this.models);

  _.each(filterNames, function (filterName) {
    var filter = self.filters[filterName];

    if (!_.isFunction(filter)) {
      throw new ValidationError({eager: 'could not find filter "' + filterName + '" for relation "' + relation.name + '"'});
    }

    filter(queryBuilder);
  });

  return queryBuilder.then(function (related) {
    return self._fetchNextEager(relation, related, nextEager);
  });
};

EagerFetcher.prototype._fetchNextEager = function (relation, related, eager) {
  this.children[relation.name] = new EagerFetcher({
    modelClass: relation.relatedModelClass,
    models: related,
    eager: eager,
    filters: this.filters,
    parent: this
  });

  return this.children[relation.name].fetch();
};

module.exports = EagerFetcher;
