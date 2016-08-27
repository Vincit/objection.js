import QueryBuilderOperation from './QueryBuilderOperation';

export default class OnBuildOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBeforeBuild(builder) {
    return this.func.call(builder, builder);
  }
}
