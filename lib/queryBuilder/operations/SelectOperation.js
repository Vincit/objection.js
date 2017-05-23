'use strict';

const flatten = require('lodash/flatten');
const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

const ALIAS_REGEX = /\s+as\s+/i;
const COUNT_REGEX = /count/i;

class SelectOperation extends WrappingQueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    
    this.selections = [];
    this.hasCache = Object.create(null);
  }

  static parseSelection(selection) {
    let dotIdx;

    if (typeof selection !== 'string') {
      return null;
    }

    // Discard the possible alias.
    if (ALIAS_REGEX.test(selection)) {
      selection = selection.split(ALIAS_REGEX)[0].trim();
    }
  
    dotIdx = selection.lastIndexOf('.');

    if (dotIdx !== -1) {
      return {
        table: selection.substr(0, dotIdx),
        column: selection.substr(dotIdx + 1)
      };
    } else {
      return {
        table: null,
        column: selection
      };
    }
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

  onBuild(builder) {
    builder[this.name].apply(builder, this.args);
  }

  hasSelection(fromTable, selection) {
    const testSelect = SelectOperation.parseSelection(selection);

    if (!testSelect) {
      return false;
    }

    const testTable = testSelect.table || fromTable;
    const testColumn = testSelect.column;

    for (let i = 0, l = this.selections.length; i < l; ++i) {
      const table = this.selections[i].table || fromTable;
      const column = this.selections[i].column;

      if (testTable === table && (column === testColumn || column === '*')) {
        return true;
      }
    }

    return false;
  }
}

module.exports = SelectOperation;