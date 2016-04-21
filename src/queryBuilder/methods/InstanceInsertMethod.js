import InsertMethod from './InsertMethod';

export default class InstanceInsertMethod extends InsertMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    this.isArray = false;
    this.models = [this.instance];

    return retVal;
  }
}