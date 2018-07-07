const { Model, snakeCaseMappers } = require('../../');
const sortBy = require('lodash/sortBy');
const Promise = require('bluebird');
const expect = require('chai').expect;

module.exports = session => {
  describe('snakeCaseMappers', () => {
    class Person extends Model {
      static get tableName() {
        return 'person';
      }

      static get columnNameMappers() {
        return snakeCaseMappers();
      }

      static get relationMappings() {
        return {
          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'person.parent_id',
              to: 'person.id'
            }
          },

          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'person.id',
              to: 'animal.owner_id'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'person.id',
              through: {
                from: 'person_movie.person_id',
                to: 'person_movie.movie_id'
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

      static get columnNameMappers() {
        return snakeCaseMappers();
      }
    }

    class Movie extends Model {
      static get tableName() {
        return 'movie';
      }

      static get columnNameMappers() {
        return snakeCaseMappers();
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

    describe('queries', () => {
      beforeEach(() => {
        return Person.query(session.knex).insertGraph({
          firstName: 'Seppo',

          parent: {
            firstName: 'Teppo',

            parent: {
              firstName: 'Matti'
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
        return ['animal', 'person_movie', 'movie', 'person'].reduce((promise, table) => {
          return promise.then(() => session.knex(table).delete());
        }, Promise.resolve());
      });

      it('$relatedQuery', () => {
        return Person.query(session.knex)
          .findOne({ first_name: 'Seppo' })
          .then(model => {
            return model.$relatedQuery('pets', session.knex).orderBy('animal_name');
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
            return Person.query(session.knex)
              .select('person.first_name as rootFirstName')
              .modifyEager('parent', qb => qb.select('first_name as parentFirstName'))
              .modifyEager('parent.parent', qb => qb.select('first_name as grandParentFirstName'))
              .eager('[parent.parent, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('person.first_name')
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
  });

  describe('snakeCaseMappers uppercase = true', () => {
    class Person extends Model {
      static get tableName() {
        return 'PERSON';
      }

      static get idColumn() {
        return 'ID';
      }

      static get columnNameMappers() {
        return snakeCaseMappers({ upperCase: true });
      }

      static get relationMappings() {
        return {
          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'PERSON.PARENT_ID',
              to: 'PERSON.ID'
            }
          },

          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'PERSON.ID',
              to: 'ANIMAL.OWNER_ID'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'PERSON.ID',
              through: {
                from: 'PERSON_MOVIE.PERSON_ID',
                to: 'PERSON_MOVIE.MOVIE_ID'
              },
              to: 'MOVIE.ID'
            }
          }
        };
      }
    }

    class Animal extends Model {
      static get tableName() {
        return 'ANIMAL';
      }

      static get idColumn() {
        return 'ID';
      }

      static get columnNameMappers() {
        return snakeCaseMappers({ upperCase: true });
      }
    }

    class Movie extends Model {
      static get tableName() {
        return 'MOVIE';
      }

      static get idColumn() {
        return 'ID';
      }

      static get columnNameMappers() {
        return snakeCaseMappers({ upperCase: true });
      }
    }

    before(() => {
      return session.knex.schema
        .dropTableIfExists('PERSON_MOVIE')
        .dropTableIfExists('ANIMAL')
        .dropTableIfExists('MOVIE')
        .dropTableIfExists('PERSON')
        .createTable('PERSON', table => {
          table.increments('ID').primary();
          table.string('FIRST_NAME');
          table.integer('PARENT_ID');
        })
        .createTable('ANIMAL', table => {
          table.increments('ID').primary();
          table.string('ANIMAL_NAME');
          table.integer('OWNER_ID');
        })
        .createTable('MOVIE', table => {
          table.increments('ID').primary();
          table.string('MOVIE_NAME');
        })
        .createTable('PERSON_MOVIE', table => {
          table.integer('PERSON_ID');
          table.integer('MOVIE_ID');
        });
    });

    describe('queries', () => {
      beforeEach(() => {
        return Person.query(session.knex).insertGraph({
          firstName: 'Seppo',

          parent: {
            firstName: 'Teppo',

            parent: {
              firstName: 'Matti'
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
        return ['ANIMAL', 'PERSON_MOVIE', 'MOVIE', 'PERSON'].reduce((promise, table) => {
          return promise.then(() => session.knex(table).delete());
        }, Promise.resolve());
      });

      it('$relatedQuery', () => {
        return Person.query(session.knex)
          .findOne({ FIRST_NAME: 'Seppo' })
          .then(model => {
            return model.$relatedQuery('pets', session.knex).orderBy('ANIMAL_NAME');
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
            return Person.query(session.knex)
              .select('PERSON.FIRST_NAME as rootFirstName')
              .modifyEager('parent', qb => qb.select('FIRST_NAME as parentFirstName'))
              .modifyEager('parent.parent', qb =>
                qb.select('FIRST_NAME as GRAND_PARENT_FIRST_NAME')
              )
              .eager('[parent.parent, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('PERSON.FIRST_NAME')
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
        .dropTableIfExists('PERSON_MOVIe')
        .dropTableIfExists('ANIMAL')
        .dropTableIfExists('MOVIE')
        .dropTableIfExists('PERSON');
    });
  });
};
