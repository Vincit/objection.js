'use strict';

const { inheritModel } = require('./inheritModel');
const { staticHiddenProps } = require('./modelUtils');
const { defineNonEnumerableProperty } = require('./modelUtils');

function bindKnex(modelClass, knex) {
  let BoundModelClass = getBoundModelFromCache(modelClass, knex);

  if (BoundModelClass === null) {
    BoundModelClass = inheritModel(modelClass);
    BoundModelClass = copyHiddenProperties(modelClass, BoundModelClass);

    BoundModelClass.knex(knex);

    BoundModelClass = putBoundModelToCache(modelClass, BoundModelClass, knex);
    BoundModelClass = bindRelations(modelClass, BoundModelClass, knex);
  }

  return BoundModelClass;
}

function getBoundModelFromCache(modelClass, knex) {
  const cache = getCache(knex);
  const cacheKey = modelClass.uniqueTag();

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

function copyHiddenProperties(modelClass, BoundModelClass) {
  for (let i = 0, l = staticHiddenProps.length; i < l; ++i) {
    const prop = staticHiddenProps[i];

    // $$relations and $$relationArray are handled in separately.
    if (modelClass.hasOwnProperty(prop) && prop !== '$$relations' && prop !== '$$relationArray') {
      defineNonEnumerableProperty(BoundModelClass, prop, modelClass[prop]);
    }
  }

  return BoundModelClass;
}

function putBoundModelToCache(modelClass, BoundModelClass, knex) {
  const cache = getCache(knex);
  const cacheKey = modelClass.uniqueTag();

  cache.set(cacheKey, BoundModelClass);
  return BoundModelClass;
}

function bindRelations(modelClass, BoundModelClass, knex) {
  const relations = modelClass.getRelationArray();
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
