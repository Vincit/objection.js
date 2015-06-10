"use strict";

var _ = require('lodash')
  , MoronModelBase = require('./MoronModelBase')
  , MoronQueryBuilder = require('./MoronQueryBuilder')
  , MoronRelationExpression = require('./MoronRelationExpression')
  , MoronValidationError = require('./MoronValidationError')
  , MoronEagerFetcher = require('./MoronEagerFetcher')
  , MoronRelation = require('./relations/MoronRelation')
  , MoronHasOneRelation = require('./relations/MoronHasOneRelation')
  , MoronHasManyRelation = require('./relations/MoronHasManyRelation')
  , MoronManyToManyRelation = require('./relations/MoronManyToManyRelation');

/**
 * Subclasses of this class represent database tables.
 *
 * Subclass can be created like this:
 *
 * ```js
 * function Person() {
 *   MoronModel.apply(this, arguments);
 * }
 *
 * MoronModel.extend(Person);
 *
 * Person.prototype.fullName = function () {
 *   return this.firstName + ' ' + this.lastName;
 * };
 *
 * Person.tableName = 'Person';
 *
 * Person.jsonSchema = {
 *   type: 'object',
 *   properties: {
 *     id: {type: 'integer'},
 *     firstName: {type: 'string'},
 *     lastName: {type: 'string'}
 *   }
 * };
 *
 * Person.relationMappings = {
 *   pets: {
 *     relation: MoronModel.OneToManyRelation,
 *     modelClass: Animal,
 *     join: {
 *       from: 'Person.id',
 *       to: 'Animal.ownerId'
 *     }
 *   },
 *   mother: {
 *     relation: MoronModel.OneToOneRelation,
 *     modelClass: Person,
 *     join: {
 *       from: 'Person.motherId',
 *       to: 'Person.id'
 *     }
 *   }
 * };
 * ```
 *
 * @extends MoronModelBase
 * @class
 */
function MoronModel() {
  MoronModelBase.apply(this, arguments);
}

MoronModelBase.extend(MoronModel);

/**
 * Returns or sets the identifier of a model instance.
 *
 * ```js
 * // Returns the id.
 * model.$id();
 * // Sets the id.
 * model.$id(100);
 * ```
 *
 * The identifier property does not have to be accessed or set using this method.
 * If the identifier property is known it can be accessed or set just like any
 * other property:
 *
 * ```js
 * console.log(model.id);
 * model.id = 100;
 * ```
 *
 * This method is just a helper for the cases where the id property is not known.
 *
 * @param {*=} id
 * @returns {*}
 */
MoronModel.prototype.$id = function () {
  var ModelClass = this.constructor;

  if (arguments.length > 0) {
    this[ModelClass.getIdProperty()] = arguments[0];
  } else {
    return this[ModelClass.getIdProperty()];
  }
};

/**
 * Creates a query builder for this model instance.
 *
 * All queries built using this method only affect this instance. For example to
 * re-fetch the model from the database you can do this:
 *
 * ```js
 * model.$query().then(function (model) {
 *   console.log(model);
 * });
 * ```
 *
 * Insert a new model to database.
 *
 * ```js
 * Person.fromJson({firstName: 'Jennifer'}).$query().insert().then(function (jennifer) {
 *   console.log(jennifer.id);
 * });
 * ```
 *
 * Patch values of an existing model:
 *
 * ```js
 * person.$query().patch({lastName: 'Cooper'}).then(function (person) {
 *   console.log(person.lastName); // --> 'Cooper'.
 * });
 * ```
 *
 * Delete a model.
 *
 * ```js
 * person.$query().delete().then(function () {
 *   console.log('person deleted');
 * });
 * ```
 *
 * @returns {MoronQueryBuilder}
 */
