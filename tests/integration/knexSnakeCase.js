const Knex = require('knex');
const Promise = require('bluebird');
const { Model, knexSnakeCaseMappers } = require('../../');
const { expect } = require('chai');

module.exports = session => {
  describe('knexSnakeCaseMappers', () => {
    let knex;

    class Person extends Model {
      static get tableName() {
        return 'person';
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

      if (session.isPostgres()) {
        it('alter', () => {
          return knex.schema
            .createTable(table, table => {
              table.increments('id');
              table.string('firstName');
            })
            .then(() => {
              return knex.schema.table(table, table => {
                table.text('firstName').alter();
              });
            });
        });
      }

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
        function maybeWithAddress(obj, address) {
          if (session.isPostgres()) {
            obj.personAddress = address;
          }

          return obj;
        }

        return Person.query(knex).insertGraph({
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
        return ['animal', 'personMovie', 'movie', 'person'].reduce((promise, table) => {
          return promise.then(() => knex(table).delete());
        }, Promise.resolve());
      });

      if (session.isPostgres()) {
        it('returning', () => {
          return Person.query(knex)
            .insert({ firstName: 'Arto' })
            .returning('*')
            .then(res => {
              expect(res).to.containSubset({ firstName: 'Arto', parentId: null });
            });
        });
      }

      it('joinRelation', () => {
        return Person.query(knex)
          .joinRelation('parentPerson.parentPerson')
          .select('parentPerson:parentPerson.firstName as nestedRef')
          .then(result => {
            expect(result).to.containSubset([{ nestedRef: 'Matti' }]);
          });
      });

      if (session.isPostgres()) {
        it('update with json references', () => {
          return Person.query(knex)
            .where('firstName', 'Matti')
            .patch({
              'personAddress:cityCoordinates.latitudeCoordinate': 30
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

      [Model.WhereInEagerAlgorithm, Model.JoinEagerAlgorithm, Model.NaiveEagerAlgorithm].forEach(
        eagerAlgo => {
          it(`eager (${eagerAlgo})`, () => {
            return Person.query(knex)
              .select('person.firstName as rootFirstName')
              .modifyEager('parentPerson', qb => qb.select('firstName as parentFirstName'))
              .modifyEager('parentPerson.parentPerson', qb =>
                qb.select('firstName as grandParentFirstName')
              )
              .eager('[parentPerson.parentPerson, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('person.firstName')
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

    after(() => {
      return knex.destroy();
    });
  });

  describe('knexSnakeCaseMappers uppercase = true', () => {
    let knex;

    class Person extends Model {
      static get tableName() {
        return 'person';
      }

      static get relationMappings() {
        return {
          parentPerson: {
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

    before(() => {
      const config = Object.assign(
        {},
        session.opt.knexConfig,
        knexSnakeCaseMappers({ upperCase: true })
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
            return session.knex('SNAKE_CASE_TEST_TABLE');
          })
          .then(rows => {
            expect(rows).to.eql([{ ID: 1, FIRST_NAME: 'fooBar' }]);
          });
      });

      if (session.isPostgres()) {
        it('alter', () => {
          return knex.schema
            .createTable(table, table => {
              table.increments('id');
              table.string('firstName');
            })
            .then(() => {
              return knex.schema.table(table, table => {
                table.text('firstName').alter();
              });
            });
        });
      }

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

      [Model.WhereInEagerAlgorithm, Model.JoinEagerAlgorithm, Model.NaiveEagerAlgorithm].forEach(
        eagerAlgo => {
          it(`eager (${eagerAlgo})`, () => {
            return Person.query(knex)
              .select('person.firstName as rootFirstName')
              .modifyEager('parentPerson', qb => qb.select('firstName as parentFirstName'))
              .modifyEager('parentPerson.parentPerson', qb =>
                qb.select('firstName as grandParentFirstName')
              )
              .eager('[parentPerson.parentPerson, pets, movies]')
              .eagerAlgorithm(eagerAlgo)
              .orderBy('person.firstName')
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

    after(() => {
      return knex.destroy();
    });
  });
};
