function isSubclassOf(Constructor, SuperConstructor) {
  if (typeof SuperConstructor !== 'function') {
    return false;
  }

  while (typeof Constructor === 'function') {
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
