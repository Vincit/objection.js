function getSetId(model, maybeId) {
  if (maybeId !== undefined) {
    return setId(model, maybeId);
  } else {
    return getId(model);
  }
}

function hasId(model) {
  return model.$hasProps(model.constructor.getIdPropertyArray());
}

function setId(model, id) {
  const idProp = model.constructor.getIdProperty();
  const isCompositeId = Array.isArray(idProp);

  if (Array.isArray(id)) {
    if (isCompositeId) {
      if (id.length !== idProp.length) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      for (let i = 0; i < id.length; ++i) {
        model[idProp[i]] = id[i];
      }
    } else {
      if (id.length !== 1) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      model[idProp] = id[0];
    }
  } else {
    if (isCompositeId) {
      if (idProp.length > 1) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      model[idProp[0]] = id;
    } else {
      model[idProp] = id;
    }
  }
}

function getId(model) {
  const idProp = model.constructor.getIdProperty();
  const isCompositeId = Array.isArray(idProp);

  if (isCompositeId) {
    return model.$values(idProp);
  } else {
    return model[idProp];
  }
}

function isNullOrUndefined(val) {
  return val === null || val === undefined;
}

module.exports = {
  getSetId,
  hasId
};
