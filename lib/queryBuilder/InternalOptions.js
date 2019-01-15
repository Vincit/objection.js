'use strict';

class InternalOptions {
  constructor() {
    this.skipUndefined = false;
    this.keepImplicitJoinProps = false;
    this.isInternalQuery = false;
    this.debug = false;
  }

  clone() {
    const copy = new this.constructor();

    copy.skipUndefined = this.skipUndefined;
    copy.keepImplicitJoinProps = this.keepImplicitJoinProps;
    copy.isInternalQuery = this.isInternalQuery;
    copy.debug = this.debug;

    return copy;
  }
}

module.exports = {
  InternalOptions
};
