import _ from 'lodash';
import QueryBuilderBase from './QueryBuilderBase';

export default class InsertionOrUpdate {

  constructor({ModelClass, modelsOrObjects, modelOptions}) {
    this._modelClass = ModelClass;
    this._arrayInput = false;
    this._models = null;
    this.setData(modelsOrObjects, modelOptions);
  }

  model() {
    return this._models[0];
  }

  models() {
    return this._models;
  }

  /**
   * @returns {boolean}
   */
  isArray() {
    return this._arrayInput;
  }

  /**
   * @param {(Object|Array.<Object>)} modelsOrObjects
   * @param {ModelOptions} modelOptions
   */
  setData(modelsOrObjects, modelOptions) {
    this._models = this._modelClass.ensureModelArray(modelsOrObjects, modelOptions);
    this._arrayInput = _.isArray(modelsOrObjects);
  }
}

