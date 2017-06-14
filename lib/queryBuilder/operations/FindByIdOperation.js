'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class FindByIdOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.id = null;
  }

  call(builder, args){
    this.id = args[0];
    return super.call(builder, args);
  }

  onBuild(builder) {
    builder.whereComposite(builder.fullIdColumnFor(builder.modelClass()), this.id).first();
  }
}

module.exports = FindByIdOperation;