MoronModel.prototype.$query = function () {
  var ModelClass = this.constructor;
  var self = this;

  return MoronQueryBuilder
    .forClass(ModelClass)
    .findImpl(function () {
      this.where(ModelClass.getFullIdColumn(), self.$id());
    })
    .insertImpl(function () {
      ModelClass.$$insert(this, self);
    })
    .updateImpl(function (update) {
      ModelClass.$$update(this, update || self).where(ModelClass.getFullIdColumn(), self.$id());
    })
    .patchImpl(function (patch) {
      ModelClass.$$patch(this, patch || self).where(ModelClass.getFullIdColumn(), self.$id());
    })
    .deleteImpl(function () {
      ModelClass.$$delete(this).where(ModelClass.getFullIdColumn(), self.$id());
    })
    .relateImpl(function () {
      throw new Error('relate makes no sense in this context');
    })
    .unrelateImpl(function () {
      throw new Error('relate makes no sense in this context');
    });
};

/**
 * Use this to build a query that only affects the models related to this instance through a relation.
 *
 * Fetch all models related to this instance through a relation. The fetched models are
 * also stored to the owner model's property named after the relation:
 *
 * ```js
 * jennifer.$relatedQuery('pets').then(function (pets) {
 *   console.log('jennifer has', pets.length, 'pets');
 *   console.log(jennifer.pets === pets); // --> true
 * });
 * ```
 *
 * The related query is just like any other query. All *knex* methods are available:
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .select('Animal.*', 'Person.name as ownerName')
 *   .where('species', '=', 'dog')
 *   .orWhere('breed', '=', 'cat')
 *   .innerJoin('Person', 'Person.id', 'Animal.ownerId')
 *   .orderBy('Animal.name')
 *   .then(function (dogsAndCats) {
 *     // All the dogs and cats have the owner's name "Jennifer" joined as the `ownerName` property.
 *     console.log(dogsAndCats);
 *   });
 * ```
 *
 * This inserts a new model to the database and binds it to the owner model as defined
 * by the relation:
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .insert({species: 'dog', name: 'Fluffy'})
 *   .then(function (waldo) {
 *     console.log(waldo.id);
 *   });
 * ```
 *
 * To add an existing model to a relation the `relate` method can be used. In this example
 * the dog `fluffy` already exists in the database but it isn't related to `jennifer` through
 * the `pets` relation. We can make the connection like this:
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .relate(fluffy)
 *   .then(function () {
 *     console.log('fluffy is now related to jennifer through pets relation');
 *   });
 * ```
 *
 * The connection can be removed using the `unrelate` method. Again, this doesn't delete the
 * related model. Only the connection is removed. For example in the case of ManyToMany relation
 * the join table entries are deleted.
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .unrelate(fluffy.id)
 *   .then(function () {
 *     console.log('jennifer no longer has fluffy as a pet');
 *   });
 * ```
 *
 * Related models can be deleted using the delete method. Delete method deletes the related
 * model _and_ any connections to the owner. Naturally the delete query can be chained with
 * any *knex* methods.
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .delete()
 *   .where('species', 'cat')
 *   .then(function () {
 *     console.log('jennifer no longer has any cats');
 *   });
 * ```
 *
 * `update` and `patch` can be used to update related models. Only difference between the mentioned
 * methods is that `update` validates the input objects using the related model class's full schema
 * and the `patch` ignores the `required` property of the schema. Use `update` when you want to update
 * _all_ properties of a model and `patch` when only a subset should be updated.
 *
 * ```js
 * jennifer
 *   .$relatedQuery('pets')
 *   .update({species: 'dog', name: 'Fluffy the great', vaccinated: false})
 *   .where('id', fluffy.id)
 *   .then(function (updatedFluffy) {
 *     console.log('fluffy\'s new name is', updatedFluffy.name);
 *   });
 *
 * // This will throw assuming that `name` or `species` is a required property for an Animal.
 * jennifer.$relatedQuery('pets').patch({vaccinated: true});
 *
 * // This will _not_ throw.
 * jennifer
 *   .$relatedQuery('pets')
 *   .patch({vaccinated: true})
 *   .where('species', 'dog')
 *   .then(function () {
 *     console.log('jennifer just got all her dogs vaccinated');
 *   });
 * ```
 *
 * @param {String} relationName
 *    Name of the relation.
 *
 * @returns {MoronQueryBuilder}
 */
