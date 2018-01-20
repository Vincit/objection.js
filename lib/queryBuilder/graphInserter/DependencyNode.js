class DependencyNode {
  constructor({ parentNode, model, modelClass, relation, dataPath }) {
    this.id = model[modelClass.uidProp];
    this.parentNode = parentNode || null;
    this.model = model;
    this.modelClass = modelClass;
    this.relation = relation || null;
    this.dataPath = dataPath;
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

  markAsInserted() {
    for (let nb = 0, lnb = this.isNeededBy.length; nb < lnb; ++nb) {
      const dependency = this.isNeededBy[nb];
      dependency.node.numHandledNeeds++;
    }

    this.handled = true;
  }
}

module.exports = DependencyNode;
