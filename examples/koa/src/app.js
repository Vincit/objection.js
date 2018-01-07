import Knex from 'knex';
import Koa from 'koa';
import json from 'koa-json';
import logger from 'koa-morgan';
import bodyparser from 'koa-bodyparser';
import Router from 'koa-router';
import knexConfig from '../knexfile';
import registerApi from './api';
import {Model, ValidationError} from 'objection';

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500;
    if (err instanceof ValidationError) {
      ctx.body = {message: 'Invalid request parameter(s)', data: err.data};
    } else if (ctx.status === 500) {
      ctx.app.emit('error', err, ctx);
    } else {
      ctx.body = {message: err.message || 'An error occurred'};
    }
  }
}

const router = new Router();

const app = new Koa()
  .use(json({pretty: true}))
  .use(errorHandler)
  .use(logger('dev'))
  .use(bodyparser())
  .use(router.routes());

// Register our REST API.
registerApi(router);

const server = app.listen(8641, () => {
  console.log('Example app listening at port %s', server.address().port);
});
