'use strict';

const { asArray, isString, isFunction, isPlainObject } = require('./objectUtils');

function createModifier({ modelClass, modifier, modifiers }) {
  const modelModifiers = modelClass ? modelClass.getModifiers() : {};

  const modifierFunctions = asArray(modifier).map(modifier => {
    let modify = null;

    if (isString(modifier)) {
      modify = (modifiers && modifiers[modifier]) || modelModifiers[modifier];

      // Modifiers can be pointers to other modifiers. Call this function recursively.
      if (modify && !isFunction(modify)) {
        return createModifier({ modelClass, modifier: modify, modifiers });
      }
    } else if (isFunction(modifier)) {
      modify = modifier;
    } else if (isPlainObject(modifier)) {
      modify = builder => builder.where(modifier);
    } else if (Array.isArray(modifier)) {
      return createModifier({ modelClass, modifier, modifiers });
    }

    if (!modify) {
      modify = builder => modelClass.modifierNotFound(builder, modifier);
    }

    return modify;
  });

  return (builder, ...args) => {
    for (const modifier of modifierFunctions) {
      modifier.call(builder, builder, ...args);
    }
  };
}

module.exports = {
  createModifier
};
