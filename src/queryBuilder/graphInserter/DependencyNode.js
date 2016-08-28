export default class DependencyNode {

  constructor(model, modelClass) {
    this.id = model[model.constructor.uidProp];

    /**
     * @type {Model}
     */
    this.model = model;

    /**
     * @type {Constructor.<Model>}
     */
    this.modelClass = modelClass;

    /**
     * @type {Array.<Dependency>}
     */
    this.needs = [];

    /**
     * @type {Array.<Dependency>}
     */
    this.isNeededBy = [];

    /**
     * @type {Array.<ManyToManyConnection>}
     */
    this.manyToManyConnections = [];

    this.numHandledNeeds = 0;
    this.handled = false;
    this.visited = false;
    this.recursion = false;
  }

}