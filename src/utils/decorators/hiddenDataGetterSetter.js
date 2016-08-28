import {createHiddenDataGetter, createHiddenDataSetter} from '../hiddenData';

export default function hiddenDataGetterSetter(propName) {
  const get = createHiddenDataGetter(propName);
  const set = createHiddenDataSetter(propName);

  return function (target, property, descriptor) {
    descriptor.value = function decorator$hiddenDataGetterSetter() {
      if (arguments.length === 0) {
        return get(this);
      } else {
        set(this, arguments[0]);
      }
    };
  };
}