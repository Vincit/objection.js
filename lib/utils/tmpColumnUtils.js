'use strict';

const OWNER_JOIN_COLUMN_ALIAS_PREFIX = 'objectiontmpjoin';

function getTempColumn(index) {
  return `${OWNER_JOIN_COLUMN_ALIAS_PREFIX}${index}`;
}

function isTempColumn(col) {
  return col.startsWith(OWNER_JOIN_COLUMN_ALIAS_PREFIX);
}

module.exports = {
  getTempColumn,
  isTempColumn
};
