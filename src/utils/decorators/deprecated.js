import _ from 'lodash';

export default function deprecated(opt) {
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