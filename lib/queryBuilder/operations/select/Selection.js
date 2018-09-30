const { isString } = require('../../../utils/objectUtils');

const ALIAS_REGEX = /\s+as\s+/i;

class Selection {
  constructor(table, column, alias) {
    this.table = table || null;
    this.column = column || null;
    this.alias = alias || null;
  }

  static create(selection, table = null) {
    let dotIdx, column;
    let alias = null;

    if (!isString(selection)) {
      return null;
    }

    if (ALIAS_REGEX.test(selection)) {
      const parts = selection.split(ALIAS_REGEX);

      selection = parts[0].trim();
      alias = parts[1].trim();
    }

    dotIdx = selection.lastIndexOf('.');

    if (dotIdx !== -1) {
      table = selection.substr(0, dotIdx);
      column = selection.substr(dotIdx + 1);
    } else {
      column = selection;
    }

    return new this(table, column, alias);
  }

  static get SelectAll() {
    return SELECT_ALL;
  }

  get name() {
    return this.alias || this.column;
  }

  // Test if this selection "includes" another selection.
  // For example `foo.*` includes `foo.bar`.
  includes(that) {
    const tablesMatch = that.table === this.table || this.table === null;
    const colsMatch = this.column === that.column || this.column === '*';

    return tablesMatch && colsMatch;
  }
}

const SELECT_ALL = new Selection(null, '*');

module.exports = Selection;
