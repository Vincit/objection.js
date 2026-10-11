'use strict';

const { asArray } = require('../utils/objectUtils');

const BUILDER_SYMBOL = Symbol();

class StaticHookArguments {
  constructor({ builder, result = null }) {
    // The builder should never be accessed through the arguments.
    // Hide it as well as possible to discourage people from
    // digging it out.
    Object.defineProperty(this, BUILDER_SYMBOL, {
      value: builder,
    });

    Object.defineProperty(this, 'result', {
      value: asArray(result),
    });
  }

  static create(args) {
    return new StaticHookArguments(args);
  }

  get asFindQuery() {
    return () => {
      // The `runAfter()` callbacks of the query being executed (including the
      // ones installed by `throwIfNotFound()` and `traverse()`) are meant for
      // its result, not for the result of this find query. The same goes for
      // the value it was resolved with, e.g. the 0 of an update that only
      // changes the join rows of a many-to-many relation.
      return this[BUILDER_SYMBOL].toFindQuery()
        .clear('runAfter')
        .clearResolve()
        .clearWithGraphFetched()
        .runAfter(toArray);
    };
  }

  get context() {
    return this[BUILDER_SYMBOL].context();
  }

  get transaction() {
    return this[BUILDER_SYMBOL].unsafeKnex();
  }

  get relation() {
    const op = this[BUILDER_SYMBOL].findOperation(hasRelation);

    if (op) {
      return getRelation(op);
    } else {
      return undefined;
    }
  }

  get modelOptions() {
    const op = this[BUILDER_SYMBOL].findOperation(hasModelOptions);

    if (op) {
      return getModelOptions(op);
    } else {
      return undefined;
    }
  }

  get items() {
    const op = this[BUILDER_SYMBOL].findOperation(hasItems);

    if (op) {
      return asArray(getItems(op));
    } else {
      return [];
    }
  }

  get inputItems() {
    const op = this[BUILDER_SYMBOL].findOperation(hasInputItems);

    if (op) {
      return asArray(getInputItems(op));
    } else {
      return [];
    }
  }

  get cancelQuery() {
    const args = this;

    return (cancelValue) => {
      const builder = this[BUILDER_SYMBOL];

      if (cancelValue === undefined) {
        if (builder.isInsert()) {
          cancelValue = args.inputItems;
        } else if (builder.isFind()) {
          cancelValue = [];
        } else {
          cancelValue = 0;
        }
      }

      builder.resolve(cancelValue);
    };
  }
}

// Like `asArray()`, but an empty `first()` result becomes an empty array.
function toArray(result) {
  return result === undefined ? [] : asArray(result);
}

function getRelation(op) {
  return op.relation;
}

function hasRelation(op) {
  return !!getRelation(op);
}

function getModelOptions(op) {
  return op.modelOptions;
}

function hasModelOptions(op) {
  return !!getModelOptions(op);
}

function getItems(op) {
  return op.instance || (op.owner && op.owner.isModels && op.owner.modelArray);
}

function hasItems(op) {
  return !!getItems(op);
}

function getInputItems(op) {
  return op.models || op.model;
}

function hasInputItems(op) {
  return !!getInputItems(op);
}

module.exports = {
  StaticHookArguments,
};
