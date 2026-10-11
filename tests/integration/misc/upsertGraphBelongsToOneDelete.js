const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe('upsertGraph() deleting a BelongsToOneRelation without ON DELETE SET NULL', () => {
    const { knex } = session;
    let Owner;

    before(() => {
      return knex.schema
        .dropTableIfExists('bt1_delete_owner')
        .dropTableIfExists('bt1_delete_pet')
        .createTable('bt1_delete_pet', (table) => {
          table.integer('id').primary();
          table.string('name');
        })
        .createTable('bt1_delete_owner', (table) => {
          table.integer('id').primary();
          // A foreign key without an `onDelete` action, so the pet can only be
          // deleted once the owner no longer references it.
          table.integer('petId').references('bt1_delete_pet.id');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('bt1_delete_owner').dropTableIfExists('bt1_delete_pet');
    });

    before(() => {
      class Pet extends Model {
        static get tableName() {
          return 'bt1_delete_pet';
        }
      }

      Owner = class Owner extends Model {
        static get tableName() {
          return 'bt1_delete_owner';
        }

        static get relationMappings() {
          return {
            pet: {
              relation: Model.BelongsToOneRelation,
              modelClass: Pet,
              join: { from: 'bt1_delete_owner.petId', to: 'bt1_delete_pet.id' },
            },
          };
        }
      };

      Owner.knex(knex);
    });

    beforeEach(async () => {
      await knex('bt1_delete_owner').delete();
      await knex('bt1_delete_pet').delete();
      await knex('bt1_delete_pet').insert({ id: 1, name: 'old' });
      await knex('bt1_delete_owner').insert({ id: 1, petId: 1 });
    });

    it('should delete the related row after removing the reference to it', async () => {
      await Owner.query().upsertGraph({ id: 1, pet: null });

      expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: null }]);
      expect(await knex('bt1_delete_pet')).to.eql([]);
    });

    it('should delete the related row after referencing a new one', async () => {
      await Owner.query().upsertGraph(
        { id: 1, pet: { id: 2, name: 'new' } },
        { insertMissing: true },
      );

      expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: 2 }]);
      expect(await knex('bt1_delete_pet')).to.eql([{ id: 2, name: 'new' }]);
    });
  });
};
