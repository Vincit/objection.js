import Promise from 'bluebird';

export function isPromise(obj) {
  return obj && (typeof obj === 'object') && (typeof obj.then === 'function');
}

export function after(obj, func) {
  if (isPromise(obj)) {
    return obj.then(func);
  } else {
    return func(obj);
  }
}

export function afterReturn(obj, returnValue) {
  if (obj instanceof Promise) {
    return obj.return(returnValue);
  } else if (isPromise(obj)) {
    return obj.then(() => returnValue);
  } else {
    return returnValue;
  }
}

export function mapAfterAllReturn(arr, mapper, returnValue) {
  const results = new Array(arr.length);
  let containsPromise = false;

  for (let i = 0, l = arr.length; i < l; ++i) {
    results[i] = mapper(arr[i]);

    if (isPromise(results[i])) {
      containsPromise = true;
    }
  }

  if (containsPromise) {
    return Promise.all(results).return(returnValue);
  } else {
    return returnValue;
  }
}