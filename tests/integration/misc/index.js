const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = session => {
  describe('misc', () => {
    fs
      .readdirSync(__dirname)
      .filter(file => _.endsWith(file, '.js'))
      .filter(file => file !== 'index.js')
      .forEach(file => require(path.join(__dirname, file))(session));
  });
};
