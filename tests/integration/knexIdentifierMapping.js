const Knex = require('knex');
const Promise = require('bluebird');
const { expect } = require('chai');
const { Model, knexIdentifierMapping } = require('../../');

module.exports = session => {
  describe('knexIdentifierMapping', () => {
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
      // Create schema with the knex instance that doesn't
      // have identifier mapping configured.
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
      const config = Object.assign(
        {},
        session.opt.knexConfig,
        knexIdentifierMapping({
          person_movie: 'personMovie',
          first_name: 'fName',
          parent_id: 'parentId',
          owner_id: 'ownerId',
          movie_name: 'movieName',
          person_id: 'personId',
          movie_id: 'movieId',
          snake_case_test_table: 'snakeCaseTestTable',
          animal_name: 'animalName'
        })
      );

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
            table.string('fName');
          })
          .then(() => {
            return knex(table).insert({ id: 1, fName: 'fooBar' });
          })
          .then(() => {
            return knex(table);
          })
          .then(rows => {
            expect(rows).to.eql([{ id: 1, fName: 'fooBar' }]);

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
          fName: 'Seppo',

          parent: {
            fName: 'Teppo',

            parent: {
              fName: 'Matti'
            }
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
          .findOne({ fName: 'Seppo' })
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

      [Model.WhereInEagerAlgorithm, Model.JoinEagerAlgorithm, Model.NaiveEagerAlgorithm].forEach(
        eagerAlgo => {
          it(`eager (${eagerAlgo.name})`, () => {
            return Person.query(knex)
              .select('person.fName as rootFirstName')
              .modifyEager('parent', qb => qb.select('fName as parentFirstName'))
              .modifyEager('parent.parent', qb => qb.select('fName as grandParentFirstName'))
              .eager('[parent.parent, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('person.fName')
              .then(people => {
                expect(people.length).to.equal(3);
                expect(people).to.containSubset([
                  {
                    rootFirstName: 'Seppo',

                    parent: {
                      parentFirstName: 'Teppo',

                      parent: {
                        grandParentFirstName: 'Matti'
                      }
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
                    rootFirstName: 'Teppo',

                    parent: {
                      parentFirstName: 'Matti'
                    }
                  },
                  {
                    rootFirstName: 'Matti'
                  }
                ]);
              });
          });
        }
      );
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
