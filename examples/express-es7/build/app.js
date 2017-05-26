'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _knex = require('knex');

var _knex2 = _interopRequireDefault(_knex);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _expressPromiseRouter = require('express-promise-router');

var _expressPromiseRouter2 = _interopRequireDefault(_expressPromiseRouter);

var _knexfile = require('../knexfile');

var _knexfile2 = _interopRequireDefault(_knexfile);

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _objection = require('objection');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Initialize knex.
var knex = (0, _knex2.default)(_knexfile2.default.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
_objection.Model.knex(knex);

var router = (0, _expressPromiseRouter2.default)();
var app = (0, _express2.default)().use(_bodyParser2.default.json()).use((0, _morgan2.default)('dev')).use(router).set('json spaces', 2);

// Register our REST API.
(0, _api2.default)(router);

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
app.use(function (err, req, res, next) {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

var server = app.listen(8641, function () {
  console.log('Example app listening at port %s', server.address().port);
});