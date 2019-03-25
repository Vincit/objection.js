const { Model } = require('../../');
const expect = require('chai').expect;

module.exports = session => {
  describe('relation modify hooks', () => {
    class Person extends Model {
      static get tableName() {
        return 'person';
      }

      static get relationMappings() {
        return {
          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            modify: builder => {
              builder.modify(builder.context().belongsToOne);
            },
            join: {
              from: 'person.parentId',
              to: 'person.id'
            }
          },

          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            modify: builder => {
              builder.modify(builder.context().hasMany);
            },
            join: {
              from: 'person.id',
              to: 'animal.ownerId'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            modify: builder => {
              builder.modify(builder.context().manyToMany);
            },
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
                  name: 'Terminator'
                },
                {
                  name: 'Terminator 2'
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

    describe('$relatedQuery', () => {
      describe('belongs to one relation', () => {
        it('find', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.select('name')));
            })
            .then(gustav => expect(gustav.name).to.eql('Gustav'));
        });

        it('update', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Not Gustav')))
                .update({ name: 'Updated' });
            })
            .then(numUpdated => expect(numUpdated).to.equal(0))
            .then(findArnold)
            .then(arnold => {
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Gustav')))
                .update({ name: 'Updated' });
            })
            .then(numUpdated => expect(numUpdated).to.equal(1));
        });

        it('delete', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Not Gustav')))
                .delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(0))
            .then(findArnold)
            .then(arnold => {
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Gustav')))
                .delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(1));
        });

        it('insert', () => {
          return findArnold()
            .then(arnold => {
              // The filter should not affect inserts.
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Not Gustav')))
                .insert({ name: 'Gustav-neue' });
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(gustavNeue => expect(gustavNeue.name).to.equal('Gustav-neue'));
        });

        it('relate', () => {
          return Promise.all([findArnold(), findMeinhard()])
            .then(([arnold, meinhard]) => {
              // The filter should not affect relates because the relates
              // query is directed at the owner, not the related model.
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Not Gustav')))
                .relate(meinhard.id);
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(meinhard => expect(meinhard.name).to.equal('Meinhard'));
        });

        it('unrelate', () => {
          return findArnold()
            .then(arnold => {
              // The filter should not affect unrelates because the unrelate
              // query is directed at the owner, not the related model.
              return arnold
                .$relatedQuery('parent')
                .context(modifyBelongsToOne(qb => qb.where('name', 'Not Gustav')))
                .unrelate();
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(parent => expect(parent).to.eql(undefined));
        });
      });

      describe('has many relation', () => {
        it('find', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.select('name').orderBy('name')));
            })
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud', 'Stalin']));
        });

        it('update', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'None of the pets')))
                .update({ name: 'Updated' });
            })
            .then(numUpdated => expect(numUpdated).to.equal(0))
            .then(findArnold)
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'Freud')))
                .update({ name: 'Updated' });
            })
            .then(numUpdated => expect(numUpdated).to.equal(1));
        });

        it('delete', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'None of the pets')))
                .delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(0))
            .then(findArnold)
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'Stalin')))
                .delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(1));
        });

        it('insert', () => {
          return findArnold()
            .then(arnold => {
              // The filter should not affect inserts.
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'None of the pets')))
                .insert({ name: 'Cat' });
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('pets')
                .orderBy('name')
                .select('name')
            )
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Cat', 'Freud', 'Stalin']));
        });

        it('relate', () => {
          return Promise.all([findArnold(), findRuffus()])
            .then(([arnold, ruffus]) => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'None of the pets')))
                .relate(ruffus.id);
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('pets')
                .orderBy('name')
                .select('name')
            )
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud', 'Stalin']))
            .then(() => Promise.all([findArnold(), findRuffus()]))
            .then(([arnold, ruffus]) => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'Ruffus')))
                .relate(ruffus.id);
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('pets')
                .orderBy('name')
                .select('name')
            )
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud', 'Ruffus', 'Stalin']));
        });

        it('unrelate', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'None of the pets')))
                .unrelate();
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('pets')
                .orderBy('name')
                .select('name')
            )
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud', 'Stalin']))
            .then(findArnold)
            .then(arnold => {
              return arnold
                .$relatedQuery('pets')
                .context(modifyHasMany(qb => qb.where('name', 'Stalin')))
                .unrelate();
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('pets')
                .orderBy('name')
                .select('name')
            )
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud']));
        });
      });

      describe('many to many relation', () => {
        it('find', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('movies')
                .context(modifyManyToMany(qb => qb.select('name').orderBy('name')));
            })
            .then(movies =>
              expect(movies.map(it => it.name)).to.eql(['Terminator', 'Terminator 2'])
            );
        });

        describe('update', () => {
          it('simple modifier', () => {
            return findArnold()
              .then(arnold => {
                return arnold
                  .$relatedQuery('movies')
                  .context(modifyManyToMany(qb => qb.where('name', 'None of the movies')))
                  .update({ name: 'Updated' });
              })
              .then(numUpdated => expect(numUpdated).to.equal(0))
              .then(findArnold)
              .then(arnold => {
                return arnold
                  .$relatedQuery('movies')
                  .context(modifyManyToMany(qb => qb.where('name', 'Terminator')))
                  .update({ name: 'Updated' });
              })
              .then(numUpdated => expect(numUpdated).to.equal(1));
          });

          it('modifier with selects', () => {
            return findArnold()
              .then(arnold => {
                return arnold
                  .$relatedQuery('movies')
                  .context(modifyManyToMany(qb => qb.where('name', 'None of the movies')))
                  .update({ name: 'Updated' });
              })
              .then(numUpdated => expect(numUpdated).to.equal(0))
              .then(findArnold)
              .then(arnold => {
                return arnold
                  .$relatedQuery('movies')
                  .context(modifyManyToMany(qb => qb.where('name', 'Terminator').select('name')))
                  .update({ name: 'Updated' });
              })
              .then(numUpdated => expect(numUpdated).to.equal(1));
          });
        });
      });
    });

    describe('eager', () => {
      it('belongs to one relation', () => {});

      it('has many relation', () => {});

      it('many to many relation', () => {});
    });

    describe('joinEager', () => {
      it('belongs to one relation', () => {});

      it('has many relation', () => {});

      it('many to many relation', () => {});
    });

    describe('joinRelation', () => {
      it('belongs to one relation', () => {});

      it('has many relation', () => {});

      it('many to many relation', () => {});
    });

    after(() => {
      return session.knex.schema
        .dropTableIfExists('personMovie')
        .dropTableIfExists('animal')
        .dropTableIfExists('movie')
        .dropTableIfExists('person');
    });

    function findArnold() {
      return Person.query().findOne('name', 'Arnold');
    }

    function findMeinhard() {
      return Person.query().findOne('name', 'Meinhard');
    }

    function findRuffus() {
      return Animal.query().findOne('name', 'Ruffus');
    }

    function modifyBelongsToOne(query) {
      return {
        belongsToOne: query
      };
    }

    function modifyHasMany(query) {
      return {
        hasMany: query
      };
    }

    function modifyManyToMany(query) {
      return {
        manyToMany: query
      };
    }
  });
};
