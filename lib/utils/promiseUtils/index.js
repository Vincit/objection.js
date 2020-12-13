'use strict';

const { isPromise } = require('./isPromise');
const { after } = require('./after');
const { afterReturn } = require('./afterReturn');
const { mapAfterAllReturn } = require('./mapAfterAllReturn');
const { promiseMap } = require('./map');
const { promiseTry } = require('./try');

module.exports = {
  isPromise,
  after,
  afterReturn,
  mapAfterAllReturn,
  map: promiseMap,
  try: promiseTry,
};
