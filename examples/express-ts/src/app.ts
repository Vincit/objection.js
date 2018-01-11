import registerApi from './api';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as promiseRouter from 'express-promise-router';
import * as Knex from 'knex';
import * as morgan from 'morgan';
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

const router = promiseRouter();
const app = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .use(router)
  .set('json spaces', 2);

// Register our REST API.
registerApi(router);

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

const server = app.listen(8641, function() {
  console.log('Example app listening at port %s', server.address().port);
});
