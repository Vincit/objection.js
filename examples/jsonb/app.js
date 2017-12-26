// Connect to database with knex
var knexConfig = require('./knexfile');
var knex = require('knex')(knexConfig.development);
var objection = require('objection');
var _ = require('lodash');
var Promise = require('bluebird');
var util = require('util');

// Bind each model to knex separately
var db = {
  Hero: require('./models/Hero').bindKnex(knex),
  Place: require('./models/Place').bindKnex(knex),
  truncate: function() {
    return Promise.all([this.Hero.query().delete(), this.Place.query().delete()]);
  }
};

var castleGreyskull = {
  name: 'Castle Grayskull',
  details: {
    color: 'Gray',
    looksLikeSkull: true
  },
  heroes: [
    {
      name: 'He-Man',
      details: {
        title: 'Master of the Universe',
        type: 'Hero',
        quote: 'by the power of Grayskull!',
        luckyNumbers: [1]
      }
    },
    {
      name: 'Teela',
      details: {
        type: 'Hero',
        magic: true,
        0: 'zero',
        luckyNumbers: [5, 7]
      }
    },
    {
      name: 'Orko',
      details: {
        type: 'Hero',
        title: 'Jester',
        magic: true,
        funniness: true,
        race: 'Trollan',
        luckyNumbers: [0]
      }
    }
  ]
};

var snakeMountain = {
  name: 'Snake Mountain',
  details: {
    color: 'Purple',
    looksLikeSnake: true
  },
  heroes: [
    {
      name: 'Skeletor',
      details: {
        title: 'Main Villain of the Evildoers',
        type: 'Villain',
        luckyNumbers: [4, 5, 9]
      }
    },
    {
      name: 'Evil-Lyn',
      details: [{}, 'race', [], 0]
    },
    {
      name: 'Faker',
      details: null
    }
  ]
};

db
  .truncate()
  .then(function() {
    return db.Place.query().insertWithRelated([castleGreyskull, snakeMountain]);
  })
  .then(function(data) {
    // Start doing the queries...
    console.log('Inserted data:', util.inspect(data, { colors: true, depth: null }));

    function testQuery(label, opts) {
      // Kids, don't try this at home!
      var builder = eval(label);
      var queryString = builder.toString();

      return function runQuery() {
        console.log('------', label, '-------');
        console.log(queryString);
        if (!opts || !opts.justDumpSql) {
          return builder.then(function(result) {
            console.log(JSON.stringify(result));
          });
        }
      };
    }

    return Promise.each(
      [
        testQuery(
          "db.Place.query().whereJsonIsObject('JustTable.imaColumn:the.same.sql.generated')",
          { justDumpSql: true }
        ),
        testQuery(
          "db.Place.query().whereJsonIsObject('JustTable.imaColumn:[the][same][sql][generated]')",
          { justDumpSql: true }
        ),
        testQuery("db.Hero.query().select('name').whereJsonHasAny('details', ['title', 'race'])"),
        testQuery("db.Hero.query().select('name').whereJsonHasAll('details', ['title', 'race'])"),
        testQuery("db.Hero.query().select('name').whereJsonHasAny('details', ['0'])"),
        // key order doesn't matter
        testQuery(
          "db.Place.query().select('name').whereJsonEquals('details', { looksLikeSnake: true, color: 'Purple' })"
        ),
        testQuery(
          "db.Hero.query().select('name').whereJsonEquals('details:funniness', 'details:magic')"
        ),
        testQuery(
          "db.Hero.query().select('name').whereJsonNotEquals('details:luckyNumbers', [ 0 ])"
        ),
        testQuery(
          "db.Place.query().select('name').whereJsonEquals('details:nonExisting1', 'details:nonExisting2')"
        ),
        testQuery(
          "db.Place.query().select('name').whereJsonNotEquals('details:nonExisting1', 'details:nonExisting1')"
        ),
        testQuery(
          "db.Hero.query().select('name').whereJsonSupersetOf('details', { type: 'Hero' })"
        ),
        // all objects / arrays are their own subs- and supersets / order doesn't matter
        testQuery(
          "db.Hero.query().select('name').whereJsonSubsetOf('details:luckyNumbers', [9,5,4])"
        ),
        // with additional key
        testQuery(
          "db.Place.query().select('name').whereJsonSubsetOf('details', { color: 'Purple', looksLikeSnake: true, containsVillains: true })"
        ),
        // field type object
        testQuery("db.Hero.query().select('name').whereJsonIsObject('details')"),
        // field type array
        testQuery("db.Hero.query().select('name').whereJsonIsArray('details')"),
        // field type with not also returns those rows, where referred field doesn't to return e.g. null columns
        testQuery("db.Hero.query().select('name').whereJsonNotObject('details')"),
        // querying string in certain field
        testQuery(
          "db.Hero.query().select('name').whereJsonField('details:title', 'ilike', '%master%')"
        ),
        // querying by number
        testQuery(
          "db.Hero.query().select('name').whereJsonField('details:luckyNumbers[1]', '=', 7)"
        ),
        // querying by null...
        testQuery(
          "db.Hero.query().select('name').whereJsonField('details:luckyNumbers[1]', 'IS', null)"
        )
      ],
      function(val) {
        return val();
      }
    );
  })
  .catch(function(err) {
    console.log('Error', err);
    throw err;
  })
  .finally(function() {
    knex.destroy();
  });
