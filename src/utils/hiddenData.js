const HIDDEN_DATA = '$$hiddenData';

function init(obj, data) {
  Object.defineProperty(obj, HIDDEN_DATA, {
    enumerable: false,
    writable: true,
    value: data || Object.create(null)
  });
}

function createGetter(propName) {
  const factory = new Function(`
    return function hiddenData$get${capitalize(propName)}(obj) {
      if (obj.hasOwnProperty("${HIDDEN_DATA}")) {
        return obj.${HIDDEN_DATA}.${propName};
      } else {
        return undefined;
      }
    }
  `);

  return factory();
}

function createSetter(propName) {
  const factory = new Function(`
    return function hiddenData$set${capitalize(propName)}(obj, data) {
      if (!obj.hasOwnProperty("${HIDDEN_DATA}")) {
        Object.defineProperty(obj, "${HIDDEN_DATA}", {
          enumerable: false,
          writable: true,
          value: Object.create(null)
        });
      }

      obj.${HIDDEN_DATA}.${propName} = data;
    }
  `);

  return factory();
}

function inheritHiddenData(src, dst) {
  init(dst, Object.create(src[HIDDEN_DATA] || null));
}

function copyHiddenData(src, dst) {
  init(dst, src[HIDDEN_DATA]);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.substring(1)
}

module.exports = {
  init: init,
  createGetter: createGetter,
  createSetter: createSetter,
  inheritHiddenData: inheritHiddenData,
  copyHiddenData: copyHiddenData
};