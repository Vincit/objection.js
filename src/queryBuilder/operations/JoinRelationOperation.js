import _ from 'lodash';
import QueryBuilderOperation from './QueryBuilderOperation';

export default class JoinRelationOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.joinOperation = opt.joinOperation;
    this.relationName = null;
    this.callOpt = null;
  }

  call(builder, args) {
    this.relationName = args[0];
    this.callOpt = args[1] || {};
    return true;
  }

  onBeforeBuild(builder) {
    const relation = builder.modelClass().getRelation(this.relationName);
    let alias = null;

    if (this.callOpt.alias === false) {
      alias = relation.relatedModelClass.tableName;
    } else if (this.callOpt.alias === true || !this.callOpt.alias) {
      alias = relation.name;
    } else if (_.isString(this.callOpt.alias)) {
      alias = this.callOpt.alias;
    }

    relation.join(builder, {
      joinOperation: this.joinOperation,
      relatedTableAlias: alias
    });
  }
}
