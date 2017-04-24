'use strict';

const _ = require('lodash');
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

module.exports = InterpolateValueDependency;