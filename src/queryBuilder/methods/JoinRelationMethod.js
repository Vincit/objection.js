import QueryBuilderMethod from './QueryBuilderMethod';

export default class JoinRelationMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.joinMethod = opt.joinMethod;
    this.relationName = null;
  }

  call(builder, args) {
    this.relationName = args[0];
    return true;
  }

  onBeforeBuild(builder) {
    let relation = builder.modelClass().getRelation(this.relationName);
    relation.join(builder, this.joinMethod, relation.name);
  }
}
