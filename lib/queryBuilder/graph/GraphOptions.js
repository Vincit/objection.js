'use strict';

const NO_RELATE = 'noRelate';
const NO_UNRELATE = 'noUnrelate';
const NO_INSERT = 'noInsert';
const NO_UPDATE = 'noUpdate';
const NO_DELETE = 'noDelete';

const UPDATE = 'update';
const RELATE = 'relate';
const UNRELATE = 'unrelate';
const INSERT_MISSING = 'insertMissing';
const FETCH_STRATEGY = 'fetchStrategy';

const FetchStrategy = {
  OnlyIdentifiers: 'OnlyIdentifiers',
  Everything: 'Everything',
  OnlyNeeded: 'OnlyNeeded'
};

class GraphOptions {
  constructor(options) {
    if (options instanceof GraphOptions) {
      this.options = options.options;
    } else {
      this.options = options;
    }
  }

  isFetchStrategy(strategy) {
    if (!FetchStrategy[strategy]) {
      throw new Error(`unknown strategy "${strategy}"`);
    }

    if (!this.options[FETCH_STRATEGY]) {
      return strategy === FetchStrategy.OnlyIdentifiers;
    } else {
      return this.options[FETCH_STRATEGY] === strategy;
    }
  }

  isInsertOnly() {
    // NO_RELATE is not in the list, since the `insert only` mode does
    // relate things that can be related using inserts.
    return [NO_DELETE, NO_UPDATE, NO_UNRELATE, INSERT_MISSING].every(opt => {
      return this.options[opt] === true;
    });
  }

  // Like `shouldRelate` but ignores settings that explicitly disable relate operations.
  shouldRelateIgnoreDisable(node, currentGraph) {
    if (node.isReference || node.isDbReference) {
      return true;
    }

    return (
      !getCurrentNode(node, currentGraph) &&
      this._hasOption(node, RELATE) &&
      !!node.parentEdge &&
      !!node.parentEdge.relation &&
      node.parentEdge.relation.hasRelateProp(node.obj)
    );
  }

  shouldRelate(node, currentGraph) {
    return !this._hasOption(node, NO_RELATE) && this.shouldRelateIgnoreDisable(node, currentGraph);
  }

  // Like `shouldInsert` but ignores settings that explicitly disable insert operations.
  shouldInsertIgnoreDisable(node, currentGraph) {
    return (
      !getCurrentNode(node, currentGraph) &&
      !this.shouldRelateIgnoreDisable(node, currentGraph) &&
      (!node.hadIdOriginally || this._hasOption(node, INSERT_MISSING))
    );
  }

  shouldInsert(node, currentGraph) {
    return !this._hasOption(node, NO_INSERT) && this.shouldInsertIgnoreDisable(node, currentGraph);
  }

  // Like `shouldPatch() || shouldUpdate()` but ignores settings that explicitly disable
  // update or patch operations.
  shouldPatchOrUpdateIgnoreDisable(node, currentGraph) {
    if (this.shouldRelate(node)) {
      // We should update all nodes that are going to be related. Note that
      // we don't actually update anything unless there is something to update
      // so this is just a preliminary test.
      return true;
    }

    return !!getCurrentNode(node, currentGraph);
  }

  shouldPatch(node, currentGraph) {
    return (
      this.shouldPatchOrUpdateIgnoreDisable(node, currentGraph) &&
      !this._hasOption(node, NO_UPDATE) &&
      !this._hasOption(node, UPDATE)
    );
  }

  shouldUpdate(node, currentGraph) {
    return (
      this.shouldPatchOrUpdateIgnoreDisable(node, currentGraph) &&
      !this._hasOption(node, NO_UPDATE) &&
      this._hasOption(node, UPDATE)
    );
  }

  // Like `shouldUnrelate` but ignores settings that explicitly disable unrelate operations.
  shouldUnrelateIgnoreDisable(currentNode) {
    return this._hasOption(currentNode, UNRELATE);
  }

  shouldUnrelate(currentNode, graph) {
    return (
      !getNode(currentNode, graph) &&
      !this._hasOption(currentNode, NO_UNRELATE) &&
      this.shouldUnrelateIgnoreDisable(currentNode)
    );
  }

  shouldDelete(currentNode, graph) {
    return (
      !getNode(currentNode, graph) &&
      !this._hasOption(currentNode, NO_DELETE) &&
      !this.shouldUnrelateIgnoreDisable(currentNode)
    );
  }

  shouldInsertOrRelate(node, currentGraph) {
    return this.shouldInsert(node, currentGraph) || this.shouldRelate(node, currentGraph);
  }

  shouldDeleteOrUnrelate(currentNode, graph) {
    return this.shouldDelete(currentNode, graph) || this.shouldUnrelate(currentNode, graph);
  }

  rebasedOptions(newRoot) {
    const newOpt = {};
    const newRootRelationPath = newRoot.relationPathKey;

    for (const name of Object.keys(this.options)) {
      const value = this.options[name];

      if (Array.isArray(value)) {
        newOpt[name] = value
          .filter(it => it.startsWith(newRootRelationPath))
          .map(it => it.slice(newRootRelationPath.length + 1))
          .filter(it => !!it);
      } else {
        newOpt[name] = value;
      }
    }

    return new GraphOptions(newOpt);
  }

  _hasOption(node, optionName) {
    const option = this.options[optionName];

    if (Array.isArray(option)) {
      return option.indexOf(node.relationPathKey) !== -1;
    } else if (typeof option === 'boolean') {
      return option;
    } else if (option === undefined) {
      return false;
    } else {
      throw new Error(
        `expected ${optionName} option value "${option}" to be an instance of boolean or array of strings`
      );
    }
  }
}

function getCurrentNode(node, currentGraph) {
  if (!currentGraph || !node) {
    return null;
  }

  return currentGraph.nodeForNode(node);
}

function getNode(currentNode, graph) {
  if (!graph || !currentNode) {
    return null;
  }

  return graph.nodeForNode(currentNode);
}

module.exports = {
  GraphOptions,
  FetchStrategy
};
