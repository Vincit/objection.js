'use strict';

const promiseUtils = require('../../../utils/promiseUtils');

const { EagerOperation } = require('./EagerOperation');
const { LimitPerParentOperation } = require('../LimitPerParentOperation');
const { isMsSql, isOracle, isSqlite, hasWindowFunctions } = require('../../../utils/knexUtils');
const { isObject, asArray, flatten, chunk } = require('../../../utils/objectUtils');
const { ValidationErrorType } = require('../../../model/ValidationError');
const { createModifier } = require('../../../utils/createModifier');
const { RelationDoesNotExistError } = require('../../../model/RelationDoesNotExistError');
const { RelationOwner } = require('../../../relations/RelationOwner');

class WhereInEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relationsToFetch = [];
  }

  batchSize(knex) {
    if (this.graphOptions.maxBatchSize) {
      return this.graphOptions.maxBatchSize;
    } else if (isMsSql(knex)) {
      // On MSSQL the parameter limit is actually 2100, but since I couldn't figure out
      // if the limit is for all parameters in a query or for individual clauses, we set
      // the limit to 2000 to leave 100 parameters for where clauses etc.
      return 2000;
    } else if (isOracle(knex)) {
      return 1000;
    } else if (isSqlite(knex)) {
      // SQLITE_MAX_VARIABLE_NUMBER is 999 by default
      return 999;
    } else {
      // I'm sure there is some kind of limit for other databases too, but let's lower
      // this if someone ever hits those limits.
      return 10000;
    }
  }

  onBuild(builder) {
    const relationsToFetch = findRelationsToFetch(
      builder.modelClass(),
      this.buildFinalExpression(builder),
    );

    const { selectionsToAdd, selectedProps } = findRelationPropsToSelect(builder, relationsToFetch);

    if (selectionsToAdd.length) {
      builder.select(selectionsToAdd);
    }

    // Omit the implicitly selected columns from the result once the relations
    // have been fetched.
    if (!builder.internalOptions().keepImplicitJoinProps) {
      for (const prop of selectedProps) {
        builder.addInternalSelection(prop);
      }
    }

    this.relationsToFetch = relationsToFetch;
  }

  async onAfter2(builder, result) {
    const modelClass = builder.resultModelClass();

    if (!result) {
      return result;
    }

    const models = asArray(result);

    // Check models to be actual objects, to filter out `count` results (#2397).
    if (!models.length || !isObject(models[0])) {
      return result;
    }

    await promiseUtils.map(
      this.relationsToFetch,
      (it) => this.fetchRelation(builder, models, it.relation, it.childExpression),
      { concurrency: modelClass.getConcurrency(builder.unsafeKnex()) },
    );

    return result;
  }

  async fetchRelation(builder, models, relation, expr) {
    const modelClass = builder.resultModelClass();
    const batchSize = this.shouldFetchPerParent(builder, models, relation, expr)
      ? 1
      : this.batchSize(builder.knex());
    const modelBatches = chunk(models, batchSize);

    const result = await promiseUtils.map(
      modelBatches,
      (batch) => this.fetchRelationBatch(builder, batch, relation, expr),
      {
        concurrency: modelClass.getConcurrency(builder.unsafeKnex()),
      },
    );

    return flatten(result);
  }

  fetchRelationBatch(builder, models, relation, expr) {
    if (this.shouldSkipFetched(models, relation, expr)) {
      return this.createSkippedQuery(builder, models, relation, expr);
    }

    const queryBuilder = this.createRelationQuery(builder, relation, expr);
    const findOperation = relation.find(queryBuilder, RelationOwner.create(models));

    findOperation.alwaysReturnArray = true;
    findOperation.assignResultToOwner = true;
    findOperation.relationProperty = expr.node.$name;

    queryBuilder.addOperation(findOperation, []);

    for (const modifierName of expr.node.$modify) {
      const modifier = createModifier({
        modifier: modifierName,
        modelClass: relation.relatedModelClass,
        modifiers: this.buildFinalModifiers(builder),
      });

      try {
        modifier(queryBuilder);
      } catch (err) {
        const modelClass = builder.modelClass();

        if (err instanceof modelClass.ModifierNotFoundError) {
          throw modelClass.createValidationError({
            type: ValidationErrorType.RelationExpression,
            message: `could not find modifier "${modifierName}" for relation "${relation.name}"`,
          });
        } else {
          throw err;
        }
      }
    }

    if (this.graphOptions.limitPerParent) {
      queryBuilder.addOperation(
        new LimitPerParentOperation('limitPerParent', { findOperation }),
        [],
      );
    }

    return queryBuilder;
  }

  // Without window functions, the related models can only be limited per
  // parent with one query per parent.
  shouldFetchPerParent(builder, models, relation, expr) {
    if (this.graphOptions.limitPerParent && !hasWindowFunctions(builder.knex())) {
      // Build the query to find its limits, also those of the relation's
      // `modify` and of `onBuildKnex()` hooks. This runs its modifiers and
      // build hooks once more than for fetching the relation.
      const query = this.fetchRelationBatch(builder, models, relation, expr);
      query.executeOnBuild();
      const knexQuery = query.executeOnBuildKnex(query.knex().queryBuilder());
      return !!query.findOperation(LimitPerParentOperation)?.getRange(knexQuery, query);
    } else {
      return false;
    }
  }

  shouldSkipFetched(models, relation, expr) {
    if (!this.graphOptions.skipFetched) {
      return false;
    }

    if (models.some((it) => it[expr.node.$name] === undefined)) {
      return false;
    }

    const relationsToFetch = findRelationsToFetch(relation.relatedModelClass, expr);
    const childModels = getRelatedModels(models, expr);

    // We can only skip fetching a relation if all already fetched models
    // have all needed relation properties so that we can fetch the next
    // level of relations.
    for (const { relation } of relationsToFetch) {
      const { ownerProp } = relation;

      for (let c = 0, lc = ownerProp.size; c < lc; ++c) {
        const prop = ownerProp.props[c];

        for (const model of childModels) {
          if (model[prop] === undefined) {
            return false;
          }
        }
      }
    }

    return true;
  }

  createSkippedQuery(builder, models, relation, expr) {
    const childModels = getRelatedModels(models, expr);

    return relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .findOptions({ dontCallFindHooks: true })
      .withGraphFetched(expr, this.graphOptions)
      .resolve(childModels);
  }

  createRelationQuery(builder, relation, expr) {
    return relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .withGraphFetched(expr, this.graphOptions)
      .modifiers(this.buildFinalModifiers(builder));
  }

  clone() {
    const clone = super.clone();

    clone.relationsToFetch = this.relationsToFetch.slice();

    return clone;
  }
}

function findRelationsToFetch(modelClass, eagerExpression) {
  const relationsToFetch = [];

  try {
    eagerExpression.forEachChildExpression(modelClass, (childExpression, relation) => {
      relationsToFetch.push({
        childExpression,
        relation,
      });
    });
  } catch (err) {
    if (err instanceof RelationDoesNotExistError) {
      throw modelClass.createValidationError({
        type: ValidationErrorType.RelationExpression,
        message: `unknown relation "${err.relationName}" in an eager expression`,
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
    selectedProps,
  };
}

function getRelatedModels(models, expr) {
  const allRelated = [];

  for (const model of models) {
    const related = model[expr.node.$name];

    if (related) {
      if (Array.isArray(related)) {
        for (const rel of related) {
          allRelated.push(rel);
        }
      } else {
        allRelated.push(related);
      }
    }
  }

  return allRelated;
}

module.exports = {
  WhereInEagerOperation,
};
