'use strict';

// A small helper method for cached lazy-importing of the Model class.
let Model;
const getModel = () => Model || (Model = require('./Model').Model);

module.exports = {
  getModel,
};
