import QueryBuilderOperation from './QueryBuilderOperation';

export default class RunBeforeOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBefore(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
