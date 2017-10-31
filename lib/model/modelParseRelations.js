'use strict';

function parseRelationsIntoModelInstances(model, json, options) {
  const ModelClass = model.constructor;
  const relations = ModelClass.getRelationArray();

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relation = relations[i];
    const relationName = relation.name;
    const relationJson = json[relationName];

    if (relationJson !== undefined) {
      model[relationName] = parseRelationIntoModelInstances(relationJson, relation, options);
    }
  }
}

function parseRelationIntoModelInstances(json, relation, options) {
  if (Array.isArray(json)) {
    const models = new Array(json.length);

    for (let i = 0, l = json.length; i < l; ++i) {
      models[i] = parseRelationObjectIntoModelInstance(json[i], relation, options);
    }

    return models;
  } else if (json) {
    return parseRelationObjectIntoModelInstance(json, relation, options);
  } else {
    return null;
  }
}

function parseRelationObjectIntoModelInstance(json, relation, options) {
  if (json && typeof json === 'object') {
    return relation.relatedModelClass.ensureModel(json, options);
  } else {
    return json;
  }
}

module.exports = {
  parseRelationsIntoModelInstances
};
