const { isNumber } = require('./objectUtils');

function appendDataPath(dataPath, relationOrIndex) {
  const token = isNumber(relationOrIndex) ? `[${relationOrIndex}]` : `.${relationOrIndex.name}`;
  return dataPath ? `${dataPath}${token}` : token;
}

module.exports = {
  appendDataPath
};
