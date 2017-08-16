'use strict';

const keyBy = require('lodash/keyBy');
const Promise = require('bluebird');
const UpsertNode = require('../graphUpserter/UpsertNode');
const UpsertGraph = require('../graphUpserter/UpsertGraph');
const InsertGraphOperation = require('./InsertGraphOperation');

class UpsertGraphOperation extends InsertGraphOperation {

  constructor(name, opt) {
    super(name, opt);

    this.graph = null;
    this.opt = opt.opt || {};
  }

  onBefore1(builder) {
    this.graph = new UpsertGraph(this.models, this.queryProps, this.opt);

    return this.graph
      .build(builder)
      .then(() => this.delete(builder))
  }

  // This operation inherits from InsertGraphOperation because we use it to perform
  // all the inserts. When the graph inserter instance is created, this method gets called
  // We need to modify the insert graph so that existing models won't get inserted again.
  onGraphInserterCreated(builder, graphInserter) {
    const nodes = graphInserter.graph.nodes;

    // Go through all insert graph nodes and mark the ones that have an id as
    // handled so that they are not inserted again.
    for (let i = 0, l = nodes.length; i < l; ++i) {
      const node = nodes[i];

      if (node.model.$hasId()) {
        // Resolve the nodes that depend on the node's model.
        for (let d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
          node.isNeededBy[d].resolve(node.model);
        }

        if (node.parentNode) {
          const parent = node.parentNode;
          // If this node is in a many-to-many relation we also need to remove it from
          // its parent's manyToManyConnections so that the join row is not inserted.
          parent.manyToManyConnections = parent.manyToManyConnections.filter(conn => conn.node !== node); 
        }

        node.markAsHandled();
      }
    }
  }

  onAfter2(builder, result) {
    return this
      .update(builder)
      .then(() => super.onAfter2(builder, result));
  }

  delete(builder) {
    return Promise.map(this.graph.nodes, node => {
      const relNames = Object.keys(node.relations);

      return Promise.map(relNames, relName => {
        const relation = node.modelClass.getRelation(relName);
        const deleteIds = node.relations[relName]
          .filter(it => it.type === UpsertNode.Type.Delete)
          .map(it => it.currentModel.$id());

        if (deleteIds.length) {
          const query = node.upsertModel
            .$relatedQuery(relName)
            .childQueryOf(builder)

          if (!relation.isOneToOne()) {
            query.whereInComposite(builder.fullIdColumnFor(relation.relatedModelClass), deleteIds);
          }

          if (this.opt.unrelate) {
            query.unrelate();
          } else {
            query.delete();
          }

          return query;
        }
      }, {concurrency: 1});
    }, {concurrency: 4})
  }

  update(builder) {
    const queryProps = this.queryProps;
    const updateNodes = this.graph.nodes.filter(it => it.type === UpsertNode.Type.Update);

    return Promise.map(updateNodes, node => {
      let query = null;

      // The models were created by the parent class `InsertGraphOperation` with a
      // skipValidation flag. We need to explicitly call $validate here.
      node.upsertModel.$validate(node.upsertModel, {patch: true});

      if (node.parentNode) {
        // Call patch through parent's $relatedQuery to make things like many-to-many
        // extra property updates to work.
        query = node
          .parentNode
          .upsertModel
          .$relatedQuery(node.relationName)
          .childQueryOf(builder, true)
          .findById(node.upsertModel.$id())
          .internalOptions({queryProps})
          .patch(node.upsertModel);
      } else {
        query = node.upsertModel
          .$query()
          .childQueryOf(builder, true)
          .internalOptions({queryProps})
          .patch();
      }

      return query;
    }, {concurrency: 4})
  }
}

module.exports = UpsertGraphOperation;
