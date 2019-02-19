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
  }

  get finalExpression() {
    const expression = this.expression.clone();

    this.modifiersAtPath.forEach((modifier, i) => {
      const modifierName = getModifierName(i);

      expression.expressionsAtPath(modifier.path).forEach(expr => {
        expr.node.$modify.push(modifierName);
      });
    });

    return expression;
  }

  get finalModifiers() {
    const modifiers = Object.assign({}, this.modifiers);

    this.modifiersAtPath.forEach((modifier, i) => {
      const modifierName = getModifierName(i);

      modifiers[modifierName] = modifier.modifier;
    });

    return modifiers;
  }

  cloneFrom(eagerOp) {
    this.expression = eagerOp.expression.clone();
    this.modifiers = Object.assign({}, eagerOp.modifiers);
    this.modifiersAtPath = eagerOp.modifiersAtPath.slice();
    this.allowedExpression = eagerOp.allowedExpression && eagerOp.allowedExpression.clone();
    this.eagerOptions = Object.assign({}, eagerOp.eagerOptions);
  }

  clone() {
    const clone = super.clone();
    clone.cloneFrom(this);
    return clone;
  }
}

function getModifierName(index) {
  return `_f${index}_`;
}

module.exports = {
  EagerOperation
};
