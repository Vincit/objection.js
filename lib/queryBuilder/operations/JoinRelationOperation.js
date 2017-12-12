'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');
const RelationJoinBuilder = require('./eager/RelationJoinBuilder');
const RelationExpression = require('../RelationExpression');

class JoinRelationOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.callOpt = null;
  }

  onAdd(builder, args) {
    this.expression = RelationExpression.parse(args[0]);
    this.callOpt = args[1] || {};
    return true;
  }

  onBuild(builder) {
    const modelClass = builder.modelClass();
    const opt = Object.assign({}, this.callOpt);

    opt.aliases = Object.assign({}, opt.aliases);
    opt.joinOperation = this.opt.joinOperation;

    // Special case for one single relation.
    if (this.expression.numChildren === 1) {
      const childNames = Object.keys(this.expression.children).map(
        it => this.expression.children[it].name
      );
      const relationName = childNames[0];
      const relation = modelClass.getRelation(relationName);
      let alias = null;

      if (opt.alias === false) {
        alias = builder.tableRefFor(relation.relatedModelClass);
      } else if (opt.alias === true || !opt.alias) {
        alias = relation.name;
      } else if (typeof opt.alias === 'string') {
        alias = opt.alias;
      }

      if (alias) {
        opt.aliases[relationName] = alias;
      }
    }

    const joinBuilder = new RelationJoinBuilder({
      modelClass,
      expression: this.expression
    });

    joinBuilder.setOptions(opt);
    joinBuilder.buildJoinOnly(builder);
  }
}

module.exports = JoinRelationOperation;
