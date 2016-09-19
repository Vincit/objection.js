import Promise from 'bluebird';
import ValidationError from '../../ValidationError'
import EagerOperation from './EagerOperation';

export default class WhereInEagerOperation extends EagerOperation {

  onAfterInternal(builder, result) {
    const models = Array.isArray(result) ? result : [result];

    if (!models.length || !(models[0] instanceof builder.modelClass())) {
      return result;
    }

    const promises = [];

    this.expression.forEachChild(child => {
      let relation = builder.modelClass().getRelations()[child.name];

      if (!relation) {
        throw new ValidationError({eager: 'unknown relation "' + child.name + '" in an eager expression'});
      }
    });

    const relations = builder.modelClass().getRelations();
    const relNames = Object.keys(relations);

    for (let i = 0, l = relNames.length; i < l; ++i) {
      const relName = relNames[i];
      const relation = relations[relName];

      let childExpression = this.expression.childExpression(relation.name);

      if (childExpression) {
        promises.push(this._fetchRelation(builder, models, relation, childExpression));
      }
    }

    return Promise.all(promises).return(result);
  }

  _fetchRelation(builder, models, relation, childExpression) {
    const queryBuilder = relation.ownerModelClass.RelatedQueryBuilder
      .forClass(relation.relatedModelClass)
      .childQueryOf(builder)
      .eager(childExpression);

    queryBuilder.callQueryBuilderOperation(relation.find(queryBuilder, models), []);

    for (let i = 0, l = childExpression.args.length; i < l; ++i) {
      const filterName = childExpression.args[i];
      const filter = childExpression.filters[filterName];

      if (typeof filter !== 'function') {
        throw new ValidationError({eager: 'could not find filter "' + filterName + '" for relation "' + relation.name + '"'});
      }

      filter(queryBuilder);
    }

    return queryBuilder;
  }
}