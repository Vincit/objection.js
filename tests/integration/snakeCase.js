const { Model, snakeCaseMappers } = require('../../');
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

      static get jsonAttributes() {
        return ['address'];
      }

      static get relationMappings() {
        return {
          parentPerson: {
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

          if (session.isPostgres()) {
            table.jsonb('person_address');
          }
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
        function maybeWithAddress(obj, address) {
          if (session.isPostgres()) {
            obj.personAddress = address;
          }

          return obj;
        }

        return Person.query(session.knex).insertGraph({
          firstName: 'Seppo',

          parentPerson: {
            firstName: 'Teppo',

            parentPerson: maybeWithAddress(
              {
                firstName: 'Matti'
              },
              {
                personCity: 'Jalasjärvi',

                cityCoordinates: {
                  latitudeCoordinate: 61,
                  longitudeCoordinate: 23
                }
              }
            )
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

      it('joinRelation', () => {
        return Person.query(session.knex)
          .joinRelation('parentPerson.parentPerson')
          .select('parentPerson:parentPerson.first_name as nestedRef')
          .then(result => {
            expect(result).to.containSubset([{ nestedRef: 'Matti' }]);
          });
      });

      if (session.isPostgres()) {
        it('update with json references', () => {
          return Person.query(session.knex)
            .where('first_name', 'Matti')
            .patch({
              'person_address:cityCoordinates.latitudeCoordinate': 30
            })
            .returning('*')
            .then(result => {
              expect(result).to.containSubset([
                {
                  firstName: 'Matti',
                  parentId: null,
                  personAddress: {
                    personCity: 'Jalasjärvi',
                    cityCoordinates: {
                      latitudeCoordinate: 30,
                      longitudeCoordinate: 23
                    }
                  }
                }
              ]);
            });
        });
      }

      [Model.WhereInEagerAlgorithm, Model.JoinEagerAlgorithm, Model.NaiveEagerAlgorithm].forEach(
        eagerAlgo => {
          it(`eager (${eagerAlgo})`, () => {
            return Person.query(session.knex)
              .select('person.first_name as rootFirstName')
              .modifyEager('parentPerson', qb => qb.select('first_name as parentFirstName'))
              .modifyEager('parentPerson.parentPerson', qb =>
                qb.select('first_name as grandParentFirstName')
              )
              .eager('[parentPerson.parentPerson, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('person.first_name')
              .then(people => {
                expect(people.length).to.equal(3);
                expect(people).to.containSubset([
                  {
                    rootFirstName: 'Seppo',

                    parentPerson: {
                      parentFirstName: 'Teppo',

                      parentPerson: {
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

                    parentPerson: {
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
          parentPerson: {
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

          parentPerson: {
            firstName: 'Teppo',

            parentPerson: {
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
          it(`eager (${eagerAlgo})`, () => {
            return Person.query(session.knex)
              .select('PERSON.FIRST_NAME as rootFirstName')
              .modifyEager('parentPerson', qb => qb.select('FIRST_NAME as parentFirstName'))
              .modifyEager('parentPerson.parentPerson', qb =>
                qb.select('FIRST_NAME as GRAND_PARENT_FIRST_NAME')
              )
              .eager('[parentPerson.parentPerson, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('PERSON.FIRST_NAME')
              .then(people => {
                expect(people.length).to.equal(3);
                expect(people).to.containSubset([
                  {
                    rootFirstName: 'Seppo',

                    parentPerson: {
                      parentFirstName: 'Teppo',

                      parentPerson: {
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

                    parentPerson: {
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
