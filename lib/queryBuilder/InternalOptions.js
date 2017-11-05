'use strict';

class InternalOptions {
  constructor() {
    this.skipUndefined = false;
    this.keepImplicitJoinProps = false;
    this.queryProps = null;
    this.debug = false;
  }

  clone() {
    const copy = new this.constructor();

    copy.skipUndefined = this.skipUndefined;
    copy.keepImplicitJoinProps = this.keepImplicitJoinProps;
    copy.queryProps = this.queryProps;
    copy.debug = this.debug;

    return copy;
  }
}

module.exports = InternalOptions;
