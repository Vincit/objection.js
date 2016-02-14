import _ from 'lodash';

/**
 * @ignore
 */
export function memoize(target, property, descriptor) {
  const cacheProp = '@memoize_' + property;
  const impl = descriptor.value;

  if (impl.length === 0) {
    descriptor.value = function () {
      if (!(cacheProp in this)) {
        Object.defineProperty(this, cacheProp, {
          enumerable: false,
          value: impl.call(this)
        });
      }

      return this[cacheProp];
    };
  } else {
    descriptor.value = function (input) {
      if (!(cacheProp in this)) {
        Object.defineProperty(this, cacheProp, {
          enumerable: false,
          value: Object.create(null)
        });
      }

      let cache = this[cacheProp];

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

/**
 * @ignore
 */
export function deprecated(opt) {
  return function (target, property, descriptor) {
    const message = `${property} is deprecated and will be removed in version ${opt.removedIn}. Use ${opt.useInstead} instead.`;

    const value = descriptor.value;
    const getter = descriptor.get;

    if (_.isFunction(value)) {
      descriptor.value = function () {
        console.warn(message);
        return value.apply(this, arguments);
      };
    }

    if (_.isFunction(getter)) {
      descriptor.get = function () {
        console.warn(message);
        return getter.apply(this, arguments);
      };
    }
  };
}