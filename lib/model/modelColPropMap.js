const { difference } = require('../utils/objectUtils');

function columnNameToPropertyName(ModelClass, columnName) {
  const model = new ModelClass();
  const addedProps = Object.keys(model.$parseDatabaseJson({}));

  const row = {};
  row[columnName] = null;

  const props = Object.keys(model.$parseDatabaseJson(row));
  const propertyName = difference(props, addedProps)[0];

  return propertyName || null;
}

function propertyNameToColumnName(ModelClass, propertyName) {
  const model = new ModelClass();
  const addedCols = Object.keys(model.$formatDatabaseJson({}));

  const obj = {};
  obj[propertyName] = null;

  const cols = Object.keys(model.$formatDatabaseJson(obj));
  const columnName = difference(cols, addedCols)[0];

  return columnName || null;
}

function idColumnToIdProperty(ModelClass, idColumn) {
  const idProperty = ModelClass.columnNameToPropertyName(idColumn);

  if (!idProperty) {
    throw new Error(
      ModelClass.name +
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
