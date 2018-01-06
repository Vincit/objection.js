'use strict';

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
let errorHandler = (() => {
  var _ref = _asyncToGenerator(function* (ctx, next) {
    try {
      yield next();
    } catch (err) {
      ctx.status = err.statusCode || err.status || 500;
      ctx.body = err.data || err.message || {};
      ctx.app.emit('error', err, ctx);
    }
  });

  return function errorHandler(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

var _knex = require('knex');

var _knex2 = _interopRequireDefault(_knex);

var _koa = require('koa');

var _koa2 = _interopRequireDefault(_koa);

var _koaMorgan = require('koa-morgan');

var _koaMorgan2 = _interopRequireDefault(_koaMorgan);

var _koaBodyparser = require('koa-bodyparser');

var _koaBodyparser2 = _interopRequireDefault(_koaBodyparser);

var _koaRouter = require('koa-router');

var _koaRouter2 = _interopRequireDefault(_koaRouter);

var _knexfile = require('../knexfile');

var _knexfile2 = _interopRequireDefault(_knexfile);

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _objection = require('objection');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

// Initialize knex.
const knex = (0, _knex2.default)(_knexfile2.default.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
_objection.Model.knex(knex);

const router = new _koaRouter2.default();

const app = new _koa2.default().use(errorHandler).use((0, _koaMorgan2.default)('dev')).use((0, _koaBodyparser2.default)()).use(router.routes());

// Register our REST API.
(0, _api2.default)(router);

const server = app.listen(8641, () => {
  console.log('Example app listening at port %s', server.address().port);
});