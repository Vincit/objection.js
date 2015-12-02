// Connect to database with knex
var knexConfig = require('./knexfile');
var knex = require('knex')(knexConfig.development);
var objection = require('objection');
var _ = require('lodash');
var Promise = require('bluebird');

// Bind each model to knex separately
var db = {
  Hero : require('./models/Hero').bindKnex(knex),
  Place : require('./models/Place').bindKnex(knex),
  truncate: function () {
    return Promise.all([
      this.Hero.query().delete(),
      this.Place.query().delete()
    ]);
  }
};

var castleGreyskull = {
  name: 'Castle Grayskull',
  details: {
    color: 'Gray'
  },
  heroes : [
    {
      name: 'He-Man',
      details: {
        title: 'Master of the Universe',
        type: 'Hero',
        quote: 'by the power of the Grayskull!'
      }
    }, {
      name: 'Teela',
      details: {
        type: 'Hero'
      }
    }
  ]
};

var snakeMountain = {
  name: 'Snake Mountain',
  details: {
    color: 'Purple'
  },
  heroes : [
    {
      name: 'Skeletor',
      details: {
        title: 'Main Villain of the Evildoers',
        type: 'Villain'
      }
    }, {
      name: 'Evilyn',
      details: [ "I", "Just", "Broke", "The", "Rules" ]
    }
  ]
};

db.truncate().then(function () {
  return db.Place.query().insertWithRelated([castleGreyskull, snakeMountain]);
})
.then(function (data) {
  // Start doing the queries...
  console.log(data);
})
.catch(function (err) {
  console.log("Error", err);
  throw err;
})
.finally(function () {
  knex.destroy();
});
