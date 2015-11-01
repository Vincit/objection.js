'use strict';

try {
  module.exports = require('./inheritModelEs6');
} catch (err) {
  module.exports = require('./inheritModelEs5');
}
