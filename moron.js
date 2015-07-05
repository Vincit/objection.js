module.exports = {
  ModelBase: require('./src/ModelBase'),
  Model: require('./src/Model'),
  QueryBuilder: require('./src/QueryBuilder'),
  RelationExpression: require('./src/RelationExpression'),
  ValidationError: require('./src/ValidationError'),

  Relation: require('./src/relations/Relation'),
  OneToOneRelation: require('./src/relations/OneToOneRelation'),
  OneToManyRelation: require('./src/relations/OneToManyRelation'),
  ManyToManyRelation: require('./src/relations/ManyToManyRelation'),

  transaction: require('./src/transaction'),

  // Backwards compatibility. This change was made when the library probably had 10 users. So
  // these can be removed as soon as semver rules allow it.
  MoronModelBase: require('./src/ModelBase'),
  MoronModel: require('./src/Model'),
  MoronQueryBuilder: require('./src/QueryBuilder'),
  MoronRelationExpression: require('./src/RelationExpression'),
  MoronValidationError: require('./src/ValidationError'),
  MoronRelation: require('./src/relations/Relation'),
  MoronOneToOneRelation: require('./src/relations/OneToOneRelation'),
  MoronOneToManyRelation: require('./src/relations/OneToManyRelation'),
  MoronManyToManyRelation: require('./src/relations/ManyToManyRelation')
};
