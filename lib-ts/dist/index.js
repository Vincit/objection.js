'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const OWNER_JOIN_COLUMN_ALIAS_PREFIX = 'objectiontmpjoin';
function getTempColumn(index) {
    return `${OWNER_JOIN_COLUMN_ALIAS_PREFIX}${index}`;
}
function isTempColumn(col) {
    return col.startsWith(OWNER_JOIN_COLUMN_ALIAS_PREFIX);
}

exports.getTempColumn = getTempColumn;
exports.isTempColumn = isTempColumn;
//# sourceMappingURL=index.js.map
