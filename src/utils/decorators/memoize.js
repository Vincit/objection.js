import _ from 'lodash';
import {createHiddenDataGetter, createHiddenDataSetter} from '../hiddenData';

export default function memoize(target, property, descriptor) {
  const cacheProp = 'memoized' + property.charAt(0).toUpperCase() + property.substring(1);
  const impl = descriptor.value;

  const getHiddenData = createHiddenDataGetter(cacheProp);
  const setHiddenData = createHiddenDataSetter(cacheProp);

  if (impl.length === 0) {
    descriptor.value = function () {
      let value = getHiddenData(this);

      if (typeof value === 'undefined') {
        value = impl.call(this);
        setHiddenData(this, value);
      }

      return value;
    };
  } else {
    descriptor.value = function (input) {
      let cache = getHiddenData(this);

      if (typeof cache === 'undefined') {
        cache = Object.create(null);
        setHiddenData(this, cache);
      }

      if (input in cache) {
        return cache[input];
      } else {
        let value = impl.call(this, input);
        cache[input] = value;
        return value;
      }
    };
  }
}
