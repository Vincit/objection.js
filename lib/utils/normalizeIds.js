const { isObject } = require('../utils/objectUtils');

// ids is of type RelationProperty.
module.exports = (ids, prop, opt) => {
  opt = opt || {};

  let isComposite = prop.size > 1;
  let ret;

  if (isComposite) {
    // For composite ids these are okay:
    //
    // 1. [1, 'foo', 4]
    // 2. {a: 1, b: 'foo', c: 4}
    // 3. [[1, 'foo', 4], [4, 'bar', 1]]
    // 4. [{a: 1, b: 'foo', c: 4}, {a: 4, b: 'bar', c: 1}]
    //
    if (Array.isArray(ids)) {
      if (Array.isArray(ids[0])) {
        ret = new Array(ids.length);

        // 3.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = convertIdArrayToObject(ids[i], prop);
        }
      } else if (isObject(ids[0])) {
        ret = new Array(ids.length);

        // 4.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = ensureObject(ids[i], prop);
        }
      } else {
        // 1.
        ret = [convertIdArrayToObject(ids, prop)];
      }
    } else if (isObject(ids)) {
      // 2.
      ret = [ids];
    } else {
      throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
    }
  } else {
    // For non-composite ids, these are okay:
    //
    // 1. 1
    // 2. {id: 1}
    // 3. [1, 'foo', 4]
    // 4. [{id: 1}, {id: 'foo'}, {id: 4}]
    //
    if (Array.isArray(ids)) {
      if (isObject(ids[0])) {
        ret = new Array(ids.length);

        // 4.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = ensureObject(ids[i]);
        }
      } else {
        ret = new Array(ids.length);

        // 3.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = {};
          prop.setProp(ret[i], 0, ids[i]);
        }
      }
    } else if (isObject(ids)) {
      // 2.
      ret = [ids];
    } else {
      // 1.
      const obj = {};
      prop.setProp(obj, 0, ids);
      ret = [obj];
    }
  }

  checkProperties(ret, prop);

  if (opt.arrayOutput) {
    return normalizedToArray(ret, prop);
  } else {
    return ret;
  }
};

function convertIdArrayToObject(ids, prop) {
  if (!Array.isArray(ids)) {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }

  if (ids.length != prop.size) {
    throw new Error(`composite identifier ${JSON.stringify(ids)} should have ${prop.size} values`);
  }

  const obj = {};

  for (let i = 0; i < ids.length; ++i) {
    prop.setProp(obj, i, ids[i]);
  }

  return obj;
}

function ensureObject(ids) {
  if (isObject(ids)) {
    return ids;
  } else {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }
}

function checkProperties(ret, prop) {
  for (let i = 0, l = ret.length; i < l; ++i) {
    const obj = ret[i];

    for (let j = 0, lp = prop.size; j < lp; ++j) {
      const val = prop.getProp(obj, j);

      if (typeof val === 'undefined') {
        throw new Error(
          `expected id ${JSON.stringify(obj)} to have property ${prop.propDescription(j)}`
        );
      }
    }
  }
}

function normalizedToArray(ret, prop) {
  const arr = new Array(ret.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    arr[i] = prop.getProps(ret[i]);
  }

  return arr;
}
