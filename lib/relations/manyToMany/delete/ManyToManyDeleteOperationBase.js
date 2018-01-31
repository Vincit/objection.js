const DeleteOperation = require('../../../queryBuilder/operations/DeleteOperation');

class ManyToManyDeleteOperationBase extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  /* istanbul ignore next */
  applyModifyFilterForRelatedTable(builder) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  applyModifyFilterForJoinTable(builder) {
    throw new Error('not implemented');
  }
}

module.exports = ManyToManyDeleteOperationBase;
