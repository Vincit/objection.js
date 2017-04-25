'use strict';

const _ = require('lodash');
const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

class SelectOperation extends WrappingQueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.selections = [];
  }

  static parseSelection(selection) {
    if (!_.isString(selection)) {
      return null;
    }

    // Discard the possible alias.
    selection = selection.split(/\s+as\s+/i)[0].trim();
    const dotIdx = selection.lastIndexOf('.');

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
    const selections = _.flatten(args);

    // Don't add an empty selection. Empty list is accepted for `count`, `countDistinct`
    // etc. because knex apparently supports it.
    if (selections.length === 0 && !/count/i.test(this.name)) {
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