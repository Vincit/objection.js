const HIDDEN_DATA = '$$hiddenData';

export function createHiddenDataGetter(propName) {
  return new Function('obj', `
    if (obj.hasOwnProperty("${HIDDEN_DATA}")) {
      return obj.${HIDDEN_DATA}.${propName};
    } else {
      return undefined;
    }
  `);
}

export function createHiddenDataSetter(propName) {
  return new Function('obj', 'data', `
    if (!obj.hasOwnProperty("${HIDDEN_DATA}")) {
      Object.defineProperty(obj, "${HIDDEN_DATA}", {
        enumerable: false,
        writable: true,
        value: Object.create(null)
      });
    }

    obj.${HIDDEN_DATA}.${propName} = data;
  `);
}

export function inheritHiddenData(src, dst) {
  Object.defineProperty(dst, HIDDEN_DATA, {
    enumerable: false,
    writable: true,
    value: Object.create(src[HIDDEN_DATA] || null)
  });
}