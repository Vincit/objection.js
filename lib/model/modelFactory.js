'use strict';

const isKnexQueryBuilder = require('../utils/knexUtils').isKnexQueryBuilder;
const isKnexRaw = require('../utils/knexUtils').isKnexRaw;

function fromJson(args) {
  const json = args.json;
  const modelClass = args.modelClass;
  const modelOptions = args.modelOptions;

  if (args.deep) {
    return fromJsonDeep(json, modelClass, modelOptions);
  } else {
    return fromJsonShallow(json, modelClass, modelOptions);
  }
}

function toDatabaseJson(args) {
  const model = args.model;
  const queryProps = args.queryProps;
  const knex = args.knex;
  
  const json = model.$toDatabaseJson();
  const modelClass = model.constructor;

  if (queryProps) {
    const query = queryProps.get(model);

    if (query) {
      const keys = Object.keys(query);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const key = keys[i];
        let queryProp = query[key];

        if (queryProp) {
          if (queryProp.isObjectionQueryBuilderBase) {
            queryProp = queryProp.build();
          } else if (queryProp.isObjectionReferenceBuilder) {
            queryProp = queryProp.build(knex);
          } else if (queryProp.isObjectionRawBuilder) {
            queryProp = queryProp.build(knex);
          }
        }

        json[modelClass.propertyNameToColumnName(key)] = queryProp;
      }
    }
  }

  return json;
}

function fromJsonDeep(obj, modelClass, modelOptions) {
  const queryProps = new Map();

  const ctx = {
    modelOptions,
    queryProps
  };

  const model = splitDeep(obj, modelClass, ctx);

  return {
    model,
    queryProps
  };
}

function fromJsonShallow(obj, modelClass, modelOptions) {
  const queryProps = new Map();

  let model;

  if (Array.isArray(obj)) {
    model = obj.map(obj => doSplit(obj, modelClass, queryProps, modelOptions));
  } else {
    model = doSplit(obj, modelClass, queryProps, modelOptions);
  }

  return {
    model,
    queryProps
  };
}

function splitDeep(objs, modelClass, ctx) {
  if (Array.isArray(objs)) {
    return splitDeepMany(objs, modelClass, ctx);
  } else if (objs) {
    return splitDeepOne(objs, modelClass, ctx);
  }
}

function splitDeepMany(objs, modelClass, ctx) {
  const models = new Array(objs.length);

  for (let i = 0, l = objs.length; i < l; ++i) {
    models[i] = splitDeepOne(objs[i], modelClass, ctx);
  }

  return models;
}

function splitDeepOne(obj, modelClass, ctx) {
  const relations = modelClass.getRelationArray();
  const model = doSplit(obj, modelClass, ctx.queryProps, ctx.modelOptions);

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relation = relations[i];
    const relatedObjs = obj[relation.name];
    const relatedModelClass = relation.relatedModelClass;

    if (relatedObjs) {
      model[relation.name] = splitDeep(relatedObjs, relatedModelClass, ctx);
    } else if (relatedObjs !== undefined) {
      model[relation.name] = relatedObjs;
    }
  }

  return model;
}

function doSplit(obj, modelClass, queryProps, modelOpt) {
  let query = {};
  let model = {};

  const keys = Object.keys(obj);
  let hasQueries = false;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = obj[key];

    if (isQueryProp(value)) {
      hasQueries = true;
      query[key] = value;
    } else {
      model[key] = value;
    }
  }

  model = modelClass.fromJson(model, modelOpt);

  if (hasQueries) {
    queryProps.set(model, query);
  }

  return model;
}

function isQueryProp(value) {
  if (!value) {
    return false;
  }

  return isKnexQueryBuilder(value)
    || isKnexRaw(value)
    || value.isObjectionQueryBuilderBase
    || value.isObjectionReferenceBuilder
    || value.isObjectionRawBuilder;
}

module.exports = {
  fromJson,
  toDatabaseJson
};