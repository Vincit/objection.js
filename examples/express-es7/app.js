import _ from 'lodash';
import Knex from 'knex';
import morgan from 'morgan';
import express from 'express';
import bodyParser from 'body-parser';
import knexConfig from './knexfile';
import registerApi from './api';
import {MoronModel} from 'moron';

// Initialize knex.
let knex = Knex(knexConfig.development);

// Bind all MoronModels to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the MoronModel.bindKnex method.
MoronModel.knex(knex);

let app = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .set('json spaces', 2);
  
// Wrap the callback of each route method to a try-catch. This way
// we don't need to write a try-catch in each route callback.
['get', 'put', 'post', 'delete', 'patch'].map(function (routeMethodName) {
  let routeMethod = app[routeMethodName];
  
  app[routeMethodName] = function () {
    let args = _.toArray(arguments);
    let callback = _.last(args);
    
    if (_.isFunction(callback)) {
      args[args.length - 1] = function (req, res, next) {
        callback(req, res, next).catch(next);
      };
    }
    
    // Call the original method.
    return routeMethod.apply(this, args);
  };
});

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
