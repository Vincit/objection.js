const Knex = require('knex');
const Model = require('../../').Model;
const sortBy = require('lodash/sortBy');
const Promise = require('bluebird');
const knexSnakeCaseMappers = require('../../').knexSnakeCaseMappers;
const expect = require('chai').expect;

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

      after(() => {
        return knex.schema.dropTableIfExists(table);
      });

      it('createTable', () => {
        return knex.schema
          .createTable(table, table => {
            table.increments('id');
            table.string('firstName');
          })
          .then(() => {
            return knex(table).insert({ id: 1, firstName: 'fooBar' });
          })
          .then(() => {
            return knex(table);
          })
          .then(rows => {
            expect(rows).to.eql([{ id: 1, firstName: 'fooBar' }]);

            // Query with a knex without case mapping.
            return session.knex('snake_case_test_table');
          })
          .then(rows => {
            expect(rows).to.eql([{ id: 1, first_name: 'fooBar' }]);
          });
      });

      it('dropTable', () => {
        return knex.schema
          .createTable(table, table => {
            table.increments('id');
          })
          .dropTableIfExists(table);
      });

      it('hasTable (true)', () => {
        return knex.schema
          .createTable(table, table => {
            table.increments('id');
          })
          .hasTable(table)
          .then(hasTable => {
            expect(!!hasTable).to.equal(true);
          });
      });

      it('hasTable (false)', () => {
        return knex.schema.hasTable(table).then(hasTable => {
          expect(hasTable).to.equal(false);
        });
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

      afterEach(() => {
        return ['animal', 'personMovie', 'movie', 'person'].reduce((promise, table) => {
          return promise.then(() => knex(table).delete());
        }, Promise.resolve());
      });

      it('$relatedQuery', () => {
        return Person.query(knex)
          .findOne({ firstName: 'Seppo' })
          .then(model => {
            return model.$relatedQuery('pets', knex).orderBy('animalName');
          })
          .then(pets => {
            expect(pets).to.containSubset([
              {
                animalName: 'Hurtta'
              },
              {
                animalName: 'Katti'
              }
            ]);
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
              .then(people => {
                expect(people.length).to.equal(2);
                expect(people).to.containSubset([
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
          { concurrency: 1 }
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
