'use strict';

class DependencyNode {

  constructor(model, modelClass) {
    this.id = model[modelClass.uidProp];
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

}

module.exports = DependencyNode;