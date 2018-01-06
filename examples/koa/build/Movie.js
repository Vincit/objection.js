'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objection = require('objection');

class Movie extends _objection.Model {}
exports.default = Movie;
Movie.tableName = 'Movie';
Movie.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: { type: 'integer' },
    name: { type: 'string', minLength: 1, maxLength: 255 }
  }
};
Movie.relationMappings = {
  actors: {
    relation: _objection.Model.ManyToManyRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: `${__dirname}/Person`,
    join: {
      from: 'Movie.id',
      // ManyToMany relation needs the `through` object to describe the join table.
      through: {
        from: 'Person_Movie.movieId',
        to: 'Person_Movie.personId'
      },
      to: 'Person.id'
    }
  }
};