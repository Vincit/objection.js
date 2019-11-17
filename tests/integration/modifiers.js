const { Model } = require('../../');
const expect = require('chai').expect;

module.exports = session => {
  describe('modifiers', () => {
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

      static get modifiers() {
        return {
          filterByName(query, name) {
            query.where('name', name);
          }
        };
      }
    }

    class Movie extends Model {
      static get tableName() {
        return 'movie';
      }

      static get modifiers() {
        return {
          atLeastStars(query, starLimit = 4) {
            query.where('stars', '>=', starLimit);
          }
        };
      }
    }

    before(() => {
      return session.knex.schema
        .dropTableIfExists('personMovie')
        .dropTableIfExists('animal')
        .dropTableIfExists('movie')
        .dropTableIfExists('person')
        .createTable('person', table => {
          table.increments('id').primary();
          table.string('name');
          table.integer('parentId');
        })
        .createTable('animal', table => {
          table.increments('id').primary();
          table.string('name');
          table.integer('ownerId');
        })
        .createTable('movie', table => {
          table.increments('id').primary();
          table
            .integer('stars')
            .defaultTo(0)
            .notNullable();
          table.string('name');
        })
        .createTable('personMovie', table => {
          table.integer('personId');
          table.integer('movieId');
        });
    });

    before(() => {
      Person.knex(session.knex);
      Animal.knex(session.knex);
      Movie.knex(session.knex);
    });

    beforeEach(() => {
      return Person.query()
        .delete()
        .then(() => Animal.query().delete())
        .then(() => Movie.query().delete())
        .then(() => {
          return Person.query().insertGraph([
            {
              name: 'Arnold',

              parent: {
                name: 'Gustav'
              },

              pets: [
                {
                  name: 'Freud'
                },
                {
                  name: 'Stalin'
                }
              ],

              movies: [
                {
                  name: 'Terminator',
                  stars: 4
                },
                {
                  name: 'Terminator 2',
                  stars: 3
                },
                {
                  name: 'Terminator 3',
                  stars: 2
                }
              ]
            },
            {
              name: 'Meinhard',

              pets: [
                {
                  name: 'Ruffus'
                }
              ]
            }
          ]);
        });
    });

    it('eager', async () => {
      const arnold = await Person.query()
        .findOne('name', 'Arnold')
        .eager('[movies(goodMovies), pets(onlyDictators)]')
        .modifiers({
          goodMovies(query) {
            query.modify('atLeastStars', 3);
          },
          onlyDictators(query) {
            query.modify('filterByName', 'Stalin');
          }
        });

      for (const movie of arnold.movies) {
        expect(movie.stars).to.be.greaterThan(2);
      }

      expect(arnold.pets.length).to.equal(1);
      expect(arnold.pets[0].name).to.equal('Stalin');
    });

    it('joinEager', async () => {
      const arnold = await Person.query()
        .findOne('person.name', 'Arnold')
        .joinEager('[movies(goodMovies), pets(onlyDictators)]')
        .modifiers({
          goodMovies(query) {
            query.modify('atLeastStars', 3);
          },
          onlyDictators(query) {
            query.modify('filterByName', 'Stalin');
          }
        });

      for (const movie of arnold.movies) {
        expect(movie.stars).to.be.greaterThan(2);
      }

      expect(arnold.pets.length).to.equal(1);
      expect(arnold.pets[0].name).to.equal('Stalin');
    });

    it('joinRelated', async () => {
      const result = await Person.query()
        .where('person.name', 'Arnold')
        .select('person.name', 'movies.name as movieName', 'pets.name as petName')
        .joinRelated('[movies(goodMovies), pets(onlyDictators)]')
        .modifiers({
          goodMovies(query) {
            query.modify('atLeastStars', 3);
          },
          onlyDictators(query) {
            query.modify('filterByName', 'Stalin');
          }
        })
        .orderBy(['person.name', 'movies.name', 'pets.name']);

      expect(result).to.eql([
        { name: 'Arnold', movieName: 'Terminator', petName: 'Stalin' },
        { name: 'Arnold', movieName: 'Terminator 2', petName: 'Stalin' }
      ]);
    });

    after(() => {
      return session.knex.schema
        .dropTableIfExists('personMovie')
        .dropTableIfExists('animal')
        .dropTableIfExists('movie')
        .dropTableIfExists('person');
    });
  });
};
