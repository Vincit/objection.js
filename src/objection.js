import ModelBase from './model/ModelBase';
import Model from './model/Model';
import QueryBuilderBase from './queryBuilder/QueryBuilderBase';
import QueryBuilder from './queryBuilder/QueryBuilder';
import RelationExpression from './queryBuilder/RelationExpression';
import ValidationError from './ValidationError';

import Relation from './relations/Relation';
import HasOneRelation from './relations/HasOneRelation';
import HasManyRelation from './relations/HasManyRelation';
import BelongsToOneRelation from './relations/BelongsToOneRelation';
import ManyToManyRelation from './relations/ManyToManyRelation';

import transaction from './transaction';
import Promise from 'bluebird';

export {
  ModelBase,
  Model,
  QueryBuilder,
  QueryBuilderBase,
  RelationExpression,
  ValidationError,
  Relation,
  HasOneRelation,
  HasManyRelation,
  BelongsToOneRelation,
  ManyToManyRelation,
  transaction,
  Promise
};

Object.defineProperty(module.exports, "OneToOneRelation", {
  get: function () {
    console.warn(`OneToOneRelation is deprecated and will be removed in version 0.7.0. Use BelongsToOneRelation instead. Simply replace OneToOneRelation with BelongsToOneRelation.`);
    return BelongsToOneRelation;
  }
});

Object.defineProperty(module.exports, "OneToManyRelation", {
  get: function () {
    console.warn(`OneToManyRelation is deprecated and will be removed in version 0.7.0. Use HasManyRelation instead. Simply replace OneToManyRelation with HasManyRelation.`);
    return HasManyRelation;
  }
});
