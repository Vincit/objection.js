var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
function Hero() {
  Model.apply(this, arguments);
}

Model.extend(Hero);
module.exports = Hero;

// Table name is the only required property.
Hero.tableName = 'Hero';

Hero.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    details: { type: ['object', 'array', 'null'] },
    homeId: { type: 'integer' }
  }
};

Hero.relationMappings = {
  home: {
    relation: Model.OneToOneRelation,
    modelClass: __dirname + '/Place',
    join: {
      from: 'Hero.homeId',
      to: 'Place.id'
    }
  }
};
