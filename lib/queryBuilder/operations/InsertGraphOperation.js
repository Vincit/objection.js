const DelegateOperation = require('./DelegateOperation');
const InsertOperation = require('./InsertOperation');

const insertFuncBuilder = require('../graphInserter/inserter');
const GraphInserter = require('../graphInserter/GraphInserter');

class InsertGraphOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }

    // Our delegate operation inherits from `InsertOperation`. Disable the call-time
    // validation. We do the validation in onAfter1 instead.
    this.delegate.modelOptions.skipValidation = true;

    this.insertOpt = opt.opt || {};
  }

  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    builder.resolve([]);

    return retVal;
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onBefore1() {
    // Do nothing.
  }

  onBefore2() {
    // Do nothing. We override this with empty implementation so that
    // the $beforeInsert() hooks are not called twice for the root models.
  }

  onBefore3() {
    // Do nothing.
  }

  onBuild() {
    // Do nothing.
  }

  onBuildKnex() {
    // Do nothing.
  }

  beforeGraphInserterCreated(builder) {
    // For subclasses to implement.
  }

  afterGraphInserterCreated(builder, graphInserter) {
    // For subclasses to implement.
  }

  // We overrode all other hooks but this one and do all the work in here.
  // This is a bit hacky.
  onAfter1(builder) {
    const modelClass = builder.modelClass();
    const insertFunc = insertFuncBuilder(builder);

    this.beforeGraphInserterCreated(builder);

    const graphInserter = new GraphInserter({
      modelClass: modelClass,
      models: this.models,
      allowedRelations: builder.allowedUpsertExpression(),
      queryContext: builder.context(),
      knex: builder.knex(),
      opt: this.insertOpt
    });

    graphInserter.buildDependencyGraph();

    this.afterGraphInserterCreated(builder, graphInserter);

    // Check for cyclic references only after calling the `afterCreated` hook.
    // The hook may modify the graph.
    graphInserter.checkForCyclicReferences();

    return graphInserter.execute(insertFunc).then(() => {
      return super.onAfter1(builder, this.models);
    });
  }

  onAfter2() {
    // We override this with empty implementation so that the $afterInsert() hooks
    // are not called twice for the root models.
    return this.isArray ? this.models : this.models[0] || null;
  }
}

module.exports = InsertGraphOperation;
