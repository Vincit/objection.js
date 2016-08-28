import _ from 'lodash';
import Dependency from './Dependency';

export default class ReplaceValueDependency extends Dependency {

  constructor(node, path, refProp,inverse) {
    super(node);

    /**
     * @type {Array.<string>}
     */
    this.path = path.slice();

    /**
     * @type {string}
     */
    this.refProp = refProp;

    /**
     * @type boolean
     */
    this.inverse = inverse;
  }

  resolve(model) {
    if (!this.inverse) {
      _.set(model, this.path, this.node.model[this.refProp]);
    } else {
      _.set(this.node.model, this.path, model[this.refProp]);
    }
  }
}