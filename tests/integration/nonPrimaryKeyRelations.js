const { Model, raw } = require('../../');
const { expect } = require('chai');
const { orderBy } = require('lodash');

module.exports = session => {
  describe("relations that don't use the primary keys", () => {
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
              from: 'person.parentName',
              to: 'person.name'
            }
          },

          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'person.name',
              to: 'animal.ownerName'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'person.name',
              through: {
                modelClass: PersonMovie,
                from: 'personMovie.personName',
                to: 'personMovie.movieName'
              },
              to: 'movie.name'
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

    class PersonMovie extends Model {
      static get tableName() {
        return 'personMovie';
      }

      static get idColumn() {
        return ['personName', 'movieName'];
      }

      static uniqueTag() {
        return 'personMovie_nonPrimaryKeys';
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
          table.string('nickname');
          table.string('parentName');
        })
        .createTable('animal', table => {
          table.increments('id').primary();
          table.string('name');
          table.string('nickname');
          table.string('ownerName');
        })
        .createTable('movie', table => {
          table.increments('id').primary();
          table.string('name');
          table.string('altName');
        })
        .createTable('personMovie', table => {
          table.string('personName');
          table.string('movieName');
        });
    });

    before(() => {
      Person.knex(session.knex);
      PersonMovie.knex(session.knex);
      Animal.knex(session.knex);
      Movie.knex(session.knex);
    });

    beforeEach(() => {
      return Person.query()
        .delete()
        .then(() => PersonMovie.query().delete())
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
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(gustav => expect(gustav.name).to.eql('Gustav'));
        });

        it('update', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('parent').update({ nickname: 'Gus' });
            })
            .then(numUpdated => expect(numUpdated).to.equal(1))
            .then(findGustav)
            .then(gustav => expect(gustav.nickname).to.equal('Gus'));
        });

        it('delete', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('parent').delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(1))
            .then(findGustav)
            .then(gustav => expect(gustav).to.equal(undefined));
        });

        it('insert', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('parent').insert({ name: 'Gustav-neue' });
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(gustavNeue => expect(gustavNeue.name).to.equal('Gustav-neue'))
            .then(findGustav)
            .then(gustav => expect(gustav.name).to.equal('Gustav'));
        });

        it('relate', () => {
          return Promise.all([findArnold(), findMeinhard()])
            .then(([arnold, meinhard]) => {
              return arnold.$relatedQuery('parent').relate(meinhard.name);
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(meinhard => expect(meinhard.name).to.equal('Meinhard'))
            .then(findGustav)
            .then(gustav => expect(gustav.name).to.equal('Gustav'));
        });

        it('unrelate', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('parent').unrelate();
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(parent => expect(parent).to.eql(undefined))
            .then(findGustav)
            .then(gustav => expect(gustav.name).to.equal('Gustav'));
        });
      });

      describe('has many relation', () => {
        it('find', () => {
          return findArnold()
            .then(arnold => arnold.$relatedQuery('pets'))
            .then(pets => expect(pets.map(it => it.name)).to.eql(['Freud', 'Stalin']));
        });

        it('update', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('pets').update({ nickname: concat('name', "'zilla'") });
            })
            .then(numUpdated => expect(numUpdated).to.equal(2))
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('pets'))
            .then(pets => {
              expect(orderBy(pets, 'nickname').map(pet => pet.nickname)).to.eql([
                'Freudzilla',
                'Stalinzilla'
              ]);
            });
        });

        it('delete', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('pets').delete();
            })
            .then(numDeleted => expect(numDeleted).to.equal(2))
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('pets'))
            .then(pets => expect(pets).to.have.length(0));
        });

        it('insert', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('pets').insert({ name: 'Cat' });
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
          return Promise.all([findArnold(), insertTerminator3()])
            .then(([arnold, terminator3]) => {
              return arnold.$relatedQuery('movies').relate(terminator3.name);
            })
            .then(findArnold)
            .then(arnold =>
              arnold
                .$relatedQuery('movies')
                .orderBy('name')
                .select('name')
            )
            .then(movies =>
              expect(movies.map(it => it.name)).to.eql([
                'Terminator',
                'Terminator 2',
                'Terminator 3'
              ])
            );
        });

        it('unrelate', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('movies').unrelate();
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('movies'))
            .then(movies => expect(movies).to.eql([]));
        });
      });

      describe('many to many relation', () => {
        it('find', () => {
          return findArnold()
            .then(arnold => arnold.$relatedQuery('movies'))
            .then(movies =>
              expect(movies.map(it => it.name)).to.eql(['Terminator', 'Terminator 2'])
            );
        });

        it('update', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('movies')
                .where('name', 'Terminator')
                .patch({ altName: concat('name', "': This Time its Personal'") });
            })
            .then(numUpdated => expect(numUpdated).to.equal(1))
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('movies'))
            .then(movies => {
              expect(movies.length).to.equal(2);
              expect(movies.filter(it => it.altName).map(it => it.altName)).to.eql([
                'Terminator: This Time its Personal'
              ]);
            });
        });

        it('delete', () => {
          return findArnold()
            .then(arnold => {
              return arnold
                .$relatedQuery('movies')
                .delete()
                .where('name', 'Terminator 2');
            })
            .then(numDeleted => expect(numDeleted).to.equal(1))
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('movies'))
            .then(movies => {
              expect(movies.map(it => it.name)).to.eql(['Terminator']);
            });
        });

        it('relate', () => {
          return Promise.all([findArnold(), findMeinhard()])
            .then(([arnold, meinhard]) => {
              return arnold.$relatedQuery('parent').relate(meinhard.name);
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(meinhard => expect(meinhard.name).to.equal('Meinhard'))
            .then(findGustav)
            .then(gustav => expect(gustav.name).to.equal('Gustav'));
        });

        it('unrelate', () => {
          return findArnold()
            .then(arnold => {
              return arnold.$relatedQuery('parent').unrelate();
            })
            .then(findArnold)
            .then(arnold => arnold.$relatedQuery('parent'))
            .then(parent => expect(parent).to.eql(undefined))
            .then(findGustav)
            .then(gustav => expect(gustav.name).to.equal('Gustav'));
        });
      });
    });

    it('eager', () => {
      return Person.query()
        .eager({
          parent: true,
          pets: true,
          movies: true
        })
        .whereExists(Person.relatedQuery('pets'))
        .orderBy('name')
        .then(result => {
          expect(result.length).to.equal(2);
          expect(result).to.containSubset([
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

    it('joinEager', () => {
      return Person.query()
        .joinEager({
          parent: true,
          pets: true,
          movies: true
        })
        .whereExists(Person.relatedQuery('pets'))
        .orderBy('person.name')
        .then(result => {
          expect(result.length).to.equal(2);
          expect(result).to.containSubset([
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

    describe('upsertGraph', () => {
      describe('belongs to one relation', () => {
        it('insert', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.parent = { name: 'Kustaa' };
              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',

                parent: {
                  name: 'Kustaa'
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
              });
            })
            .then(findGustav)
            .then(gustav => {
              expect(gustav).to.equal(undefined);
            });
        });

        it('delete', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.parent = null;
              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',
                parent: null,

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
              });
            })
            .then(findGustav)
            .then(gustav => {
              expect(gustav).to.equal(undefined);
            });
        });

        it('relate', () => {
          // TODO: Could be optimized! Useless update happens.
          return Promise.all([findArnoldEagerly(), insertTeppo()])
            .then(([arnold, teppo]) => {
              arnold.parent = teppo;
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['parent'],
                unrelate: ['parent']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',

                parent: {
                  name: 'Teppo'
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
              });
            })
            .then(findGustav)
            .then(gustav => {
              expect(gustav.name).to.equal('Gustav');
            });
        });

        it('unrelate', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.parent = null;
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['parent'],
                unrelate: ['parent']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',
                parent: null,

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
              });
            })
            .then(findGustav)
            .then(gustav => {
              expect(gustav.name).to.equal('Gustav');
            });
        });
      });

      describe('has many relation', () => {
        it('insert', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.pets.push({
                name: 'Tahvo'
              });

              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                  },
                  {
                    name: 'Tahvo'
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
              });
            });
        });

        it('delete', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.pets = arnold.pets.filter(it => it.name !== 'Stalin');
              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',

                parent: {
                  name: 'Gustav'
                },

                pets: [
                  {
                    name: 'Freud'
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
              });
            })
            .then(findStalin)
            .then(stalin => {
              expect(stalin).to.equal(undefined);
            });
        });

        it('relate', () => {
          return Promise.all([findArnoldEagerly(), insertTahvo()])
            .then(([arnold, tahvo]) => {
              arnold.pets.push(tahvo);
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['pets'],
                unrelate: ['pets']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                  },
                  {
                    name: 'Tahvo'
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
              });
            })
            .then(() => Animal.query().where('name', 'Tahvo'))
            .then(tahvos => {
              expect(tahvos.length).to.equal(1);
            });
        });

        it('unrelate', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.pets = arnold.pets.filter(it => it.name !== 'Stalin');
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['pets'],
                unrelate: ['pets']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
                name: 'Arnold',

                parent: {
                  name: 'Gustav'
                },

                pets: [
                  {
                    name: 'Freud'
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
              });
            })
            .then(findStalin)
            .then(stalin => {
              expect(stalin.name).to.equal('Stalin');
              expect(stalin.ownerName).to.equal(null);
            });
        });
      });

      describe('many to many relation', () => {
        it('insert', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.movies.push({ name: 'Terminator 3' });
              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                  },
                  {
                    name: 'Terminator 3'
                  }
                ]
              });
            });
        });

        it('delete', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.movies = arnold.movies.filter(it => it.name !== 'Terminator');
              return Person.query().upsertGraph(arnold, { fetchStrategy: 'OnlyNeeded' });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                    name: 'Terminator 2'
                  }
                ]
              });
            })
            .then(findTerminator)
            .then(terminator => {
              expect(terminator).to.equal(undefined);
            });
        });

        it('relate', () => {
          return Promise.all([findArnoldEagerly(), insertTerminator3()])
            .then(([arnold, terminator3]) => {
              arnold.movies.push(terminator3);
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['movies'],
                unrelate: ['movies']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                  },
                  {
                    name: 'Terminator 3'
                  }
                ]
              });
            })
            .then(() => Movie.query().where('name', 'Terminator 3'))
            .then(terminator3s => {
              expect(terminator3s.length).to.equal(1);
            });
        });

        it('unrelate', () => {
          return findArnoldEagerly()
            .then(arnold => {
              arnold.movies = arnold.movies.filter(it => it.name !== 'Terminator');
              return Person.query().upsertGraph(arnold, {
                fetchStrategy: 'OnlyNeeded',
                relate: ['movies'],
                unrelate: ['movies']
              });
            })
            .then(findArnoldEagerly)
            .then(arnold => {
              expect(arnold).to.containSubset({
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
                    name: 'Terminator 2'
                  }
                ]
              });
            })
            .then(findTerminator)
            .then(terminator => {
              expect(terminator.name).to.equal('Terminator');
            });
        });
      });
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

    function findArnoldEagerly() {
      return Person.query()
        .findOne('name', 'Arnold')
        .eager({
          parent: true,
          pets: true,
          movies: true
        });
    }

    function findGustav() {
      return Person.query().findOne('name', 'Gustav');
    }

    function findMeinhard() {
      return Person.query().findOne('name', 'Meinhard');
    }

    function findStalin() {
      return Animal.query().findOne('name', 'Stalin');
    }

    function findTerminator() {
      return Movie.query().findOne('name', 'Terminator');
    }

    function insertTeppo() {
      return Person.query().insert({ name: 'Teppo' });
    }

    function insertTahvo() {
      return Animal.query().insert({ name: 'Tahvo' });
    }

    function insertTerminator3() {
      return Movie.query().insert({ name: 'Terminator 3' });
    }
  });

  function concat(str1, str2) {
    if (session.isMySql()) {
      return raw(`CONCAT(${str1}, ${str2})`);
    } else {
      return raw(`${str1} || ${str2}`);
    }
  }
};
