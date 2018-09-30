const { isFunction } = require('./objectUtils');

function isSubclassOf(Constructor, SuperConstructor) {
  if (!isFunction(SuperConstructor)) {
    return false;
  }

  while (isFunction(Constructor)) {
    if (Constructor === SuperConstructor) {
      return true;
    }

    const proto = Constructor.prototype && Object.getPrototypeOf(Constructor.prototype);
    Constructor = proto && proto.constructor;
  }

  return false;
}

module.exports = {
  isSubclassOf
};
