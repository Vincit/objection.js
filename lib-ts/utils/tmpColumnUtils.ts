const OWNER_JOIN_COLUMN_ALIAS_PREFIX = 'objectiontmpjoin';

function getTempColumn(index: number) {
  return `${OWNER_JOIN_COLUMN_ALIAS_PREFIX}${index}`;
}

function isTempColumn(col: string) {
  return col.startsWith(OWNER_JOIN_COLUMN_ALIAS_PREFIX);
}

export { getTempColumn, isTempColumn };
