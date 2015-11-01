'use strict';

var _ = require('lodash')
  , utils = require('./utils')
  , ModelBase = require('./ModelBase')
  , QueryBuilder = require('./QueryBuilder')
  , inheritModel = require('./inheritModel')
  , RelationExpression = require('./RelationExpression')
  , ValidationError = require('./ValidationError')
  , EagerFetcher = require('./EagerFetcher')
  , Relation = require('./relations/Relation')
  , OneToOneRelation = require('./relations/OneToOneRelation')
  , OneToManyRelation = require('./relations/OneToManyRelation')
  , ManyToManyRelation = require('./relations/ManyToManyRelation');

/**
 * Subclasses of this class represent database tables.
 *
 * Subclass can be created like this:
 *
 * ```js
  var Model = require('objection').Model;

  function Person() {
    Model.apply(this, arguments);
  }

  Model.extend(Person);
  module.exports = Person;

  // Table name is the only required property.
  Person.tableName = 'Person';

  // This is not the database schema! Nothing is generated based on this. Whenever a
  // Person object is created from a JSON object, the JSON is checked against this
  // schema. For example when you call Person.fromJson({firstName: 'Jennifer'});
  Person.jsonSchema = {
    type: 'object',
    required: ['firstName', 'lastName'],

    properties: {
      id: {type: 'integer'},
      parentId: {type: ['integer', 'null']},
      firstName: {type: 'string', minLength: 1, maxLength: 255},
      lastName: {type: 'string', minLength: 1, maxLength: 255},
      age: {type: 'number'},

      address: {
        type: 'object',
        properties: {
          street: {type: 'string'},
          city: {type: 'string'},
          zipCode: {type: 'string'}
        }
      }
    }
  };

  // This object defines the relations to other models.
  Person.relationMappings = {
    pets: {
      relation: Model.OneToManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: __dirname + '/Animal',
      join: {
        from: 'Person.id',
        to: 'Animal.ownerId'
      }
    },

    movies: {
      relation: Model.ManyToManyRelation,
      modelClass: __dirname + '/Movie',
      join: {
        from: 'Person.id',
        // ManyToMany relation needs the `through` object to describe the join table.
        through: {
          from: 'Person_Movie.personId',
          to: 'Person_Movie.movieId'
        },
        to: 'Movie.id'
      }
    },

    children: {
      relation: Model.OneToManyRelation,
      modelClass: Person,
      join: {
        from: 'Person.id',
        to: 'Person.parentId'
      }
    }
  };
 * ```
 *
 * @extends ModelBase
 * @constructor
 */
function Model() {
  ModelBase.apply(this, arguments);
}

