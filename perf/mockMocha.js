var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function () {
  var rootScope = new Scope('root');
  var currentScope = rootScope;
  var onlyTest = null;

  function Scope(name) {
    this.name = name;
    this.childScopes = {};

    this.tests = {};
    this.beforeEach = [];
    this.before = [];
    this.afterEach = [];
    this.after = [];

    var self = this;
    this.run = function () {
      var promise = Promise.resolve();

      _.each(self.before, function (before) {
        promise = promise.then(function () {
          return before();
        });
      });

      if (onlyTest == null || _.includes(self.tests, onlyTest)) {
        console.log('scope:', self.name);

        _.each(self.tests, function (test, testName) {
          if (onlyTest !== null && test !== onlyTest) {
            return;
          }

          promise = promise.then(function () {
            var innerPromise = Promise.resolve();

            _.each(self.beforeEach, function (beforeEach) {
              innerPromise = innerPromise.then(function () {
                return beforeEach();
              });
            });

            innerPromise = innerPromise.then(function () {
              console.log('test:', testName);
              return test();
            });

            _.each(self.afterEach, function (afterEach) {
              innerPromise = innerPromise.then(function () {
                return afterEach();
              });
            });

            return innerPromise;
          });
        });
      }

      _.each(this.childScopes, function (childScope) {
        promise = promise.then(function () {
          return childScope.run();
        });
      });

      _.each(self.after, function (after) {
        promise = promise.then(function () {
          return after();
        });
      });

      return promise;
    }
  }

  function it(testName, func) {
    currentScope.tests[testName] = func;
  }

  it.only = function (testName, func) {
    currentScope.tests[testName] = func;
    onlyTest = func;
  };

  return {
    describe: function describe(description, func) {
      var scope = new Scope(description);
      var oldCurrentScope = currentScope;

      currentScope.childScopes[description] = scope;
      currentScope = scope;

      func();

      currentScope = oldCurrentScope;
    },

    before: function before(func) {
      currentScope.before.push(func);
    },

    beforeEach: function beforeEach(func) {
      currentScope.beforeEach.push(func);
    },

    after: function after(func) {
      currentScope.after.push(func);
    },

    afterEach: function afterEach(func) {
      currentScope.afterEach.push(func);
    },

    it: it,

    run: function () {
      return rootScope.run();
    }
  };
};