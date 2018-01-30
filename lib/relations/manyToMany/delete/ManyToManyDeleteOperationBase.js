const DeleteOperation = require('../../../queryBuilder/operations/DeleteOperation');

class ManyToManyDeleteOperationBase extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }
}

module.exports = ManyToManyDeleteOperationBase;
