const HIDDEN_DATA = '$$hiddenData';

export function init(obj, data) {
  Object.defineProperty(obj, HIDDEN_DATA, {
    enumerable: false,
    writable: true,
    value: data || Object.create(null)
  });
}

export function createGetter(propName) {
  return new Function('obj', `
    if (obj.hasOwnProperty("${HIDDEN_DATA}")) {
      return obj.${HIDDEN_DATA}.${propName};
    } else {
      return undefined;
    }
  `);
}

export function createSetter(propName) {
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
  init(dst, Object.create(src[HIDDEN_DATA] || null));
}

export function copyHiddenData(src, dst) {
  init(dst, src[HIDDEN_DATA]);
}