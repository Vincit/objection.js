const FindOperation = require('./FindOperation');

const { after } = require('../../utils/promiseUtils');
const { assertHasId } = require('../../utils/assert');

class InstanceFindOperation extends FindOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBuild(builder) {
    assertHasId(this.instance);

    const idColumn = builder.fullIdColumnFor(builder.modelClass());
    const id = this.instance.$id();

    builder.whereComposite(idColumn, id);
  }

  onAfter3(builder, result) {
    const maybePromise = super.onAfter3(builder, result);

    return after(maybePromise, result => {
      if (Array.isArray(result)) {
        return result[0];
      } else {
        return result;
      }
    });
  }
}

module.exports = InstanceFindOperation;