ModelBase.extend(Model);

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
Model.prototype.$id = function () {
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
 * The returned query builder has all the methods a *knex* query builder has. See
 * {@link QueryBuilder} and <a href="http://knexjs.org/#Builder">knexjs.org</a>
 * for more information.
 *
 * All queries built using the returned builder only affect this instance.
 *
 * Examples:
 *
 * Re-fetch the instance from the database:
 *
 * ```js
 * person.$query().then(function (person) {
 *   console.log(person);
 * });
 * ```
 *
 * Insert a new model to database:
 *
 * ```js
 * Person.fromJson({firstName: 'Jennifer'}).$query().insert().then(function (jennifer) {
 *   console.log(jennifer.id);
 * });
 * ```
 *
 * Patch a model:
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
 * @returns {QueryBuilder}
 */
Model.prototype.$query = function () {
  var ModelClass = this.constructor;
  var self = this;

  return ModelClass.QueryBuilder
    .forClass(ModelClass)
    .findImpl(function () {
      this.first();
      this.onBuild(function (builder) {
        builder.where(ModelClass.getFullIdColumn(), self.$id());
      });
    })
    .insertImpl(function (insertion) {
      insertion.setData(self);

      this.onBuild(function (builder) {
        builder.$$insert(insertion);
      });
    })
    .updateImpl(function (update) {
      if (!update.model()) {
        update.setData(self);
      }

      this.onBuild(function (builder) {
        builder.$$update(update).where(ModelClass.getFullIdColumn(), self.$id());
      });
    })
    .patchImpl(function (patch) {
      if (!patch.model()) {
        patch.setData(self);
      }

      this.onBuild(function (builder) {
        builder.$$update(patch).where(ModelClass.getFullIdColumn(), self.$id());
      });
    })
    .deleteImpl(function () {
      this.onBuild(function (builder) {
        builder.$$delete().where(ModelClass.getFullIdColumn(), self.$id());
      });
    })
    .relateImpl(function () {
      throw new Error('`relate` makes no sense in this context');
    })
    .unrelateImpl(function () {
      throw new Error('`unrelate` makes no sense in this context');
    });
};

/**
 * Use this to build a query that only affects the models related to this instance through a relation.
 *
 * The returned query builder has all the methods a *knex* query builder has. See
 * {@link QueryBuilder} and <a href="http://knexjs.org/#Builder">knexjs.org</a>
 * for more information.
 *
 * Examples:
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
 *   .relate(fluffy.id)
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
 *   .unrelate()
 *   .where('id', fluffy.id)
 *   .then(function () {
 *     console.log('jennifer no longer has fluffy as a pet');
 *   });
 * ```
 *
 * Related models can be deleted using the delete method. Note that in the case of ManyToManyRelation
 * the join table entries are not deleted. Naturally the delete query can be chained with any *knex*
 * methods.
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
 * and `patch` ignores the `required` property of the schema. Use `update` when you want to update
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
 * @returns {QueryBuilder}
 */
Model.prototype.$relatedQuery = function (relationName) {
  var relation = this.constructor.getRelation(relationName);
  var ModelClass = relation.relatedModelClass;
  var self = this;

  return ModelClass.RelatedQueryBuilder
    .forClass(ModelClass)
    .findImpl(function () {
      var queryBuilder = this;
      relation.find(queryBuilder, [self]);
    })
    .insertImpl(function (insert) {
      var queryBuilder = this;
      relation.insert(queryBuilder, self, insert);
    })
    .updateImpl(function (update) {
      var queryBuilder = this;
      relation.update(queryBuilder, self, update);
    })
    .patchImpl(function (patch) {
      var queryBuilder = this;
      relation.patch(queryBuilder, self, patch);
    })
    .deleteImpl(function () {
      var queryBuilder = this;
      relation.delete(queryBuilder, self);
    })
    .relateImpl(function (ids) {
      var queryBuilder = this;
      relation.relate(queryBuilder, self, ids);
    })
    .unrelateImpl(function () {
      var queryBuilder = this;
      relation.unrelate(queryBuilder, self);
    });
};

/**
 * Loads related models using a {@link RelationExpression}.
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
 * @see {@link RelationExpression} for more examples on relation expressions.
 *
 * @param {String|RelationExpression} relationExpression
 * @returns {Promise}
 */
Model.prototype.$loadRelated = function (relationExpression) {
  return this.constructor.loadRelated(this, relationExpression);
};

/**
 * Shortcut for `Model.traverse(filterConstructor, this, callback)`.
 *
 * See the static method `Model.traverse` for more info.
 *
 * @param {Function=} filterConstructor
 * @param {Function(Model)} callback
 * @return {Model}
 */
Model.prototype.$traverse = function (filterConstructor, callback) {
  if (_.isUndefined(callback)) {
    callback = filterConstructor;
    filterConstructor = null;
  }

  this.constructor.traverse(filterConstructor, this, callback);
  return this;
};

/**
 * @override
 */
Model.prototype.$parseDatabaseJson = function (json) {
  var ModelClass = this.constructor;
  var jsonAttr = ModelClass.$$getJsonAttributes();

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
Model.prototype.$formatDatabaseJson = function (json) {
  var ModelClass = this.constructor;
  var jsonAttr = ModelClass.$$getJsonAttributes();

  if (jsonAttr.length) {
    for (var i = 0, l = jsonAttr.length; i < l; ++i) {
      var attr = jsonAttr[i];
      var value = json[attr];

      if (_.isObject(value)) {
       json[attr] = JSON.stringify(value);
      }
    }
  }

  return json;
};

/**
 * @override
 */
Model.prototype.$setJson = function (json, options) {
  ModelBase.prototype.$setJson.call(this, json, options);

  if (!_.isObject(json)) {
    return;
  }

  var relations = this.constructor.getRelations();
  // Parse relations into Model instances.
  for (var relationName in relations) {
    if (_.has(json, relationName)) {
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
Model.prototype.$toJson = function (shallow) {
  if (shallow) {
    return this.$$toJson(false, this.constructor.getRelations(), null);
  } else {
    return this.$$toJson(false, null, null);
  }
};

/**
 * @override
 */
Model.prototype.$toDatabaseJson = function () {
  var jsonSchema = this.constructor.jsonSchema;
  var pick = jsonSchema && jsonSchema.properties;
  var omit;

  if (!pick) {
    omit = this.constructor.getRelations();
  }

  return this.$$toJson(true, omit, pick);
};

/**
 * Called before a model is inserted into the database.
 *
 * You can return a promise from this function if you need to do asynchronous stuff. You can
 * also throw an exception to abort the insert and reject the query. This can be useful if
 * you need to do insert specific validation.
 *
 * @returns {Promise|*}
 */
Model.prototype.$beforeInsert = function () {

};

/**
 * Called after a model has been inserted into the database.
 *
 * You can return a promise from this function if you need to do asynchronous stuff.
 *
 * @returns {Promise|*}
 */
Model.prototype.$afterInsert = function () {

};

/**
 * Called before a model is updated.
 *
 * You can return a promise from this function if you need to do asynchronous stuff. You can
 * also throw an exception to abort the update and reject the query. This can be useful if
 * you need to do update specific validation.
 *
 * This method is also called before a model is patched. Therefore all the model's properties
 * may not exist. You can check if the update operation is a patch by checking the `opt.patch`
 * boolean.
 *
 * Also note that this method is called only once when you do something like this:
 *
 * ```js
 * Person
 *   .$query()
 *   .patch({firstName: 'Jennifer'})
 *   .where('gender', 'female')
 *   .then(function () {
 *     ...
 *   });
 * ```
 *
 * The example above updates all rows whose `gender` equals `female` but the `$beforeUpdate`
 * method is called only once for the `{firstName: 'Jennifer'}` model. This is because the
 * updating is done completely in the database and the affected models are never fetched
 * to the javascript side.
 *
 * @param {ModelOptions} opt
 * @returns {Promise|*}
 */
Model.prototype.$beforeUpdate = function (opt) {
  _.noop(opt);
};

/**
 * Called after a model is updated.
 *
 * You can return a promise from this function if you need to do asynchronous stuff.
 *
 * This method is also called after a model is patched. Therefore all the model's properties
 * may not exist. You can check if the update operation is a patch by checking the `opt.patch`
 * boolean.
 *
 * Also note that this method is called only once when you do something like this:
 *
 * ```js
 * Person
 *   .$query()
 *   .patch({firstName: 'Jennifer'})
 *   .where('gender', 'female')
 *   .then(function () {
 *     ...
 *   });
 * ```
 *
 * The example above updates all rows whose `gender` equals `female` but the `$beforeUpdate`
 * method is called only once for the `{firstName: 'Jennifer'}` model. This is because the
 * updating is done completely in the database and the affected models are never fetched
 * to the javascript side.
 *
 * @param {ModelOptions} opt
 * @returns {Promise|*}
 */
Model.prototype.$afterUpdate = function (opt) {
  _.noop(opt);
};

/**
 * QueryBuilder subclass to use in `query()` or `$query()` methods.
 *
 * This constructor is used whenever a query builder is created using `query()` or `$query()` methods.
 * You can override this to use your own `QueryBuilder` subclass.
 */
Model.QueryBuilder = QueryBuilder;

/**
 * QueryBuilder subclass to use in `$relatedQuery()` method.
 *
 * This constructor is used whenever a query builder is created using the `$relatedQuery()` method.
 * You can override this to use your own `QueryBuilder` subclass.
 */
Model.RelatedQueryBuilder = QueryBuilder;

/**
 * one-to-many relation type.
 *
 * @type {OneToOneRelation}
 */
Model.OneToOneRelation = OneToOneRelation;

/**
 * one-to-many relation type.
 *
 * @type {OneToManyRelation}
 */
Model.OneToManyRelation = OneToManyRelation;

/**
 * may-to-many relation type.
 *
 * @type {ManyToManyRelation}
 */
Model.ManyToManyRelation = ManyToManyRelation;

/**
 * Name of the database table of this model.
 *
 * @type {String}
 */
Model.tableName = null;

/**
 * Name of the primary key column in the database table.
 *
 * Defaults to 'id'.
 *
 * @type {String}
 */
Model.idColumn = 'id';

/**
 * Name of the property used to store a temporary non-db identifier for the model.
 *
 * Defaults to '#id'.
 *
 * @type {String}
 */
Model.uidProp = '#id';

/**
 * Name of the property used to store a reference to a `uidProp`.
 *
 * Defaults to '#ref'.
 *
 * @type {String}
 */
Model.uidRefProp = '#ref';

/**
 * Regular expression for parsing a reference to a property.
 *
 * @type {RegExp}
 */
Model.propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;

/**
 * Properties that should be saved to database as JSON strings.
 *
 * The properties listed here are serialized to JSON strings upon insertion to the database
 * and parsed back to objects when models are read from the database. Combined with the
 * postgresql's json or jsonb data type, this is a powerful way of representing documents
 * as single database rows.
 *
 * If this property is left unset all properties declared as objects or arrays in the
 * `jsonSchema` are implicitly added to this list.
 *
 * Example:
 *
 * ```js
 * Person.jsonAttributes = ['address'];
 *
 * var jennifer = Person.fromJson({
 *   name: 'Jennifer',
 *   address: {
 *     address: 'Someroad 10',
 *     zipCode: '1234',
 *     city: 'Los Angeles'
 *   }
 * });
 *
 * var dbRow = jennifer.$toDatabaseJson();
 * console.log(dbRow);
 * // --> {name: 'Jennifer', address: '{"address":"Someroad 10","zipCode":"1234","city":"Los Angeles"}'}
 * ```
 *
 * @type {Array.<String>}
 */
Model.jsonAttributes = null;

/**
 * This property defines the relations to other models.
 *
 * Relations to other models can be defined by setting this property. The best way to explain how to
 * do this is by example:
 *
 * ```js
 * Person.relationMappings = {
 *   pets: {
 *     relation: Model.OneToManyRelation,
 *     modelClass: Animal,
 *     join: {
 *       from: 'Person.id',
 *       to: 'Animal.ownerId'
 *     }
 *   },
 *
 *   father: {
 *     relation: Model.OneToOneRelation,
 *     modelClass: Person,
 *     join: {
 *       from: 'Person.fatherId',
 *       to: 'Person.id'
 *     }
 *   },
 *
 *   movies: {
 *     relation: Model.ManyToManyRelation,
 *     modelClass: Movie,
 *     join: {
 *       from: 'Person.id',
 *       through: {
 *         from: 'Person_Movie.actorId',
 *         to: 'Person_Movie.movieId'
 *       },
 *       to: 'Movie.id'
 *     }
 *   }
 * };
 * ```
 *
 * relationMappings is an object whose keys are relation names and values define the relation. The
 * `join` property in addition to the relation type define how the models are related to one another.
 * The `from` and `to` properties of the `join` object define the database columns through which the
 * models are associated. Note that neither of these columns need to be primary keys. They can be any
 * columns!. In the case of ManyToManyRelation also the join table needs to be defined. This is
 * done using the `through` object.
 *
 * The `modelClass` passed to the relation mappings is the class of the related model. It can be either
 * a Model subclass constructor or an absolute path to a module that exports one. Using file paths
 * is a handy way to prevent require loops.
 *
 * @type {Object.<String, RelationMapping>}
 */
Model.relationMappings = null;

/**
 * @private
 */
Model.$$knex = null;

/**
 * @private
 */
Model.$$idProperty = null;

/**
 * @private
 */
Model.$$relations = null;

/**
 * Creates a query builder for this table.
 *
 * The returned query builder has all the methods a *knex* query builder has. See
 * {@link QueryBuilder} and <a href="http://knexjs.org/#Builder">knexjs.org</a>
 * for more information.
 *
 * Examples:
 *
 * Read models from the database:
 *
 * ```js
 * // Get all rows.
 * Person.query().then(function(allPersons) {
 *   console.log('there are', allPersons.length, 'persons in the database');
 * });
 *
 * // Example of a more complex WHERE clause. This generates:
 * // SELECT * FROM "Person" WHERE ("firstName" = 'Jennifer' AND "age" < 30) OR ("firstName" = "Mark" AND "age" > 30)
 * Person
 *   .query()
 *   .where(function () {
 *     this.where('firstName', 'Jennifer').where('age', '<', 30);
 *   })
 *   .orWhere(function () {
 *     this.where('firstName', 'Mark').where('age', '>', 30);
 *   })
 *   .then(function (marksAndJennifers) {
 *     console.log(marksAndJennifers);
 *   });
 *
 * // Get a subset of rows and fetch related models for each row.
 * Person
 *   .query()
 *   .where('age', '>', 60)
 *   .eager('children.children.movies')
 *   .then(function (oldPeople) {
 *     console.log('some old person\'s grand child has appeared in',
 *       oldPeople[0].children[0].children[0].movies.length,
 *       'movies');
 *   });
 * ```
 *
 * Insert models to the database:
 *
 * ```js
 * Person.query().insert({firstName: 'Sylvester', lastName: 'Stallone'}).then(function (sylvester) {
 *   console.log(sylvester.fullName()); // --> 'Sylvester Stallone'.
 * });
 *
 * // Batch insert. This only works on Postgresql as it is the only database that returns the
 * // identifiers of _all_ inserted rows. If you need to do batch inserts on other databases use
 * // *knex* directly. (See .knexQuery() method).
 * Person
 *   .query()
 *   .insert([
 *     {firstName: 'Arnold', lastName: 'Schwarzenegger'},
 *     {firstName: 'Sylvester', lastName: 'Stallone'}
 *   ])
 *   .then(function (inserted) {
 *     console.log(inserted[0].fullName()); // --> 'Arnold Schwarzenegger'
 *   });
 * ```
 *
 * `update` and `patch` can be used to update models. Only difference between the mentioned methods
 * is that `update` validates the input objects using the model class's full jsonSchema and `patch`
 * ignores the `required` property of the schema. Use `update` when you want to update _all_ properties
 * of a model and `patch` when only a subset should be updated.
 *
 * ```js
 * Person
 *   .query()
 *   .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 35})
 *   .where('id', jennifer.id)
 *   .then(function (updatedJennifer) {
 *     console.log('Jennifer is now', updatedJennifer.age, 'years old');
 *   });
 *
 * // This will throw assuming that `firstName` or `lastName` is a required property for a Person.
 * Person.query().patch({age: 100});
 *
 * // This will _not_ throw.
 * Person
 *   .query()
 *   .patch({age: 100})
 *   .then(function () {
 *     console.log('Everyone is now 100 years old');
 *   });
 * ```
 *
 * Models can be deleted using the delete method. Naturally the delete query can be chained with
 * any *knex* methods:
 *
 * ```js
 * Person
 *   .query()
 *   .delete()
 *   .where('age', '>', 90)
 *   .then(function () {
 *     console.log('anyone over 90 is now removed from the database');
 *   });
 * ```
 *
 * @returns {QueryBuilder}
 */
Model.query = function () {
  var ModelClass = this;

  return ModelClass.QueryBuilder
    .forClass(ModelClass)
    .relateImpl(function () {
      throw new Error('`relate` makes no sense in this context');
    })
    .unrelateImpl(function () {
      throw new Error('`unrelate` makes no sense in this context');
    });
};

/**
 * Get/Set the knex instance for this model class.
 *
 * Subclasses inherit the connection. A system-wide knex instance can thus be set by calling
 * `Model.knex(knex)`. This works even after subclasses have been created.
 *
 * ```js
 * var knex = require('knex')({
 *   client: 'sqlite3',
 *   connection: {
 *     filename: 'database.db'
 *   }
 * });
 *
 * Model.knex(knex);
 * knex = Model.knex();
 * ```
 *
 * @param {knex=} knex
 *    The knex to set.
 *
 * @returns {knex|undefined}
 */
Model.knex = function (knex) {
  if (arguments.length) {
    this.$$knex = knex;
  } else {
    var modelClass = this;

    while (modelClass && !modelClass.$$knex) {
      var proto = modelClass.prototype.__proto__;
      modelClass = proto && proto.constructor;
    }

    return modelClass && modelClass.$$knex;
  }
};

/**
 * Shortcut for `SomeModel.knex().raw()`.
 */
Model.raw = function () {
  var knex = this.knex();
  return knex.raw.apply(knex, arguments);
};

/**
 * Shortcut for `SomeModel.knex().fn`.
 */
Model.fn = function () {
  var knex = this.knex();
  return knex.fn;
};

/**
 * Shortcut for `SomeModel.knex().client.formatter()`.
 *
 * @return {Formatter}
 */
Model.formatter = function () {
  return this.knex().client.formatter();
};

/**
 * Shortcut for `SomeModel.knex().table(SomeModel.tableName)`.
 *
 * @returns {knex.QueryBuilder}
 */
Model.knexQuery = function () {
  return this.knex().table(this.tableName);
};

/**
 * Creates a subclass of this class that is bound to the given knex.
 *
 * This method can be used to bind a Model subclass to multiple databases for example in
 * a multi tenant system.
 *
 * Example:
 *
 * ```js
 * var knex1 = require('knex')({
 *   client: 'sqlite3',
 *   connection: {
 *     filename: 'database1.db'
 *   }
 * });
 *
 * var knex2 = require('knex')({
 *   client: 'sqlite3',
 *   connection: {
 *     filename: 'database2.db'
 *   }
 * });
 *
 * SomeModel.knex(null);
 *
 * var BoundModel1 = SomeModel.bindKnex(knex1);
 * var BoundModel2 = SomeModel.bindKnex(knex2);
 *
 * // Throws since the knex instance is null.
 * SomeModel.query().then();
 *
 * // Works.
 * BoundModel1.query().then(function (models) {
 *  console.log(models[0] instanceof SomeModel); // --> true
 *  console.log(models[0] instanceof BoundModel1); // --> true
 * });
 *
 * // Works.
 * BoundModel2.query().then(function (models) {
 *  console.log(models[0] instanceof SomeModel); // --> true
 *  console.log(models[0] instanceof BoundModel2); // --> true
 * });
 *
 * ```
 *
 * @param {knex} knex
 * @returns {Model}
 */
Model.bindKnex = function (knex) {
  var ModelClass = this;

  if (!knex.$$objection) {
    knex.$$objection = {};
    knex.$$objection.id = _.uniqueId();
    knex.$$objection.boundModels = Object.create(null);
  }

  // Check if this model class has already been bound to the given knex.
  if (knex.$$objection.boundModels[ModelClass.tableName]) {
    return knex.$$objection.boundModels[ModelClass.tableName];
  }

  // Create a new subclass of this class.
  var BoundModelClass = inheritModel(ModelClass);

  BoundModelClass.knex(knex);
  knex.$$objection.boundModels[ModelClass.tableName] = BoundModelClass;

  BoundModelClass.$$relations = _.reduce(ModelClass.getRelations(), function (relations, relation, relationName) {
    relations[relationName] = relation.bindKnex(knex);
    return relations;
  }, Object.create(null));

  return BoundModelClass;
};

/**
 * Ensures that the given model is an instance of this class.
 *
 * If `model` is already an instance of this class, nothing is done.
 *
 * @param {Model|Object} model
 * @param {ModelOptions=} options
 * @returns {Model}
 */
Model.ensureModel = function (model, options) {
  var ModelClass = this;

  if (!model) {
    return null;
  }

  if (model instanceof ModelClass) {
    return model;
  } else if (model instanceof Model) {
    throw new Error('model is already an instance of another Model');
  } else {
    return ModelClass.fromJson(model, options);
  }
};

/**
 * Ensures that each element in the given array is an instance of this class.
 *
 * If an element is already an instance of this class, nothing is done for it.
 *
 * @param {Array.<Model|Object>} input
 * @param {ModelOptions=} options
 * @returns {Array.<Model>}
 */
Model.ensureModelArray = function (input, options) {
  var ModelClass = this;

  if (!input) {
    return [];
  }

  if (_.isArray(input)) {
    var models = new Array(input.length);

    for (var i = 0, l = input.length; i < l; ++i) {
      models[i] = ModelClass.ensureModel(input[i], options);
    }

    return models;
  } else {
    return [ModelClass.ensureModel(input, options)];
  }
};

/**
 * Returns the name of the identifier property.
 *
 * The identifier property is equal to the `idColumn` if `$parseDatabaseJson` is not
 * implemented. If `$parseDatabaseJson` is implemented it may change the id property's
 * name. This method passes the `idColumn` through `$parseDatabaseJson`.
 *
 * @returns {String}
 */
Model.getIdProperty = function () {
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

/**
 * Full identifier column name like 'SomeTable.id'.
 *
 * @returns {String}
 */
Model.getFullIdColumn = function () {
  return this.tableName + '.' + this.idColumn;
};

/**
 * All relations of this class.
 *
 * @return {Object.<String, Relation>}
 */
Model.getRelations = function () {
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
 * Get a relation by name.
 *
 * This should not be used to make queries. Use `$relatedQuery` or `loadRelated` instead.
 *
 * @return {Relation}
 */
Model.getRelation = function (name) {
  var relation = this.getRelations()[name];

  if (!relation) {
    throw new Error("model class '" + this.name + "' doesn't have relation '" + name + "'");
  }

  return relation;
};

/**
 * Exactly like $loadRelated but for multiple instances.
 *
 * ```js
 * Person.loadRelated([person1, person2], 'children.pets').then(function (persons) {
 *   var person1 = persons[0];
 *   var person2 = persons[1];
 * });
 * ```
 *
 * @param {Array.<Model|Object>} $models
 * @param {String|RelationExpression} expression
 * @returns {*}
 */
Model.loadRelated = function ($models, expression) {
  if (!(expression instanceof RelationExpression)) {
    expression = RelationExpression.parse(expression);
  }

  if (!expression) {
    throw new Error('invalid expression ' + expression);
  }

  return new EagerFetcher({
    modelClass: this,
    models: this.ensureModelArray($models),
    eager: expression
  }).fetch().then(function (models) {
    return _.isArray($models) ? models : models[0];
  });
};

/**
 * Traverses the relation tree of a list of models.
 *
 * Calls the callback for each related model recursively. The callback is called
 * also for the input models themselves.
 *
 * There are two ways to call this method:
 *
 * ```js
 * Model.traverse(models, function (model, parentModel, relationName) {
 *   doSomething(model);
 * });
 * ```
 *
 * and
 *
 * ```js
 * Model.traverse(Person, models, function (person, parentModel, relationName) {
 *   doSomethingForPerson(person);
 * });
 * ```
 *
 * In the second example the traverser function is only called for `Person` instances.
 *
 * @param {Function=} filterConstructor
 *    If this optional constructor is given, the `traverser` is only called for
 *    models for which `model instanceof filterConstructor` returns true.
 *
 * @param {Model|Array.<Model>} models
 *    The model(s) whose relation trees to traverse.
 *
 * @param {Function(Model, Model, String)} traverser
 *    The traverser function that is called for each model. The first argument
 *    is the model itself. If the model is in a relation of some other model
 *    the second argument is the parent model and the third argument is the
 *    name of the relation.
 *
 * @return {Model}
 */
Model.traverse = function (filterConstructor, models, traverser) {
  filterConstructor = filterConstructor || null;

  if (_.isUndefined(traverser)) {
    traverser = models;
    models = filterConstructor;
    filterConstructor = null;
  }

  if (!_.isFunction(traverser)) {
    throw new Error('traverser must be a function');
  }

  traverse(models, null, null, filterConstructor, traverser);
  return this;
};

/**
 * @protected
 * @returns {Array.<String>}
 */
Model.$$getJsonAttributes = function () {
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

/**
 * @private
 */
function ensureArray(obj) {
  if (_.isArray(obj)) {
    return obj;
  } else {
    return [obj];
  }
}

/**
 * @private
 */
function traverse(models, parent, relationName, modelClass, callback) {
  if (!_.isObject(models)) {
    return;
  }

  if (_.isArray(models)) {
    for (var i = 0, l = models.length; i < l; ++i) {
      traverseOne(models[i], parent, relationName, modelClass, callback);
    }
  } else {
    traverseOne(models, parent, relationName, modelClass, callback)
  }
}

/**
 * @private
 */
function traverseOne(model, parent, relationName, modelClass, callback) {
  if (!(model instanceof Model)) {
    return;
  }

  if (!modelClass || model instanceof modelClass) {
    callback(model, parent, relationName);
  }

  for (var relName in model.constructor.getRelations()) {
    if (_.has(model, relName)) {
      traverse(model[relName], model, relName, modelClass, callback);
    }
  }
}

module.exports = Model;
