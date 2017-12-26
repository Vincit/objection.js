const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');
const KnexOperation = require('./operations/KnexOperation');

class JoinBuilder extends QueryBuilderOperationSupport {
  using() {
    return this.addOperation(new KnexOperation('using'), arguments);
  }

  on() {
    return this.addOperation(new KnexOperation('on'), arguments);
  }

  orOn() {
    return this.addOperation(new KnexOperation('orOn'), arguments);
  }

  onBetween() {
    return this.addOperation(new KnexOperation('onBetween'), arguments);
  }

  onNotBetween() {
    return this.addOperation(new KnexOperation('onNotBetween'), arguments);
  }

  orOnBetween() {
    return this.addOperation(new KnexOperation('orOnBetween'), arguments);
  }

  orOnNotBetween() {
    return this.addOperation(new KnexOperation('orOnNotBetween'), arguments);
  }

  onIn() {
    return this.addOperation(new KnexOperation('onIn'), arguments);
  }

  onNotIn() {
    return this.addOperation(new KnexOperation('onNotIn'), arguments);
  }

  orOnIn() {
    return this.addOperation(new KnexOperation('orOnIn'), arguments);
  }

  orOnNotIn() {
    return this.addOperation(new KnexOperation('orOnNotIn'), arguments);
  }

  onNull() {
    return this.addOperation(new KnexOperation('onNull'), arguments);
  }

  orOnNull() {
    return this.addOperation(new KnexOperation('orOnNull'), arguments);
  }

  onNotNull() {
    return this.addOperation(new KnexOperation('onNotNull'), arguments);
  }

  orOnNotNull() {
    return this.addOperation(new KnexOperation('orOnNotNull'), arguments);
  }

  onExists() {
    return this.addOperation(new KnexOperation('onExists'), arguments);
  }

  orOnExists() {
    return this.addOperation(new KnexOperation('orOnExists'), arguments);
  }

  onNotExists() {
    return this.addOperation(new KnexOperation('onNotExists'), arguments);
  }

  orOnNotExists() {
    return this.addOperation(new KnexOperation('orOnNotExists'), arguments);
  }

  type() {
    return this.addOperation(new KnexOperation('type'), arguments);
  }

  andOn() {
    return this.addOperation(new KnexOperation('andOn'), arguments);
  }

  andOnIn() {
    return this.addOperation(new KnexOperation('andOnIn'), arguments);
  }

  andOnNotIn() {
    return this.addOperation(new KnexOperation('andOnNotIn'), arguments);
  }

  andOnNull() {
    return this.addOperation(new KnexOperation('andOnNull'), arguments);
  }

  andOnNotNull() {
    return this.addOperation(new KnexOperation('andOnNotNull'), arguments);
  }

  andOnExists() {
    return this.addOperation(new KnexOperation('andOnExists'), arguments);
  }

  andOnNotExists() {
    return this.addOperation(new KnexOperation('andOnNotExists'), arguments);
  }

  andOnBetween() {
    return this.addOperation(new KnexOperation('andOnBetween'), arguments);
  }

  andOnNotBetween() {
    return this.addOperation(new KnexOperation('andOnNotBetween'), arguments);
  }
}

module.exports = JoinBuilder;
