import _ from 'lodash';
import Knex from 'knex';
import morgan from 'morgan';
import express from 'express';
import bodyParser from 'body-parser';
import knexConfig from './knexfile';
import registerApi from './api';
import {Model} from 'moron';

// Initialize knex.
let knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

let app = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .set('json spaces', 2);

monkeyPatchRouteMethods(app);

// Register our REST API.
registerApi(app);

// Error handling.
app.use(function (err, req, res, next) {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

let server = app.listen(8641, function () {
  console.log('Example app listening at port %s', server.address().port);
});

// Wrap each express route method with code that passes unhandled exceptions
// from async functions to the `next` callback. This way we don't need to
// wrap our route handlers in try-catch blocks.
function monkeyPatchRouteMethods(app) {
  ['get', 'put', 'post', 'delete', 'patch'].forEach(function (routeMethodName) {
    let originalRouteMethod = app[routeMethodName];

    app[routeMethodName] = function () {
      let args = _.toArray(arguments);
      let originalRouteHandler = _.last(args);

      if (_.isFunction(originalRouteHandler)) {
        // Overwrite the route handler.
        args[args.length - 1] = function (req, res, next) {
          let ret = originalRouteHandler.call(this, req, res, next);

          // If the route handler returns a Promise (probably an async function) catch
          // the error and pass it to the next middleware.
          if (_.isObject(ret) && _.isFunction(ret.then) && _.isFunction(ret.catch)) {
            return ret.catch(next);
          } else {
            return ret;
          }
        };
      }

      return originalRouteMethod.apply(this, args);
    };
  });
}
