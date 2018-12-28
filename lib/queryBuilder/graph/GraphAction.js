const { isPostgres } = require('../../utils/knexUtils');
const { asArray } = require('../../utils/objectUtils');

const POSTGRES_MAX_INSERT_BATCH_SIZE = 100;
const MAX_CONCURRENCY = 100;

class GraphAction {
  static get ReturningAllSelector() {
    return op => {
      // Only select `returning('*')` operation.
      return op.name === 'returning' && op.args.includes('*');
    };
  }

  run(builder) {
    return null;
  }

  _getConcurrency(builder, nodes) {
    return nodes.reduce((minConcurrency, node) => {
      return Math.min(minConcurrency, node.modelClass.getConcurrency(builder.unsafeKnex()));
    }, MAX_CONCURRENCY);
  }

  _getBatchSize(builder) {
    return isPostgres(builder.unsafeKnex()) ? POSTGRES_MAX_INSERT_BATCH_SIZE : 1;
  }

  _resolveReferences(node) {
    if (node.isDbReference) {
      this._resolveDbReference(node);
    }

    if (node.isReference) {
      this._resolveReference(node);
    }
  }

  _resolveDbReference(node) {
    const dbRef = asArray(node.dbReference);
    const { relatedProp } = node.parentEdge.relation;

    for (let i = 0, l = relatedProp.size; i < l; ++i) {
      relatedProp.setProp(node.obj, i, dbRef[i]);
    }
  }

  _resolveReference(node) {
    const refNode = node.referencedNode;

    for (const prop of Object.keys(refNode.obj)) {
      if (!node.obj.hasOwnProperty(prop)) {
        node.obj[prop] = refNode.obj[prop];
      }
    }
  }
}

module.exports = {
  GraphAction
};
