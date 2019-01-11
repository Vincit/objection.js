'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { RelationJoinBuilder } = require('./eager/RelationJoinBuilder');
const { RelationExpression } = require('../RelationExpression');
const { isString } = require('../../utils/objectUtils');

class JoinRelationOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.calls = null;
  }

  onAdd(_, calls) {
    this.calls = calls;
    return true;
  }

  onBuild(builder) {
    const modelClass = builder.modelClass();
    const joinOperation = this.calls[0].joinOperation;
    let mergedExpr = RelationExpression.create();

    for (const call of this.calls) {
      const expr = RelationExpression.create(call.expression).toPojo();
      const childNames = RelationExpression.getChildNames(expr);
      const options = call.options || {};

      if (childNames.length === 1) {
        applyAlias(expr, modelClass, builder, options);
      }

      if (options.aliases) {
        applyAliases(expr, modelClass, options);
      }

      mergedExpr = mergedExpr.merge(expr);
    }

    const joinBuilder = new RelationJoinBuilder({
      modelClass,
      expression: mergedExpr
    });

    joinBuilder.setOptions({ joinOperation });
    joinBuilder.buildJoinOnly(builder);
  }

  clone() {
    const clone = super.clone();
    clone.calls = this.calls;
    return clone;
  }
}

function applyAlias(expr, modelClass, builder, options) {
  const childNames = RelationExpression.getChildNames(expr);
  const childName = childNames[0];
  const childExpr = expr[childName];
  const relation = modelClass.getRelation(childExpr.$relation);

  let alias = childName;

  if (options.alias === false) {
    alias = builder.tableRefFor(relation.relatedModelClass.getTableName());
  } else if (isString(options.alias)) {
    alias = options.alias;
  }

  if (childName !== alias) {
    renameRelationExpressionNode(expr, childName, alias);
  }
}

function applyAliases(expr, modelClass, options) {
  for (const childName of RelationExpression.getChildNames(expr)) {
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
}

module.exports = {
  JoinRelationOperation
};
