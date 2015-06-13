var MoronModel = require('moron').MoronModel;

/**
 * @Override MoronModel
 * @constructor
 */
function Person() {
  MoronModel.apply(this, arguments);
}

MoronModel.extend(Person);
module.exports = Person;

// Table name is the only required property.
Person.tableName = 'Person';

// This is not the database schema! Nothing is generated based on this. Whenever a
// Person object is created from a JSON object, the JSON is checked against this
// schema. For example when you call Person.fromJson({name: 'Matrix'});
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
    relation: MoronModel.OneToManyRelation,
    // The related model. This can be either a MoronModel subclass constructor or an
    // absolute file path to a module that exports one. We use the file path version
    // here to prevent require loops.
    modelClass: __dirname + '/Animal',
    join: {
      from: 'Person.id',
      to: 'Animal.ownerId'
    }
  },

  movies: {
    relation: MoronModel.ManyToManyRelation,
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
    relation: MoronModel.OneToManyRelation,
    modelClass: Person,
    join: {
      from: 'Person.id',
      to: 'Person.parentId'
    }
  }
};
