const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  const { knex } = session;

  // Typescript adds undefined default values for all declared class fields
  // when the there's `target: 'esnext'` in tsconfig.json. This test set
  // makes sure objection plays nice with those undefineds.
  describe('default undefined model field values', () => {
    class Person extends Model {
      firstName;
      pets;

      static jsonSchema = {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
          },
        },
      };

      static tableName = 'person';
      static relationMappings = () => ({
        pets: {
          modelClass: Pet,
          relation: Model.HasManyRelation,
          join: {
            from: 'person.id',
            to: 'pet.ownerId',
          },
        },
      });
    }

    class Pet extends Model {
      name;
      ownerId;
      owner;
      toys;

      static jsonSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          ownerId: {
            type: 'integer',
          },
        },
      };

      static tableName = 'pet';
      static relationMappings = () => ({
        owner: {
          modelClass: Person,
          relation: Model.BelongsToOneRelation,
          join: {
            from: 'pet.ownerId',
            to: 'person.id',
          },
        },

        toys: {
          modelClass: Toy,
          relation: Model.ManyToManyRelation,
          join: {
            from: 'pet.id',
            through: {
              from: 'petToy.petId',
              to: 'petToy.toyId',
            },
            to: 'toy.id',
          },
        },
      });
    }

    class Toy extends Model {
      toyName;
      price;

      static jsonSchema = {
        type: 'object',
        properties: {
          toyName: {
            type: 'string',
          },
          price: {
            type: 'number',
          },
        },
      };

      static tableName = 'toy';
    }

    before(() => {
      return knex.schema
        .dropTableIfExists('petToy')
        .dropTableIfExists('pet')
        .dropTableIfExists('toy')
        .dropTableIfExists('person')
        .createTable('person', (table) => {
          table.increments('id').primary();
          table.string('firstName');
        })
        .createTable('pet', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('ownerId').unsigned().references('person.id').onDelete('cascade');
        })
        .createTable('toy', (table) => {
          table.increments('id').primary();
          table.string('toyName');
          table.float('price');
        })
        .createTable('petToy', (table) => {
          table.integer('petId').unsigned().references('pet.id').notNullable().onDelete('cascade');
          table.integer('toyId').unsigned().references('toy.id').notNullable().onDelete('cascade');
        });
    });

    after(() => {
      return knex.schema
        .dropTableIfExists('petToy')
        .dropTableIfExists('pet')
        .dropTableIfExists('toy')
        .dropTableIfExists('person');
    });

    it('insertGraph', async () => {
      const result = await Person.query(knex)
        .allowGraph('pets.toys')
        .insertGraph({
          firstName: 'Arnold',
          pets: [{ name: 'Catto' }, { name: 'Doggo', toys: [{ toyName: 'Bone' }] }],
        });

      expect(result).to.containSubset({
        firstName: 'Arnold',
        pets: [
          { name: 'Catto', owner: undefined, toys: undefined },
          {
            name: 'Doggo',
            owner: undefined,
            toys: [{ toyName: 'Bone' }],
          },
        ],
      });

      const resultFromDb = await Person.query(knex)
        .findById(result.id)
        .withGraphFetched({
          pets: {
            toys: true,
          },
        });

      expect(resultFromDb).to.containSubset({
        firstName: 'Arnold',
        pets: [
          { name: 'Catto', owner: undefined, toys: [] },
          {
            name: 'Doggo',
            toys: [{ toyName: 'Bone' }],
          },
        ],
      });
    });

    it('withGraphFetched', async () => {
      const { id } = await Person.query(knex).insertGraph({
        firstName: 'Arnold',
        pets: [{ name: 'Catto' }, { name: 'Doggo', toys: [{ toyName: 'Bone' }] }],
      });

      const result = await Person.query(knex)
        .findById(id)
        .withGraphFetched({
          pets: {
            toys: true,
          },
        });

      expect(result).to.containSubset({
        firstName: 'Arnold',
        pets: [
          { name: 'Catto', owner: undefined, toys: [] },
          {
            name: 'Doggo',
            owner: undefined,
            toys: [{ toyName: 'Bone' }],
          },
        ],
      });
    });

    it('withGraphJoined', async () => {
      const { id } = await Person.query(knex).insertGraph({
        firstName: 'Arnold',
        pets: [{ name: 'Catto' }, { name: 'Doggo', toys: [{ toyName: 'Bone' }] }],
      });

      const result = await Person.query(knex)
        .findById(id)
        .withGraphJoined({
          pets: {
            toys: true,
          },
        });

      expect(result).to.containSubset({
        firstName: 'Arnold',
        pets: [
          { name: 'Catto', owner: undefined, toys: [] },
          {
            name: 'Doggo',
            owner: undefined,
            toys: [{ toyName: 'Bone' }],
          },
        ],
      });
    });

    it('patch', async () => {
      let toy = await Toy.query(knex).insert({ toyName: 'Bone' });
      await Toy.query(knex).patch({ price: 100 }).findById(toy.id);
      await toy.$query(knex).patch({ toyName: 'Wheel' });

      toy = await Toy.query(knex).findById(toy.id);
      expect(toy.price).to.equal(100);
      expect(toy.toyName).to.equal('Wheel');

      toy = await Toy.query(knex).insert({ toyName: 'Wheel' });
      await toy.$query(knex).update();
    });

    it('relatedQuery: find', async () => {
      const {
        id: personId,
        pets: [{ id: cattoId }, { id: doggoId }],
      } = await Person.query(knex).insertGraph({
        firstName: 'Arnold',
        pets: [{ name: 'Catto' }, { name: 'Doggo', toys: [{ toyName: 'Bone' }] }],
      });

      // HasManyRelation
      const catto = await Person.relatedQuery('pets', knex).for(personId).findById(cattoId);
      expect(catto).to.containSubset({ name: 'Catto' });
      const doggo = await Person.relatedQuery('pets', knex).for(personId).findById(doggoId);
      expect(doggo).to.containSubset({ name: 'Doggo' });

      // BelongsToOneRelation
      const person = await doggo.$relatedQuery('owner', knex);
      expect(person).to.containSubset({ firstName: 'Arnold' });

      // ManyToManyRelation
      const toys = await Pet.relatedQuery('toys', knex).for(doggo);
      expect(toys).to.have.length(1);
      expect(toys).to.containSubset([{ toyName: 'Bone' }]);
    });

    it('relatedQuery: insert', async () => {
      // BelongsToOneRelation
      const doggo = await Pet.query(knex).insert({ name: 'Doggo' });
      const { id: arnoldId } = await Pet.relatedQuery('owner', knex)
        .for(doggo)
        .insert({ firstName: 'Arnold' });
      let arnold = await Person.query(knex).withGraphFetched('pets').findById(arnoldId);
      expect(arnold).to.containSubset({
        firstName: 'Arnold',
        pets: [{ name: 'Doggo' }],
      });

      // HasManyRelation
      const catto = await Person.relatedQuery('pets', knex)
        .for(arnold.id)
        .insert({ name: 'Catto' });
      arnold = await Person.query(knex).withGraphFetched('pets').findById(arnoldId);
      expect(arnold).to.containSubset({
        firstName: 'Arnold',
        pets: [{ name: 'Doggo' }, { name: 'Catto' }],
      });

      // ManyToManyRelation
      const toy = await Pet.relatedQuery('toys', knex).for(catto).insert({ toyName: 'Bone' });
      expect(toy).to.containSubset({ toyName: 'Bone' });

      const result = await Person.query(knex)
        .findById(arnoldId)
        .withGraphJoined({
          pets: {
            toys: true,
          },
        });

      expect(result).to.containSubset({
        firstName: 'Arnold',
        pets: [
          { name: 'Catto', owner: undefined, toys: [{ toyName: 'Bone' }] },
          {
            name: 'Doggo',
            owner: undefined,
            toys: [],
          },
        ],
      });
    });
  });
};
