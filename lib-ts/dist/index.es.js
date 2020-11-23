const INTERNAL_PROP_PREFIX = '$';
function isInternalProp(propName) {
    return propName[0] === INTERNAL_PROP_PREFIX;
}

const OWNER_JOIN_COLUMN_ALIAS_PREFIX = 'objectiontmpjoin';
function getTempColumn(index) {
    return `${OWNER_JOIN_COLUMN_ALIAS_PREFIX}${index}`;
}
function isTempColumn(col) {
    return col.startsWith(OWNER_JOIN_COLUMN_ALIAS_PREFIX);
}

export { getTempColumn, isInternalProp, isTempColumn };
//# sourceMappingURL=index.es.js.map
