'use strict';

const chunk = require('lodash/chunk');
const flatten = require('lodash/flatten');
const Promise = require('bluebird');
const EagerOperation = require('./EagerOperation');
const isMsSql = require('../../../utils/knexUtils').isMsSql;

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

  clone(props) {
    const copy = super.clone(props);

    copy.relationsToFetch = this.relationsToFetch.slice();
    copy.omitProps = this.omitProps.slice();

    return copy;
  }

  call(builder, args) {
    const ret = super.call(builder, args);

    const modelClass = builder.modelClass();
    const relations = modelClass.getRelationArray();

    for (let i = 0, l = relations.length; i < l; ++i) {
      const relation = relations[i];
      const childExpression = this.expression.childExpression(relation.name);

      if (childExpression) {
        this.relationsToFetch.push({
          relation,
          childExpression
        });
      }
    }

    return ret;
  }

  onBeforeBuild(builder) {
    const addedSelects = {};

    // Collect columns that need to be selected for the eager fetch
    // to work that are not currently selected.
    for (let i = 0, l = this.relationsToFetch.length; i < l; ++i) {
      const relation = this.relationsToFetch[i].relation;
      const cols = relation.fullOwnerCol(builder);

      for (let c = 0, lc = cols.length; c < lc; ++c) {
        const col = cols[c];

        if (!builder.hasSelectionAs(col, relation.ownerCol[c]) && !addedSelects[col]) {
          this.omitProps.push(relation.ownerProp[c]);
          addedSelects[col] = true;
        }
      }
    }

    // This needs to be `var` instead of `let` or `const` to prevent
    // bailout because of "Unsupported phi use of const or let variable".
    var cols = Object.keys(addedSelects);

    if (cols.length) {
      builder.select(cols);
    }
  }

  onAfterInternal(builder, result) {
    const modelClass = builder.modelClass();
    const promises = [];

    if (!result) {
      return result;
    }

    // This needs to be `var` instead of `let` or `const` to prevent
    // bailout because of "Unsupported phi use of const or let variable".
    var models = Array.isArray(result) ? result : [result];

    if (!models.length || !(models[0] instanceof modelClass)) {
      return result;
    }

    this.expression.forEachChild(child => {
      let relation = modelClass.getRelations()[child.name];

      if (!relation) {
        throw modelClass.createValidationError({eager: `unknown relation "${child.name}" in an eager expression`});
      }
    });

    for (let i = 0, l = this.relationsToFetch.length; i < l; ++i) {
      const relation = this.relationsToFetch[i].relation;
      const childExpression = this.relationsToFetch[i].childExpression;
      const relationFetchPromise = this.fetchRelation(builder, models, relation, childExpression);

      promises.push(relationFetchPromise);
    }

    return Promise.all(promises).then(() => {
      if (!this.omitProps.length) {
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
    })
  }

  fetchRelation(builder, models, relation, childExpression) {
    const batchSize = this.batchSize(builder.knex());
    const modelBatches = chunk(models, batchSize);

    return Promise
      .map(modelBatches, batch => this.fetchRelationBatch(builder, batch, relation, childExpression))
      .then(flatten);
  }

  fetchRelationBatch(builder, models, relation, childExpression) {
    const queryBuilder = this.createRelationQuery(builder, models, relation, childExpression);
    const findOperation = relation.find(queryBuilder, models);
    const modelNamedFilters = relation.relatedModelClass.namedFilters || {};

    findOperation.alwaysReturnArray = true;
    queryBuilder.callQueryBuilderOperation(findOperation, []);

    for (let i = 0, l = childExpression.args.length; i < l; ++i) {
      const filterName = childExpression.args[i];
      const filter = childExpression.filters[filterName] || modelNamedFilters[filterName];

      if (typeof filter !== 'function') {
        const modelClass = builder.modelClass();
        throw modelClass.createValidationError({eager: `could not find filter "${filterName}" for relation "${relation.name}"`});
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
      .eagerOptions(this.opt)
      .eager(childExpression);
  }
}

module.exports = WhereInEagerOperation;