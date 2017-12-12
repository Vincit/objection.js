'use strict';

const clone = require('lodash/clone');
const QueryBuilderOperation = require('../QueryBuilderOperation');

class EagerOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.filters = null;
  }

  onAdd(builder, args) {
    this.expression = args[0].clone();
    this.filters = args[1];

    for (let i = 0, l = this.filters.length; i < l; ++i) {
      const filter = this.filters[i];
      this.expression.addAnonymousFilterAtPath(filter.path, filter.filter);
    }

    return true;
  }
}

module.exports = EagerOperation;
