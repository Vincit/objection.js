'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy, chunk } = require('../../../utils/objectUtils');
const promiseUtils = require('../../../utils/promiseUtils');

class JoinRowGraphInsertAction extends GraphAction {
  constructor(graphData, { nodes }) {
    super(graphData);
    this.nodes = nodes;
  }

  run(builder) {
    const batches = this._createInsertBatches(builder);
    const concurrency = this._getConcurrency(builder, this.nodes);

    return promiseUtils.map(batches, (batch) => this._insertBatch(builder, batch), { concurrency });
  }

  _createInsertBatches(builder) {
    const batches = [];
    const batchSize = this._getBatchSize(builder);
    const nodesByModel = groupBy(this.nodes, (node) => getJoinTableModel(builder, node));

    for (const [joinTableModelClass, nodes] of nodesByModel.entries()) {
      for (const nodeBatch of chunk(nodes, batchSize)) {
        batches.push(this._createBatch(joinTableModelClass, nodeBatch));
      }
    }

    return batches;
  }

  _createBatch(joinTableModelClass, nodes) {
    return nodes
      .filter((node) => {
        return this.graphOptions.shouldRelate(node, this.graphData) || node.userData.inserted;
      })
      .map((node) => ({
        node,
        joinTableModelClass,
        joinTableObj: this._createJoinTableObj(joinTableModelClass, node),
      }));
  }

  _createJoinTableObj(joinTableModelClass, node) {
    const { parentEdge, parentNode } = node;
    const { relation } = parentEdge;

    this._resolveReferences(node);

    return joinTableModelClass.fromJson(
      relation.createJoinModel(relation.ownerProp.getProps(parentNode.obj), node.obj)
    );
  }

  _insertBatch(parentBuilder, batch) {
    return this._beforeInsert(parentBuilder, batch).then(() => this._insert(parentBuilder, batch));
  }

  _beforeInsert(parentBuilder, batch) {
    return Promise.all(
      batch.map(({ node, joinTableObj }) => {
        if (node.parentEdge) {
          return node.parentEdge.relation.joinTableBeforeInsert(
            joinTableObj,
            parentBuilder.context()
          );
        } else {
          return null;
        }
      })
    );
  }

  _insert(parentBuilder, batch) {
    if (batch.length > 0) {
      return batch[0].joinTableModelClass
        .query()
        .childQueryOf(parentBuilder)
        .insert(batch.map((it) => it.joinTableObj));
    }
  }
}

function getJoinTableModel(builder, node) {
  return node.parentEdge.relation.getJoinModelClass(builder.unsafeKnex());
}

module.exports = {
  JoinRowGraphInsertAction,
};
