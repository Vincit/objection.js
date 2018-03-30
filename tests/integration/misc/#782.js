const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = session => {
  describe(`Cannot upsert anything under a node that is going to be related in upsertGraph. #782`, () => {
    let knex = session.knex;
    let Person, Movie, Prop;
    let graph;

    before(() => {
      return knex.schema
        .dropTableIfExists('person_movie')
        .dropTableIfExists('movie_prop')
        .dropTableIfExists('person')
        .dropTableIfExists('prop')
        .dropTableIfExists('movie')
        .createTable('person', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('prop', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('movie', table => {
          table.increments('id').primary();
          table.string('name');
        })
        .createTable('person_movie', table => {
          table.increments('id').primary();
          table
            .integer('person_id')
            .unsigned()
            .references('person.id')
            .onDelete('CASCADE');
          table
            .integer('movie_id')
            .unsigned()
            .references('movie.id')
            .onDelete('CASCADE');
        })
        .createTable('movie_prop', table => {
          table.increments('id').primary();
          table
            .integer('movie_id')
            .unsigned()
            .references('movie.id')
            .onDelete('CASCADE');
          table
            .integer('prop_id')
            .unsigned()
            .references('prop.id')
            .onDelete('CASCADE');
        });
    });

    after(() => {
      return knex.schema
        .dropTableIfExists('person_movie')
        .dropTableIfExists('movie_prop')
        .dropTableIfExists('person')
        .dropTableIfExists('prop')
        .dropTableIfExists('movie');
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'person';
        }

        static get relationMappings() {
          return {
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
      };

      Movie = class Movie extends Model {
        static get tableName() {
          return 'movie';
        }

        static get relationMappings() {
          return {
            props: {
              relation: Model.ManyToManyRelation,
              modelClass: Prop,
              join: {
                from: 'movie.id',
                through: {
                  from: 'movie_prop.movie_id',
                  to: 'movie_prop.prop_id'
                },
                to: 'prop.id'
              }
            }
          };
        }
      };

      Prop = class Prop extends Model {
        static get tableName() {
          return 'prop';
        }
      };

      Person.knex(knex);
      Movie.knex(knex);
      Prop.knex(knex);
    });

    beforeEach(() => {
      return Prop.query()
        .delete()
        .then(() => Person.query().delete())
        .then(() => Movie.query().delete())
        .then(() => {
          return Person.query()
            .delete()
            .then(() => {
              return Person.query().insertGraph([
                {
                  name: 'actor 1',
                  movies: [
                    {
                      name: 'movie 1',

                      props: [
                        {
                          name: 'prop 1'
                        }
                      ]
                    },
                    {
                      name: 'movie 2',

                      props: [
                        {
                          name: 'prop 2'
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'actor 2'
                }
              ]);
            });
        })
        .then(inserted => {
          graph = inserted;
        });
    });

    it('should throw an error', done => {
      const actor1 = graph[0];
      const actor2 = graph[1];
      const movie1 = actor1.movies[0];
      const movie2 = actor1.movies[1];
      const prop1 = movie1.props[0];

      Person.query()
        .upsertGraph(
          {
            id: actor2.id,

            movies: [
              {
                id: movie2.id,

                props: [
                  {
                    id: prop1.id
                  }
                ]
              }
            ]
          },
          { relate: true, unrelate: true }
        )
        .then(() => {
          return Person.query()
            .eager('movies.props')
            .findById(actor2.id)
            .modifyEager('movies', qb => qb.orderBy('name'));
        })
        .then(result => {
          done(new Error('should not get here'));
        })
        .catch(err => {
          expect(err.message).to.equal(
            `graph node (id=${
              movie2.id
            }) is going to be related. cannot upsert any children of that node. objection doesn't support that yet. See the issue #782`
          );
          done();
        })
        .catch(done);
    });
  });
};
