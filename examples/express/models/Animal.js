var Model = require('moron').Model;

/**
 * @extends Model
 * @constructor
 */
function Animal() {
  Model.apply(this, arguments);
}

Model.extend(Animal);
module.exports = Animal;

// Table name is the only required property.
Animal.tableName = 'Animal';

// This is not the database schema! Nothing is generated based on this. Whenever an
// Animal object is created from a JSON object, the JSON is checked against this
// schema. For example when you call Animal.fromJson({name: 'Fluffy'});
Animal.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: {type: 'integer'},
    ownerId: {type: ['integer', 'null']},
    name: {type: 'string', minLength: 1, maxLength: 255},
    species: {type: 'string', minLength: 1, maxLength: 255}
  }
};

// This object defines the relations to other models.
Animal.relationMappings = {
  owner: {
    relation: Model.OneToOneRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: __dirname + '/Person',
    join: {
      from: 'Animal.ownerId',
      to: 'Person.id'
    }
  }
};
