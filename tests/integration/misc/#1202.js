const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = session => {
  describe(`relations should be loaded lazily #1202`, () => {
    let knex = session.knex;
    let Person;
    let loadedRelations = [];

    before(() => {
      return knex.schema
        .dropTableIfExists('cousins')
        .dropTableIfExists('persons')
        .createTable('persons', table => {
          table.increments('id').primary();
          table.integer('parentId');
          table.string('name');
        })
        .createTable('cousins', table => {
          table.integer('id1');
          table.integer('id2');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('cousins').dropTableIfExists('persons');
    });

    beforeEach(() => {
      loadedRelations = [];

      Person = class Person extends Model {
        static get tableName() {
          return 'persons';
        }

        static get relationMappings() {
          return {
            parent: {
              relation: Model.BelongsToOneRelation,
              modelClass() {
                loadedRelations.push('parent');
                return Person;
              },
              join: {
                from: 'persons.parentId',
                to: 'persons.id'
              }
            },

            cousins: {
              relation: Model.ManyToManyRelation,
              modelClass() {
                loadedRelations.push('cousins');
                return Person;
              },
              join: {
                from: 'persons.id',
                through: {
                  from: 'cousins.id1',
                  to: 'cousins.id2'
                },
                to: 'persons.id'
              }
            }
          };
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => Person.query().delete());

    beforeEach(() => {
      // This is what you get when you cannot use insertGraph.
      return session
        .knex('persons')
        .insert({ name: 'Meinhart ' })
        .returning('id')
        .then(([id]) => {
          return session
            .knex('persons')
            .insert({ name: 'Arnold', parentId: id })
            .returning('id');
        })
        .then(([arnoldId]) => {
          return Promise.all([
            session
              .knex('persons')
              .insert({ name: 'Hans' })
              .returning('id'),
            session
              .knex('persons')
              .insert({ name: 'Urs' })
              .returning('id')
          ]).then(([[hansId], [ursId]]) => {
            return Promise.all([
              session.knex('cousins').insert({ id1: arnoldId, id2: hansId }),
              session.knex('cousins').insert({ id1: arnoldId, id2: ursId })
            ]);
          });
        });
    });

    it('inserting a model should not load relations', () => {
      return Person.query()
        .insert({ name: 'Arnold' })
        .then(() => {
          expect(loadedRelations).to.have.length(0);
        });
    });

    it('updating a model should not load relations', () => {
      return Person.query()
        .patch({ name: 'Arnold' })
        .findById(1)
        .then(() => {
          expect(loadedRelations).to.have.length(0);
        });
    });

    it('finding a model should not load relations', () => {
      return Person.query()
        .findOne({ name: 'Arnold' })
        .then(result => {
          expect(result).to.containSubset({ name: 'Arnold' });
          expect(loadedRelations).to.have.length(0);
        });
    });

    it('toJSON a model should not load relations', () => {
      return Person.query()
        .findOne({ name: 'Arnold' })
        .then(result => {
          result.toJSON();
          result.$toDatabaseJson();
          expect(loadedRelations).to.have.length(0);
        });
    });

    it('eager should only load relations in the expression', () => {
      return Person.query()
        .eager('parent')
        .then(() => {
          expect(loadedRelations).to.eql(['parent']);
          return Person.query().eager('cousins');
        })
        .then(() => {
          expect(loadedRelations).to.eql(['parent', 'cousins']);
        });
    });

    it('joinEager should only load relations in the expression', () => {
      return Person.query()
        .joinEager('parent')
        .then(() => {
          expect(loadedRelations).to.eql(['parent']);
          return Person.query().joinEager('cousins');
        })
        .then(() => {
          expect(loadedRelations).to.eql(['parent', 'cousins']);
        });
    });

    it('$relatedQuery should only load the queried relation', () => {
      return Person.query()
        .findOne({ name: 'Arnold' })
        .then(arnold => {
          return arnold.$relatedQuery('cousins');
        })
        .then(() => {
          expect(loadedRelations).to.eql(['cousins']);
        });
    });

    it('insertGraph should only load relations in the graph', () => {
      return Person.query()
        .insertGraph({
          name: 'Sami',
          parent: {
            name: 'Liisa'
          }
        })
        .then(() => {
          expect(loadedRelations).to.eql(['parent']);
        });
    });

    it('fromJson should only load relations that are present in the object', () => {
      Person.fromJson({
        name: 'Ardnold',
        cousins: [
          {
            name: 'Hans'
          }
        ]
      });

      expect(loadedRelations).to.eql(['cousins']);
    });
  });
};
