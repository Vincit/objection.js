import QueryBuilderOperation from './QueryBuilderOperation';

export default class RunAfterOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onAfter(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
