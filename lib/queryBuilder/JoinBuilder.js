'use strict';

const { QueryBuilderOperationSupport } = require('./QueryBuilderOperationSupport');
const { KnexOperation } = require('./operations/KnexOperation');

class JoinBuilder extends QueryBuilderOperationSupport {
  using(...args) {
    return this.addOperation(new KnexOperation('using'), args);
  }

  on(...args) {
    return this.addOperation(new KnexOperation('on'), args);
  }

  orOn(...args) {
    return this.addOperation(new KnexOperation('orOn'), args);
  }

  onBetween(...args) {
    return this.addOperation(new KnexOperation('onBetween'), args);
  }

  onNotBetween(...args) {
    return this.addOperation(new KnexOperation('onNotBetween'), args);
  }

  orOnBetween(...args) {
    return this.addOperation(new KnexOperation('orOnBetween'), args);
  }

  orOnNotBetween(...args) {
    return this.addOperation(new KnexOperation('orOnNotBetween'), args);
  }

  onIn(...args) {
    return this.addOperation(new KnexOperation('onIn'), args);
  }

  onNotIn(...args) {
    return this.addOperation(new KnexOperation('onNotIn'), args);
  }

  orOnIn(...args) {
    return this.addOperation(new KnexOperation('orOnIn'), args);
  }

  orOnNotIn(...args) {
    return this.addOperation(new KnexOperation('orOnNotIn'), args);
  }

  onNull(...args) {
    return this.addOperation(new KnexOperation('onNull'), args);
  }

  orOnNull(...args) {
    return this.addOperation(new KnexOperation('orOnNull'), args);
  }

  onNotNull(...args) {
    return this.addOperation(new KnexOperation('onNotNull'), args);
  }

  orOnNotNull(...args) {
    return this.addOperation(new KnexOperation('orOnNotNull'), args);
  }

  onExists(...args) {
    return this.addOperation(new KnexOperation('onExists'), args);
  }

  orOnExists(...args) {
    return this.addOperation(new KnexOperation('orOnExists'), args);
  }

  onNotExists(...args) {
    return this.addOperation(new KnexOperation('onNotExists'), args);
  }

  orOnNotExists(...args) {
    return this.addOperation(new KnexOperation('orOnNotExists'), args);
  }

  type(...args) {
    return this.addOperation(new KnexOperation('type'), args);
  }

  andOn(...args) {
    return this.addOperation(new KnexOperation('andOn'), args);
  }

  andOnIn(...args) {
    return this.addOperation(new KnexOperation('andOnIn'), args);
  }

  andOnNotIn(...args) {
    return this.addOperation(new KnexOperation('andOnNotIn'), args);
  }

  andOnNull(...args) {
    return this.addOperation(new KnexOperation('andOnNull'), args);
  }

  andOnNotNull(...args) {
    return this.addOperation(new KnexOperation('andOnNotNull'), args);
  }

  andOnExists(...args) {
    return this.addOperation(new KnexOperation('andOnExists'), args);
  }

  andOnNotExists(...args) {
    return this.addOperation(new KnexOperation('andOnNotExists'), args);
  }

  andOnBetween(...args) {
    return this.addOperation(new KnexOperation('andOnBetween'), args);
  }

  andOnNotBetween(...args) {
    return this.addOperation(new KnexOperation('andOnNotBetween'), args);
  }

  onVal(...args) {
    return this.addOperation(new KnexOperation('onVal'), args);
  }

  andOnVal(...args) {
    return this.addOperation(new KnexOperation('andOnVal'), args);
  }

  orOnVal(...args) {
    return this.addOperation(new KnexOperation('orOnVal'), args);
  }
}

module.exports = {
  JoinBuilder,
};
