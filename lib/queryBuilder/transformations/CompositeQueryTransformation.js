'use strict';

const { QueryTransformation } = require('./QueryTransformation');

class CompositeQueryTransformation extends QueryTransformation {
  constructor(transformations) {
    super();
    this.transformations = transformations;
  }

  onConvertQueryBuilderBase(item, builder) {
    for (const transformation of this.transformations) {
      item = transformation.onConvertQueryBuilderBase(item, builder);
    }

    return item;
  }
}

module.exports = {
  CompositeQueryTransformation,
};
