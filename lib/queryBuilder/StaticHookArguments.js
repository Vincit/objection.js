'use strict';

const { asArray } = require('../utils/objectUtils');

const BUILDER_SYMBOL = Symbol();

class StaticHookArguments {
  constructor({ builder, result = null }) {
    // The builder should never be accessed through the arguments.
    // Hide it as well as possible to discourage people from
    // digging it out.
    Object.defineProperty(this, BUILDER_SYMBOL, {
      value: builder
    });

    Object.defineProperty(this, 'result', {
      value: asArray(result)
    });
  }

  static create(args) {
    return new StaticHookArguments(args);
  }

  get findQuery() {
    return this[BUILDER_SYMBOL].toFindQuery().runAfter(asArray);
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
      return null;
    }
  }

  get modelOptions() {
    const op = this[BUILDER_SYMBOL].findOperation(hasModelOptions);

    if (op) {
      return getModelOptions(op);
    } else {
      return null;
    }
  }

  get modelInstances() {
    const op = this[BUILDER_SYMBOL].findOperation(hasModelInstance);

    if (op) {
      return asArray(getModelInstance(op));
    } else {
      return [];
    }
  }

  get inputModelInstances() {
    const op = this[BUILDER_SYMBOL].findOperation(hasInputModelInstance);

    if (op) {
      return asArray(getInputModelInstance(op));
    } else {
      return [];
    }
  }

  get cancelQuery() {
    const args = this;

    return cancelValue => {
      const builder = this[BUILDER_SYMBOL];

      if (cancelValue === undefined) {
        if (builder.isInsert()) {
          cancelValue = args.inputModelInstances;
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

function getModelInstance(op) {
  return op.instance || op.owner || op.owners;
}

function hasModelInstance(op) {
  return !!getModelInstance(op);
}

function getInputModelInstance(op) {
  return op.models || op.model;
}

function hasInputModelInstance(op) {
  return !!getInputModelInstance(op);
}

module.exports = {
  StaticHookArguments
};
