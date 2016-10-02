import clone from 'lodash/clone';
import QueryBuilderOperation from './QueryBuilderOperation';

export default class EagerOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.filters = null;
  }

  clone(props) {
    props = props || {};
    const copy = new this.constructor(this.name, props.opt || clone(this.opt));

    copy.isWriteOperation = this.isWriteOperation;
    copy.expression = this.expression.clone();
    copy.filters = clone(this.filters);

    return copy;
  }

  call(builder, args) {
    this.expression = args[0].clone();
    this.filters = args[1];

    for (let i = 0, l = this.filters.length; i < l; ++i) {
      const filter = this.filters[i];
      this.expression.addAnonymousFilterAtPath(filter.path, filter.filter);
    }

    return true;
  }
}