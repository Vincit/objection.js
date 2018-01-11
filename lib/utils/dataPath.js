function getDataPath(dataPath, property, isArray = false) {
  const token = typeof property === 'number' ? `[${property}]` : `.${property}`;
  return dataPath ? `${dataPath}${token}` : token;
}

module.exports = {
  getDataPath
};
