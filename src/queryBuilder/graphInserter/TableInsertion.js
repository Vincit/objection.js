export default class TableInsertion {

  constructor(modelClass, isJoinTableInsertion) {
    /**
     * @type {Constructor.<Model>}
     */
    this.modelClass = modelClass;

    /**
     * @type {boolean}
     */
    this.isJoinTableInsertion = isJoinTableInsertion;

    /**
     * @type {Array.<Model>}
     */
    this.models = [];

    /**
     * @type {Array.<Boolean>}
     */
    this.isInputModel = [];
  }
}