function transformOptionFromPath(opt, relPathFromRoot) {
  const lengthOfPath = relPathFromRoot.length;

  if (Array.isArray(opt)) {
    const updatedArray = opt
      .filter(
        optString => optString.startsWith(relPathFromRoot) && !(optString === relPathFromRoot)
      )
      .map(optString => optString.substring(lengthOfPath + 1));

    if (updatedArray.length === 0) {
      return false;
    }

    return updatedArray;
  }

  return opt;
}

module.exports = (options, relPathFromRoot) => {
  return Object.keys(options).reduce((acc, key) => {
    const transformedOpt = transformOptionFromPath(options[key], relPathFromRoot);

    if (transformedOpt) {
      acc[key] = transformedOpt;
    }

    return acc;
  }, {});
};
