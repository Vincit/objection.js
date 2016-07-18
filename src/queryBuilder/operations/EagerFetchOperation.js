import _ from 'lodash';
import Promise from 'bluebird';
import ValidationError from '../../ValidationError'
import QueryBuilderOperation from './QueryBuilderOperation';
import {afterReturn, mapAfterAllReturn} from '../../utils/promiseUtils';

export default class EagerFetchOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.expression = null;
  }

  call(builder, args) {
    this.expression = args[0].clone();

    _.each(args[1], filter => {
      this.expression.addAnonymousFilterAtPath(filter.path, filter.filter);
    });

    return true;
  }

  onAfterInternal(builder, result) {
    let models = _.isArray(result) ? result : [result];

    if (_.isEmpty(models) || !(models[0] instanceof builder.modelClass())) {
      return result;
    }

    let promises = [];

    this.expression.forEachChild(child => {
      let relation = builder.modelClass().getRelations()[child.name];

      if (!relation) {
        throw new ValidationError({eager: 'unknown relation "' + child.name + '" in an eager expression'});
      }
    });

    _.each(builder.modelClass().getRelations(), relation => {
      let childExpression = this.expression.childExpression(relation.name);

      if (childExpression) {
        promises.push(this._fetchRelation(builder, models, relation, childExpression));
      }
    });

    return Promise.all(promises).return(result);
  }

  _fetchRelation(builder, models, relation, childExpression) {
    let queryBuilder = relation.ownerModelClass.RelatedQueryBuilder
      .forClass(relation.relatedModelClass)
      .childQueryOf(builder)
      .eager(childExpression);

    queryBuilder.callQueryBuilderOperation(relation.find(queryBuilder, models), []);

    _.each(childExpression.args, filterName => {
      let filter = childExpression.filters[filterName];

      if (!_.isFunction(filter)) {
        throw new ValidationError({eager: 'could not find filter "' + filterName + '" for relation "' + relation.name + '"'});
      }

      filter(queryBuilder);
    });

    return queryBuilder;
  }
}