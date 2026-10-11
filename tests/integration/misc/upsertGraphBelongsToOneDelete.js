const { expect } = require('chai');
const { Model, ForeignKeyViolationError } = require('../../../');

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

    // Replacing the row first points the owner to the new row and then
    // deletes the old one, so it works with every foreign key.
    function itShouldReplaceTheRow() {
      it('should point the owner to an inserted row and delete the old one', async () => {
        await Owner.query().upsertGraph({ id: 1, pet: { id: 2 } }, { insertMissing: true });

        expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: 2 }]);
        expect(await knex('bt1_delete_pet')).to.eql([{ id: 2 }]);
      });

      it('should point the owner to a related row and delete the old one', async () => {
        await knex('bt1_delete_pet').insert({ id: 2 });
        await Owner.query().upsertGraph({ id: 1, pet: { id: 2 } }, { relate: true });

        expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: 2 }]);
        expect(await knex('bt1_delete_pet')).to.eql([{ id: 2 }]);
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

      itShouldReplaceTheRow();
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

      itShouldReplaceTheRow();
    });

    describe('with a reference without ON DELETE action', () => {
      before(() => {
        return createTables((table) => {
          table.integer('petId').references('bt1_delete_pet.id');
        });
      });

      it('should fail to delete the referenced row', async () => {
        const error = await Owner.query()
          .upsertGraph({ id: 1, pet: null })
          .catch((err) => err);

        expect(error).to.be.an.instanceof(ForeignKeyViolationError);
        expect(await knex('bt1_delete_owner')).to.eql([{ id: 1, petId: 1 }]);
        expect(await knex('bt1_delete_pet')).to.eql([{ id: 1 }]);
      });

      itShouldReplaceTheRow();
    });
  });
};
