'use strict';

class InternalOptions {
  constructor() {
    this.skipUndefined = false;
    this.keepImplicitJoinProps = false;
    this.returnImmediatelyValue = undefined;
    this.isInternalQuery = false;
    this.debug = false;
    this.schema = undefined;
  }

  clone() {
    const copy = new this.constructor();

    copy.skipUndefined = this.skipUndefined;
    copy.keepImplicitJoinProps = this.keepImplicitJoinProps;
    copy.returnImmediatelyValue = this.returnImmediatelyValue;
    copy.isInternalQuery = this.isInternalQuery;
    copy.debug = this.debug;
    copy.schema = this.schema;

    return copy;
  }
}

module.exports = {
  InternalOptions,
};
