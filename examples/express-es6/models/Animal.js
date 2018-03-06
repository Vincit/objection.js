'use strict';

const Model = require('objection').Model;

class Animal extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'animals';
  }

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: { type: 'integer' },
        ownerId: { type: ['integer', 'null'] },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        species: { type: 'string', minLength: 1, maxLength: 255 }
      }
    };
  }

  // This object defines the relations to other models.
  static get relationMappings() {
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        // The related model. This can be either a Model subclass constructor or an
        // absolute file path to a module that exports one. We use the file path version
        // here to prevent require loops.
        modelClass: __dirname + '/Person',
        join: {
          from: 'animals.ownerId',
          to: 'persons.id'
        }
      }
    };
  }
}

module.exports = Animal;
