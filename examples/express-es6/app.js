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

// Adds yield support for express router.
require('express-yields')

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

// Register our REST API.
registerApi(app);

// Error handling. The `ValidationError` instances thrown by objection.js have a `statusCode`
// property that is sent as the status code of the response.
app.use((err, req, res, next) => {
  if (err) {
    res.status(err.statusCode || err.status || 500).send(err.data || err.message || {});
  } else {
    next();
  }
});

const server = app.listen(8641, () => {
  console.log('Example app listening at port %s', server.address().port);
});
