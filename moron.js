module.exports = {
  ModelBase: require('./lib/ModelBase'),
  Model: require('./lib/Model'),
  QueryBuilder: require('./lib/QueryBuilder'),
  RelationExpression: require('./lib/RelationExpression'),
  ValidationError: require('./lib/ValidationError'),

  Relation: require('./lib/relations/Relation'),
  OneToOneRelation: require('./lib/relations/OneToOneRelation'),
  OneToManyRelation: require('./lib/relations/OneToManyRelation'),
  ManyToManyRelation: require('./lib/relations/ManyToManyRelation'),

  transaction: require('./lib/transaction'),

  // Backwards compatibility. This change was made when the library probably had 10 users. So
  // these can be removed as soon as semver rules allow it.
  MoronModelBase: require('./lib/ModelBase'),
  MoronModel: require('./lib/Model'),
  MoronQueryBuilder: require('./lib/QueryBuilder'),
  MoronRelationExpression: require('./lib/RelationExpression'),
  MoronValidationError: require('./lib/ValidationError'),
  MoronRelation: require('./lib/relations/Relation'),
  MoronOneToOneRelation: require('./lib/relations/OneToOneRelation'),
  MoronOneToManyRelation: require('./lib/relations/OneToManyRelation'),
  MoronManyToManyRelation: require('./lib/relations/ManyToManyRelation')
};
