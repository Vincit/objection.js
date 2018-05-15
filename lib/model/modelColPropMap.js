const { difference } = require('../utils/objectUtils');

function columnNameToPropertyName(modelClass, columnName) {
  const model = new modelClass();
  const addedProps = Object.keys(model.$parseDatabaseJson({}));

  const row = {};
  row[columnName] = null;

  const props = Object.keys(model.$parseDatabaseJson(row));
  const propertyName = difference(props, addedProps)[0];

  return propertyName || null;
}

function propertyNameToColumnName(modelClass, propertyName) {
  const model = new modelClass();
  const addedCols = Object.keys(model.$formatDatabaseJson({}));

  const obj = {};
  obj[propertyName] = null;

  const cols = Object.keys(model.$formatDatabaseJson(obj));
  const columnName = difference(cols, addedCols)[0];

  return columnName || null;
}

function idColumnToIdProperty(modelClass, idColumn) {
  const idProperty = modelClass.columnNameToPropertyName(idColumn);

  if (!idProperty) {
    throw new Error(
      modelClass.name +
        '.$parseDatabaseJson probably changes the value of the id column `' +
        idColumn +
        '` which is a no-no.'
    );
  }

  return idProperty;
}

module.exports = {
  columnNameToPropertyName,
  propertyNameToColumnName,
  idColumnToIdProperty
};
