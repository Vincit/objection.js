const ALIAS_REGEX = /\s+as\s+/i;

class Selection {
  constructor(table, column, alias) {
    this.table = table || null;
    this.column = column || null;
    this.alias = alias || null;
  }

  static create(selection) {
    let dotIdx, table, column;
    let alias = null;

    if (typeof selection !== 'string') {
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
      table = null;
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

  selects(that) {
    const tablesMatch = that.table === this.table || this.table === null || that.table === null;
    const colsMatch = this.column === that.column || this.column === '*';
    return tablesMatch && colsMatch;
  }
}

const SELECT_ALL = new Selection(null, '*');

module.exports = Selection;