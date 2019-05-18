'use strict';

const { Model: NativeModel } = require('./model/Model');
const { QueryBuilder: NativeQueryBuilder } = require('./queryBuilder/QueryBuilder');
const { QueryBuilderBase } = require('./queryBuilder/QueryBuilderBase');
const { QueryBuilderOperation } = require('./queryBuilder/operations/QueryBuilderOperation');
const { RelationExpression } = require('./queryBuilder/RelationExpression');
const { ValidationError } = require('./model/ValidationError');
const { NotFoundError } = require('./model/NotFoundError');
const { AjvValidator: NativeAjvValidator } = require('./model/AjvValidator');
const { Validator: NativeValidator } = require('./model/Validator');
const { Relation } = require('./relations/Relation');
const { HasOneRelation } = require('./relations/hasOne/HasOneRelation');
const { HasManyRelation } = require('./relations/hasMany/HasManyRelation');
const { BelongsToOneRelation } = require('./relations/belongsToOne/BelongsToOneRelation');
const { HasOneThroughRelation } = require('./relations/hasOneThrough/HasOneThroughRelation');
const { ManyToManyRelation } = require('./relations/manyToMany/ManyToManyRelation');
const { transaction } = require('./transaction');

const {
  snakeCaseMappers,
  knexSnakeCaseMappers,
  knexIdentifierMapping
} = require('./utils/identifierMapping');
const { compose, mixin } = require('./utils/mixin');
const { ref } = require('./queryBuilder/ReferenceBuilder');
const { lit } = require('./queryBuilder/LiteralBuilder');
const { raw } = require('./queryBuilder/RawBuilder');

const { inherit } = require('../lib/utils/classUtils');
const { deprecate } = require('../lib/utils/deprecate');

// We need to wrap the classes, that people can inherit, with ES5 classes
// so that babel is able to use ES5 inheritance. sigh... Maybe people
// should stop transpiling node apps to ES5 in the year 2019? Node 6
// with full class support was released three years ago.

function Model() {
  // Nothing to do here.
}

function QueryBuilder(...args) {
  NativeQueryBuilder.init(this, ...args);
}

function Validator(...args) {
  NativeValidator.init(this, ...args);
}

function AjvValidator(...args) {
  NativeAjvValidator.init(this, ...args);
}

inherit(Model, NativeModel);
inherit(QueryBuilder, NativeQueryBuilder);
inherit(Validator, NativeValidator);
inherit(AjvValidator, NativeAjvValidator);

Model.QueryBuilder = QueryBuilder;

module.exports = {
  Model,
  QueryBuilder,
  QueryBuilderBase,
  QueryBuilderOperation,
  RelationExpression,
  ValidationError,
  NotFoundError,
  AjvValidator,
  Validator,
  Relation,
  HasOneRelation,
  HasManyRelation,
  BelongsToOneRelation,
  HasOneThroughRelation,
  ManyToManyRelation,

  transaction,
  compose,
  mixin,
  ref,
  lit,
  raw,

  snakeCaseMappers,
  knexSnakeCaseMappers,
  knexIdentifierMapping
};

Object.defineProperties(module.exports, {
  Promise: {
    enumerable: true,

    get: () => {
      deprecate(
        'objection.Promise is deprecated and will be removed in 2.0.0. Bluebird dependency will be removed in 2.0.0.'
      );
      return require('bluebird');
    }
  },

  lodash: {
    enumerable: true,

    get: () => {
      deprecate(
        'objection.lodash is deprecated and will be removed in 2.0.0. lodash dependency will be removed in 2.0.0.'
      );
      return require('lodash');
    }
  }
});
