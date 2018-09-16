const { asArray, isString, isFunction, isPlainObject } = require('./objectUtils');

class ModifierNotFoundError extends Error {
  constructor(mofifierName) {
    super();
    this.mofifierName = mofifierName;
  }
}

function createModifier({ modelClass, modifier, modifiers, args }) {
  modifiers = modifiers || {};
  args = args || [];

  const modelModifiers = modelClass ? modelClass.getModifiers() : {};

  const modifierFunctions = asArray(modifier).map(modifier => {
    let modify = null;

    if (isString(modifier)) {
      modifier = modifiers[modifier] || modelModifiers[modifier];
      // Modifiers can be pointers to other modifiers. Call this function recursively.
      return createModifier({ modelClass, modifier, modifiers });
    } else if (isFunction(modifier)) {
      modify = modifier;
    } else if (isPlainObject(modifier)) {
      modify = builder => builder.where(modifier);
    } else if (Array.isArray(modifier)) {
      return createModifier({ modelClass, modifier, modifiers });
    }

    if (!modify) {
      throw new ModifierNotFoundError(modifier);
    }

    return modify;
  });

  return builder => modifierFunctions.forEach(modifier => modifier(builder, ...args));
}

module.exports = {
  createModifier,
  ModifierNotFoundError
};
