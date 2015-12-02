var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
function Place() {
  Model.apply(this, arguments);
}

Model.extend(Place);
module.exports = Place;

// Table name is the only required property.
Place.tableName = 'Place';

// Optional JSON schema. This is not the database schema! Nothing is generated
// based on this. This is only used for validation. Whenever a model instance
// is created it is checked against this schema. http://json-schema.org/.
Place.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    details: { type: 'object' }
  }
};

Place.relationMappings = {
  heroes: {
    relation: Model.OneToManyRelation,
    modelClass: __dirname + '/Hero',
    join: {
      from: 'Place.id',
      to: 'Hero.homeId'
    }
  }
};
