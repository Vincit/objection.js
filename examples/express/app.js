var _ = require('lodash');
var Knex = require('knex');
var morgan = require('morgan');
var express = require('express');
var bodyParser = require('body-parser');
var knexConfig = require('./knexfile');
var registerApi = require('./api');
var MoronModel = require('moron').MoronModel;

// Initialize knex.
var knex = Knex(knexConfig.development);

// Bind all MoronModels to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the MoronModel.bindKnex method.
MoronModel.knex(knex);

var app = express()
  .use(bodyParser.json())
  .use(morgan('dev'))
  .set('json spaces', 2);

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

var server = app.listen(8641, function () {
  console.log('Example app listening at port %s', server.address().port);
});
