'use strict';

class Dependency {

  constructor(node) {
    /**
     * @type {DependencyNode}
     */
    this.node = node;
  }

  resolve(model) {
    throw new Error('not implemented');
  }
}

module.exports = Dependency;