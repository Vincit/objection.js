const { flatten } = require('../../../utils/objectUtils');
const Selection = require('./Selection');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

const COUNT_REGEX = /count/i;

class SelectOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);
    this.selections = [];
  }

  static get Selection() {
    return Selection;
  }

  static parseSelection(selection, table) {
    return this.Selection.create(selection, table);
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

  findSelection(selection, table) {
    let testSelect = this.constructor.parseSelection(selection, table);

    if (!testSelect) {
      return null;
    }

    for (let i = 0, l = this.selections.length; i < l; ++i) {
      if (this.selections[i].includes(testSelect)) {
        return this.selections[i];
      }
    }

    return null;
  }
}

module.exports = SelectOperation;
