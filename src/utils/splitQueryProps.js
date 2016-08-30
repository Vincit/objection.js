const KnexQueryBuilder = require('knex/lib/query/builder');
const KnexRaw = require('knex/lib/raw');
let QueryBuilderBase = null;

export default function (ModelClass, obj) {
  if (QueryBuilderBase === null) {
    // Lazy loading to prevent circular deps.
    QueryBuilderBase = require('../queryBuilder/QueryBuilderBase').default;
  }

  const keys = Object.keys(obj);
  let needsSplit = false;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = obj[key];

    if (value instanceof KnexQueryBuilder || value instanceof QueryBuilderBase || value instanceof KnexRaw) {
      needsSplit = true;
      break;
    }
  }

  if (needsSplit) {
    return split(obj);
  } else {
    return {json: obj, query: null};
  }
}

function split(obj) {
  const ret = {json: {}, query: {}};
  const keys = Object.keys(obj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = obj[key];

    if (value instanceof KnexQueryBuilder || value instanceof KnexRaw) {
      ret.query[key] = value;
    } else if (value instanceof QueryBuilderBase) {
      ret.query[key] = value.build();
    } else {
      ret.json[key] = value;
    }
  }

  return ret;
}