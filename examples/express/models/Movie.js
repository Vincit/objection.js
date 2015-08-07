var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
function Movie() {
  Model.apply(this, arguments);
}

Model.extend(Movie);
module.exports = Movie;

// Table name is the only required property.
Movie.tableName = 'Movie';

// Optional JSON schema. This is not the database schema! Nothing is generated
// based on this. This is only used for validation. Whenever a model instance
// is created it is checked against this schema. http://json-schema.org/.
Movie.jsonSchema = {
  type: 'object',
  required: ['name'],

  properties: {
    id: {type: 'integer'},
    name: {type: 'string', minLength: 1, maxLength: 255}
  }
};

// This object defines the relations to other models.
Movie.relationMappings = {
  actors: {
    relation: Model.ManyToManyRelation,
    // The related model. This can be either a Model subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: __dirname + '/Person',
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
