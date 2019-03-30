const { expect } = require('chai');
const { Model } = require('../../');

module.exports = session => {
  describe('static model hooks', () => {
    let knex = session.knex;

    let Person;
    let Pet;
    let Movie;

    before(() => {
      return knex.schema
        .dropTableIfExists('actorsMovies')
        .dropTableIfExists('movies')
        .dropTableIfExists('pets')
        .dropTableIfExists('people')
        .createTable('people', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('pets', table => {
          table.increments('id').primary();
          table.string('name');
          table.string('species');
          table
            .integer('ownerId')
            .unsigned()
            .references('people.id')
            .onDelete('SET NULL');
        })
        .createTable('movies', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('actorsMovies', table => {
          table.increments('id').primary();
          table
            .integer('personId')
            .unsigned()
            .references('people.id')
            .onDelete('CASCADE');
          table
            .integer('movieId')
            .unsigned()
            .references('movies.id')
            .onDelete('CASCADE');
        });
    });

    after(() => {
      return knex.schema
        .dropTableIfExists('actorsMovies')
        .dropTableIfExists('movies')
        .dropTableIfExists('pets')
        .dropTableIfExists('people');
    });

    beforeEach(() => {
      Person = class extends Model {
        static get tableName() {
          return 'people';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Pet,
              join: {
                from: 'people.id',
                to: 'pets.ownerId'
              }
            },

            movies: {
              relation: Model.ManyToManyRelation,
              modelClass: Movie,
              join: {
                from: 'people.id',
                through: {
                  from: 'actorsMovies.personId',
                  to: 'actorsMovies.movieId'
                },
                to: 'movies.id'
              }
            }
          };
        }
      };

      Pet = class extends Model {
        static get tableName() {
          return 'pets';
        }

        static get relationMappings() {
          return {
            owner: {
              relation: Model.BelongsToOneRelation,
              modelClass: Person,
              join: {
                from: 'pets.ownerId',
                to: 'people.id'
              }
            }
          };
        }
      };

      Movie = class extends Model {
        static get tableName() {
          return 'movies';
        }

        static get relationMappings() {
          return {
            actors: {
              relation: Model.ManyToManyRelation,
              modelClass: Person,
              join: {
                from: 'movies.id',
                through: {
                  from: 'actorsMovies.movieId',
                  to: 'actorsMovies.personId'
                },
                to: 'people.id'
              }
            }
          };
        }
      };

      Person.knex(knex);
      Pet.knex(knex);
      Movie.knex(knex);
    });

    describe('onCreateQuery', () => {
      describe('default selects', () => {
        beforeEach(() => {
          Person.onCreateQuery = query => {
            query.select('people.name');
          };

          Pet.onCreateQuery = query => {
            query.select('pets.name');
          };

          Movie.onCreateQuery = query => {
            query.select('movies.name');
          };
        });

        beforeEach(() => {
          return Person.query().insertGraph({
            name: 'Jennifer',

            pets: [
              {
                name: 'Doggo',
                species: 'dog'
              },
              {
                name: 'Cato',
                species: 'cat'
              }
            ],

            movies: [
              {
                name: 'Silver Linings Playbook'
              }
            ]
          });
        });

        it('should work with a simple query', () => {
          return Person.query()
            .findOne('name', 'Jennifer')
            .then(result => {
              expect(result).to.eql({
                name: 'Jennifer'
              });
            });
        });

        it('should work with eager', () => {
          return Person.query()
            .findOne('name', 'Jennifer')
            .eager({
              movies: true,
              pets: {
                owner: true
              }
            })
            .modifyEager('pets', query => query.orderBy('name', 'desc'))
            .then(result => {
              expect(result).to.eql({
                name: 'Jennifer',
                pets: [
                  {
                    name: 'Doggo',
                    owner: {
                      name: 'Jennifer'
                    }
                  },
                  {
                    name: 'Cato',
                    owner: {
                      name: 'Jennifer'
                    }
                  }
                ],
                movies: [
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]
              });
            });
        });

        it('should work with joinEager', () => {
          return Person.query()
            .findOne('people.name', 'Jennifer')
            .joinEager({
              movies: true,
              pets: {
                owner: true
              }
            })
            .orderBy('pets.name', 'desc')
            .then(result => {
              expect(result).to.eql({
                name: 'Jennifer',
                pets: [
                  {
                    name: 'Doggo',
                    owner: {
                      name: 'Jennifer'
                    }
                  },
                  {
                    name: 'Cato',
                    owner: {
                      name: 'Jennifer'
                    }
                  }
                ],
                movies: [
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]
              });
            });
        });
      });
    });
  });
};
