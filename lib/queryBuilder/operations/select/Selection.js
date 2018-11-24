const { isString, isObject } = require('../../../utils/objectUtils');

const ALIAS_REGEX = /\s+as\s+/i;

class Selection {
  constructor(table, column, alias) {
    this.table = table;
    this.column = column;
    this.alias = alias;
  }

  get name() {
    return this.alias || this.column;
  }

  static create(selection) {
    if (isObject(selection) && selection.isObjectionReferenceBuilder) {
      return createSelectionFromReference(selection);
    } else if (isString(selection)) {
      return createSelectionFromString(selection);
    } else {
      return null;
    }
  }

  /**
   * Returns true if `selectionInBuilder` causes `selectionToTest` to be selected.
   *
   * Examples that return true:
   *
   * doesSelect(Person.query(), '*', 'name')
   * doesSelect(Person.query(), 'Person.*', 'name')
   * doesSelect(Person.query(), 'name', 'name')
   * doesSelect(Person.query(), 'name', 'Person.name')
   */
  static doesSelect(builder, selectionInBuilder, selectionToTest) {
    selectionInBuilder = ensureSelectionInstance(selectionInBuilder);
    selectionToTest = ensureSelectionInstance(selectionToTest);

    if (selectionInBuilder.column === '*') {
      if (selectionInBuilder.table) {
        if (selectionToTest.column === '*') {
          return selectionToTest.table === selectionInBuilder.table;
        } else {
          return (
            selectionToTest.table === null || selectionToTest.table === selectionInBuilder.table
          );
        }
      } else {
        return true;
      }
    } else {
      const selectionInBuilerTable = selectionInBuilder.table || builder.tableRef();

      if (selectionToTest.column === '*') {
        return false;
      } else {
        return (
          selectionToTest.column === selectionInBuilder.column &&
          (selectionToTest.table === null || selectionToTest.table === selectionInBuilerTable)
        );
      }
    }
  }
}

Object.defineProperties(Selection.prototype, {
  isObjectionSelection: {
    enumerable: false,
    writable: false,
    value: true
  }
});

function createSelectionFromReference(ref) {
  return new Selection(ref.tableName, ref.column, ref.alias);
}

function createSelectionFromString(selection) {
  let table = null;
  let column = null;
  let alias = null;

  if (ALIAS_REGEX.test(selection)) {
    const parts = selection.split(ALIAS_REGEX);

    selection = parts[0].trim();
    alias = parts[1].trim();
  }

  const dotIdx = selection.lastIndexOf('.');

  if (dotIdx !== -1) {
    table = selection.substr(0, dotIdx);
    column = selection.substr(dotIdx + 1);
  } else {
    column = selection;
  }

  return new Selection(table, column, alias);
}

function ensureSelectionInstance(selection) {
  if (isObject(selection) && selection.isObjectionSelection) {
    return selection;
  } else {
    return Selection.create(selection);
  }
}

module.exports = {
  Selection
};
