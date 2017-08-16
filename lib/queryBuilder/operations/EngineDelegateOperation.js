'use strict';

const DelegateOperation = require('./DelegateOperation');
const getDialect = require('../../utils/knexUtils').getDialect;

// Operation that delegates all calls to an operation designed
// for the database engine of the query.
class EngineDelegateOperation extends DelegateOperation {

  call(builder, args) {
    const dialect = getDialect(builder.knex());
    const operationDefs = this.opt;

    // Select the operation definition for the correct dialect. If there
    // is no definition for the correct dialect, use the `default`.
    let operationDef = operationDefs[dialect] || operationDefs.default;
    let Operation = null;
    let opt = null;

    // Operation definition can be either an Operation class or an
    // array that contains an Operation class and options object.
    if (Array.isArray(operationDef)) {
      Operation = operationDef[0];
      opt = operationDef[1];
    } else {
      Operation = operationDef;
    }

    // Overwrite `DelegateOperation` properties.
    this.delegate = new Operation(this.name, opt);
    this.isWriteOperation = this.delegate.isWriteOperation;

    return super.call(builder, args);
  }
}

module.exports = EngineDelegateOperation;