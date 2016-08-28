import _ from 'lodash';
import Dependency from './Dependency';

export default class InterpolateValueDependency extends Dependency {

  constructor(node, path, refProp, match, inverse) {
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
     * @type {string}
     */
    this.match = match;

    /**
     * @type boolean
     */
    this.inverse = inverse;
  }

  resolve(model) {
    if (!this.inverse) {
      let value = _.get(model, this.path);
      value = value.replace(this.match, this.node.model[this.refProp]);
      _.set(model, this.path, value);
    } else {
      let value = _.get(this.node.model, this.path);
      value = value.replace(this.match, model[this.refProp]);
      _.set(this.node.model, this.path, value);
    }
  }
}