import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class SelectOperation extends WrappingQueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.selections = [];
  }

  static parseSelection(selection) {
    if (!_.isString(selection)) {
      return null;
    }

    // Discard the possible alias.
    selection = selection.split(/\s+as\s+}/i)[0].trim();
    const dotIdx = selection.indexOf('.');

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
    const ret = super.call(builder, args);
    const selections = _.flatten(this.args);

    for (let i = 0, l = selections.length; i < l; ++i) {
      const selection = SelectOperation.parseSelection(selections[i]);

      if (selection) {
        this.selections.push(selection);
      }
    }

    return ret;
  }

  onBuild(builder) {
    builder.select.apply(builder, this.args);
  }

  hasSelection(fromTable, selection) {
    const select1 = SelectOperation.parseSelection(selection);

    if (!select1) {
      return false;
    }

    for (let i = 0, l = this.selections.length; i < l; ++i) {
      const select2 = this.selections[i];

      const match = (select1.table === select2.table && select1.column === select2.column)
        || (select1.table === select2.table && select2.column === '*')
        || (select1.table === null && select2.table === fromTable && select1.column === select2.column)
        || (select2.table === null && select1.table === fromTable && select1.column === select2.column);

      if (match) {
        return true;
      }
    }

    return false;
  }
}