'use strict';

const ref = require('../../').ref;
const find = require('lodash/find');
const Model = require('../../').Model;
const expect = require('expect.js');
const sortBy = require('lodash/sortBy');
const mapValues = require('lodash/mapValues');

module.exports = (session) => {

  describe('JSON relations', () => {

    class BaseModel extends Model {
      static get namedFilters() {
        return {
          id: qb => qb.select('id'),
          name: qb => qb.select('name'),
          json: qb => qb.select('json')
        };
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
                to: ref('PersonMovie.json:movieId').castInt(),
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
        .createTable('Person', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('Animal', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('Movie', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.jsonb('json');
        })
        .createTable('PersonMovie', (table) => {
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
      return Animal
        .query()
        .delete()
        .then(() => Movie.query().delete())
        .then(() => session.knex('PersonMovie').delete())
        .then(() => Person.query().delete());
    });

    beforeEach(() => {
      return Person
        .query()
        .insertGraph([{
          name: 'Arnold',

          favoritePet: {
            name: 'Fluffy',
            json: {
              favoritePersonName: 'Brad'
            }
          },

          movies: [{
            name: 'Terminator'
          }, {
            name: 'Terminator 2'
          }]
        }, {
          name: 'Brad',

          favoritePet: {
            name: 'Cato'
          },
        }]);
    });

    describe('eager', () => {

      it('eager', () => {
        return Person
          .query()
          .findOne({'Person.name': 'Arnold'})
          .select('Person.name')
          .eager(`[
            movies(name),
            favoritePet(name).[
              peopleWhoseFavoriteIAm(name),
              favoritePerson(name),
            ]
          ]`)
          .then(sortRelations)
          .then(person => {
            expect(person).to.eql({
              "name": "Arnold",

              "favoritePet": {
                "name": "Fluffy",

                "peopleWhoseFavoriteIAm": [
                  {
                    "name": "Arnold",
                  }
                ],

                "favoritePerson": {
                  "name": "Brad"
                }
              },

              "movies": [
                {
                  "name": "Terminator"
                },
                {
                  "name": "Terminator 2"
                }
              ]
            });
          });
      });

      it('joinEager', () => {
        return Person
          .query()
          .findOne({'Person.name': 'Arnold'})
          .select('Person.name')
          .joinEager(`[
            movies(name),
            favoritePet(name).[
              peopleWhoseFavoriteIAm(name),
              favoritePerson(name),
            ]
          ]`)
          .then(sortRelations)
          .then(person => {
            expect(person).to.eql({
              "name": "Arnold",

              "favoritePet": {
                "name": "Fluffy",

                "peopleWhoseFavoriteIAm": [
                  {
                    "name": "Arnold",
                  }
                ],

                "favoritePerson": {
                  "name": "Brad"
                }
              },

              "movies": [
                {
                  "name": "Terminator"
                },
                {
                  "name": "Terminator 2"
                }
              ]
            });
          });
      });

    });

    describe('$relatedQuery', () => {

      describe('belongs to one relation', () => {

        it('insert', () => {
          return Person
            .query()
            .findOne({name: 'Arnold'})
            .then(it => it.$relatedQuery('favoritePet').insert({name: 'Doggo'}))
            .then(() => Person.query().findOne({name: 'Arnold'}).eager('favoritePet'))
            .then(person => {
              expect(person.json.stuff.favoritePetId).to.equal(person.favoritePet.id);
            });
        });

        it('find', () => {
          return Person
            .query()
            .findOne({name: 'Arnold'})
            .then(it => it.$relatedQuery('favoritePet').select('name'))
            .then(pet => {
              expect(pet).to.eql({
                "name": "Fluffy"
              });
            });
        });

        it('patch', () => {
          return Person
            .query()
            .findOne({name: 'Arnold'})
            .then(it => it.$relatedQuery('favoritePet').patch({json: {updated: true}}))
            .then(() => Animal.query().select('json', 'name').orderBy('name'))
            .then(pets => {
              expect(pets).to.eql([
                {
                  "json": null,
                  "name": "Cato"
                },
                {
                  "json": {
                    "updated": true
                  },
                  "name": "Fluffy"
                }
              ]);
            });
        });

        it('relate', () => {
          return Person
            .query()
            .findOne({name: 'Arnold'})
            .then(it => it.$relatedQuery('favoritePet').relate(123))
            .then(() => Person.query().eager('favoritePet').orderBy('name'))
            .then(people => {
              const brad = find(people, {name: 'Brad'});
              const ardnold = find(people, {name: 'Arnold'});

              expect(ardnold.json.stuff.favoritePetId).to.equal(123);
              expect(brad.json.stuff.favoritePetId).to.equal(brad.favoritePet.id);
            });
        });

        it('unrelate', () => {
          return Person
            .query()
            .findOne({name: 'Arnold'})
            .then(it => it.$relatedQuery('favoritePet').unrelate())
            .then(() => Person.query().eager('favoritePet').orderBy('name'))
            .then(people => {
              const brad = find(people, {name: 'Brad'});
              const ardnold = find(people, {name: 'Arnold'});

              expect(ardnold.json.stuff.favoritePetId).to.equal(null);
              expect(brad.json.stuff.favoritePetId).to.equal(brad.favoritePet.id);
            });
        });

      });

    });

    function sortRelations(obj) {
      if (obj instanceof Person) {
        obj.movies = sortBy(obj.movies, 'name');
      }

      return obj;
    }

  });

};
