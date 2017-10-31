'use strict';

const flatten = require('lodash/flatten');
const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');

const ALIAS_REGEX = /\s+as\s+/i;
const COUNT_REGEX = /count/i;

class SelectOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);

    this.selections = [];
  }

  static get Selection() {
    return Selection;
  }

  static parseSelection(selection) {
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

    return new this.Selection(table, column, alias);
  }

  onAdd(builder, args) {
    const selections = flatten(args);

    // Don't add an empty selection. Empty list is accepted for `count`, `countDistinct`
    // etc. because knex apparently supports it.
    if (selections.length === 0 && !COUNT_REGEX.test(this.name)) {
      return false;
    }

    const ret = super.onAdd(builder, selections);

    for (let i = 0, l = selections.length; i < l; ++i) {
      const selection = SelectOperation.parseSelection(selections[i]);

      if (selection) {
        this.selections.push(selection);
      }
    }

    return ret;
  }

  onBuildKnex(knexBuilder) {
    knexBuilder[this.name].apply(knexBuilder, this.args);
  }

  findSelection(fromTable, selection) {
    let testSelect = SelectOperation.parseSelection(selection);

    if (!testSelect) {
      return null;
    }

    if (!testSelect.table) {
      testSelect.table = fromTable;
    }

    for (let i = 0, l = this.selections.length; i < l; ++i) {
      if (this.selections[i].selects(testSelect)) {
        return this.selections[i];
      }
    }

    return null;
  }
}

class Selection {
  constructor(table, column, alias) {
    this.table = table || null;
    this.column = column || null;
    this.alias = alias || null;
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

module.exports = SelectOperation;
