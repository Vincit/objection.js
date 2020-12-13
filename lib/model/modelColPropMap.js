'use strict';

const { difference } = require('../utils/objectUtils');

function columnNameToPropertyName(modelClass, columnName) {
  const model = new modelClass();
  const addedProps = Object.keys(model.$parseDatabaseJson({}));

  const row = {};
  row[columnName] = null;

  const props = Object.keys(model.$parseDatabaseJson(row));
  const propertyName = difference(props, addedProps)[0];

  return propertyName || columnName;
}

function propertyNameToColumnName(modelClass, propertyName) {
  const model = new modelClass();
  const addedCols = Object.keys(model.$formatDatabaseJson({}));

  const obj = {};
  obj[propertyName] = null;

  const cols = Object.keys(model.$formatDatabaseJson(obj));
  const columnName = difference(cols, addedCols)[0];

  return columnName || propertyName;
}

module.exports = {
  columnNameToPropertyName,
  propertyNameToColumnName,
};
