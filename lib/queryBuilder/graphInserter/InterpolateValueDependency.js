const { get, set } = require('../../utils/objectUtils');
const Dependency = require('./Dependency');

class InterpolateValueDependency extends Dependency {
  constructor(node, path, refProp, match, inverse) {
    super(node);

    this.path = path.slice();
    this.refProp = refProp;
    this.match = match;
    this.inverse = inverse;
  }

  resolve(model) {
    if (!this.inverse) {
      let value = get(model, this.path);
      value = value.replace(this.match, this.node.model[this.refProp]);
      set(model, this.path, value);
    } else {
      let value = get(this.node.model, this.path);
      value = value.replace(this.match, model[this.refProp]);
      set(this.node.model, this.path, value);
    }
  }
}

module.exports = InterpolateValueDependency;
