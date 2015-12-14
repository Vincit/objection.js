'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , QueryBuilder = require('./QueryBuilder')
  , ValidationError = require('./../ValidationError')
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
  var promises = [];

  this.eager.forEachChild(function (child) {
    var relation = self.modelClass.getRelations()[child.name];

    if (!relation) {
      throw new ValidationError({eager: 'unknown relation "' + child.name + '" in an eager expression'});
    }
  });

  _.each(this.modelClass.getRelations(), function (relation) {
    var nextEager = self.eager.childExpression(relation.name);

    if (nextEager) {
      promises.push(self._fetchRelation(relation, nextEager));
    }
  });

  this.promise = Promise.all(promises).return(this.models);
  return this.promise;
};

EagerFetcher.prototype._fetchRelation = function (relation, nextEager) {
  var self = this;
  var ModelClass = relation.relatedModelClass;
  var queryBuilder = ModelClass.RelatedQueryBuilder.forClass(ModelClass);

  relation.find(queryBuilder, this.models);

  _.each(nextEager.args, function (filterName) {
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
