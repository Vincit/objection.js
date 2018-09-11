const QueryBuilderOperation = require('../QueryBuilderOperation');

class EagerOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.modifiers = null;
  }

  onAdd(builder, args) {
    this.expression = args[0];
    this.modifiers = args[1];
    return true;
  }
}

module.exports = EagerOperation;
