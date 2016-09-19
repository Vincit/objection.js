import InsertOperation from './InsertOperation';

export default class InstanceInsertOperation extends InsertOperation {

  constructor(knex, name, opt) {
    super(knex, name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    this.isArray = false;
    this.models = [this.instance];
    return true;
  }
}