var express = require('express');
var knexConfig = require('./knexfile');
var MoronModel = require('moron').MoronModel;

// Create knex instance. We use sqlite in this example project for simplicity.
var knex = require('knex')(knexConfig.development);

// Bind all MoronModels to the knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the MoronModel.bindKnex method.
MoronModel.knex(knex);

var app = express()
  .use(require('body-parser').json())
  .use(require('morgan')('dev'))
  .set('json spaces', 2);

// Register our REST API.
require('./api')(app);

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
