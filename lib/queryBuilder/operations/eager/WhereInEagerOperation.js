const Promise = require('bluebird');
const EagerOperation = require('./EagerOperation');

const { isMsSql } = require('../../../utils/knexUtils');
const { asArray, flatten, chunk } = require('../../../utils/objectUtils');
const { Type: ValidationErrorType } = require('../../../model/ValidationError');

class WhereInEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relationsToFetch = [];
    this.omitProps = [];
  }

  batchSize(knex) {
    if (isMsSql(knex)) {
      // On MSSQL the parameter limit is actually 2100, but since I couldn't figure out
      // if the limit is for all parameters in a query or for individual clauses, we set
      // the limit to 2000 to leave 100 parameters for where clauses etc.
      return 2000;
    } else {
      // I'm sure there is some kind of limit for other databases too, but let's lower
      // this if someone ever hits those limits.
      return 10000;
    }
  }

  onAdd(builder, args) {
    const ret = super.onAdd(builder, args);

    const modelClass = builder.modelClass();
    const relations = modelClass.getRelations();

    this.expression.forEachChildExpression(relations, (childExpression, relation) => {
      if (!relation) {
        throw modelClass.createValidationError({
          type: ValidationErrorType.RelationExpression,
          message: `unknown relation "${childExpression.$relation}" in an eager expression`
        });
      }

      this.relationsToFetch.push({
        childExpression,
        relation
      });
    });

    return ret;
  }

  onBuild(builder) {
    const addedSelects = [];

    // Collect columns that need to be selected for the eager fetch
    // to work that are not currently selected.
    for (let i = 0, l = this.relationsToFetch.length; i < l; ++i) {
      const relation = this.relationsToFetch[i].relation;
      const ownerProp = relation.ownerProp;

      for (let c = 0, lc = ownerProp.size; c < lc; ++c) {
        const fullCol = ownerProp.fullCol(builder, c);
        const prop = ownerProp.props[c];
        const col = ownerProp.cols[c];

        if (!builder.hasSelectionAs(fullCol, col) && addedSelects.indexOf(fullCol) === -1) {
          this.omitProps.push(prop);
          addedSelects.push(fullCol);
        }
      }
    }

    if (addedSelects.length) {
      builder.select(addedSelects);
    }
  }

  onAfter2(builder, result) {
    const modelClass = builder.resultModelClass();

    if (!result) {
      return result;
    }

    const models = asArray(result);

    if (!models.length || !(models[0] instanceof modelClass)) {
      return result;
    }

    const promise = Promise.map(
      this.relationsToFetch,
      it => this.fetchRelation(builder, models, it.relation, it.childExpression),
      { concurrency: modelClass.concurrency }
    );

    return promise.then(() => {
      const intOpt = builder.internalOptions();

      if (!this.omitProps.length || intOpt.keepImplicitJoinProps) {
        return result;
      }

      // Now that relations have been fetched for `models` we can omit the
      // columns that were implicitly selected by this class.
      for (let i = 0, l = result.length; i < l; ++i) {
        const model = result[i];

        for (let c = 0, lc = this.omitProps.length; c < lc; ++c) {
          modelClass.omitImpl(model, this.omitProps[c]);
        }
      }

      return result;
    });
  }

  fetchRelation(builder, models, relation, expr) {
    const modelClass = builder.resultModelClass();
    const batchSize = this.batchSize(builder.knex());
    const modelBatches = chunk(models, batchSize);

    return Promise.map(
      modelBatches,
      batch => this.fetchRelationBatch(builder, batch, relation, expr),
      { concurrency: modelClass.concurrency }
    ).then(flatten);
  }

  fetchRelationBatch(builder, models, relation, expr) {
    const queryBuilder = this.createRelationQuery(builder, models, relation, expr);
    const findOperation = relation.find(queryBuilder, models);
    const modelNamedFilters = relation.relatedModelClass.namedFilters || {};

    findOperation.alwaysReturnArray = true;
    findOperation.assignResultToOwner = true;
    findOperation.relationProperty = expr.$name;

    queryBuilder.addOperation(findOperation, []);

    for (let i = 0, l = expr.$modify.length; i < l; ++i) {
      const filterName = expr.$modify[i];
      const filter = this.filters[filterName] || modelNamedFilters[filterName];

      if (typeof filter !== 'function') {
        const modelClass = builder.modelClass();

        throw modelClass.createValidationError({
          type: ValidationErrorType.RelationExpression,
          message: `could not find filter "${filterName}" for relation "${relation.name}"`
        });
      }

      filter(queryBuilder);
    }

    return queryBuilder;
  }

  createRelationQuery(builder, models, relation, childExpression) {
    return relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .eagerOperationFactory(builder.eagerOperationFactory())
      .eagerOptions(builder.eagerOptions())
      .eager(childExpression, this.filters);
  }
}

module.exports = WhereInEagerOperation;
