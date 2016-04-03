import _ from 'lodash';

const KnexQueryBuilder = require('knex/lib/query/builder');
const KnexRaw = require('knex/lib/raw');
let QueryBuilderBase = null;

export default function (ModelClass, obj) {
  if (QueryBuilderBase === null) {
    // Lazy loading to prevent circular deps.
    QueryBuilderBase = require('../queryBuilder/QueryBuilderBase').default;
  }

  const needsSplit = _.any(obj, value => isQueryProp);

  if (needsSplit) {
    return split(obj);
  } else {
    return {
      json: obj,
      query: null
    };
  }
}

function isQueryProp(value) {
  return value instanceof KnexQueryBuilder || value instanceof QueryBuilderBase || value instanceof KnexRaw;
}

function split(obj) {
  let ret = {
    json: {},
    query: {}
  };

  _.each(obj, (value, key) => {
    if (value instanceof KnexQueryBuilder || value instanceof KnexRaw) {
      ret.query[key] = value;
    } else if (value instanceof QueryBuilderBase) {
      ret.query[key] = value.build();
    } else {
      ret.json[key] = value;
    }
  });

  return ret;
}