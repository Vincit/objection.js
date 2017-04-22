const _ = require('lodash');
const QueryBuilderOperation = require('./QueryBuilderOperation');
const RelationJoinBuilder = require('./eager/RelationJoinBuilder');
const RelationExpression = require('../RelationExpression');

module.exports = class JoinRelationOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.callOpt = null;
  }

  call(builder, args) {
    this.expression = RelationExpression.parse(args[0]);
    this.callOpt = args[1] || {};
    return true;
  }

  onBeforeBuild(builder) {
    const modelClass = builder.modelClass();
    const opt = Object.assign({}, this.callOpt);

    opt.aliases = Object.assign({}, opt.aliases);
    opt.joinOperation = this.opt.joinOperation;

    // Special case for one single relation.
    if (this.expression.numChildren === 1) {
      let relationName;

      // A bit crappy way to get the only child.
      this.expression.forEachChild((child, childName) => {
        relationName = childName;
      });

      const relation = modelClass.getRelation(relationName);
      let alias = null;

      if (opt.alias === false) {
        alias = relation.relatedModelClass.tableName;
      } else if (opt.alias === true || !opt.alias) {
        alias = relation.name;
      } else if (_.isString(opt.alias)) {
        alias = opt.alias;
      }

      if (alias) {
        opt.aliases[relationName] = alias;
      }
    }

    const joinBuilder = new RelationJoinBuilder({
      modelClass,
      expression: this.expression,
      opt: opt
    });

    joinBuilder.buildJoinOnly(builder);
  }
}
