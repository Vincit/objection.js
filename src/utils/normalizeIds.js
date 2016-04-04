import _ from 'lodash';

export default function (ids, expectedProperties, opt) {
  opt = opt || {};

  if (!_.isArray(expectedProperties)) {
    throw new Error(`expected expectedProperties to be an array, got ${expectedProperties}`);
  }

  if (expectedProperties.length === 0) {
    throw new Error(`expectedProperties must not be empty`);
  }

  let isComposite = expectedProperties.length > 1;

  if (isComposite) {
    // For composite ids these are okay:
    //
    // 1. [1, 'foo', 4]
    // 2. {a: 1, b: 'foo', c: 4}
    // 3. [[1, 'foo', 4], [4, 'bar', 1]]
    // 4. [{a: 1, b: 'foo', c: 4}, {a: 4, b: 'bar', c: 1}]
    //
    if (_.isArray(ids)) {
      if (_.isArray(ids[0])) {
        // 3.
        ids = _.map(ids, item => convertIdArrayToObject(item, expectedProperties));
      } else if (_.isObject(ids[0])) {
        // 4.
        ids = _.map(ids, ensureObject);
      } else {
        // 1.
        ids = [convertIdArrayToObject(ids, expectedProperties)];
      }
    } else if (_.isObject(ids)) {
      // 2.
      ids = [ids];
    } else {
      throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
    }
  } else {
    // For non-composite ids, these are okay:
    //
    // 1. 1
    // 2. {id: 1}
    // 3. [1, 'foo', 4]
    // 4. [{id: 1}, {id: 'foo'}, {id: 4}]
    //
    if (_.isArray(ids)) {
      if (_.isObject(ids[0])) {
        // 4.
        ids = _.map(ids, ensureObject);
      } else {
        // 3.
        ids = _.map(ids, item => _.zipObject(expectedProperties, [item]));
      }
    } else if (_.isObject(ids)) {
      // 2.
      ids = [ids];
    } else {
      // 1.
      ids = [_.zipObject(expectedProperties, [ids])];
    }
  }

  _.each(ids, obj => {
    _.each(expectedProperties, prop => {
      if (_.isUndefined(obj[prop])) {
        throw new Error(`expected id ${JSON.stringify(obj)} to have property ${prop}`);
      }
    });
  });

  if (opt.arrayOutput) {
    return _.map(ids, obj => _.map(expectedProperties, prop => obj[prop]));
  } else {
    return ids;
  }
};

function convertIdArrayToObject(ids, expectedProperties) {
  if (!_.isArray(ids)) {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }

  if (ids.length != expectedProperties.length) {
    throw new Error(`composite identifier ${JSON.stringify(ids)} should have ${expectedProperties.length} values`);
  }

  return _.zipObject(expectedProperties, ids);
}

function ensureObject(ids) {
  if (_.isObject(ids)) {
    return ids;
  } else {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }
}