'use strict';

class ModifierNotFoundError extends Error {
  constructor(modifierName) {
    super(`Unable to determine modify function from provided value: "${modifierName}".`);
    this.modifierName = modifierName;
  }
}

module.exports = {
  ModifierNotFoundError,
};
