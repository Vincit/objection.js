/**
 * This is a simple template for bug reproductions. It contains three models `Person`, `Animal` and `Movie`.
 * They create a simple IMDB-style database. Try to add minimal modifications to this file to reproduce
 * your bug.
 *
 * install:
 *    npm install objection knex sqlite3 chai
 *
 * run:
 *    node reproduction-template
 */

let Model;

try {
  Model = require('./').Model;
} catch (err) {
  Model = require('objection').Model;
}

const Knex = require('knex');
const chai = require('chai');

async function main() {
  await createSchema();

  ///////////////////////////////////////////////////////////////
  // Your reproduction
  ///////////////////////////////////////////////////////////////

  await Person.query().insertGraph({
    firstName: 'Jennifer',
    lastName: 'Lawrence',

    pets: [
      {
        name: 'Doggo',
        species: 'dog'
      }
    ]
  });

  const jennifer = await Person.query()
    .findOne({firstName: 'Jennifer'})
    .eager('pets');

  chai.expect(jennifer.pets[0].name).to.equal('Doggo');
}

///////////////////////////////////////////////////////////////
// Database
///////////////////////////////////////////////////////////////

const knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: ':memory:'
  }
});

Model.knex(knex);

///////////////////////////////////////////////////////////////
// Models
///////////////////////////////////////////////////////////////

class Person extends Model {
  static get tableName() {
    return 'Person';
  }

  static get jsonSchema() {
    return {
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
  }

  static get relationMappings() {
    return {
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Animal,
        join: {
          from: 'Person.id',
          to: 'Animal.ownerId'
        }
      },

      movies: {
        relation: Model.ManyToManyRelation,
        modelClass: Movie,
        join: {
          from: 'Person.id',
          through: {
            from: 'Person_Movie.personId',
            to: 'Person_Movie.movieId'
          },
          to: 'Movie.id'
        }
      },

      children: {
        relation: Model.HasManyRelation,
        modelClass: Person,
        join: {
          from: 'Person.id',
          to: 'Person.parentId'
        }
      },

      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Person.parentId',
          to: 'Person.id'
        }
      }
    };
  }
}

class Animal extends Model {
  static get tableName() {
    return 'Animal';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: {type: 'integer'},
        ownerId: {type: ['integer', 'null']},
        name: {type: 'string', minLength: 1, maxLength: 255},
        species: {type: 'string', minLength: 1, maxLength: 255}
      }
    };
  }

  static get relationMappings() {
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Person,
        join: {
          from: 'Animal.ownerId',
          to: 'Person.id'
        }
      }
    };
  }
}

class Movie extends Model {
  static get tableName() {
    return 'Movie';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: {type: 'integer'},
        name: {type: 'string', minLength: 1, maxLength: 255}
      }
    };
  }

  static get relationMappings() {
    return {
      actors: {
        relation: Model.ManyToManyRelation,
        modelClass: Person,
        join: {
          from: 'Movie.id',
          through: {
            from: 'Person_Movie.movieId',
            to: 'Person_Movie.personId'
          },
          to: 'Person.id'
        }
      }
    };
  }
}

///////////////////////////////////////////////////////////////
// Schema
///////////////////////////////////////////////////////////////

async function createSchema() {
  await knex.schema
    .dropTableIfExists('Person_Movie')
    .dropTableIfExists('Animal')
    .dropTableIfExists('Movie')
    .dropTableIfExists('Person');

  await knex.schema
    .createTable('Person', table => {
      table.increments('id').primary();
      table
        .integer('parentId')
        .unsigned()
        .references('id')
        .inTable('Person');
      table.string('firstName');
      table.string('lastName');
      table.integer('age');
      table.json('address');
    })
    .createTable('Movie', table => {
      table.increments('id').primary();
      table.string('name');
    })
    .createTable('Animal', table => {
      table.increments('id').primary();
      table
        .integer('ownerId')
        .unsigned()
        .references('id')
        .inTable('Person');
      table.string('name');
      table.string('species');
    })
    .createTable('Person_Movie', table => {
      table.increments('id').primary();
      table
        .integer('personId')
        .unsigned()
        .references('id')
        .inTable('Person')
        .onDelete('CASCADE');
      table
        .integer('movieId')
        .unsigned()
        .references('id')
        .inTable('Movie')
        .onDelete('CASCADE');
    });
}

main()
  .then(() => console.log('success'))
  .catch(console.error);
