function visitModels(models, modelClass, visitor) {
  doVisit(models, modelClass, null, null, visitor);
}

function doVisit(models, modelClass, parent, rel, visitor) {
  if (Array.isArray(models)) {
    visitMany(models, modelClass, parent, rel, visitor);
  } else if (models) {
    visitOne(models, modelClass, parent, rel, visitor);
  }
}

function visitMany(models, modelClass, parent, rel, visitor) {
  for (let i = 0, l = models.length; i < l; ++i) {
    visitOne(models[i], modelClass, parent, rel, visitor);
  }
}

function visitOne(model, modelClass, parent, rel, visitor) {
  if (model) {
    visitor(model, modelClass, parent, rel);
  }

  const relations = modelClass.getRelationArray();

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relation = relations[i];
    doVisit(model[relation.name], relation.relatedModelClass, model, relation, visitor);
  }
}

module.exports = {
  visitModels
};
