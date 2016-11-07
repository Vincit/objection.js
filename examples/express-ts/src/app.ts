import * as _ from 'lodash';
import * as Knex from 'knex';
import * as morgan from 'morgan';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import registerApi from './api';
import { Model } from 'objection';

const knexConfig = require('../knexfile');

// Initialize knex.
export const knex = Knex(knexConfig.development);

// Create or migrate:
knex.migrate.latest();

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

const app: express.Application = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .set('json spaces', 2);

monkeyPatchRouteMethods(app);

// Register our REST API.
registerApi(app);

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
app.use((err: any, req: express.Request, res: express.Response,next: express.NextFunction) => {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

const server = app.listen(8641, function () {
  console.log('Example app listening at port %s', server.address().port);
});

// Wrap each express route method with code that passes unhandled exceptions
// from async functions to the `next` callback. This way we don't need to
// wrap our route handlers in try-catch blocks.
function monkeyPatchRouteMethods(app: express.Application) {
  ['get', 'put', 'post', 'delete', 'patch'].forEach(function (routeMethodName) {
    const originalRouteMethod = app[routeMethodName];

    app[routeMethodName] = function () {
      const args = _.toArray(arguments);
      const originalRouteHandler = _.last(args);

      if (_.isFunction(originalRouteHandler)) {
        // Overwrite the route handler.
        args[args.length - 1] = function (req, res, next) {
          const ret = originalRouteHandler.call(app, req, res, next);

          // If the route handler returns a Promise (probably an async function) catch
          // the error and pass it to the next middleware.
          if (_.isObject(ret) && _.isFunction(ret.then) && _.isFunction(ret.catch)) {
            return ret.catch(next);
          } else {
            return ret;
          }
        };
      }

      return originalRouteMethod.apply(app, args);
    };
  });
}
