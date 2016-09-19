import FindOperation from './FindOperation';

export default class InstanceFindOperation extends FindOperation {

  constructor(knex, name, opt) {
    super(knex, name, opt);
    this.instance = opt.instance;
  }

  onBeforeBuild(builder) {
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id()).first()
  }
}