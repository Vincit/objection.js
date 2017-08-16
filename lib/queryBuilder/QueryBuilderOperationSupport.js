'use strict';

const QueryBuilderContextBase = require('./QueryBuilderContextBase');

class QueryBuilderOperationSupport {

  constructor(knex, QueryBuilderContext) {
    this._knex = knex;
    this._operations = [];
    this._context = new (QueryBuilderContext || QueryBuilderContextBase)(createUserContextBase(this));
  }

  context(ctx) {
    if (arguments.length === 0) {
      return this._context.userContext;
    } else {
      const ctxBase = createUserContextBase(this);
      this._context.userContext = Object.assign(ctxBase, ctx);
      return this;
    }
  }

  mergeContext(ctx) {
    const oldCtx = this._context.userContext;
    this._context.userContext = Object.assign(oldCtx, ctx);
    return this;
  }

  internalContext(ctx) {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = ctx;
      return this;
    }
  }

  internalOptions(opt) {
    if (arguments.length === 0) {
      return this._context.options;
    } else {
      const oldOpt = this._context.options;
      this._context.options = Object.assign(oldOpt, opt);
      return this;
    }
  }

  knex() {
    if (arguments.length === 0) {
      const knex = this._context.knex || this._knex;

      if (!knex) {
        throw new Error(
          `no database connection available for a query. You need ` +
          `to bind the model class or the query to a knex instance.`);
      }

      return knex;
    } else {
      this._knex = arguments[0];
      return this;
    }
  }

  clear(operationSelector) {
    const operations = [];

    this.forEachOperation(operationSelector, (op) => {
      operations.push(op);
    }, false);

    this._operations = operations;
    return this;
  }

  copyFrom(queryBuilder, operationSelector) {
    const operations = this._operations;

    queryBuilder.forEachOperation(operationSelector, (op) => {
      operations.push(op);
    });

    return this;
  }

  has(operationSelector) {
    return this.indexOfOperation(operationSelector) !== -1;
  }

  indexOfOperation(operationSelector) {
    let idx = -1;

    this.forEachOperation(operationSelector, (op, i) => {
      idx = i;
      return false;
    });

    return idx;
  }

  indexOfLastOperation(operationSelector) {
    let idx = -1;

    this.forEachOperation(operationSelector, (op, i) => {
      idx = i;
    });

    return idx;
  }

  findLastOperation(operationSelector) {
    const idx = this.indexOfLastOperation(operationSelector);

    if (idx !== -1) {
      return this._operations[idx];
    } else {
      return null;
    }
  }

  forEachOperation(operationSelector, callback, match) {
    match = (match == null) ? true : match;

    if (operationSelector instanceof RegExp) {
      forEachOperationRegex(this._operations, operationSelector, callback, match);
    } else {
      forEachOperationInstanceOf(this._operations, operationSelector, callback, match);
    }

    return this;
  }

  addOperation(operation, args) {
    const shouldAdd = operation.onAdd(this, args);

    if (shouldAdd) {
      this._operations.push(operation);
    }

    return this;
  }

  addOperationToFront(operation, args) {
    const shouldAdd = operation.onAdd(this, args);

    if (shouldAdd) {
      this._operations.unshift(operation);
    }

    return this;
  }

  clone() {
    return this.baseCloneInto(new this.constructor(this.knex()));
  }

  baseCloneInto(builder) {
    builder._knex = this._knex;
    builder._operations = this._operations.slice();
    builder._context = this._context.clone();

    return builder;
  }

  build() {
    return this.buildInto(this.knex().queryBuilder());
  }

  buildInto(knexBuilder) {
    const tmp = new Array(10);

    let i = 0;
    while (i < this._operations.length) {
      const op = this._operations[i];
      const ln = this._operations.length;

      op.onBuild(this);

      const numNew = this._operations.length - ln;

      // onBuild may call methods that add more operations. If
      // this was the case, move the operations to be executed next.
      if (numNew > 0) {
        while (tmp.length < numNew) {
          tmp.push(null);
        }

        // Copy the new operations to tmp.
        for (let j = 0; j < numNew; ++j) {
          tmp[j] = this._operations[ln + j];
        }

        // Make room for the new operations after the current operation.
        for (let j = ln + numNew - 1; j > i + numNew; --j) {
          this._operations[j] = this._operations[j - numNew];
        }

        // Move the new operations after the current operation.
        for (let j = 0; j < numNew; ++j) {
          this._operations[i + j + 1] = tmp[j];
        }
      }

      ++i;
    }

    // onBuildKnex operations should never add new operations. They should only call
    // methods on the knex query builder.
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      this._operations[i].onBuildKnex(knexBuilder, this);

      if (this._operations.length !== l) {
        throw new Error('onBuildKnex should only call query building methods on the knex builder');
      }
    }

    return knexBuilder;
  }

  toString() {
    return this.build().toString();
  }

  toSql() {
    return this.toString();
  }

  skipUndefined() {
    this._context.options.skipUndefined = true;
    return this;
  }
}

function createUserContextBase(builder) {
  const ctxProto = {};

  Object.defineProperty(ctxProto, 'transaction', {
    enumerable: false,
    get: () => builder.knex()
  });

  return Object.create(ctxProto);
}

function forEachOperationRegex(operations, operationSelector, callback, match) {
  for (let i = 0, l = operations.length; i < l; ++i) {
    const op = operations[i];

    if (operationSelector.test(op.name) === match) {
      if (callback(op, i) === false) {
        break;
      }
    }
  }
}

function forEachOperationInstanceOf(operations, operationSelector, callback, match) {
  for (let i = 0, l = operations.length; i < l; ++i) {
    const op = operations[i];

    if ((op instanceof operationSelector) === match) {
      if (callback(op, i) === false) {
        break;
      }
    }
  }
}

module.exports = QueryBuilderOperationSupport;
