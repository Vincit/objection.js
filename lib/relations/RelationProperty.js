'use strict';

const get = require('lodash/get');
const set = require('lodash/set');

const createRef = require('../queryBuilder/ReferenceBuilder').ref;
const createRaw = require('../queryBuilder/RawBuilder').raw;

const propToStr = require('../model/modelValues').propToStr;
const PROP_KEY_PREFIX = require('../model/modelValues').PROP_KEY_PREFIX;

class ModelNotFoundError extends Error {}
class InvalidReferenceError extends Error {}

// A pair of these define how two tables are related to each other.
// Both the owner and the related table have one of these.
//
// A relation property can be a single column, an array of columns
// (composite key) a json column reference, an array of json column
// references or any combination of the those.
class RelationProperty {

  // relationRef must be a reference string like `Table.column:maybe.some.json[1].path`.
  // or an array of such references (composite key).
  //
  // modelClasses must be an array that contains a model class for `Table`.
  constructor(inputRefs,  modelClassResolver) {
    if (!Array.isArray(inputRefs)) {
      inputRefs = [inputRefs];
    }

    let refs = null;
    let theModelClass = null;

    try {
      refs = inputRefs.map(it => {
        if (!it.isObjectionReferenceBuilder) {
          return createRef(it)
        } else {
          return it;
        }
      });
    } catch (err) {
      throw new InvalidReferenceError();
    }

    const paths = refs.map(ref => {
      if (!ref.tableName) {
        throw new InvalidReferenceError();
      }

      const modelClass = modelClassResolver(ref.tableName);

      if (!modelClass) {
        throw new ModelNotFoundError();
      }

      if (theModelClass !== null && theModelClass !== modelClass) {
        throw new InvalidReferenceError();
      }

      theModelClass = modelClass;

      const prop = modelClass.columnNameToPropertyName(ref.column);
      const jsonPath = ref.reference.access.map(acc => acc.ref);

      return [prop].concat(jsonPath);
    });

    this._props = paths.map(it => it[0]);
    this._cols = refs.map(it => it.column);
    this._refs = refs;
    this._modelClass = theModelClass;
    this._propGetters = paths.map(createGetter);
    this._propSetters = paths.map(createSetter);
  }

  static get ModelNotFoundError() {
    return ModelNotFoundError;
  }

  static get InvalidReferenceError() {
    return InvalidReferenceError;
  }

  // The number of columns.
  get size() {
    return this._refs.length;
  }

  get modelClass() {
    return this._modelClass;
  }

  propKey(obj) {
    const size = this.size;
    var key = PROP_KEY_PREFIX;

    for (let i = 0; i < size; ++i) {
      key += propToStr(this.getProp(obj, i));

      if (i !== size - 1) {
        key += ',';
      }
    }

    return key;
  }

  getProps(obj) {
    const size = this.size;
    const props = new Array(size);

    for (let i = 0; i < size; ++i) {
      props[i] = this.getProp(obj, i);
    }

    return props;
  }

  getProp(obj, index) {
    return this._propGetters[index](obj);
  }

  setProp(obj, index, value) {
    return this._propSetters[index](obj, value);
  }

  prop(index) {
    return this._props[index];
  }

  props() {
    return this._props;
  }

  col(index) {
    return this._cols[index];
  }

  cols() {
    return this._cols;
  }

  fullCol(builder, index) {
    const table = builder.tableRefFor(this.modelClass);

    return `${table}.${this.col(index)}`;
  }

  fullCols(builder) {
    const col = new Array(this.size);

    for (let i = 0, l = col.length; i < l; ++i) {
      col[i] = this.fullCols(builder, i);
    }

    return col;
  }

  ref(builder, index) {
    const table = builder.tableRefFor(this.modelClass);

    return this._refs[index].clone().table(table);
  }

  refs(builder) {
    const refs = new Array(this.size);

    for (let i = 0, l = refs.length; i < l; ++i) {
      refs[i] = this.ref(builder, i);
    }

    return refs;
  }

  patch(patch, index, value) {
    const ref = this._refs[index];

    if (ref.isPlainColumnRef) {
      patch[this.col(index)] = value;
    } else {
      patch[ref.expression] = value;
    }
  }

  propDescription(index) {
    return this._refs[index].expression;
  }
}

function createGetter(path) {
  if (path.length === 1) {
    const prop = path[0];
    return (obj) => obj[prop];
  } else {
    return (obj) => get(obj, path);
  }
}

function createSetter(path) {
  if (path.length === 1) {
    const prop = path[0];
    return (obj, value) => obj[prop] = value;
  } else {
    return (obj, value) => set(obj, path, value);
  }
}

module.exports = RelationProperty;