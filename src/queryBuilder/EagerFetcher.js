import _ from 'lodash';
import Promise from 'bluebird';
import ValidationError from '../ValidationError';
import RelationExpression from './RelationExpression';

export default class EagerFetcher {

  constructor({modelClass, models, eager, filters, parent, rootQuery}) {
    this.modelClass = modelClass;
    this.models = models;
    this.eager = eager;
    this.filters = filters || {};
    this.parent = parent || null;
    this.rootQuery = rootQuery || null;
    this.children = Object.create(null);
    this.promise = null;
  }

  fetch() {
    if (this.promise) {
      return this.promise;
    }

    if (_.isEmpty(this.models)) {
      this.promise = Promise.resolve([]);
      return this.promise;
    }

    let promises = [];

    this.eager.forEachChild(child => {
      let relation = this.modelClass.getRelations()[child.name];

      if (!relation) {
        throw new ValidationError({eager: 'unknown relation "' + child.name + '" in an eager expression'});
      }
    });

    _.each(this.modelClass.getRelations(), relation => {
      let nextEager = this.eager.childExpression(relation.name);

      if (nextEager) {
        promises.push(this._fetchRelation(relation, nextEager));
      }
    });

    this.promise = Promise.all(promises).return(this.models);
    return this.promise;
  }

  _fetchRelation(relation, nextEager) {
    let queryBuilder = relation.ownerModelClass.RelatedQueryBuilder.forClass(relation.relatedModelClass).childQueryOf(this.rootQuery);
    let operation = relation.find(queryBuilder, this.models);

    queryBuilder.callQueryBuilderOperation(operation, []);

    _.each(nextEager.args, filterName => {
      let filter = this.filters[filterName];

      if (!_.isFunction(filter)) {
        throw new ValidationError({eager: 'could not find filter "' + filterName + '" for relation "' + relation.name + '"'});
      }

      filter(queryBuilder);
    });

    return queryBuilder.then(related => {
      return this._fetchNextEager(relation, related, nextEager);
    });
  }

  _fetchNextEager(relation, related, eager) {
    this.children[relation.name] = new EagerFetcher({
      modelClass: relation.relatedModelClass,
      models: related,
      eager: eager,
      filters: this.filters,
      parent: this,
      rootQuery: this.rootQuery
    });

    return this.children[relation.name].fetch();
  }
}