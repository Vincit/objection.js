const HIDDEN_DATA = '$$hiddenData';

export function createHiddenDataGetter(propName) {
  return new Function('obj', `
    return obj.${HIDDEN_DATA} && obj.${HIDDEN_DATA}.${propName};
  `);
}

export function createHiddenDataSetter(propName) {
  return new Function('obj', 'data', `
    var hiddenData = obj.${HIDDEN_DATA};

    if (typeof hiddenData !== 'object') {
      hiddenData = Object.create(null);

      Object.defineProperty(obj, "${HIDDEN_DATA}", {
        enumerable: false,
        writable: false,
        value: hiddenData
      });
    }

    hiddenData.${propName} = data;
  `);
}