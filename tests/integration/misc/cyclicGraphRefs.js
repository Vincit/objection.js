const { expect } = require('chai');
const { Model } = require('../../../');
const { FetchStrategy } = require('../../../lib/queryBuilder/graph/GraphOptions');

module.exports = (session) => {
  describe('insertGraph / upsertGraph with cyclic #ref dependencies #1482', () => {
    const { knex } = session;
    let Person;
    let Pet;
    let Toy;

    before(() => {
      return knex.schema
        .dropTableIfExists('cyclic_toy')
        .dropTableIfExists('cyclic_pet')
        .dropTableIfExists('cyclic_person')
        .createTable('cyclic_person', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('favoritePetId').unsigned();
          table.integer('favoriteToyId').unsigned();
          table.string('favoritePetName');
        })
        .createTable('cyclic_pet', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('ownerId').unsigned().references('cyclic_person.id');
          table.integer('favoriteToyId').unsigned();
        })
        .createTable('cyclic_toy', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('petId').unsigned().references('cyclic_pet.id');
        })
        .then(() => {
          return knex.schema
            .alterTable('cyclic_person', (table) => {
              table.foreign('favoritePetId').references('cyclic_pet.id');
              table.foreign('favoriteToyId').references('cyclic_toy.id');
            })
            .alterTable('cyclic_pet', (table) => {
              table.foreign('favoriteToyId').references('cyclic_toy.id');
            });
        });
    });

    after(() => {
      return knex.schema
        .alterTable('cyclic_person', (table) => {
          table.dropForeign('favoritePetId');
          table.dropForeign('favoriteToyId');
        })
        .alterTable('cyclic_pet', (table) => {
          table.dropForeign('favoriteToyId');
        })
        .catch(() => {
          // SQLite doesn't support dropping foreign keys this way.
        })
        .then(() => {
          return knex.schema
            .dropTableIfExists('cyclic_toy')
            .dropTableIfExists('cyclic_pet')
            .dropTableIfExists('cyclic_person');
        });
    });

    before(() => {
      Person = class Person extends Model {
        static get tableName() {
          return 'cyclic_person';
        }

        $beforeUpdate() {
          Person.hookCalls.push('beforeUpdate');

          if (Person.failUpdate) {
            throw new Error('update failed');
          }
        }

        $afterUpdate() {
          Person.hookCalls.push('afterUpdate');
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Pet,
              join: {
                from: 'cyclic_person.id',
                to: 'cyclic_pet.ownerId',
              },
            },

            favoritePet: {
              relation: Model.BelongsToOneRelation,
              modelClass: Pet,
              join: {
                from: 'cyclic_person.favoritePetId',
                to: 'cyclic_pet.id',
              },
            },

            favoriteToy: {
              relation: Model.BelongsToOneRelation,
              modelClass: Toy,
              join: {
                from: 'cyclic_person.favoriteToyId',
                to: 'cyclic_toy.id',
              },
            },
          };
        }
      };

      Pet = class Pet extends Model {
        static get tableName() {
          return 'cyclic_pet';
        }

        static get relationMappings() {
          return {
            toys: {
              relation: Model.HasManyRelation,
              modelClass: Toy,
              join: {
                from: 'cyclic_pet.id',
                to: 'cyclic_toy.petId',
              },
            },

            favoriteToy: {
              relation: Model.BelongsToOneRelation,
              modelClass: Toy,
              join: {
                from: 'cyclic_pet.favoriteToyId',
                to: 'cyclic_toy.id',
              },
            },
          };
        }
      };

      Toy = class Toy extends Model {
        static get tableName() {
          return 'cyclic_toy';
        }
      };

      Person.hookCalls = [];
      Person.knex(knex);
      Pet.knex(knex);
      Toy.knex(knex);
    });

    beforeEach(async () => {
      Person.failUpdate = false;
      await Pet.query().patch({ favoriteToyId: null });
      await Person.query().patch({ favoritePetId: null, favoriteToyId: null });
      await Toy.query().delete();
      await Pet.query().delete();
      await Person.query().delete();
      Person.hookCalls = [];
    });

    function fetchPerson(name) {
      return Person.query()
        .findOne({ name })
        .withGraphFetched('[pets(orderById).toys(orderById), favoritePet, favoriteToy]')
        .modifiers({ orderById: (builder) => builder.orderBy('id') });
    }

    async function expectCyclicError(promise) {
      let error;

      try {
        await promise;
      } catch (err) {
        error = err;
      }

      expect(error).to.be.an('error');
      expect(error.message).to.equal('the object graph contains cyclic references');
    }

    async function expectNoRows() {
      expect(await Person.query().resultSize()).to.equal(0);
      expect(await Pet.query().resultSize()).to.equal(0);
      expect(await Toy.query().resultSize()).to.equal(0);
    }

    const variants = [
      { title: 'insertGraph()', method: 'insertGraph', options: {} },
      ...Object.keys(FetchStrategy).map((fetchStrategy) => ({
        title: `upsertGraph() (fetchStrategy: ${fetchStrategy})`,
        method: 'upsertGraph',
        options: { fetchStrategy },
      })),
    ];

    for (const { title, method, options } of variants) {
      describe(title, () => {
        const graphOptions = { ...options, allowRefs: true };

        it('should insert a BelongsToOne #ref to a HasMany sibling (issue example)', async () => {
          const result = await Person.query()[method](
            {
              name: 'Jennifer',
              pets: [{ name: 'Doggo' }, { '#id': 'felix', name: 'Felix' }],
              favoritePet: { '#ref': 'felix' },
            },
            graphOptions,
          );

          const felix = result.pets[1];
          expect(felix.id).to.be.a('number');
          expect(felix.ownerId).to.equal(result.id);
          expect(result.favoritePetId).to.equal(felix.id);

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.pets.map((it) => it.name).sort()).to.eql(['Doggo', 'Felix']);
          expect(jennifer.favoritePet.name).to.equal('Felix');
          expect(jennifer.favoritePet.id).to.equal(felix.id);
        });

        it('should work when the #ref target is the first item of the relation', async () => {
          await Person.query()[method](
            {
              favoritePet: { '#ref': 'felix' },
              name: 'Jennifer',
              pets: [{ '#id': 'felix', name: 'Felix' }, { name: 'Doggo' }],
            },
            graphOptions,
          );

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.pets.map((it) => it.name).sort()).to.eql(['Doggo', 'Felix']);
          expect(jennifer.favoritePet.name).to.equal('Felix');
        });

        it('should break cycles spanning more than two levels', async () => {
          const result = await Person.query()[method](
            {
              name: 'Jennifer',
              pets: [
                {
                  name: 'Felix',
                  toys: [{ name: 'Mouse' }, { '#id': 'ball', name: 'Ball' }],
                },
              ],
              favoriteToy: { '#ref': 'ball' },
            },
            graphOptions,
          );

          expect(result.favoriteToyId).to.equal(result.pets[0].toys[1].id);

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.favoriteToy.name).to.equal('Ball');
          expect(jennifer.pets[0].toys.map((it) => it.name).sort()).to.eql(['Ball', 'Mouse']);
        });

        it('should break multiple cycles in one graph', async () => {
          await Person.query()[method](
            [
              {
                name: 'Jennifer',
                pets: [{ '#id': 'felix', name: 'Felix', toys: [{ '#id': 'ball', name: 'Ball' }] }],
                favoritePet: { '#ref': 'felix' },
                favoriteToy: { '#ref': 'ball' },
              },
              {
                name: 'Brad',
                pets: [{ name: 'Rex' }, { '#id': 'tom', name: 'Tom' }],
                favoritePet: { '#ref': 'tom' },
              },
            ],
            graphOptions,
          );

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.favoritePet.name).to.equal('Felix');
          expect(jennifer.favoriteToy.name).to.equal('Ball');

          const brad = await fetchPerson('Brad');
          expect(brad.favoritePet.name).to.equal('Tom');
          expect(brad.pets.map((it) => it.name).sort()).to.eql(['Rex', 'Tom']);
        });

        it('should handle a #ref into another root without a cycle', async () => {
          await Person.query()[method](
            [
              {
                name: 'Jennifer',
                favoritePet: { '#ref': 'tom' },
              },
              {
                name: 'Brad',
                pets: [{ '#id': 'tom', name: 'Tom' }],
              },
            ],
            graphOptions,
          );

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.favoritePet.name).to.equal('Tom');
          expect(jennifer.pets).to.eql([]);
        });

        it('should resolve #ref{} properties of the owner that are not deferred', async () => {
          await Person.query()[method](
            {
              '#id': 'jennifer',
              name: 'Jennifer',
              pets: [
                { '#id': 'felix', name: 'Felix', toys: [{ name: 'Toy of #ref{jennifer.name}' }] },
              ],
              favoritePet: { '#ref': 'felix' },
            },
            graphOptions,
          );

          const jennifer = await fetchPerson('Jennifer');
          expect(jennifer.favoritePet.name).to.equal('Felix');
          expect(jennifer.pets[0].toys[0].name).to.equal('Toy of Jennifer');
        });

        it('should not defer a foreign key that is read by a #ref{} property reference', async () => {
          await expectCyclicError(
            Person.query()[method](
              {
                '#id': 'jennifer',
                name: 'Jennifer',
                pets: [
                  {
                    '#id': 'felix',
                    name: 'Felix',
                    toys: [{ name: '#ref{jennifer.favoritePetId}' }],
                  },
                ],
                favoritePet: { '#ref': 'felix' },
              },
              graphOptions,
            ),
          );

          await expectNoRows();
        });

        it('should still throw for cycles that only go through property references', async () => {
          await expectCyclicError(
            Person.query()[method](
              {
                '#id': 'jennifer',
                name: 'Jennifer',
                // `favoritePetName` depends on felix, felix depends on jennifer
                // through the `pets` relation. Property references can't be deferred.
                favoritePetName: '#ref{felix.name}',
                pets: [{ '#id': 'felix', name: 'Felix' }],
              },
              graphOptions,
            ),
          );

          await expectNoRows();
        });

        it('should call the update hooks once per patched owner', async () => {
          await Person.query()[method](
            {
              name: 'Jennifer',
              pets: [{ '#id': 'felix', name: 'Felix', toys: [{ '#id': 'ball', name: 'Ball' }] }],
              favoritePet: { '#ref': 'felix' },
              favoriteToy: { '#ref': 'ball' },
            },
            graphOptions,
          );

          expect(Person.hookCalls).to.eql(['beforeUpdate', 'afterUpdate']);
        });

        it('should roll back the transaction if the deferred patch fails', async () => {
          Person.failUpdate = true;
          let error;

          try {
            await Person.transaction((trx) =>
              Person.query(trx)[method](
                {
                  name: 'Jennifer',
                  pets: [{ '#id': 'felix', name: 'Felix' }],
                  favoritePet: { '#ref': 'felix' },
                },
                graphOptions,
              ),
            );
          } catch (err) {
            error = err;
          }

          expect(error).to.be.an('error');
          expect(error.message).to.equal('update failed');
          await expectNoRows();
        });
      });
    }

    describe('insertGraph() through relatedQuery()', () => {
      it('should break cycles in the inserted graph', async () => {
        const jennifer = await Person.query().insert({ name: 'Jennifer' });

        await Person.relatedQuery('pets')
          .for(jennifer.id)
          .insertGraph(
            {
              name: 'Felix',
              toys: [{ name: 'Mouse' }, { '#id': 'ball', name: 'Ball' }],
              favoriteToy: { '#ref': 'ball' },
            },
            { allowRefs: true },
          );

        const felix = await Pet.query().findOne({ name: 'Felix' }).withGraphFetched('favoriteToy');
        expect(felix.ownerId).to.equal(jennifer.id);
        expect(felix.favoriteToy.name).to.equal('Ball');
      });
    });

    describe('upsertGraph() cycles that must not be broken', () => {
      it('should throw if the #ref target is not inserted because of noInsert', async () => {
        await expectCyclicError(
          Person.query().upsertGraph(
            {
              name: 'Jennifer',
              pets: [{ '#id': 'felix', name: 'Felix' }],
              favoritePet: { '#ref': 'felix' },
            },
            { allowRefs: true, noInsert: ['pets'] },
          ),
        );

        await expectNoRows();
      });

      it('should throw if the owner is not inserted because of noInsert', async () => {
        await expectCyclicError(
          Person.query().upsertGraph(
            {
              name: 'Jennifer',
              pets: [{ '#id': 'felix', name: 'Felix' }],
              favoritePet: { '#ref': 'felix' },
            },
            { allowRefs: true, noInsert: true },
          ),
        );

        await expectNoRows();
      });
    });

    describe('upsertGraph() on an existing root', () => {
      it('should relate a new #ref target that is inserted as a child', async () => {
        const jennifer = await Person.query().insert({ name: 'Jennifer' });

        await Person.query().upsertGraph(
          {
            id: jennifer.id,
            pets: [{ '#id': 'felix', name: 'Felix' }],
            favoritePet: { '#ref': 'felix' },
          },
          { allowRefs: true },
        );

        const fetched = await fetchPerson('Jennifer');
        expect(fetched.pets.map((it) => it.name)).to.eql(['Felix']);
        expect(fetched.favoritePet.name).to.equal('Felix');
      });
    });

    describe('deferred updates', () => {
      let queries;
      const onQuery = (query) => queries.push(query.sql);

      beforeEach(() => {
        queries = [];
        knex.on('query', onQuery);
      });

      afterEach(() => {
        knex.removeListener('query', onQuery);
      });

      const countUpdates = () => queries.filter((sql) => /^update/i.test(sql)).length;

      it('should patch all deferred foreign keys of an owner in one query', async () => {
        await Person.query().insertGraph(
          {
            name: 'Jennifer',
            pets: [{ '#id': 'felix', name: 'Felix', toys: [{ '#id': 'ball', name: 'Ball' }] }],
            favoritePet: { '#ref': 'felix' },
            favoriteToy: { '#ref': 'ball' },
          },
          { allowRefs: true },
        );

        expect(countUpdates()).to.equal(1);

        const jennifer = await fetchPerson('Jennifer');
        expect(jennifer.favoritePet.name).to.equal('Felix');
        expect(jennifer.favoriteToy.name).to.equal('Ball');
      });

      it('should patch each owner with deferred foreign keys once', async () => {
        await Person.query().insertGraph(
          [
            {
              name: 'Jennifer',
              pets: [{ '#id': 'felix', name: 'Felix' }],
              favoritePet: { '#ref': 'felix' },
            },
            {
              name: 'Brad',
              pets: [{ '#id': 'tom', name: 'Tom' }],
              favoritePet: { '#ref': 'tom' },
            },
          ],
          { allowRefs: true },
        );

        expect(countUpdates()).to.equal(2);
      });

      it('should not patch anything if the graph has no cycles', async () => {
        await Person.query().insertGraph(
          [
            { name: 'Jennifer', favoritePet: { '#ref': 'tom' } },
            { name: 'Brad', pets: [{ '#id': 'tom', name: 'Tom' }] },
          ],
          { allowRefs: true },
        );

        expect(countUpdates()).to.equal(0);
      });
    });

    describe('non-nullable foreign keys', () => {
      let Owner;
      let Item;

      before(() => {
        return knex.schema
          .dropTableIfExists('cyclic_item')
          .dropTableIfExists('cyclic_owner')
          .createTable('cyclic_owner', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('requiredItemId').unsigned().notNullable();
          })
          .createTable('cyclic_item', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('ownerId').unsigned();
          });
      });

      after(() => {
        return knex.schema.dropTableIfExists('cyclic_item').dropTableIfExists('cyclic_owner');
      });

      before(() => {
        Owner = class Owner extends Model {
          static get tableName() {
            return 'cyclic_owner';
          }

          static get relationMappings() {
            return {
              items: {
                relation: Model.HasManyRelation,
                modelClass: Item,
                join: { from: 'cyclic_owner.id', to: 'cyclic_item.ownerId' },
              },

              requiredItem: {
                relation: Model.BelongsToOneRelation,
                modelClass: Item,
                join: { from: 'cyclic_owner.requiredItemId', to: 'cyclic_item.id' },
              },
            };
          }
        };

        Item = class Item extends Model {
          static get tableName() {
            return 'cyclic_item';
          }
        };

        Owner.knex(knex);
        Item.knex(knex);
      });

      // MySQL without strict mode stores 0 for the missing value instead of
      // rejecting the insert.
      const itUnlessMySql = session.isMySql() ? it.skip : it;

      itUnlessMySql('should fail in the database and roll back inside a transaction', async () => {
        let error;

        try {
          await Owner.transaction((trx) =>
            Owner.query(trx).insertGraph(
              [
                { name: 'Unrelated', requiredItemId: 0 },
                {
                  name: 'Jennifer',
                  items: [{ '#id': 'felix', name: 'Felix' }],
                  requiredItem: { '#ref': 'felix' },
                },
              ],
              { allowRefs: true },
            ),
          );
        } catch (err) {
          error = err;
        }

        expect(error).to.be.an('error');
        expect(error.message).to.not.equal('the object graph contains cyclic references');
        expect(await Owner.query().resultSize()).to.equal(0);
        expect(await Item.query().resultSize()).to.equal(0);
      });
    });

    describe('composite keys', () => {
      let CPerson;
      let CPet;

      before(() => {
        return knex.schema
          .dropTableIfExists('cyclic_cpet')
          .dropTableIfExists('cyclic_cperson')
          .createTable('cyclic_cperson', (table) => {
            table.integer('idA');
            table.integer('idB');
            table.string('name');
            table.integer('favoritePetIdA');
            table.integer('favoritePetIdB');
            table.primary(['idA', 'idB']);
          })
          .createTable('cyclic_cpet', (table) => {
            table.integer('idA');
            table.integer('idB');
            table.string('name');
            table.integer('ownerIdA');
            table.integer('ownerIdB');
            table.primary(['idA', 'idB']);
          });
      });

      after(() => {
        return knex.schema.dropTableIfExists('cyclic_cpet').dropTableIfExists('cyclic_cperson');
      });

      before(() => {
        CPerson = class CPerson extends Model {
          static get tableName() {
            return 'cyclic_cperson';
          }

          static get idColumn() {
            return ['idA', 'idB'];
          }

          static get relationMappings() {
            return {
              pets: {
                relation: Model.HasManyRelation,
                modelClass: CPet,
                join: {
                  from: ['cyclic_cperson.idA', 'cyclic_cperson.idB'],
                  to: ['cyclic_cpet.ownerIdA', 'cyclic_cpet.ownerIdB'],
                },
              },

              favoritePet: {
                relation: Model.BelongsToOneRelation,
                modelClass: CPet,
                join: {
                  from: ['cyclic_cperson.favoritePetIdA', 'cyclic_cperson.favoritePetIdB'],
                  to: ['cyclic_cpet.idA', 'cyclic_cpet.idB'],
                },
              },
            };
          }
        };

        CPet = class CPet extends Model {
          static get tableName() {
            return 'cyclic_cpet';
          }

          static get idColumn() {
            return ['idA', 'idB'];
          }
        };

        CPerson.knex(knex);
        CPet.knex(knex);
      });

      beforeEach(async () => {
        await CPet.query().delete();
        await CPerson.query().delete();
      });

      for (const method of ['insertGraph', 'upsertGraph']) {
        it(`should patch composite foreign keys with ${method}()`, async () => {
          await CPerson.query()[method](
            [
              {
                idA: 1,
                idB: 1,
                name: 'Jennifer',
                pets: [
                  { idA: 1, idB: 2, name: 'Doggo' },
                  { '#id': 'felix', idA: 1, idB: 3, name: 'Felix' },
                ],
                favoritePet: { '#ref': 'felix' },
              },
              { idA: 2, idB: 1, name: 'Brad' },
            ],
            { allowRefs: true, insertMissing: true },
          );

          const jennifer = await CPerson.query()
            .findById([1, 1])
            .withGraphFetched('[pets, favoritePet]');
          expect(jennifer.favoritePetIdA).to.equal(1);
          expect(jennifer.favoritePetIdB).to.equal(3);
          expect(jennifer.favoritePet.name).to.equal('Felix');
          expect(jennifer.pets).to.have.length(2);

          const brad = await CPerson.query().findById([2, 1]);
          expect(brad.favoritePetIdA).to.equal(null);
          expect(brad.favoritePetIdB).to.equal(null);
        });
      }
    });

    describe('owners without a primary key (#2305)', () => {
      let Owner;
      let Item;

      before(() => {
        return knex.schema
          .dropTableIfExists('cyclic_nopk_item')
          .dropTableIfExists('cyclic_nopk_owner')
          .createTable('cyclic_nopk_owner', (table) => {
            table.string('name');
            table.integer('favoriteItemId');
          })
          .createTable('cyclic_nopk_item', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.string('ownerName');
          });
      });

      after(() => {
        return knex.schema
          .dropTableIfExists('cyclic_nopk_item')
          .dropTableIfExists('cyclic_nopk_owner');
      });

      before(() => {
        Owner = class Owner extends Model {
          static get tableName() {
            return 'cyclic_nopk_owner';
          }

          static get idColumn() {
            return null;
          }

          static get relationMappings() {
            return {
              items: {
                relation: Model.HasManyRelation,
                modelClass: Item,
                join: { from: 'cyclic_nopk_owner.name', to: 'cyclic_nopk_item.ownerName' },
              },

              favoriteItem: {
                relation: Model.BelongsToOneRelation,
                modelClass: Item,
                join: { from: 'cyclic_nopk_owner.favoriteItemId', to: 'cyclic_nopk_item.id' },
              },
            };
          }
        };

        Item = class Item extends Model {
          static get tableName() {
            return 'cyclic_nopk_item';
          }
        };

        Owner.knex(knex);
        Item.knex(knex);
      });

      it('should not defer foreign keys of owners that cannot be patched', async () => {
        await Owner.query().insert({ name: 'Other' });

        await expectCyclicError(
          Owner.query().insertGraph(
            {
              name: 'Jennifer',
              items: [{ '#id': 'felix', name: 'Felix' }],
              favoriteItem: { '#ref': 'felix' },
            },
            { allowRefs: true },
          ),
        );

        expect(await Owner.query()).to.eql([{ name: 'Other', favoriteItemId: null }]);
        expect(await Item.query().resultSize()).to.equal(0);

        await Owner.query().delete();
        await Item.query().delete();
      });
    });
  });
};
