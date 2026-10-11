const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe('upsertGraph() deleting the row of a BelongsToOneRelation', () => {
    const { knex } = session;

    class Pet extends Model {
      static get tableName() {
        return 'bt1_delete_pet';
      }
    }

    class Owner extends Model {
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
    }

    function createTables(createPetId) {
      return knex.schema
        .dropTableIfExists('bt1_delete_owner')
        .dropTableIfExists('bt1_delete_pet')
        .createTable('bt1_delete_pet', (table) => {
          table.integer('id').primary();
        })
        .createTable('bt1_delete_owner', (table) => {
          table.integer('id').primary();
          createPetId(table);
        });
    }

    before(() => {
      Owner.knex(knex);
    });

    beforeEach(async () => {
      await knex('bt1_delete_pet').insert({ id: 1 });
      await knex('bt1_delete_owner').insert({ id: 1, petId: 1 });
    });

    afterEach(async () => {
      await knex('bt1_delete_owner').delete();
      await knex('bt1_delete_pet').delete();
    });

    after(() => {
      return knex.schema.dropTableIfExists('bt1_delete_owner').dropTableIfExists('bt1_delete_pet');
    });

    describe('with ON DELETE SET NULL', () => {
      before(() => {
        return createTables((table) => {
          table.integer('petId').references('bt1_delete_pet.id').onDelete('SET NULL');
        });
      });

      it("should leave the owner's reference to the database, without validating it", async () => {
        // The owner isn't patched, so its schema doesn't have to allow `null`.
        class ValidatedOwner extends Owner {
          static get jsonSchema() {
            return {
              type: 'object',
              properties: {
                petId: { type: 'integer' },
              },
            };
          }
        }

        await ValidatedOwner.query().upsertGraph({ id: 1, pet: null });

        expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: null }]);
        expect(await knex('bt1_delete_pet')).to.eql([]);
      });
    });

    describe('with a NOT NULL reference and ON DELETE CASCADE', () => {
      before(() => {
        return createTables((table) => {
          table.integer('petId').notNullable().references('bt1_delete_pet.id').onDelete('CASCADE');
        });
      });

      it('should leave the owner to the database', async () => {
        await Owner.query().upsertGraph({ id: 1, pet: null });

        expect(await knex('bt1_delete_owner')).to.eql([]);
        expect(await knex('bt1_delete_pet')).to.eql([]);
      });
    });
  });
};
