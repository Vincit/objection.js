'use strict';

const flatten = require('lodash/flatten');
const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

const ALIAS_REGEX = /\s+as\s+/i;
const COUNT_REGEX = /count/i;

class SelectOperation extends WrappingQueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.selections = [];
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

    return {
      table,
      column,
      alias,
      name: alias || column
    };
  }

  call(builder, args) {
    const selections = flatten(args);

    // Don't add an empty selection. Empty list is accepted for `count`, `countDistinct`
    // etc. because knex apparently supports it.
    if (selections.length === 0 && !COUNT_REGEX.test(this.name)) {
      return false;
    }

    const ret = super.call(builder, selections);

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
    const testSelect = SelectOperation.parseSelection(selection);

    if (!testSelect) {
      return null;
    }

    const testTable = testSelect.table || fromTable;
    const testColumn = testSelect.column;

    for (let i = 0, l = this.selections.length; i < l; ++i) {
      const table = this.selections[i].table || fromTable;
      const column = this.selections[i].column;

      if (testTable === table && (column === testColumn || column === '*')) {
        return this.selections[i];
      }
    }

    return null;
  }
}

module.exports = SelectOperation;