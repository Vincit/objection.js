'use strict';

const _ = require('lodash');
const Knex = require('knex');
const morgan = require('morgan');
const express = require('express');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const knexConfig = require('./knexfile');
const registerApi = require('./api');
const Model = require('objection').Model;

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

const app = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .set('json spaces', 2);

monkeyPatchRouteMethods(app);

// Register our REST API.
registerApi(app);

// Error handling. The `ValidionError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
app.use(function (err, req, res, next) {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

const server = app.listen(8641, function () {
  console.log('Example app listening at port %s', server.address().port);
});

// Wrap each express route method with bluebird `Promise.coroutine` so that we can
// use generator functions and `yield` to simulate ES7 async-await pattern.
function monkeyPatchRouteMethods(app) {
  ['get', 'put', 'post', 'delete', 'patch'].forEach(function (routeMethodName) {
    const originalRouteMethod = app[routeMethodName];

    app[routeMethodName] = function () {
      const args = _.toArray(arguments);
      const originalRouteHandler = _.last(args);

      if (isGenerator(originalRouteHandler)) {
        const routeHandler = Promise.coroutine(originalRouteHandler);

        // Overwrite the route handler.
        args[args.length - 1] = function (req, res, next) {
          routeHandler(req, res, next).catch(next);
        };
      }

      return originalRouteMethod.apply(this, args);
    };
  });
}

function isGenerator(fn) {
  return fn && fn.constructor && fn.constructor.name === 'GeneratorFunction';
}
