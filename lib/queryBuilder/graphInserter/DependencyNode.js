'use strict';

class DependencyNode {

  constructor(parentNode, model, modelClass) {
    this.id = model[modelClass.uidProp];
    this.parentNode = parentNode;
    this.model = model;
    this.modelClass = modelClass;
    this.needs = [];
    this.isNeededBy = [];
    this.manyToManyConnections = [];

    this.numHandledNeeds = 0;
    this.handled = false;
    this.visited = false;
    this.recursion = false;
  }

  get hasUnresolvedDependencies() {
    return this.numHandledNeeds < this.needs.length;
  }

  markAsHandled() {
    for (let nb = 0, lnb = this.isNeededBy.length; nb < lnb; ++nb) {
      const dependency = this.isNeededBy[nb];
      dependency.node.numHandledNeeds++;
    }

    this.handled = true;
  }
}

module.exports = DependencyNode;