'use strict';

const { flatten } = require('../../../utils/objectUtils');
const { Selection } = require('./Selection');
const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');

const COUNT_REGEX = /count/i;

class SelectOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);
    this.selections = [];
  }

  onAdd(builder, args) {
    const selections = flatten(args);

    // Don't add an empty selection. Empty list is accepted for `count`, `countDistinct`
    // etc. because knex apparently supports it.
    if (selections.length === 0 && !COUNT_REGEX.test(this.name)) {
      return false;
    }

    const ret = super.onAdd(builder, selections);

    for (const selection of selections) {
      const selectionInstance = Selection.create(selection);

      if (selectionInstance) {
        this.selections.push(selectionInstance);
      }
    }

    return ret;
  }

  onBuildKnex(knexBuilder, builder) {
    return knexBuilder[this.name].apply(knexBuilder, this.getKnexArgs(builder));
  }

  findSelection(builder, selectionToFind) {
    const selectionInstanceToFind = Selection.create(selectionToFind);

    if (!selectionInstanceToFind) {
      return null;
    }

    for (const selection of this.selections) {
      if (Selection.doesSelect(builder, selection, selectionInstanceToFind)) {
        return selection;
      }
    }

    return null;
  }

  clone() {
    const clone = super.clone();
    clone.selections = this.selections.slice();
    return clone;
  }
}

module.exports = {
  SelectOperation,
};
