const HIDDEN_DATA = '$$hiddenData';

export function createHiddenDataGetter(propName) {
  return new Function('obj', `
    return obj.${HIDDEN_DATA} && obj.${HIDDEN_DATA}.${propName};
  `);
}

export function createHiddenDataSetter(propName) {
  return new Function('obj', 'data', `
    if (!obj.hasOwnProperty("${HIDDEN_DATA}")) {
      Object.defineProperty(obj, "${HIDDEN_DATA}", {
        enumerable: false,
        writable: false,
        value: Object.create(null)
      });
    }

    obj.${HIDDEN_DATA}.${propName} = data;
  `);
}