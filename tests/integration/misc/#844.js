const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe(`Ambiguous column mapping for RelationJoinBuilder (no table ref) #844`, () => {
    let knex = session.knex;
    let Person;
    let Movie;

    before(() => {
      return knex.schema
        .dropTableIfExists('Person_Movie')
        .dropTableIfExists('Movie')
        .dropTableIfExists('Person')
        .createTable('Person', table => {
          table.increments('id').primary();
          table
            .integer('parentId')
            .unsigned()
            .references('id')
            .inTable('Person');
          table.string('name');
          table.integer('age');
        })
        .createTable('Movie', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('Person_Movie', table => {
          table.increments('id').primary();
          table
            .integer('personId')
            .unsigned()
            .references('id')
            .inTable('Person')
            .onDelete('CASCADE');
          table
            .integer('movieId')
            .unsigned()
            .references('id')
            .inTable('Movie')
            .onDelete('CASCADE');
        });
    });

    after(() => {
      return knex.schema
        .dropTableIfExists('Person_Movie')
        .dropTableIfExists('Movie')
        .dropTableIfExists('Person');
    });

    before(() => {
      Person = class extends Model {
        static get tableName() {
          return 'Person';
        }

        static get relationMappings() {
          return {
            movies: {
              relation: Model.ManyToManyRelation,
              modelClass: Movie,
              join: {
                from: 'Person.id',
                through: {
                  from: 'Person_Movie.personId',
                  to: 'Person_Movie.movieId'
                },
                to: 'Movie.id'
              }
            }
          };
        }
      };

      Movie = class extends Model {
        static get tableName() {
          return 'Movie';
        }

        static get namedFilters() {
          return {
            onlyOldActors: builder =>
              builder
                .select('Movie.name')
                .joinRelation('actors')
                .where('actors.age', '>', 40)
          };
        }

        static get relationMappings() {
          return {
            actors: {
              relation: Model.ManyToManyRelation,
              modelClass: Person,
              join: {
                from: 'Movie.id',
                through: {
                  from: 'Person_Movie.movieId',
                  to: 'Person_Movie.personId'
                },
                to: 'Person.id'
              }
            }
          };
        }
      };
    });

    before(() => {
      return Movie.query(session.knex).insertGraph([
        {
          id: 1,
          name: 'movie 1',

          actors: [
            {
              id: 1,
              name: 'person 1',
              age: 30
            }
          ]
        },
        {
          id: 2,
          name: 'movie 2',

          actors: [
            {
              id: 2,
              name: 'person 2',
              age: 50
            }
          ]
        }
      ]);
    });

    it('test', () => {
      return Person.query(session.knex)
        .select('Person.name', 'movies.name as movieName')
        .joinRelation('movies(onlyOldActors)')
        .then(results => {
          expect(results.length).to.equal(1);
          expect(results[0].movieName).to.equal('movie 2');
        });
    });
  });
};