MoronModel.prototype.$relatedQuery = function (relationName) {
  var relation = this.constructor.getRelation(relationName);
  var ModelClass = relation.relatedModelClass;
  var self = this;

  return MoronQueryBuilder
    .forClass(ModelClass)
    .findImpl(function () {
      relation.find(this, self);
    })
    .insertImpl(function (modelsToInsert) {
      relation.insert(this, self, modelsToInsert);
    })
    .updateImpl(function (update) {
      relation.update(this, self, update);
    })
    .patchImpl(function (patch) {
      relation.patch(this, self, patch);
    })
    .deleteImpl(function () {
      relation.delete(this, self);
    })
    .relateImpl(function (ids) {
      relation.relate(this, self, ids);
    })
    .unrelateImpl(function () {
      relation.unrelate(this, self);
    });
};

/**
 * Loads related models using a {@link MoronRelationExpression}.
 *
 * Example:
 *
 * ```
 * jennifer.$loadRelated('[pets, children.[pets, father]]').then(function (jennifer) {
 *   console.log('Jennifer has', jennifer.pets.length, 'pets');
 *   console.log('Jennifer has', jennifer.children.length, 'children');
 *   console.log('Jennifer\'s first child has', jennifer.children[0].pets.length, 'pets');
 *   console.log('Jennifer had her first child with', jennifer.children[0].father.name);
 * });
 * ```
 *
 * @see {@link MoronRelationExpression} for more examples on relation expressions.
 *
 * @param {String|MoronRelationExpression} relationExpression
 * @returns {Promise}
 */
MoronModel.prototype.$loadRelated = function (relationExpression) {
  return this.constructor.loadRelated(this, relationExpression);
};

/**
 * @override
 */
MoronModel.prototype.$parseDatabaseJson = function (json) {
  var ModelClass = this.constructor;
  var jsonAttr = ModelClass.getJsonAttributes();

  if (jsonAttr.length) {
    for (var i = 0, l = jsonAttr.length; i < l; ++i) {
      var attr = jsonAttr[i];
      var value = json[attr];

      if (_.isString(value)) {
        json[attr] = JSON.parse(value);
      }
    }
  }

  return json;
};

/**
 * @override
 */
MoronModel.prototype.$formatDatabaseJson = function (json) {
  var ModelClass = this.constructor;
  var jsonAttr = ModelClass.getJsonAttributes();

  if (jsonAttr.length) {
    for (var i = 0, l = jsonAttr.length; i < l; ++i) {
      var attr = jsonAttr[i];
      var value = json[attr];

      if (_.isObject(value)) {
       json[attr] = JSON.stringify(value);
      }
    }
  }

  return ModelClass.$$omitNonColumns(json);
};

/**
 * @override
 */
MoronModel.prototype.$setJson = function (json, options) {
  MoronModelBase.prototype.$setJson.call(this, json, options);

  if (!_.isObject(json)) {
    return;
  }

  var relations = this.constructor.getRelations();
  // Parse relations into MoronModel instances.
  for (var relationName in relations) {
    if (json.hasOwnProperty(relationName)) {
      var relationJson = json[relationName];
      var relation = relations[relationName];

      if (_.isArray(relationJson)) {
        this[relationName] = relation.relatedModelClass.ensureModelArray(relationJson, options);
      } else if (relationJson) {
        this[relationName] = relation.relatedModelClass.ensureModel(relationJson, options);
      } else {
        this[relationName] = null;
      }
    }
  }
};

/**
 * @override
 *
 * @param {Boolean} shallow
 *    If true the relations are omitted from the json.
 */
MoronModel.prototype.$toJson = function (shallow) {
  var json = MoronModelBase.prototype.$toJson.call(this);

  if (shallow) {
    return this.constructor.$$omitRelations(json);
  } else {
    return json;
  }
};

MoronModel.HasOneRelation = MoronHasOneRelation;
MoronModel.HasManyRelation = MoronHasManyRelation;
MoronModel.ManyToManyRelation = MoronManyToManyRelation;

MoronModel.tableName = null;
MoronModel.idColumn = 'id';

MoronModel.jsonAttributes = null;
MoronModel.relationMappings = null;

MoronModel.$$knex = null;
MoronModel.$$idProperty = null;
MoronModel.$$relations = null;
MoronModel.$$pickAttributes = null;
MoronModel.$$omitAttributes = null;

