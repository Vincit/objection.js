'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objection = require('objection');

class Animal extends _objection.Model {}
exports.default = Animal;
Animal.tableName = 'Animal';
Animal.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: { type: 'integer' },
    ownerId: { type: ['integer', 'null'] },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    species: { type: 'string', minLength: 1, maxLength: 255 }
  }
};
Animal.relationMappings = {
  owner: {
    relation: _objection.Model.BelongsToOneRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: `${__dirname}/Person`,
    join: {
      from: 'Animal.ownerId',
      to: 'Person.id'
    }
  }
};