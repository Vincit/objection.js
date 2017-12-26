class Dependency {
  constructor(node) {
    this.node = node;
  }

  resolve(model) {
    throw new Error('not implemented');
  }
}

module.exports = Dependency;
