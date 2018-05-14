const { asArray, isObject, uniqBy, get, set } = require('../utils/objectUtils');
const { ref: createRef } = require('../queryBuilder/ReferenceBuilder');
const { raw: createRaw } = require('../queryBuilder/RawBuilder');
const { propToStr, PROP_KEY_PREFIX } = require('../model/modelValues');

class ModelNotFoundError extends Error {
  constructor(tableName) {
    super();
    this.name = this.constructor.name;
    this.tableName = tableName;
  }
}

class InvalidReferenceError extends Error {
  constructor() {
    super();
    this.name = this.constructor.name;
  }
}

// A pair of these define how two tables are related to each other.
// Both the owner and the related table have one of these.
//
// A relation property can be a single column, an array of columns
// (composite key) a json column reference, an array of json column
// references or any combination of the above.
class RelationProperty {
  // references must be a reference string like `Table.column:maybe.some.json[1].path`.
  // or an array of such references (composite key).
  //
  // modelClassResolver must be a function that takes a table name
  // and returns a model class.
  constructor(references, modelClassResolver) {
    const refs = createRefs(asArray(references));
    const paths = createPaths(refs, modelClassResolver);
    const modelClass = resolveModelClass(paths);

    this._refs = refs;
    this._modelClass = modelClass;
    this._props = paths.map(it => it.path[0]);
    this._cols = refs.map(it => it.column);
    this._propGetters = paths.map(it => createGetter(it.path));
    this._propSetters = paths.map(it => createSetter(it.path));
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

  // The model class that owns the property.
  get modelClass() {
    return this._modelClass;
  }

  // An array of property names. Contains multiple values in case of composite key.
  // This may be different from `cols` if the model class has some kind of conversion
  // between database and "external" formats, for example a snake_case to camelCase
  // conversion.
  get props() {
    return this._props;
  }

  // An array of column names. Contains multiple values in case of composite key.
  // This may be different from `props` if the model class has some kind of conversion
  // between database and "external" formats, for example a snake_case to camelCase
  // conversion.
  get cols() {
    return this._cols;
  }

  // Creates a concatenated string from the property values of the given object.
  propKey(obj) {
    const size = this.size;
    let key = PROP_KEY_PREFIX;

    for (let i = 0; i < size; ++i) {
      key += propToStr(this.getProp(obj, i));

      if (i !== size - 1) {
        key += ',';
      }
    }

    return key;
  }

  // Returns the property values of the given object as an array.
  getProps(obj) {
    const size = this.size;
    const props = new Array(size);

    for (let i = 0; i < size; ++i) {
      props[i] = this.getProp(obj, i);
    }

    return props;
  }

  // Returns the index:th property value of the given object.
  getProp(obj, index) {
    return this._propGetters[index](obj);
  }

  // Sets the index:th property value of the given object.
  setProp(obj, index, value) {
    return this._propSetters[index](obj, value);
  }

  // Returns the index:th column name with table reference. Something like
  // 'Table.someColumn'.
  fullCol(builder, index) {
    const table = builder.tableRefFor(this.modelClass.getTableName());

    return `${table}.${this.cols[index]}`;
  }

  // Returns an instance of ReferenceBuilder that points to the index:th
  // value of a row.
  ref(builder, index) {
    const table = builder.tableRefFor(this.modelClass.getTableName());

    return this._refs[index].clone().table(table);
  }

  // Returns an array of reference builders. `ref(builder, i)` for each i.
  refs(builder) {
    const refs = new Array(this.size);

    for (let i = 0, l = refs.length; i < l; ++i) {
      refs[i] = this.ref(builder, i);
    }

    return refs;
  }

  // Appends an update operation for the index:th column into `patch` object.
  patch(patch, index, value) {
    const ref = this._refs[index];

    if (ref.isPlainColumnRef) {
      patch[this._cols[index]] = value;
    } else {
      // Objection `patch`, `update` etc. methods understand field expressions.
      patch[ref.expression] = value;
    }
  }

  // String representation of this property's index:th column for logging.
  propDescription(index) {
    return this._refs[index].expression;
  }
}

function createRefs(refs) {
  try {
    return refs.map(it => {
      if (!isObject(it) || !it.isObjectionReferenceBuilder) {
        return createRef(it);
      } else {
        return it;
      }
    });
  } catch (err) {
    throw new InvalidReferenceError();
  }
}

function createPaths(refs, modelClassResolver) {
  return refs.map(ref => {
    if (!ref.tableName) {
      throw new InvalidReferenceError();
    }

    const modelClass = modelClassResolver(ref.tableName);

    if (!modelClass) {
      throw new ModelNotFoundError(ref.tableName);
    }

    const prop = modelClass.columnNameToPropertyName(ref.column);
    const jsonPath = ref.reference.access.map(it => it.ref);

    return {
      path: [prop].concat(jsonPath),
      modelClass
    };
  });
}

function resolveModelClass(paths) {
  const modelClasses = paths.map(it => it.modelClass);
  const uniqueModelClasses = uniqBy(modelClasses);

  if (uniqueModelClasses.length !== 1) {
    throw new InvalidReferenceError();
  }

  return modelClasses[0];
}

function createGetter(path) {
  if (path.length === 1) {
    const prop = path[0];
    return obj => obj[prop];
  } else {
    return obj => get(obj, path);
  }
}

function createSetter(path) {
  if (path.length === 1) {
    const prop = path[0];
    return (obj, value) => (obj[prop] = value);
  } else {
    return (obj, value) => set(obj, path, value);
  }
}

module.exports = RelationProperty;
