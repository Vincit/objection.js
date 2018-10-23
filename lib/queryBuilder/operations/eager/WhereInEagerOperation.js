const promiseUtils = require('../../../utils/promiseUtils');
const EagerOperation = require('./EagerOperation');

const { isMsSql } = require('../../../utils/knexUtils');
const { asArray, flatten, chunk } = require('../../../utils/objectUtils');
const { Type: ValidationErrorType } = require('../../../model/ValidationError');
const { createModifier } = require('../../../utils/createModifier');

const RelationDoesNotExistError = require('../../../model/RelationDoesNotExistError');

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

    try {
      this.expression.forEachChildExpression(relations, (childExpression, relation) => {
        this.relationsToFetch.push({
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
    findOperation.relationProperty = expr.$name;

    queryBuilder.addOperation(findOperation, []);

    for (let i = 0, l = expr.$modify.length; i < l; ++i) {
      const modifierName = expr.$modify[i];
      const modifier = createModifier({
        modifier: modifierName,
        modelClass: relation.relatedModelClass,
        modifiers: this.modifiers
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
      .eagerOperationFactory(builder.eagerOperationFactory())
      .eagerOptions(builder.eagerOptions())
      .eager(childExpression, this.modifiers);
  }
}

module.exports = WhereInEagerOperation;
