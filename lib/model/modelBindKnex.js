const { inheritModel } = require('./inheritModel');
const { staticHiddenProps } = require('./modelUtils');
const { defineNonEnumerableProperty } = require('./modelUtils');

function bindKnex(ModelClass, knex) {
  let BoundModelClass = getBoundModelFromCache(ModelClass, knex);

  if (BoundModelClass === null) {
    BoundModelClass = inheritModel(ModelClass);
    BoundModelClass = copyHiddenProperties(ModelClass, BoundModelClass);

    BoundModelClass.knex(knex);

    BoundModelClass = putBoundModelToCache(ModelClass, BoundModelClass, knex);
    BoundModelClass = bindRelations(ModelClass, BoundModelClass, knex);
  }

  return BoundModelClass;
}

function getBoundModelFromCache(ModelClass, knex) {
  const cache = getCache(knex);
  const cacheKey = ModelClass.uniqueTag();

  return cache.get(cacheKey) || null;
}

function getCache(knex) {
  if (!knex.$$objection) {
    createCache(knex);
  }

  return knex.$$objection.boundModels;
}

function createCache(knex) {
  defineNonEnumerableProperty(knex, '$$objection', {
    boundModels: new Map()
  });
}

function copyHiddenProperties(ModelClass, BoundModelClass) {
  for (let i = 0, l = staticHiddenProps.length; i < l; ++i) {
    const prop = staticHiddenProps[i];

    // $$relations and $$relationArray are handled in separately.
    if (ModelClass.hasOwnProperty(prop) && prop !== '$$relations' && prop !== '$$relationArray') {
      defineNonEnumerableProperty(BoundModelClass, prop, ModelClass[prop]);
    }
  }

  return BoundModelClass;
}

function putBoundModelToCache(ModelClass, BoundModelClass, knex) {
  const cache = getCache(knex);
  const cacheKey = ModelClass.uniqueTag();

  cache.set(cacheKey, BoundModelClass);
  return BoundModelClass;
}

function bindRelations(ModelClass, BoundModelClass, knex) {
  const relations = ModelClass.getRelationArray();
  const boundRelations = Object.create(null);
  const boundRelationArray = [];

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relation = relations[i];
    const boundRelation = relation.bindKnex(knex);

    boundRelations[relation.name] = boundRelation;
    boundRelationArray.push(boundRelation);
  }

  defineNonEnumerableProperty(BoundModelClass, '$$relations', boundRelations);
  defineNonEnumerableProperty(BoundModelClass, '$$relationArray', boundRelationArray);

  return BoundModelClass;
}

module.exports = {
  bindKnex
};
