const { set } = require('../../utils/objectUtils');
const Dependency = require('./Dependency');

class ReplaceValueDependency extends Dependency {
  constructor(node, path, refProp, inverse) {
    super(node);

    this.path = path.slice();
    this.refProp = refProp;
    this.inverse = inverse;
  }

  resolve(model) {
    if (!this.inverse) {
      set(model, this.path, this.node.model[this.refProp]);
    } else {
      set(this.node.model, this.path, model[this.refProp]);
    }
  }
}

module.exports = ReplaceValueDependency;