MoronModel.query = function () {
  var ModelClass = this;

  return MoronQueryBuilder
    .forClass(ModelClass)
    .insertImpl(function (models) {
      ModelClass.$$insert(this, models);
    })
    .updateImpl(function (update) {
      ModelClass.$$update(this, update);
    })
    .patchImpl(function (patch) {
      ModelClass.$$patch(this, patch);
    })
    .deleteImpl(function () {
      ModelClass.$$delete(this);
    })
    .relateImpl(function () {
      throw new Error('relate makes no sense in this context');
    })
    .unrelateImpl(function () {
      throw new Error('relate makes no sense in this context');
    });
};

MoronModel.knex = function () {
  if (arguments.length) {
    this.$$knex = arguments[0];
  } else {
    var modelClass = this;
    while (modelClass && !modelClass.$$knex) {
      modelClass = modelClass._super;
    }
    return modelClass && modelClass.$$knex;
  }
};

MoronModel.knexQuery = function () {
  return this.knex().table(this.tableName);
};

MoronModel.bindKnex = function (knex) {
  var ModelClass = this;

  if (!knex.$$moron) {
    knex.$$moron = {};
    knex.$$moron.id = _.uniqueId();
    knex.$$moron.boundModels = Object.create(null);
  }

  // Check if this model class has already been bound to the given knex.
  if (knex.$$moron.boundModels[ModelClass.tableName]) {
    return knex.$$moron.boundModels[ModelClass.tableName];
  }

  // Create a new subclass of this class.
  var BoundModelClass = function BoundModelClass() {
    ModelClass.apply(this, arguments);
  };

  ModelClass.extend(BoundModelClass);

  BoundModelClass.knex(knex);
  knex.$$moron.boundModels[ModelClass.tableName] = BoundModelClass;

  BoundModelClass.$$relations = _.reduce(ModelClass.getRelations(), function (relations, relation, relationName) {
    relations[relationName] = relation.bindKnex(knex);
    return relations;
  }, Object.create(null));

  return BoundModelClass;
};

MoronModel.ensureModel = function (model, options) {
  var ModelClass = this;

  if (!model) {
    return null;
  }

  if (model instanceof ModelClass) {
    return model;
  } else if (model instanceof MoronModel) {
    throw new Error('model is already an instance of another MoronModel');
  } else {
    return ModelClass.fromJson(model, options);
  }
};

MoronModel.ensureModelArray = function (input, options) {
  var ModelClass = this;

  if (!input) {
    return null;
  }

  input = ensureArray(input);
  var models = new Array(input.length);

  for (var i = 0, l = input.length; i < l; ++i) {
    models[i] = ModelClass.ensureModel(input[i], options);
  }

  return models;
};

MoronModel.getIdProperty = function () {
  if (!this.$$idProperty) {
    this.$$idProperty = this.columnNameToPropertyName(this.idColumn);

    if (!this.$$idProperty) {
      throw new Error(this.name +
        '.$parseDatabaseJson probably changes the value of the id column `' + this.idColumn +
        '` which is a no-no.');
    }
  }

  return this.$$idProperty;
};

MoronModel.getFullIdColumn = function () {
  return this.tableName + '.' + this.idColumn;
};

/**
 * @return {Object.<String, MoronRelation>}
 */
MoronModel.getRelations = function () {
  var ModelClass = this;

  if (!this.$$relations) {
    // Lazy-load the relations to prevent require loops.
    this.$$relations = _.reduce(this.relationMappings, function (relations, mapping, relationName) {
      relations[relationName] = new mapping.relation(relationName, ModelClass);
      relations[relationName].setMapping(mapping);
      return relations;
    }, Object.create(null));
  }

  return this.$$relations;
};

/**
 * @return {MoronRelation}
 */
MoronModel.getRelation = function (name) {
  var relation = this.getRelations()[name];

  if (!relation) {
    throw new Error("model class '" + this.name + "' doesn't have relation '" + name + "'");
  }

  return relation;
};

