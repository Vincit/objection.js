'use strict';

const INTERNAL_PROP_PREFIX = '$';

function isInternalProp(propName) {
  return propName[0] === INTERNAL_PROP_PREFIX;
}

module.exports = {
  isInternalProp
};
