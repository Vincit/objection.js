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