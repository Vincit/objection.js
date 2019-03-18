'use strict';

const promiseUtils = require('../../../utils/promiseUtils');

const { EagerOperation } = require('./EagerOperation');
const { isMsSql } = require('../../../utils/knexUtils');
const { asArray, flatten, chunk } = require('../../../utils/objectUtils');
const { ValidationErrorType } = require('../../../model/ValidationError');
const { createModifier } = require('../../../utils/createModifier');
const { RelationDoesNotExistError } = require('../../../model/RelationDoesNotExistError');

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

  onBuild(builder) {
    const relationsToFetch = findRelationsToFetch(builder, this.finalExpression);
    const { selectionsToAdd, selectedProps } = findRelationPropsToSelect(builder, relationsToFetch);

    if (selectionsToAdd.length) {
      builder.select(selectionsToAdd);
    }

    this.relationsToFetch = relationsToFetch;
    this.omitProps = selectedProps;
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

    const promise = promiseUtils.map(
      this.relationsToFetch,
      it => this.fetchRelation(builder, models, it.relation, it.childExpression),
      { concurrency: modelClass.getConcurrency(builder.unsafeKnex()) }
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

    return promiseUtils
      .map(modelBatches, batch => this.fetchRelationBatch(builder, batch, relation, expr), {
        concurrency: modelClass.getConcurrency(builder.unsafeKnex())
      })
      .then(flatten);
  }

  fetchRelationBatch(builder, models, relation, expr) {
    const queryBuilder = this.createRelationQuery(builder, relation, expr);
    const findOperation = relation.find(queryBuilder, models);

    findOperation.alwaysReturnArray = true;
    findOperation.assignResultToOwner = true;
    findOperation.relationProperty = expr.node.$name;

    queryBuilder.addOperation(findOperation, []);

    for (const modifierName of expr.node.$modify) {
      const modifier = createModifier({
        modifier: modifierName,
        modelClass: relation.relatedModelClass,
        modifiers: this.finalModifiers
      });

      try {
        modifier(queryBuilder);
      } catch (err) {
        const modelClass = builder.modelClass();

        if (err instanceof modelClass.ModifierNotFoundError) {
          throw modelClass.createValidationError({
            type: ValidationErrorType.RelationExpression,
            message: `could not find modifier "${modifierName}" for relation "${relation.name}"`
          });
        } else {
          throw err;
        }
      }
    }

    return queryBuilder;
  }

  createRelationQuery(builder, relation, childExpression) {
    return relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .eagerOptions(this.eagerOptions)
      .eager(childExpression, this.finalModifiers);
  }

  clone() {
    const clone = super.clone();

    clone.relationsToFetch = this.relationsToFetch.slice();
    clone.omitProps = this.omitProps.slice();

    return clone;
  }
}

function findRelationsToFetch(builder, eagerExpression) {
  const relationsToFetch = [];
  const modelClass = builder.modelClass();

  try {
    eagerExpression.forEachChildExpression(modelClass, (childExpression, relation) => {
      relationsToFetch.push({
        childExpression,
        relation
      });
    });
  } catch (err) {
    if (err instanceof RelationDoesNotExistError) {
      throw modelClass.createValidationError({
        type: ValidationErrorType.RelationExpression,
        message: `unknown relation "${err.relationName}" in an eager expression`
      });
    }
    throw err;
  }

  return relationsToFetch;
}

function findRelationPropsToSelect(builder, relationsToFetch) {
  const selectionsToAdd = [];
  const selectedProps = [];

  // Collect columns that need to be selected for the eager fetch
  // to work that are not currently selected.
  for (const { relation } of relationsToFetch) {
    const ownerProp = relation.ownerProp;

    for (let c = 0, lc = ownerProp.size; c < lc; ++c) {
      const fullCol = ownerProp.ref(builder, c).fullColumn(builder);
      const prop = ownerProp.props[c];
      const col = ownerProp.cols[c];

      if (!builder.hasSelectionAs(fullCol, col) && selectionsToAdd.indexOf(fullCol) === -1) {
        selectedProps.push(prop);
        selectionsToAdd.push(fullCol);
      }
    }
  }

  return {
    selectionsToAdd,
    selectedProps
  };
}

module.exports = {
  WhereInEagerOperation
};
