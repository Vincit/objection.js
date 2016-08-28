import _ from 'lodash';
import {createHiddenDataGetter, createHiddenDataSetter} from '../hiddenData';

export default function memoize(target, property, descriptor) {
  const cacheProp = 'memoized' + _.upperFirst(property);
  const impl = descriptor.value;

  if (impl.length === 0) {
    descriptor.value = createSingleValueMemoizedFunc(impl, cacheProp);
  } else {
    descriptor.value = createMultiValueMemoizedFunc(impl, cacheProp);
  }
}

function createSingleValueMemoizedFunc(impl, cacheProp) {
  const get = createHiddenDataGetter(cacheProp);
  const set = createHiddenDataSetter(cacheProp);

  return function decorator$memoize() {
    let value = get(this);

    if (value === undefined) {
      value = impl.call(this);
      set(this, value);
    }

    return value;
  };
}

function createMultiValueMemoizedFunc(impl, cacheProp) {
  const get = createHiddenDataGetter(cacheProp);
  const set = createHiddenDataSetter(cacheProp);

  return function decorator$memoize(input) {
    let cache = get(this);

    if (cache === undefined) {
      cache = Object.create(null);
      set(this, cache);
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

