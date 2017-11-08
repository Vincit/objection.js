'use strict';

const Knex = require('knex');
const Model = require('../../').Model;
const sortBy = require('lodash/sortBy');
const Promise = require('bluebird');
const knexSnakeCaseMappers = require('../../').knexSnakeCaseMappers;
const expect = require('expect.js');

module.exports = session => {
  describe('knexSnakeCaseMappers', () => {
    let knex;

    class Person extends Model {
      static get tableName() {
        return 'person';
      }

      static get relationMappings() {
        return {
          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'person.parentId',
              to: 'person.id'
            }
          },

          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'person.id',
              to: 'animal.ownerId'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'person.id',
              through: {
                from: 'personMovie.personId',
                to: 'personMovie.movieId'
              },
              to: 'movie.id'
            }
          }
        };
      }
    }

    class Animal extends Model {
      static get tableName() {
        return 'animal';
      }
    }

    class Movie extends Model {
      static get tableName() {
        return 'movie';
      }
    }

    before(() => {
      return session.knex.schema
        .dropTableIfExists('person_movie')
        .dropTableIfExists('animal')
        .dropTableIfExists('movie')
        .dropTableIfExists('person')
        .createTable('person', table => {
          table.increments('id').primary();
          table.string('first_name');
          table.integer('parent_id');
        })
        .createTable('animal', table => {
          table.increments('id').primary();
          table.string('animal_name');
          table.integer('owner_id');
        })
        .createTable('movie', table => {
          table.increments('id').primary();
          table.string('movie_name');
        })
        .createTable('person_movie', table => {
          table.integer('person_id');
          table.integer('movie_id');
        });
    });

    before(() => {
      const config = Object.assign({}, session.opt.knexConfig, knexSnakeCaseMappers());
      knex = Knex(config);
    });

    describe('schema', () => {
      const table = 'snakeCaseTestTable';

      before(() => {
        return knex.schema.dropTableIfExists(table);
      });

      afterEach(() => {
        return knex.schema.dropTableIfExists(table);
      });

      it('createTable', () => {
        return knex.schema.createTable(table, table => {
          table.increments('id');
        });
      });

      it('dropTable', () => {
        return knex.schema
          .createTable(table, table => {
            table.increments('id');
          })
          .dropTableIfExists(table);
      });

      it('dropTable', () => {
        return knex.schema
          .createTable(table, table => {
            table.increments('id');
          })
          .hasTable(table);
      });
    });

    describe('queries', () => {
      beforeEach(() => {
        return Person.query(knex).insertGraph({
          firstName: 'Seppo',

          parent: {
            firstName: 'Teppo'
          },

          pets: [
            {
              animalName: 'Hurtta'
            },
            {
              animalName: 'Katti'
            }
          ],

          movies: [
            {
              movieName: 'Salkkarit the movie'
            },
            {
              movieName: 'Salkkarit 2, the low quality continues'
            }
          ]
        });
      });

      it('eager', () => {
        return Promise.map(
          [Model.WhereInEagerAlgorithm, Model.JoinEagerAlgorithm, Model.NaiveEagerAlgorithm],
          eagerAlgo => {
            return Person.query(knex)
              .eager('[parent, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('firstName')
              .traverse(model => {
                delete model.id;
                delete model.ownerId;
                delete model.parentId;

                if (model.movies) {
                  model.movies = sortBy(model.movies, 'movieName');
                }

                if (model.pets) {
                  model.pets = sortBy(model.pets, 'animalName');
                }
              })
              .then(people => {
                expect(people).to.eql([
                  {
                    firstName: 'Seppo',

                    parent: {
                      firstName: 'Teppo'
                    },

                    pets: [
                      {
                        animalName: 'Hurtta'
                      },
                      {
                        animalName: 'Katti'
                      }
                    ],

                    movies: [
                      {
                        movieName: 'Salkkarit 2, the low quality continues'
                      },
                      {
                        movieName: 'Salkkarit the movie'
                      }
                    ]
                  },
                  {
                    firstName: 'Teppo',
                    parent: null,
                    pets: [],
                    movies: []
                  }
                ]);
              });
          },
          {concurrency: 1}
        );
      });
    });

    after(() => {
      return session.knex.schema
        .dropTableIfExists('person_movie')
        .dropTableIfExists('animal')
        .dropTableIfExists('movie')
        .dropTableIfExists('person');
    });

    after(() => {
      return knex.destroy();
    });
  });
};
