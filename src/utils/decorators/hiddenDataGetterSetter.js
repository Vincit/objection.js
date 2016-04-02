import {createHiddenDataGetter, createHiddenDataSetter} from '../hiddenData';

export default function hiddenDataGetterSetter(propName) {
  const getHiddenData = createHiddenDataGetter(propName);
  const setHiddenData = createHiddenDataSetter(propName);

  return function (target, property, descriptor) {
    descriptor.value = function () {
      if (arguments.length === 0) {
        return getHiddenData(this);
      } else {
        setHiddenData(this, arguments[0]);
      }
    };
  };
}