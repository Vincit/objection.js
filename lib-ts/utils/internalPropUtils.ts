const INTERNAL_PROP_PREFIX = '$';

function isInternalProp(propName: string) {
  return propName[0] === INTERNAL_PROP_PREFIX;
}

export { isInternalProp };
