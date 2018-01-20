function appendDataPath(dataPath, relationOrIndex) {
  const token =
    typeof relationOrIndex === 'number' ? `[${relationOrIndex}]` : `.${relationOrIndex.name}`;
  return dataPath ? `${dataPath}${token}` : token;
}

module.exports = {
  appendDataPath
};
