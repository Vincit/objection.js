'use strict';

const _ = require('lodash');
const Dependency = require('./Dependency');

class ReplaceValueDependency extends Dependency {

  constructor(node, path, refProp,inverse) {
    super(node);

    this.path = path.slice();
    this.refProp = refProp;
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

module.exports = ReplaceValueDependency;