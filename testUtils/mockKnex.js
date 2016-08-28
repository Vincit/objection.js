'use strict';

var _ = require('lodash');
var Knex = require('knex');
var Promise = require('knex').Promise;

module.exports = function (knex) {
  return new MockKnex(knex);
};

function MockKnex(knex) {
  this.knex = knex || Knex({client: 'pg'});
  this.results = [];
  this.executedQueries = [];
  this.originalThen = this.knex.client.QueryBuilder.prototype.then;

  var self = this;
  this.knex.client.QueryBuilder.prototype.then = function () {
    self.executedQueries.push(this.toString());

    if (!_.isEmpty(self.results)) {
      var promise = Promise.resolve(self.results.shift());
      return promise.then.apply(promise, arguments);
    } else {
      return self.originalThen.apply(this, arguments);
    }
  };
}

MockKnex.prototype.reset = function () {
  this.result = [];
  this.executedQueries = [];
};

MockKnex.prototype.teardown = function () {
  this.knex.client.QueryBuilder.prototype.then = this.originalThen;
};