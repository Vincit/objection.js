/**
 * @param {Array.<Model|Object>|Model|Object} models
 * @param {Constructor.<Model>} modelClass
 * @param {function(model, modelClass, parent, relation)} visitor
 */
export function visitModels(models, modelClass, visitor) {
  doVisit(models, modelClass, null, null, Object.create(null), visitor);
}

function doVisit(models, modelClass, parent, rel, relCache, visitor) {
  if (Array.isArray(models)) {
    visitMany(models, modelClass, parent, rel, relCache, visitor);
  } else if (models) {
    visitOne(models, modelClass, parent, rel, relCache, visitor);
  }
}

function visitMany(models, modelClass, parent, rel, relCache, visitor) {
  for (let i = 0, l = models.length; i < l; ++i) {
    visitOne(models[i], modelClass, parent, rel, relCache, visitor);
  }
}

function visitOne(model, modelClass, parent, rel, relCache, visitor) {
  if (model) {
    visitor(model, modelClass, parent, rel);
  }

  const rels = getRelations(modelClass, relCache);

  for (let i = 0, l = rels.length; i < l; ++i) {
    const relation = rels[i];
    const relName = relation.name;
    const relatedModelClass = relation.relatedModelClass;
    const related = model[relName];

    doVisit(related, relatedModelClass, model, relation, relCache, visitor);
  }
}

function getRelations(modelClass, relCache) {
  const modelTag = modelClass.uniqueTag();
  let rels = relCache[modelTag];

  if (!rels) {
    rels = createRelations(modelClass);
    relCache[modelTag] = rels;
  }

  return rels;
}

function createRelations(modelClass) {
  const relations = modelClass.getRelations();
  const relNames = Object.keys(relations);
  const rels = new Array(relNames.length);

  for (let i = 0, l = relNames.length; i < l; ++i) {
    rels[i] = relations[relNames[i]];
  }

  return rels;
}