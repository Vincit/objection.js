'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objection = require('objection');

var _Animal = require('./Animal');

var _Animal2 = _interopRequireDefault(_Animal);

var _Movie = require('./Movie');

var _Movie2 = _interopRequireDefault(_Movie);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Person extends _objection.Model {}
exports.default = Person;
Person.tableName = 'Person';
Person.jsonSchema = {
  type: 'object',
  required: ['firstName', 'lastName'],

  properties: {
    id: { type: 'integer' },
    parentId: { type: ['integer', 'null'] },
    firstName: { type: 'string', minLength: 1, maxLength: 255 },
    lastName: { type: 'string', minLength: 1, maxLength: 255 },
    age: { type: 'number' },

    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        zipCode: { type: 'string' }
      }
    }
  }
};
Person.relationMappings = {
  pets: {
    relation: _objection.Model.HasManyRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: _Animal2.default,
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
    }
  },

  movies: {
    relation: _objection.Model.ManyToManyRelation,
    modelClass: _Movie2.default,
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
    relation: _objection.Model.HasManyRelation,
    modelClass: Person,
    join: {
      from: 'Person.id',
      to: 'Person.parentId'
    }
  },

  parent: {
    relation: _objection.Model.BelongsToOneRelation,
    modelClass: Person,
    join: {
      from: 'Person.parentId',
      to: 'Person.id'
    }
  }
};