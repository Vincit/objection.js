const { Model, ref } = require('../../');
const find = require('lodash/find');
const expect = require('expect.js');
const sortBy = require('lodash/sortBy');

module.exports = session => {
  describe('JSON relations', () => {
    class BaseModel extends Model {
      static get modifiers() {
        return ['name', 'id', 'json'].reduce((obj, prop) => {
          obj[prop] = qb => qb.select(prop);
          return obj;
        }, {});
      }
    }

    class Person extends BaseModel {
      static get tableName() {
        return 'Person';
      }

      static get relationMappings() {
        return {
          favoritePet: {
            relation: Model.BelongsToOneRelation,
            modelClass: Animal,
            join: {
              from: ref('Person.json:stuff.favoritePetId').castInt(),
              to: 'Animal.id'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'Person.id',
              through: {
                from: ref('PersonMovie.json:personId').castInt(),
                to: ref('PersonMovie.json:movieId').castInt()
              },
              to: 'Movie.id'
            }
          }
        };
      }
    }

    class Animal extends BaseModel {
      static get tableName() {
        return 'Animal';
      }

      static get relationMappings() {
        return {
          peopleWhoseFavoriteIAm: {
            relation: Model.HasManyRelation,
            modelClass: Person,
            join: {
              from: 'Animal.id',
              to: ref('Person.json:stuff.favoritePetId').castInt()
            }
          },

          favoritePerson: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: ref('Animal.json:favoritePersonName').castText(),
              to: 'Person.name'
            }
          }
        };
      }
    }

    class Movie extends BaseModel {
      static get tableName() {
        return 'Movie';
      }
    }

    before(() => {
      Person.knex(session.knex);
      Animal.knex(session.knex);
      Movie.knex(session.knex);
    });

    before(() => {
      return session.knex.schema
        .dropTableIfExists('PersonMovie')
        .dropTableIfExists('Movie')
        .dropTableIfExists('Animal')
        .dropTableIfExists('Person')
        .createTable('Person', table => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('Animal', table => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('Movie', table => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('PersonMovie', table => {
          table.jsonb('json');
        });
    });

    after(() => {
      return session.knex.schema
        .dropTableIfExists('PersonMovie')
        .dropTableIfExists('Movie')
        .dropTableIfExists('Animal')
        .dropTableIfExists('Person');
    });

    beforeEach(() => {
      return Animal.query()
        .delete()
        .then(() => Movie.query().delete())
        .then(() => session.knex('PersonMovie').delete())
        .then(() => Person.query().delete());
    });

    beforeEach(() => {
      return Person.query().insertGraph([
        {
          name: 'Arnold',

          favoritePet: {
            name: 'Fluffy',
            json: {
              favoritePersonName: 'Brad'
            }
          },

          movies: [
            {
              name: 'Terminator'
            },
            {
              name: 'Terminator 2'
            }
          ]
        },
        {
          name: 'Brad',

          favoritePet: {
            name: 'Cato'
          },

          movies: [
            {
              name: 'Inglorious bastards'
            }
          ]
        }
      ]);
    });

    describe('eager', () => {
      it('eager', () => {
        return Person.query()
          .findOne({ 'Person.name': 'Arnold' })
          .select('Person.name')
          .eager(
            `[
            movies(name),
            favoritePet(name).[
              peopleWhoseFavoriteIAm(name),
              favoritePerson(name),
            ]
          ]`
          )
          .then(sortRelations)
          .then(person => {
            expect(person).to.eql({
              name: 'Arnold',

              favoritePet: {
                name: 'Fluffy',

                peopleWhoseFavoriteIAm: [
                  {
                    name: 'Arnold'
                  }
                ],

                favoritePerson: {
                  name: 'Brad'
                }
              },

              movies: [
                {
                  name: 'Terminator'
                },
                {
                  name: 'Terminator 2'
                }
              ]
            });
          });
      });

      it('joinEager', () => {
        return Person.query()
          .findOne({ 'Person.name': 'Arnold' })
          .select('Person.name')
          .joinEager(
            `[
            movies(name),
            favoritePet(name).[
              peopleWhoseFavoriteIAm(name),
              favoritePerson(name),
            ]
          ]`
          )
          .then(sortRelations)
          .then(person => {
            expect(person).to.eql({
              name: 'Arnold',

              favoritePet: {
                name: 'Fluffy',

                peopleWhoseFavoriteIAm: [
                  {
                    name: 'Arnold'
                  }
                ],

                favoritePerson: {
                  name: 'Brad'
                }
              },

              movies: [
                {
                  name: 'Terminator'
                },
                {
                  name: 'Terminator 2'
                }
              ]
            });
          });
      });
    });

    describe('$relatedQuery', () => {
      describe('belongs to one relation', () => {
        it('insert', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('favoritePet').insert({ name: 'Doggo' }))
            .then(() =>
              Person.query()
                .findOne({ name: 'Arnold' })
                .eager('favoritePet')
            )
            .then(person => {
              expect(person.json.stuff.favoritePetId).to.equal(person.favoritePet.id);
            });
        });

        it('find', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('favoritePet').select('name'))
            .then(pet => {
              expect(pet).to.eql({
                name: 'Fluffy'
              });
            });
        });

        it('patch', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('favoritePet').patch({ json: { updated: true } }))
            .then(() =>
              Animal.query()
                .select('json', 'name')
                .orderBy('name')
            )
            .then(pets => {
              expect(pets).to.eql([
                {
                  json: null,
                  name: 'Cato'
                },
                {
                  json: {
                    updated: true
                  },
                  name: 'Fluffy'
                }
              ]);
            });
        });

        it('relate', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('favoritePet').relate(123))
            .then(() =>
              Person.query()
                .eager('favoritePet')
                .orderBy('name')
            )
            .then(people => {
              const brad = find(people, { name: 'Brad' });
              const ardnold = find(people, { name: 'Arnold' });

              expect(ardnold.json.stuff.favoritePetId).to.equal(123);
              expect(brad.json.stuff.favoritePetId).to.equal(brad.favoritePet.id);
            });
        });

        it('unrelate', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('favoritePet').unrelate())
            .then(() =>
              Person.query()
                .eager('favoritePet')
                .orderBy('name')
            )
            .then(people => {
              const brad = find(people, { name: 'Brad' });
              const ardnold = find(people, { name: 'Arnold' });

              expect(ardnold.json.stuff.favoritePetId).to.equal(null);
              expect(brad.json.stuff.favoritePetId).to.equal(brad.favoritePet.id);
            });
        });
      });

      describe('has many relation', () => {
        it('insert', () => {
          return Animal.query()
            .findOne({ name: 'Fluffy' })
            .then(it => it.$relatedQuery('peopleWhoseFavoriteIAm').insert({ name: 'Jorge' }))
            .then(() =>
              Animal.query()
                .findOne({ name: 'Fluffy' })
                .eager('peopleWhoseFavoriteIAm(name)')
                .select('name')
            )
            .then(sortRelations)
            .then(pet => {
              expect(pet).to.eql({
                name: 'Fluffy',

                peopleWhoseFavoriteIAm: [
                  {
                    name: 'Arnold'
                  },
                  {
                    name: 'Jorge'
                  }
                ]
              });
            });
        });

        it('find', () => {
          return Animal.query()
            .findOne({ name: 'Fluffy' })
            .then(it => it.$relatedQuery('peopleWhoseFavoriteIAm').select('name'))
            .then(pet => {
              expect(pet).to.eql([
                {
                  name: 'Arnold'
                }
              ]);
            });
        });

        it('patch', () => {
          return Animal.query()
            .findOne({ name: 'Fluffy' })
            .then(it =>
              it.$relatedQuery('peopleWhoseFavoriteIAm').patch({ name: 'Arnold the second' })
            )
            .then(() =>
              Person.query()
                .select('name')
                .orderBy('name')
            )
            .then(pet => {
              expect(pet).to.eql([
                {
                  name: 'Arnold the second'
                },
                {
                  name: 'Brad'
                }
              ]);
            });
        });

        it('relate', () => {
          return Animal.query()
            .findOne({ name: 'Fluffy' })
            .then(it => [it, Person.query().findOne({ name: 'Brad' })])
            .spread((fluffy, brad) => fluffy.$relatedQuery('peopleWhoseFavoriteIAm').relate(brad))
            .then(() =>
              Animal.query()
                .findOne({ name: 'Fluffy' })
                .eager('peopleWhoseFavoriteIAm(name)')
            )
            .then(sortRelations)
            .then(pet => {
              expect(pet.peopleWhoseFavoriteIAm).to.eql([
                {
                  name: 'Arnold'
                },
                {
                  name: 'Brad'
                }
              ]);
            });
        });

        it('unrelate', () => {
          return Animal.query()
            .findOne({ name: 'Fluffy' })
            .then(it => [it, Person.query().findOne({ name: 'Brad' })])
            .spread((fluffy, brad) =>
              fluffy
                .$relatedQuery('peopleWhoseFavoriteIAm')
                .relate(brad)
                .return(fluffy)
            )
            .then(it =>
              it
                .$relatedQuery('peopleWhoseFavoriteIAm')
                .unrelate()
                .where('name', 'Arnold')
            )
            .then(() =>
              Animal.query()
                .findOne({ name: 'Fluffy' })
                .eager('peopleWhoseFavoriteIAm(name)')
            )
            .then(sortRelations)
            .then(pet => {
              expect(pet.peopleWhoseFavoriteIAm).to.eql([
                {
                  name: 'Brad'
                }
              ]);

              return Person.query()
                .findOne({ name: 'Arnold' })
                .select('json');
            })
            .then(arnold => {
              expect(arnold.json.stuff.favoritePetId).to.equal(null);
            });
        });
      });

      describe('many to many relation', () => {
        it('insert', () => {
          return Person.query()
            .findOne({ name: 'Brad' })
            .then(it => it.$relatedQuery('movies').insert({ name: 'Seven years in Tibet' }))
            .then(() =>
              Person.query()
                .findOne({ name: 'Brad' })
                .eager('movies(name)')
                .select('name')
            )
            .then(sortRelations)
            .then(pet => {
              expect(pet).to.eql({
                name: 'Brad',

                movies: [
                  {
                    name: 'Inglorious bastards'
                  },
                  {
                    name: 'Seven years in Tibet'
                  }
                ]
              });
            });
        });

        it('find', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it =>
              it
                .$relatedQuery('movies')
                .select('name')
                .orderBy('name')
            )
            .then(movies => {
              expect(movies).to.eql([
                {
                  name: 'Terminator'
                },
                {
                  name: 'Terminator 2'
                }
              ]);
            });
        });

        it('patch', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => it.$relatedQuery('movies').patch({ name: 'Some terminator' }))
            .then(() =>
              Movie.query()
                .select('name')
                .orderBy('name')
            )
            .then(movies => {
              expect(movies).to.eql([
                {
                  name: 'Inglorious bastards'
                },
                {
                  name: 'Some terminator'
                },
                {
                  name: 'Some terminator'
                }
              ]);
            });
        });

        it('relate', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => [it, Movie.query().findOne({ name: 'Inglorious bastards' })])
            .spread((arnold, bastards) => arnold.$relatedQuery('movies').relate(bastards.id))
            .then(() =>
              Person.query()
                .select('name')
                .findOne({ name: 'Arnold' })
                .eager('movies(name)')
            )
            .then(sortRelations)
            .then(person => {
              expect(person.movies).to.eql([
                {
                  name: 'Inglorious bastards'
                },
                {
                  name: 'Terminator'
                },
                {
                  name: 'Terminator 2'
                }
              ]);
            });
        });

        it('unrelate', () => {
          return Person.query()
            .findOne({ name: 'Arnold' })
            .then(it => [it, Movie.query().findOne({ name: 'Inglorious bastards' })])
            .spread((arnold, bastards) =>
              arnold
                .$relatedQuery('movies')
                .relate(bastards.id)
                .return(arnold)
            )
            .then(arnold =>
              arnold
                .$relatedQuery('movies')
                .unrelate()
                .where('name', 'Terminator')
            )
            .then(() =>
              Person.query()
                .select('name')
                .findOne({ name: 'Arnold' })
                .eager('movies(name)')
            )
            .then(sortRelations)
            .then(person => {
              expect(person.movies).to.eql([
                {
                  name: 'Inglorious bastards'
                },
                {
                  name: 'Terminator 2'
                }
              ]);
            });
        });
      });
    });

    function sortRelations(obj) {
      if (obj instanceof Person) {
        obj.movies = sortBy(obj.movies, 'name');
      }

      if (obj instanceof Animal) {
        obj.peopleWhoseFavoriteIAm = sortBy(obj.peopleWhoseFavoriteIAm, 'name');
      }

      return obj;
    }
  });
};
