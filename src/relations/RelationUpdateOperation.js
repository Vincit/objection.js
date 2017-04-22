const UpdateOperation = require('../queryBuilder/operations/UpdateOperation');

module.exports = class RelationUpdateOperation extends UpdateOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);

    this.relation.findQuery(builder, {
      ownerIds: [this.owner.$values(this.relation.ownerProp)]
    });
  }
}