const { expect } = require('chai');
const { Model, raw } = require('../../../');

module.exports = (session) => {
  describe('Aggregates in withGraphJoined modifiers #2219', () => {
    let knex = session.knex;
    let Owner;
    let Pet;

    before(() => {
      return knex.schema
        .dropTableIfExists('Toy')
        .dropTableIfExists('Pet')
        .dropTableIfExists('Owner')
        .createTable('Owner', (table) => {
          table.integer('id').primary();
          table.string('name');
        })
        .createTable('Pet', (table) => {
          table.integer('id').primary();
          table.integer('ownerId').references('Owner.id');
          table.string('name');
        })
        .createTable('Toy', (table) => {
          table.integer('id').primary();
          table.integer('petId').references('Pet.id');
          table.integer('price');
        });
    });

    after(() => {
      return knex.schema
        .dropTableIfExists('Toy')
        .dropTableIfExists('Pet')
        .dropTableIfExists('Owner');
    });

    before(() => {
      Owner = class Owner extends Model {
        static get tableName() {
          return 'Owner';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Pet,
              join: { from: 'Owner.id', to: 'Pet.ownerId' },
            },
          };
        }
      };

      Pet = class Pet extends Model {
        static get tableName() {
          return 'Pet';
        }
      };

      Owner.knex(knex);
      Pet.knex(knex);
    });

    before(async () => {
      await knex('Owner').insert({ id: 1, name: 'Jennifer' });
      await knex('Pet').insert([
        { id: 1, ownerId: 1, name: 'Fluffy' },
        { id: 2, ownerId: 1, name: 'Doggo' },
      ]);
      await knex('Toy').insert([
        { id: 1, petId: 1, price: 10 },
        { id: 2, petId: 1, price: 20 },
        { id: 3, petId: 2, price: 5 },
      ]);
    });

    function fetchPets(modifier) {
      return Owner.query()
        .findById(1)
        .withGraphJoined('pets(withToys)')
        .modifiers({
          withToys: (query) =>
            modifier(
              query
                .select('Pet.name')
                .join('Toy', 'Toy.petId', 'Pet.id')
                .groupBy('Pet.id', 'Pet.ownerId', 'Pet.name'),
            ),
        })
        .orderBy('pets.id')
        .then((owner) => owner.pets);
    }

    function toNumbers(pets, prop) {
      return pets.map((pet) => ({ ...pet, [prop]: Number(pet[prop]) }));
    }

    it("count('* as n')", async () => {
      const pets = await fetchPets((query) => query.count('* as n'));

      expect(toNumbers(pets, 'n')).to.eql([
        { name: 'Fluffy', n: 2 },
        { name: 'Doggo', n: 1 },
      ]);
    });

    it("count('* as n') without other selections", async () => {
      const pets = await Owner.query()
        .findById(1)
        .withGraphJoined('pets(withToys)')
        .modifiers({
          withToys: (query) =>
            query
              .count('* as n')
              .join('Toy', 'Toy.petId', 'Pet.id')
              .groupBy('Pet.id', 'Pet.ownerId'),
        })
        .orderBy('pets.id')
        .then((owner) => owner.pets);

      expect(toNumbers(pets, 'n')).to.eql([{ n: 2 }, { n: 1 }]);
    });

    it("count('Toy.id as n')", async () => {
      const pets = await fetchPets((query) => query.count('Toy.id as n'));

      expect(toNumbers(pets, 'n')).to.eql([
        { name: 'Fluffy', n: 2 },
        { name: 'Doggo', n: 1 },
      ]);
    });

    it("count('Toy.id', { as: 'n' })", async () => {
      const pets = await fetchPets((query) => query.count('Toy.id', { as: 'n' }));

      expect(toNumbers(pets, 'n')).to.eql([
        { name: 'Fluffy', n: 2 },
        { name: 'Doggo', n: 1 },
      ]);
    });

    it("count({ n: 'Toy.id' })", async () => {
      const pets = await fetchPets((query) => query.count({ n: 'Toy.id' }));

      expect(toNumbers(pets, 'n')).to.eql([
        { name: 'Fluffy', n: 2 },
        { name: 'Doggo', n: 1 },
      ]);
    });

    it("sum('Toy.price as total')", async () => {
      const pets = await fetchPets((query) => query.sum('Toy.price as total'));

      expect(toNumbers(pets, 'total')).to.eql([
        { name: 'Fluffy', total: 30 },
        { name: 'Doggo', total: 5 },
      ]);
    });

    it("max({ maxPrice: 'Toy.price' }) and min('Toy.price as minPrice')", async () => {
      const pets = await fetchPets((query) =>
        query.max({ maxPrice: 'Toy.price' }).min('Toy.price as minPrice'),
      );

      expect(toNumbers(toNumbers(pets, 'maxPrice'), 'minPrice')).to.eql([
        { name: 'Fluffy', maxPrice: 20, minPrice: 10 },
        { name: 'Doggo', maxPrice: 5, minPrice: 5 },
      ]);
    });

    it('ignores aggregates without an alias', async function () {
      // SQL Server requires a name for every column of the joined subquery.
      if (session.isMsSql()) {
        return this.skip();
      }

      const pets = await fetchPets((query) => query.count('Toy.id'));

      expect(pets).to.eql([{ name: 'Fluffy' }, { name: 'Doggo' }]);
    });

    it("raw('count(*) as n')", async () => {
      const pets = await fetchPets((query) => query.select(raw('count(*) as n')));

      expect(toNumbers(pets, 'n')).to.eql([
        { name: 'Fluffy', n: 2 },
        { name: 'Doggo', n: 1 },
      ]);
    });

    it("keeps selecting all root columns with count('* as n')", async () => {
      const owners = await Owner.query()
        .withGraphJoined('pets')
        .count('* as n')
        .groupBy('Owner.id', 'Owner.name', 'pets.id', 'pets.ownerId', 'pets.name')
        .orderBy('pets.id');

      expect(owners.map((owner) => ({ ...owner, n: Number(owner.n) }))).to.eql([
        {
          id: 1,
          name: 'Jennifer',
          n: 1,
          pets: [
            { id: 1, ownerId: 1, name: 'Fluffy' },
            { id: 2, ownerId: 1, name: 'Doggo' },
          ],
        },
      ]);
    });
  });
};
