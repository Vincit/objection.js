const expect = require('expect.js');
const { expect: chaiExpect } = require('chai');
const { Model } = require('../../');
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = session => {
  describe('static model hooks', () => {
    let knex;
    let queries = [];

    let Person;
    let Pet;
    let Movie;

    before(() => {
      return session.knex.schema
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
      return session.knex.schema
        .dropTableIfExists('actorsMovies')
        .dropTableIfExists('movies')
        .dropTableIfExists('pets')
        .dropTableIfExists('people');
    });

    before(() => {
      knex = mockKnexFactory(session.knex, function(_, oldImpl, args) {
        queries.push(this.toSQL());
        return oldImpl.apply(this, args);
      });
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

    beforeEach(() => {
      return Movie.query()
        .delete()
        .then(() => Pet.query().delete())
        .then(() => Person.query().delete());
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

        it('should work with updates', () => {
          return Person.query()
            .findOne('name', 'Jennifer')
            .patch({ name: 'Jennier II' })
            .then(result => {
              expect(result).to.eql(1);
            });
        });

        it('should work with inserts', () => {
          return Person.query()
            .insert({ name: 'Jennier II' })
            .then(result => {
              expect(result.id).to.be.a('number');
            });
        });

        it('should work with deletes', () => {
          return Person.query()
            .findOne('name', 'Jennifer')
            .delete()
            .then(result => {
              expect(result).to.eql(1);
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

    describe('beforeFind', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called before normal queries', () => {
          Movie.beforeFind = createHookSpy();

          return Movie.query().then(movies => {
            expect(movies.length).to.equal(2);

            chaiExpect(movies).to.containSubset([
              {
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]);

            expect(Movie.beforeFind.calls.length).to.equal(1);
          });
        });

        it('can be async', () => {
          Movie.beforeFind = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query().then(movies => {
            expect(movies.length).to.equal(2);

            chaiExpect(movies).to.containSubset([
              {
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]);

            expect(Movie.beforeFind.calls.length).to.equal(1);
            expect(Movie.beforeFind.calls[0].itWorked).to.equal(true);
          });
        });

        it('should have access to `context`', () => {
          Movie.beforeFind = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .context({ a: 1 })
            .then(() => {
              expect(Movie.beforeFind.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.beforeFind = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query().then(() => {
            expect(Movie.beforeFind.calls.length).to.equal(1);
          });
        });

        it('should be able to cancel the query', () => {
          Movie.beforeFind = createHookSpy(({ cancelQuery }) => {
            cancelQuery();
          });

          return Movie.query().then(result => {
            expect(result).to.eql([]);
            expect(queries.length).to.equal(0);
          });
        });

        it('should be able to cancel the query with a value', () => {
          Movie.beforeFind = createHookSpy(({ cancelQuery }) => {
            cancelQuery(['lol']);
          });

          return Movie.query().then(result => {
            expect(result).to.eql(['lol']);
            expect(queries.length).to.equal(0);
          });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Hungergames' })
            .then(movie => {
              Movie.beforeFind = createHookSpy(({ modelInstances }) => {
                expect(modelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Hungergames'
                  }
                ]);
              });

              return movie.$query();
            })
            .then(result => {
              expect(result.name).to.equal('Hungergames');
              expect(Movie.beforeFind.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.beforeFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('movies'));
                });

                return person.$relatedQuery('movies');
              })
              .then(movies => {
                expect(movies.length).to.equal(2);

                chaiExpect(movies).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  },
                  {
                    name: 'Hungergames'
                  }
                ]);

                expect(Movie.beforeFind.calls.length).to.equal(1);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.beforeFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('pets'));
                });

                return person.$relatedQuery('pets');
              })
              .then(pets => {
                expect(pets.length).to.equal(2);

                chaiExpect(pets).to.containSubset([
                  {
                    name: 'Doggo',
                    species: 'dog'
                  },
                  {
                    name: 'Cato',
                    species: 'cat'
                  }
                ]);

                expect(Pet.beforeFind.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.beforeFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Doggo'
                    }
                  ]);

                  expect(relation).to.equal(Pet.getRelation('owner'));
                });

                return pet.$relatedQuery('owner');
              })
              .then(person => {
                chaiExpect(person).to.containSubset({
                  name: 'Jennifer'
                });

                expect(Person.beforeFind.calls.length).to.equal(1);
              });
          });
        });
      });

      describe('eager', () => {
        it('should have access to all parents and relation', () => {
          Pet.beforeFind = createHookSpy(({ modelInstances, relation }) => {
            expect(modelInstances.length).to.equal(2);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Jennifer'
              },
              {
                name: 'Brad'
              }
            ]);

            expect(relation).to.equal(Person.getRelation('pets'));
          });

          Person.beforeFind = createHookSpy(({ modelInstances, relation }) => {
            // Ignore the first call (root query).
            if (Person.beforeFind.calls.length === 1) {
              return;
            }

            expect(modelInstances.length).to.equal(4);
            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Doggo'
              },
              {
                name: 'Cato'
              },
              {
                name: 'Jamie'
              },
              {
                name: 'Rob'
              }
            ]);

            expect(relation).to.equal(Pet.getRelation('owner'));
          });

          Movie.beforeFind = createHookSpy(({ modelInstances, relation }) => {
            expect(modelInstances.length).to.equal(2);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Jennifer'
              },
              {
                name: 'Brad'
              }
            ]);

            expect(relation).to.equal(Person.getRelation('movies'));
          });

          return Person.query()
            .eager({
              movies: true,
              pets: {
                owner: true
              }
            })
            .then(() => {
              expect(Movie.beforeFind.calls.length).to.equal(1);
              expect(Pet.beforeFind.calls.length).to.equal(1);
              expect(Person.beforeFind.calls.length).to.equal(2);
            });
        });
      });
    });

    describe('afterFind', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              }
            ]
          }
        ]);
      });

      describe('query', () => {
        it('should be called before normal queries', () => {
          Movie.afterFind = createHookSpy();

          return Movie.query().then(movies => {
            expect(movies.length).to.equal(2);

            chaiExpect(movies).to.containSubset([
              {
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]);

            expect(Movie.afterFind.calls.length).to.equal(1);
          });
        });

        it('should be able to change the result', () => {
          Movie.afterFind = createHookSpy(({ result }) => {
            return ['some', 'crap', result];
          });

          return Movie.query().then(result => {
            chaiExpect(result).to.containSubset([
              'some',
              'crap',
              [
                {
                  name: 'Silver Linings Playbook'
                },
                {
                  name: 'Hungergames'
                }
              ]
            ]);
            expect(Movie.afterFind.calls.length).to.equal(1);
          });
        });

        it('can be async', () => {
          Movie.afterFind = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query().then(movies => {
            expect(movies.length).to.equal(2);

            chaiExpect(movies).to.containSubset([
              {
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]);

            expect(Movie.afterFind.calls.length).to.equal(1);
            expect(Movie.afterFind.calls[0].itWorked).to.equal(true);
          });
        });

        it('should have access to `context`', () => {
          Movie.afterFind = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .context({ a: 1 })
            .then(() => {
              expect(Movie.afterFind.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.afterFind = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query().then(() => {
            expect(Movie.afterFind.calls.length).to.equal(1);
          });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Hungergames' })
            .then(movie => {
              Movie.afterFind = createHookSpy(({ modelInstances }) => {
                expect(modelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Hungergames'
                  }
                ]);
              });

              return movie.$query();
            })
            .then(result => {
              expect(result.name).to.equal('Hungergames');
              expect(Movie.afterFind.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.afterFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('movies'));
                });

                return person.$relatedQuery('movies');
              })
              .then(movies => {
                expect(movies.length).to.equal(2);

                chaiExpect(movies).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  },
                  {
                    name: 'Hungergames'
                  }
                ]);

                expect(Movie.afterFind.calls.length).to.equal(1);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.afterFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('pets'));
                });

                return person.$relatedQuery('pets');
              })
              .then(pets => {
                expect(pets.length).to.equal(2);

                chaiExpect(pets).to.containSubset([
                  {
                    name: 'Doggo',
                    species: 'dog'
                  },
                  {
                    name: 'Cato',
                    species: 'cat'
                  }
                ]);

                expect(Pet.afterFind.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.afterFind = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Doggo'
                    }
                  ]);

                  expect(relation).to.equal(Pet.getRelation('owner'));
                });

                return pet.$relatedQuery('owner');
              })
              .then(person => {
                chaiExpect(person).to.containSubset({
                  name: 'Jennifer'
                });

                expect(Person.afterFind.calls.length).to.equal(1);
              });
          });
        });
      });

      describe('eager', () => {
        it('should have access to all parents and relation', () => {
          Pet.afterFind = createHookSpy(({ modelInstances, relation }) => {
            expect(modelInstances.length).to.equal(2);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Jennifer'
              },
              {
                name: 'Brad'
              }
            ]);

            expect(relation).to.equal(Person.getRelation('pets'));
          });

          Person.afterFind = createHookSpy(({ modelInstances, relation }) => {
            // Ignore the last call (root query).
            if (Person.afterFind.calls.length === 2) {
              return;
            }

            expect(modelInstances.length).to.equal(4);
            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Doggo'
              },
              {
                name: 'Cato'
              },
              {
                name: 'Jamie'
              },
              {
                name: 'Rob'
              }
            ]);

            expect(relation).to.equal(Pet.getRelation('owner'));
          });

          Movie.afterFind = createHookSpy(({ modelInstances, relation }) => {
            expect(modelInstances.length).to.equal(2);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Jennifer'
              },
              {
                name: 'Brad'
              }
            ]);

            expect(relation).to.equal(Person.getRelation('movies'));
          });

          return Person.query()
            .eager({
              movies: true,
              pets: {
                owner: true
              }
            })
            .then(() => {
              expect(Movie.afterFind.calls.length).to.equal(1);
              expect(Pet.afterFind.calls.length).to.equal(1);
              expect(Person.afterFind.calls.length).to.equal(2);
            });
        });
      });
    });

    describe('beforeUpdate', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called before normal queries', () => {
          Movie.beforeUpdate = createHookSpy();

          return Movie.query()
            .update({ name: 'Updated' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(3);
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
            });
        });

        it('can be async', () => {
          Movie.beforeUpdate = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(3);
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
              expect(Movie.beforeUpdate.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.beforeUpdate = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .context({ a: 1 })
            .then(() => {
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.beforeUpdate = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(() => {
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
            });
        });

        it('should have access to `inputModelInstances`', () => {
          Movie.beforeUpdate = createHookSpy(({ inputModelInstances }) => {
            expect(inputModelInstances.length).to.equal(1);
            expect(inputModelInstances[0] instanceof Movie).to.equal(true);
            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Updated'
              }
            ]);
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(() => {
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
            });
        });

        it('should be able to fetch the rows about to be updated', () => {
          Movie.beforeUpdate = createHookSpy(({ findQuery }, call) => {
            return findQuery
              .select('name')
              .forUpdate()
              .then(moviesToBeUpdated => {
                chaiExpect(moviesToBeUpdated).containSubset([
                  {
                    name: 'Hungergames'
                  }
                ]);
                call.queryWasAwaited = true;
              });
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .where('name', 'like', '%gam%')
            .then(() => {
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
              expect(Movie.beforeUpdate.calls[0].queryWasAwaited).to.equal(true);
              expect(queries.length).to.equal(2);
            });
        });

        it('should be able to cancel the query', () => {
          Movie.beforeUpdate = createHookSpy(({ cancelQuery }) => {
            cancelQuery();
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(numUpdated => {
              expect(numUpdated).to.eql(0);
              expect(queries.length).to.equal(0);
            });
        });

        it('should be able to cancel the query with a value', () => {
          Movie.beforeUpdate = createHookSpy(({ cancelQuery }) => {
            cancelQuery(['lol']);
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(result => {
              expect(result).to.eql(['lol']);
              expect(queries.length).to.equal(0);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances` and `inputModelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              Movie.beforeUpdate = createHookSpy(({ modelInstances, inputModelInstances }) => {
                expect(modelInstances.length).to.equal(1);
                expect(inputModelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]);

                chaiExpect(inputModelInstances).to.containSubset([
                  {
                    name: 'Updated'
                  }
                ]);
              });

              return movie.$query().patch({ name: 'Updated' });
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
            });
        });

        it('should be able to fetch the rows about to be updated`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              queries = [];

              Movie.beforeUpdate = createHookSpy(({ findQuery }, call) => {
                return findQuery
                  .select('name')
                  .forUpdate()
                  .then(moviesToBeUpdated => {
                    // Note: moviesToBeUpdated must be an array even though $query()
                    // would normally produce a single item.
                    chaiExpect(moviesToBeUpdated).containSubset([
                      {
                        name: 'Silver Linings Playbook'
                      }
                    ]);
                    call.queryWasAwaited = true;
                  });
              });

              return movie.$query().patch({ name: 'Updated' });
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              expect(Movie.beforeUpdate.calls.length).to.equal(1);
              expect(Movie.beforeUpdate.calls[0].queryWasAwaited).to.equal(true);
              expect(queries.length).to.equal(2);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.beforeUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'Updated'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('movies'));
                  }
                );

                return person.$relatedQuery('movies').update({ name: 'Updated' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Movie.beforeUpdate.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be updated`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                queries = [];

                Movie.beforeUpdate = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(moviesToBeUpdated => {
                      expect(moviesToBeUpdated.length).to.equal(2);

                      chaiExpect(moviesToBeUpdated).containSubset([
                        {
                          name: 'Silver Linings Playbook'
                        },
                        {
                          name: 'Hungergames'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return person.$relatedQuery('movies').patch({ name: 'Updated' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Movie.beforeUpdate.calls.length).to.equal(1);
                expect(Movie.beforeUpdate.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.beforeUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        species: 'Frog'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('pets'));
                  }
                );

                return person.$relatedQuery('pets').patch({ species: 'Frog' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Pet.beforeUpdate.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be updated`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                queries = [];

                Pet.beforeUpdate = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(moviesToBeUpdated => {
                      expect(moviesToBeUpdated.length).to.equal(2);

                      chaiExpect(moviesToBeUpdated).containSubset([
                        {
                          name: 'Doggo'
                        },
                        {
                          name: 'Cato'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return person.$relatedQuery('pets').patch({ name: 'Updated' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Pet.beforeUpdate.calls.length).to.equal(1);
                expect(Pet.beforeUpdate.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.beforeUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Doggo'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'New Owner'
                      }
                    ]);

                    expect(relation).to.equal(Pet.getRelation('owner'));
                  }
                );

                return pet.$relatedQuery('owner').patch({ name: 'New Owner' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(1);
                expect(Person.beforeUpdate.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be updated`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                queries = [];

                Person.beforeUpdate = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(peopleToBeUpdated => {
                      expect(peopleToBeUpdated.length).to.equal(1);

                      chaiExpect(peopleToBeUpdated).containSubset([
                        {
                          name: 'Jennifer'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return pet.$relatedQuery('owner').patch({ name: 'Updated' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(1);
                expect(Person.beforeUpdate.calls.length).to.equal(1);
                expect(Person.beforeUpdate.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });
      });
    });

    describe('afterUpdate', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called after normal queries', () => {
          Movie.afterUpdate = createHookSpy();

          return Movie.query()
            .update({ name: 'Updated' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(3);
              expect(Movie.afterUpdate.calls.length).to.equal(1);
            });
        });

        it('should be able to change the result', () => {
          Movie.afterUpdate = createHookSpy(({ result }) => {
            return {
              numUpdated: result[0]
            };
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(result => {
              expect(result).to.eql({ numUpdated: 3 });
            });
        });

        it('can be async', () => {
          Movie.afterUpdate = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(3);
              expect(Movie.afterUpdate.calls.length).to.equal(1);
              expect(Movie.afterUpdate.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.afterUpdate = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .context({ a: 1 })
            .then(() => {
              expect(Movie.afterUpdate.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.afterUpdate = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(() => {
              expect(Movie.afterUpdate.calls.length).to.equal(1);
            });
        });

        it('should have access to `inputModelInstances`', () => {
          Movie.afterUpdate = createHookSpy(({ inputModelInstances }) => {
            expect(inputModelInstances.length).to.equal(1);
            expect(inputModelInstances[0] instanceof Movie).to.equal(true);
            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Updated'
              }
            ]);
          });

          return Movie.query()
            .update({ name: 'Updated' })
            .then(() => {
              expect(Movie.afterUpdate.calls.length).to.equal(1);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances` and `inputModelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              Movie.afterUpdate = createHookSpy(({ modelInstances, inputModelInstances }) => {
                expect(modelInstances.length).to.equal(1);
                expect(inputModelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]);

                chaiExpect(inputModelInstances).to.containSubset([
                  {
                    name: 'Updated'
                  }
                ]);
              });

              return movie.$query().patch({ name: 'Updated' });
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              expect(Movie.afterUpdate.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.afterUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'Updated'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('movies'));
                  }
                );

                return person.$relatedQuery('movies').update({ name: 'Updated' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Movie.afterUpdate.calls.length).to.equal(1);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.afterUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        species: 'Frog'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('pets'));
                  }
                );

                return person.$relatedQuery('pets').patch({ species: 'Frog' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(2);
                expect(Pet.afterUpdate.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.afterUpdate = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Doggo'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'New Owner'
                      }
                    ]);

                    expect(relation).to.equal(Pet.getRelation('owner'));
                  }
                );

                return pet.$relatedQuery('owner').patch({ name: 'New Owner' });
              })
              .then(numUpdated => {
                expect(numUpdated).to.equal(1);
                expect(Person.afterUpdate.calls.length).to.equal(1);
              });
          });
        });
      });
    });

    describe('beforeDelete', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called before normal queries', () => {
          Movie.beforeDelete = createHookSpy();

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              expect(Movie.beforeDelete.calls.length).to.equal(1);
            });
        });

        it('can be async', () => {
          Movie.beforeDelete = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              expect(Movie.beforeDelete.calls.length).to.equal(1);
              expect(Movie.beforeDelete.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.beforeDelete = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .context({ a: 1 })
            .then(() => {
              expect(Movie.beforeDelete.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.beforeDelete = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(() => {
              expect(Movie.beforeDelete.calls.length).to.equal(1);
            });
        });

        it('should be able to fetch the rows about to be deleted', () => {
          Movie.beforeDelete = createHookSpy(({ findQuery }, call) => {
            return findQuery
              .select('name')
              .forUpdate()
              .then(moviesToBeDeleted => {
                chaiExpect(moviesToBeDeleted).containSubset([
                  {
                    name: 'A Star is Born'
                  }
                ]);
                call.queryWasAwaited = true;
              });
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(() => {
              expect(Movie.beforeDelete.calls.length).to.equal(1);
              expect(Movie.beforeDelete.calls[0].queryWasAwaited).to.equal(true);
              expect(queries.length).to.equal(2);
            });
        });

        it('should be able to cancel the query', () => {
          Movie.beforeDelete = createHookSpy(({ cancelQuery }) => {
            cancelQuery();
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(numDeleted => {
              expect(numDeleted).to.eql(0);
              expect(queries.length).to.equal(0);
            });
        });

        it('should be able to cancel the query with a value', () => {
          Movie.beforeDelete = createHookSpy(({ cancelQuery }) => {
            cancelQuery(['lol']);
          });

          return Movie.query()
            .delete()
            .where('name', 'A Star is Born')
            .then(result => {
              expect(result).to.eql(['lol']);
              expect(queries.length).to.equal(0);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              Movie.beforeDelete = createHookSpy(({ modelInstances, inputModelInstances }) => {
                expect(modelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]);
              });

              return movie.$query().delete();
            })
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              expect(Movie.beforeDelete.calls.length).to.equal(1);
            });
        });

        it('should be able to fetch the rows about to be deleted`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              queries = [];

              Movie.beforeDelete = createHookSpy(({ findQuery }, call) => {
                return findQuery
                  .select('name')
                  .forUpdate()
                  .then(moviesToBeDeleted => {
                    // Note: moviesToBeDeleted must be an array even though $query()
                    // would normally produce a single item.
                    chaiExpect(moviesToBeDeleted).containSubset([
                      {
                        name: 'Silver Linings Playbook'
                      }
                    ]);
                    call.queryWasAwaited = true;
                  });
              });

              return movie.$query().delete();
            })
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              expect(Movie.beforeDelete.calls.length).to.equal(1);
              expect(Movie.beforeDelete.calls[0].queryWasAwaited).to.equal(true);
              expect(queries.length).to.equal(2);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.beforeDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('movies'));
                });

                return person.$relatedQuery('movies').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Movie.beforeDelete.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be deleted`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                queries = [];

                Movie.beforeDelete = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(moviesToBeDeleted => {
                      expect(moviesToBeDeleted.length).to.equal(2);

                      chaiExpect(moviesToBeDeleted).containSubset([
                        {
                          name: 'Silver Linings Playbook'
                        },
                        {
                          name: 'Hungergames'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return person.$relatedQuery('movies').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Movie.beforeDelete.calls.length).to.equal(1);
                expect(Movie.beforeDelete.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.beforeDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('pets'));
                });

                return person.$relatedQuery('pets').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Pet.beforeDelete.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be deleted`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                queries = [];

                Pet.beforeDelete = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(moviesToBeDeleted => {
                      expect(moviesToBeDeleted.length).to.equal(2);

                      chaiExpect(moviesToBeDeleted).containSubset([
                        {
                          name: 'Doggo'
                        },
                        {
                          name: 'Cato'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return person.$relatedQuery('pets').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Pet.beforeDelete.calls.length).to.equal(1);
                expect(Pet.beforeDelete.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.beforeDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Doggo'
                    }
                  ]);

                  expect(relation).to.equal(Pet.getRelation('owner'));
                });

                return pet.$relatedQuery('owner').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(1);
                expect(Person.beforeDelete.calls.length).to.equal(1);
              });
          });

          it('should be able to fetch the rows about to be deleted`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                queries = [];

                Person.beforeDelete = createHookSpy(({ findQuery }, call) => {
                  return findQuery
                    .select('name')
                    .forUpdate()
                    .then(peopleToBeDeleted => {
                      expect(peopleToBeDeleted.length).to.equal(1);

                      chaiExpect(peopleToBeDeleted).containSubset([
                        {
                          name: 'Jennifer'
                        }
                      ]);

                      call.queryWasAwaited = true;
                    });
                });

                return pet.$relatedQuery('owner').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(1);
                expect(Person.beforeDelete.calls.length).to.equal(1);
                expect(Person.beforeDelete.calls[0].queryWasAwaited).to.equal(true);
                expect(queries.length).to.equal(2);
              });
          });
        });
      });
    });

    describe('afterDelete', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called after normal queries', () => {
          Movie.afterDelete = createHookSpy();

          return Movie.query()
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(3);
              expect(Movie.afterDelete.calls.length).to.equal(1);
            });
        });

        it('should be able to change the result', () => {
          Movie.afterDelete = createHookSpy(({ result }) => {
            return {
              numDeleted: result[0]
            };
          });

          return Movie.query()
            .delete()
            .where('name', 'Hungergames')
            .then(result => {
              expect(result).to.eql({ numDeleted: 1 });
            });
        });

        it('can be async', () => {
          Movie.afterDelete = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .delete()
            .where('name', 'Hungergames')
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              expect(Movie.afterDelete.calls.length).to.equal(1);
              expect(Movie.afterDelete.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.afterDelete = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .delete()
            .where('name', 'Hungergames')
            .context({ a: 1 })
            .then(() => {
              expect(Movie.afterDelete.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.afterDelete = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .delete()
            .where('name', 'Hungergames')
            .then(() => {
              expect(Movie.afterDelete.calls.length).to.equal(1);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances`', () => {
          return Movie.query()
            .findOne({ name: 'Silver Linings Playbook' })
            .then(movie => {
              Movie.afterDelete = createHookSpy(({ modelInstances }) => {
                expect(modelInstances.length).to.equal(1);

                chaiExpect(modelInstances).to.containSubset([
                  {
                    name: 'Silver Linings Playbook'
                  }
                ]);
              });

              return movie.$query().delete();
            })
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              expect(Movie.afterDelete.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.afterDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('movies'));
                });

                return person.$relatedQuery('movies').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Movie.afterDelete.calls.length).to.equal(1);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.afterDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Jennifer'
                    }
                  ]);

                  expect(relation).to.equal(Person.getRelation('pets'));
                });

                return person.$relatedQuery('pets').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(2);
                expect(Pet.afterDelete.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation` and `modelInstances`', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.afterDelete = createHookSpy(({ modelInstances, relation }) => {
                  expect(modelInstances.length).to.equal(1);

                  chaiExpect(modelInstances).to.containSubset([
                    {
                      name: 'Doggo'
                    }
                  ]);

                  expect(relation).to.equal(Pet.getRelation('owner'));
                });

                return pet.$relatedQuery('owner').delete();
              })
              .then(numDeleted => {
                expect(numDeleted).to.equal(1);
                expect(Person.afterDelete.calls.length).to.equal(1);
              });
          });
        });
      });
    });

    describe('beforeInsert', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called before normal queries', () => {
          Movie.beforeInsert = createHookSpy();

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(movie => {
              expect(movie.id).to.be.a('number');
              expect(Movie.beforeInsert.calls.length).to.equal(1);
            });
        });

        it('can be async', () => {
          Movie.beforeInsert = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(movie => {
              expect(movie.id).to.be.a('number');
              expect(Movie.beforeInsert.calls.length).to.equal(1);
              expect(Movie.beforeInsert.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.beforeInsert = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .context({ a: 1 })
            .then(() => {
              expect(Movie.beforeInsert.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.beforeInsert = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(() => {
              expect(Movie.beforeInsert.calls.length).to.equal(1);
            });
        });

        it('should have access to `inputModelInstances`', () => {
          Movie.beforeInsert = createHookSpy(({ inputModelInstances }) => {
            expect(inputModelInstances.length).to.equal(1);
            expect(inputModelInstances[0] instanceof Movie).to.equal(true);
            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(() => {
              expect(Movie.beforeInsert.calls.length).to.equal(1);
            });
        });

        it('should be able to fetch the rows about to be updated', () => {
          Movie.beforeInsert = createHookSpy(({ findQuery }, call) => {
            return findQuery
              .select('name')
              .forUpdate()
              .then(moviesToBeUpdated => {
                chaiExpect(moviesToBeUpdated).containSubset([
                  {
                    name: 'Hungergames'
                  }
                ]);
                call.queryWasAwaited = true;
              });
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .where('name', 'like', '%gam%')
            .then(() => {
              expect(Movie.beforeInsert.calls.length).to.equal(1);
              expect(Movie.beforeInsert.calls[0].queryWasAwaited).to.equal(true);
              expect(queries.length).to.equal(2);
            });
        });

        it('should be able to cancel the query', () => {
          Movie.beforeInsert = createHookSpy(({ cancelQuery }) => {
            cancelQuery();
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(result => {
              expect(result.name).to.equal('Inserted');
              expect(result.id).to.equal(undefined);
              expect(queries.length).to.equal(0);
            });
        });

        it('should be able to cancel the query with a value', () => {
          Movie.beforeInsert = createHookSpy(({ cancelQuery }) => {
            cancelQuery([{ lol: true }]);
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(result => {
              expect(result.lol).to.equal(true);
              expect(queries.length).to.equal(0);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances` and `inputModelInstances`', () => {
          const movie = Movie.fromJson({ name: 'Inserted' });

          Movie.beforeInsert = createHookSpy(({ modelInstances, inputModelInstances }) => {
            expect(modelInstances.length).to.equal(1);
            expect(inputModelInstances.length).to.equal(1);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);

            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);
          });

          return movie
            .$query()
            .insert()
            .then(result => {
              expect(result.id).to.be.a('number');
              expect(Movie.beforeInsert.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.beforeInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'Inserted'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('movies'));
                  }
                );

                return person.$relatedQuery('movies').insert({ name: 'Inserted' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(Movie.beforeInsert.calls.length).to.equal(1);
              });
          });

          it('should be able to cancel the query', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                queries = [];

                Movie.beforeInsert = createHookSpy(({ cancelQuery }) => {
                  cancelQuery();
                });

                return person.$relatedQuery('movies').insert({ name: 'Inserted' });
              })
              .then(inserted => {
                expect(inserted.id).to.equal(undefined);
                expect(Movie.beforeInsert.calls.length).to.equal(1);
                expect(queries.length).to.equal(0);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.beforeInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        species: 'Frog'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('pets'));
                  }
                );

                return person.$relatedQuery('pets').insert({ species: 'Frog' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(inserted.species).to.equal('Frog');
                expect(Pet.beforeInsert.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.beforeInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Doggo'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'New Owner'
                      }
                    ]);

                    expect(relation).to.equal(Pet.getRelation('owner'));
                  }
                );

                return pet.$relatedQuery('owner').insert({ name: 'New Owner' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(inserted.name).to.equal('New Owner');
                expect(Person.beforeInsert.calls.length).to.equal(1);
              });
          });

          it('should be able to cancel the query', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                queries = [];

                Person.beforeInsert = createHookSpy(({ cancelQuery }) => {
                  cancelQuery();
                });

                return pet.$relatedQuery('owner').insert({ name: 'New Owner' });
              })
              .then(inserted => {
                expect(inserted.id).to.equal(undefined);
                expect(inserted.name).to.equal('New Owner');
                expect(Person.beforeInsert.calls.length).to.equal(1);
                expect(queries.length).to.equal(0);
              });
          });
        });
      });
    });

    describe('afterInsert', () => {
      beforeEach(() => {
        return Person.query().insertGraph([
          {
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
                '#id': 'silver',
                name: 'Silver Linings Playbook'
              },
              {
                name: 'Hungergames'
              }
            ]
          },
          {
            name: 'Brad',

            pets: [
              {
                name: 'Jamie',
                species: 'Lion'
              },
              {
                name: 'Rob',
                species: 'Deer'
              }
            ],

            movies: [
              {
                '#ref': 'silver'
              },
              {
                name: 'A Star is Born'
              }
            ]
          }
        ]);
      });

      beforeEach(() => {
        queries = [];
      });

      describe('query', () => {
        it('should be called after normal queries', () => {
          Movie.afterInsert = createHookSpy();

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(movie => {
              expect(movie.id).to.be.a('number');
              expect(Movie.afterInsert.calls.length).to.equal(1);
            });
        });

        it('should be able to change the result', () => {
          Movie.afterInsert = createHookSpy(({ result }) => {
            return {
              someId: result[0].id,
              someName: result[0].name
            };
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(result => {
              expect(result.someId).to.be.a('number');
              expect(result.someName).to.equal('Inserted');
            });
        });

        it('can be async', () => {
          Movie.afterInsert = createHookSpy((_, call) => {
            return delay(50).then(() => {
              call.itWorked = true;
            });
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(() => {
              expect(Movie.afterInsert.calls.length).to.equal(1);
              expect(Movie.afterInsert.calls[0].itWorked).to.equal(true);
            });
        });

        it('should have access to `context`', () => {
          Movie.afterInsert = createHookSpy(({ context }) => {
            expect(context).to.eql({ a: 1 });
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .context({ a: 1 })
            .then(() => {
              expect(Movie.afterInsert.calls.length).to.equal(1);
            });
        });

        it('should have access to `transaction`', () => {
          Movie.afterInsert = createHookSpy(({ transaction }) => {
            expect(transaction).to.equal(Movie.knex());
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(() => {
              expect(Movie.afterInsert.calls.length).to.equal(1);
            });
        });

        it('should have access to `inputModelInstances`', () => {
          Movie.afterInsert = createHookSpy(({ inputModelInstances }) => {
            expect(inputModelInstances.length).to.equal(1);
            expect(inputModelInstances[0] instanceof Movie).to.equal(true);
            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);
          });

          return Movie.query()
            .insert({ name: 'Inserted' })
            .then(() => {
              expect(Movie.afterInsert.calls.length).to.equal(1);
            });
        });
      });

      describe('$query', () => {
        it('should have access to `modelInstances` and `inputModelInstances`', () => {
          const movie = Movie.fromJson({ name: 'Inserted' });

          Movie.afterInsert = createHookSpy(({ modelInstances, inputModelInstances }) => {
            expect(modelInstances.length).to.equal(1);
            expect(inputModelInstances.length).to.equal(1);

            chaiExpect(modelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);

            chaiExpect(inputModelInstances).to.containSubset([
              {
                name: 'Inserted'
              }
            ]);
          });

          return movie
            .$query()
            .insert()
            .then(movie => {
              expect(movie.id).to.be.a('number');
              expect(Movie.afterInsert.calls.length).to.equal(1);
            });
        });
      });

      describe('$relatedQuery', () => {
        describe('many to many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Movie.afterInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'Inserted'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('movies'));
                  }
                );

                return person.$relatedQuery('movies').insert({ name: 'Inserted' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(Movie.afterInsert.calls.length).to.equal(1);
              });
          });
        });

        describe('has many', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances`', () => {
            return Person.query()
              .findOne({ name: 'Jennifer' })
              .then(person => {
                Pet.afterInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Jennifer'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'Lol',
                        species: 'Frog'
                      }
                    ]);

                    expect(relation).to.equal(Person.getRelation('pets'));
                  }
                );

                return person.$relatedQuery('pets').insert({ name: 'Lol', species: 'Frog' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(Pet.afterInsert.calls.length).to.equal(1);
              });
          });
        });

        describe('belongs to one', () => {
          it('should have access to `relation`, `modelInstances` and `inputModelInstances', () => {
            return Pet.query()
              .findOne({ name: 'Doggo' })
              .then(pet => {
                Person.afterInsert = createHookSpy(
                  ({ modelInstances, inputModelInstances, relation }) => {
                    expect(modelInstances.length).to.equal(1);
                    expect(inputModelInstances.length).to.equal(1);

                    chaiExpect(modelInstances).to.containSubset([
                      {
                        name: 'Doggo'
                      }
                    ]);

                    chaiExpect(inputModelInstances).to.containSubset([
                      {
                        name: 'New Owner'
                      }
                    ]);

                    expect(relation).to.equal(Pet.getRelation('owner'));
                  }
                );

                return pet.$relatedQuery('owner').insert({ name: 'New Owner' });
              })
              .then(inserted => {
                expect(inserted.id).to.be.a('number');
                expect(Person.afterInsert.calls.length).to.equal(1);
              });
          });
        });
      });
    });
  });
};

function createHookSpy(hook = () => {}) {
  const spy = args => {
    const call = { args };
    spy.calls.push(call);
    return hook(args, call);
  };

  spy.calls = [];
  return spy;
}

function delay(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}