MoronModel.getJsonAttributes = function () {
  var self = this;

  // If the jsonAttributes property is not set, try to create it based
  // on the jsonSchema. All properties that are objects or arrays must
  // be converted to JSON.
  if (!this.jsonAttributes && this.jsonSchema) {
    this.jsonAttributes = [];

    _.each(this.jsonSchema.properties, function (prop, propName) {
      var types = _.compact(ensureArray(prop.type));

      if (types.length === 0 && _.isArray(prop.anyOf)) {
        types = _.flattenDeep(_.pluck(prop.anyOf, 'type'));
      }

      if (types.length === 0 && _.isArray(prop.oneOf)) {
        types = _.flattenDeep(_.pluck(prop.oneOf, 'type'));
      }

      if (_.contains(types, 'object') || _.contains(types, 'array')) {
        self.jsonAttributes.push(propName);
      }
    });
  }

  if (!_.isArray(this.jsonAttributes)) {
    this.jsonAttributes = [];
  }

  return this.jsonAttributes;
};

MoronModel.generateId = function () {
  return null;
};

MoronModel.loadRelated = function ($models, expression) {
  if (!(expression instanceof MoronRelationExpression)) {
    expression = MoronRelationExpression.parse(expression);
  }

  if (!expression) {
    throw new Error('invalid expression ' + expression);
  }

  return new MoronEagerFetcher({
    modelClass: this,
    models: this.ensureModelArray($models),
    eager: expression
  }).fetch().then(function (models) {
    return _.isArray($models) ? models : models[0];
  });
};

MoronModel.$$insert = function (builder, $models) {
  var ModelClass = this;
  var models = ModelClass.ensureModelArray($models);

  var json = _.map(models, function (model) {
    var id = ModelClass.generateId();

    if (!_.isNull(id)) {
      model.$id(id);
    }

    return model.$toDatabaseJson();
  });

  return builder.insert(json).returning(ModelClass.getFullIdColumn()).runAfterModelCreatePushFront(function (ids) {
    // TODO: will not work in all situations!!!!
    if (ids.length === 1 && models.length > 1) {
      var lastId = ids[0];
      ids = [];
      for (var i = models.length - 1; i >= 0; --i) {
        ids.unshift(lastId--);
      }
    }

    _.each(models, function (model, idx) {
      model.$id(ids[idx]);
    });

    if (_.isArray($models)) {
      return models;
    } else {
      return models[0];
    }
  });
};

MoronModel.$$update = function (builder, $update) {
  if (!$update) {
    return builder;
  }

  var ModelClass = this;
  $update = ModelClass.ensureModel($update);

  var update = $update.$clone();
  delete update[ModelClass.getIdProperty()];

  return builder.update(update.$toDatabaseJson()).runAfterModelCreatePushFront(function () {
    return $update;
  });
};

/**
 * @protected
 */
MoronModel.$$patch = function (builder, $patch) {
  if (!$patch) {
    return builder;
  }

  var ModelClass = this;
  $patch = ModelClass.ensureModel($patch, {patch: true});

  var patch = $patch.$clone();
  delete patch[ModelClass.getIdProperty()];

  return builder.update(patch.$toDatabaseJson()).runAfterModelCreatePushFront(function () {
    return $patch;
  });
};

MoronModel.$$delete = function (builder) {
  return builder.delete().runAfterModelCreatePushFront(function () {
    return {};
  });
};

MoronModel.$$omitNonColumns = function (json) {
  if (this.jsonSchema) {
    if (!this.$$pickAttributes) {
      this.$$pickAttributes = _.keys(this.jsonSchema.properties);
    }

    // If jsonSchema is defined, only pick the attributes listed in the
    // jsonSchema.properties object.
    return _.pick(json, this.$$pickAttributes);
  } else {
    // If jsonSchema is not defined, pick all attributes but the relations.
    return this.$$omitRelations(json);
  }
};

MoronModel.$$omitRelations = function (json) {
  if (!this.$$omitAttributes) {
    this.$$omitAttributes = _.keys(this.getRelations());
  }
  
  if (this.$$omitAttributes.length) {
    return _.omit(json, this.$$omitAttributes);
  }
  
  return json;
};

function ensureArray(obj) {
  if (_.isArray(obj)) {
    return obj;
  } else {
    return [obj];
  }
}

module.exports = MoronModel;
