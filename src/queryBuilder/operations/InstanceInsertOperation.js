import InsertOperation from './InsertOperation';

export default class InstanceInsertOperation extends InsertOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    this.isArray = false;
    this.models = [this.instance];
    return true;
  }
}