'use strict';

const { QueryBuilderOperation } = require('../QueryBuilderOperation');
const { RelationExpression } = require('../../RelationExpression');

class EagerOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.expression = RelationExpression.create();
    this.modifiers = {};
    this.modifiersAtPath = [];
    this.allowedExpression = null;
    this.eagerOptions = this.opt.defaultEagerOptions;

    this._finalExpression = null;
    this._finalModifiers = null;
  }

  get finalExpression() {
    if (!this._finalExpression) {
      this._finalExpression = this._buildFinalExpression();
    }

    return this._finalExpression;
  }

  get finalModifiers() {
    if (!this._finalModifiers) {
      this._finalModifiers = this._buildFinalModifiers();
    }

    return this._finalModifiers;
  }

  cloneFrom(eagerOp) {
    this.expression = eagerOp.expression.clone();
    this.modifiers = Object.assign({}, eagerOp.modifiers);
    this.modifiersAtPath = eagerOp.modifiersAtPath.slice();
    this.allowedExpression = eagerOp.allowedExpression && eagerOp.allowedExpression.clone();
    this.eagerOptions = Object.assign({}, eagerOp.eagerOptions);

    // No need to clone these. These are rebuilt each time this operation
    // is executed.
    this._finalExpression = eagerOp._finalExpression;
    this._finalModifiers = eagerOp._finalModifiers;
  }

  clone() {
    const clone = super.clone();
    clone.cloneFrom(this);
    return clone;
  }

  _buildFinalExpression() {
    if (this.modifiersAtPath.length === 0) {
      return this.expression;
    }

    const expression = this.expression.clone();

    this.modifiersAtPath.forEach((modifier, i) => {
      const modifierName = getModifierName(i);

      expression.expressionsAtPath(modifier.path).forEach(expr => {
        expr.node.$modify.push(modifierName);
      });
    });

    return expression;
  }

  _buildFinalModifiers() {
    if (this.modifiersAtPath.length === 0) {
      return this.modifiers;
    }

    const modifiers = Object.assign({}, this.modifiers);

    this.modifiersAtPath.forEach((modifier, i) => {
      modifiers[getModifierName(i)] = modifier.modifier;
    });

    return modifiers;
  }
}

function getModifierName(index) {
  return `_f${index}_`;
}

module.exports = {
  EagerOperation
};
