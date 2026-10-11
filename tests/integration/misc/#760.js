const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe(`orderBy extra property in relation modify #760`, () => {
    let knex = session.knex;
    let Person;

    before(async () => {
      await knex.schema.dropTableIfExists('Person').dropTableIfExists('PersonPerson');
      await session.createTable('Person', (table, { increments }) => {
        increments('id');
        table.string('name');
      });
      await session.createTable('PersonPerson', (table, { increments }) => {
        increments('id');
        table.integer('awesomeness');
        table.integer('person1Id');
        table.integer('person2Id');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('PersonPerson').dropTableIfExists('Person');
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'Person';
        }

        static get relationMappings() {
          return {
            relatives: {
              relation: Model.ManyToManyRelation,
              modelClass: Person,
              modify: (builder) => builder.orderBy('awesomeness'),
              join: {
                from: 'Person.id',
                through: {
                  from: 'PersonPerson.person1Id',
                  to: 'PersonPerson.person2Id',
                  extra: ['awesomeness'],
                },
                to: 'Person.id',
              },
            },

            goodRelatives: {
              relation: Model.ManyToManyRelation,
              modelClass: Person,
              modify: (builder) => builder.orderBy('awesomeness').where('awesomeness', '>', 1),
              join: {
                from: 'Person.id',
                through: {
                  from: 'PersonPerson.person1Id',
                  to: 'PersonPerson.person2Id',
                  extra: ['awesomeness'],
                },
                to: 'Person.id',
              },
            },
          };
        }
      };

      Person.knex(knex);
    });

    beforeEach(() => {
      return Person.query()
        .delete()
        .then(() => {
          return Person.query().insertGraph({
            id: 1,
            name: 'parent',
            relatives: [
              {
                id: 2,
                awesomeness: 1,
                name: 'relative 1',
              },
              {
                id: 3,
                awesomeness: 2,
                name: 'relative 2',
              },
            ],
          });
        });
    });

    it('eager', () => {
      return Person.query()
        .where('Person.id', 1)
        .withGraphFetched('[relatives, goodRelatives]')
        .then((result) => {
          expect(result).to.containSubset([
            {
              id: 1,
              name: 'parent',

              relatives: [
                { id: 2, name: 'relative 1', awesomeness: 1 },
                { id: 3, name: 'relative 2', awesomeness: 2 },
              ],

              goodRelatives: [{ id: 3, name: 'relative 2', awesomeness: 2 }],
            },
          ]);
        });
    });

    it('upsertGraph', () => {
      return Person.query()
        .upsertGraph({
          id: 1,
          relatives: [
            {
              id: 2,
              name: 'relative 11',
              awesomeness: 11,
            },
            {
              id: 3,
              name: 'relative 22',
              awesomeness: 22,
            },
          ],
        })
        .then(() => {
          return Person.query().findById(1).withGraphFetched('relatives');
        })
        .then((result) => {
          expect(result).to.containSubset({
            id: 1,
            name: 'parent',
            relatives: [
              { id: 2, name: 'relative 11', awesomeness: 11 },
              { id: 3, name: 'relative 22', awesomeness: 22 },
            ],
          });
        });
    });

    it('upsertGraph (only extra properties)', () => {
      return Person.query()
        .upsertGraph({
          id: 1,
          relatives: [
            {
              id: 2,
              awesomeness: 11,
            },
            {
              id: 3,
              awesomeness: 22,
            },
          ],
        })
        .then(() => {
          return Person.query().findById(1).withGraphFetched('relatives');
        })
        .then((result) => {
          expect(result).to.containSubset({
            id: 1,
            name: 'parent',
            relatives: [
              { id: 2, name: 'relative 1', awesomeness: 11 },
              { id: 3, name: 'relative 2', awesomeness: 22 },
            ],
          });
        });
    });

    it('upsertGraph passes the relation and the owner to static update hooks', async () => {
      const calls = [];

      Person.beforeUpdate = ({ relation, items, inputItems }) => {
        calls.push({
          relation: relation && relation.name,
          items: items.map((item) => item.id),
          inputItems: inputItems.map((item) => item.id),
        });
      };

      try {
        await Person.query().upsertGraph({
          id: 1,
          relatives: [
            { id: 2, name: 'relative 11' },
            { id: 3, name: 'relative 22' },
          ],
        });
      } finally {
        delete Person.beforeUpdate;
      }

      expect(calls).to.have.deep.members([
        { relation: 'relatives', items: [1], inputItems: [2] },
        { relation: 'relatives', items: [1], inputItems: [3] },
      ]);
    });
  });
};
