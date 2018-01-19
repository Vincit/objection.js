const QueryBuilderOperation = require('./QueryBuilderOperation');

class UnrelateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }
}

module.exports = UnrelateOperation;
