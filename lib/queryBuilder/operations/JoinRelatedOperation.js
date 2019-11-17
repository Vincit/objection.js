'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { RelationExpression } = require('../RelationExpression');
const { RelationJoiner } = require('../join/RelationJoiner');
const { isString } = require('../../utils/objectUtils');

class JoinRelatedOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.calls = [];
  }

  get joinOperation() {
    return this.opt.joinOperation;
  }

  addCall(call) {
    this.calls.push(call);
  }

  onBuild(builder) {
    const modelClass = builder.modelClass();
    const joinOperation = this.joinOperation;
    let mergedExpr = RelationExpression.create();

    for (const call of this.calls) {
      const expr = RelationExpression.create(call.expression).toPojo();
      const childNames = expr.$childNames;
      const options = call.options || {};

      if (childNames.length === 1) {
        applyAlias(expr, modelClass, builder, options);
      }

      if (options.aliases) {
        applyAliases(expr, modelClass, options);
      }

      mergedExpr = mergedExpr.merge(expr);
    }

    const joiner = new RelationJoiner({
      modelClass
    });

    joiner.setOptions({ joinOperation });
    joiner.setExpression(mergedExpr);
    joiner.setModifiers(builder.modifiers());
    joiner.build(builder, false);
  }

  clone() {
    const clone = super.clone();
    clone.calls = this.calls.slice();
    return clone;
  }
}

function applyAlias(expr, modelClass, builder, options) {
  const childNames = expr.$childNames;
  const childName = childNames[0];
  const childExpr = expr[childName];
  const relation = modelClass.getRelation(childExpr.$relation);

  let alias = childName;

  if (options.alias === false) {
    alias = builder.tableRefFor(relation.relatedModelClass);
  } else if (isString(options.alias)) {
    alias = options.alias;
  }

  if (childName !== alias) {
    renameRelationExpressionNode(expr, childName, alias);
  }
}

function applyAliases(expr, modelClass, options) {
  for (const childName of expr.$childNames) {
    const childExpr = expr[childName];
    const relation = modelClass.getRelation(childExpr.$relation);
    const alias = options.aliases[childExpr.$relation];

    if (alias && alias !== childName) {
      renameRelationExpressionNode(expr, childName, alias);
    }

    applyAliases(childExpr, relation.relatedModelClass, options);
  }
}

function renameRelationExpressionNode(expr, oldName, newName) {
  const childExpr = expr[oldName];
  delete expr[oldName];
  expr[newName] = childExpr;
  childExpr.$name = newName;
  expr.$childNames = expr.$childNames.map(it => (it === oldName ? newName : it));
}

module.exports = {
  JoinRelatedOperation
};
