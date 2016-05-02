import QueryBuilderOperation from './QueryBuilderOperation';

export default class JoinRelationOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.joinOperation = opt.joinOperation;
    this.relationName = null;
  }

  call(builder, args) {
    this.relationName = args[0];
    return true;
  }

  onBeforeBuild(builder) {
    let relation = builder.modelClass().getRelation(this.relationName);
    relation.join(builder, this.joinOperation, relation.name);
  }
}
