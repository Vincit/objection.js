const uuid = require('uuid');
const { expect } = require('chai');
const { Model, lit, raw } = require('../../../');

module.exports = session => {
  if (!session.isPostgres()) {
    return;
  }

  describe(`Insert an array of UUIDS #909`, () => {
    let knex = session.knex;
    let Person;

    before(() => {
      return knex.schema.dropTableIfExists('Person').createTable('Person', table => {
        table.increments('id').primary();
        table.string('name');
        table.specificType('uuids', 'uuid[]');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('Person');
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => Person.query().delete());

    it('should be able to cast to uuid[]', () => {
      const uuids = [uuid.v4(), uuid.v4()];

      return Person.query()
        .insert({
          name: 'Margot',
          uuids: lit(uuids)
            .asArray()
            .castTo('uuid[]')
        })
        .then(() => {
          return Person.query();
        })
        .then(people => {
          expect(people).to.containSubset([
            {
              name: 'Margot',
              uuids
            }
          ]);
        });
    });

    it('should be able to cast individual array items to uuid', () => {
      const uuids = [uuid.v4(), uuid.v4()];

      return Person.query()
        .insert({
          name: 'Margot',
          uuids: lit(uuids.map(it => lit(it).castTo('uuid'))).asArray()
        })
        .then(() => {
          return Person.query();
        })
        .then(people => {
          expect(people).to.containSubset([
            {
              name: 'Margot',
              uuids
            }
          ]);
        });
    });

    it('should be able to give an array of raw instances that are cast to uuid', () => {
      const uuids = [uuid.v4(), uuid.v4()];

      return Person.query()
        .insert({
          name: 'Margot',
          uuids: lit(uuids.map(it => raw('?::uuid', it))).asArray()
        })
        .then(() => {
          return Person.query();
        })
        .then(people => {
          expect(people).to.containSubset([
            {
              name: 'Margot',
              uuids
            }
          ]);
        });
    });
  });
};
